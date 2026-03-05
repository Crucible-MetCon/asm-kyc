import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import {
  SurveySubmitSchema,
  SURVEY_DEFINITIONS,
  getSurveyBySlug,
  getVisibleQuestions,
} from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { triggerSurveyReward } from '../lib/surveyReward.js';
import { generateAndUploadEntityPack } from '../lib/entityPackUploader.js';

export const surveyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // GET /api/surveys — list all surveys with completion status
  app.get('/', async (request) => {
    const userId = request.user!.id;

    // Get all survey definitions from DB (for reward amounts)
    const dbSurveys = await prisma.surveyDefinition.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' },
      include: {
        responses: {
          where: { user_id: userId },
          include: { reward: true },
        },
      },
    });

    let totalEarned = 0;
    let totalAvailable = 0;

    const surveys = dbSurveys.map((dbSurvey) => {
      const response = dbSurvey.responses[0] ?? null;
      const rewardAmount = Number(dbSurvey.reward_amount);

      if (response?.reward) {
        if (response.reward.status === 'PAID') {
          totalEarned += Number(response.reward.amount);
        }
      }

      if (!response) {
        totalAvailable += rewardAmount;
      }

      return {
        survey: {
          id: dbSurvey.id,
          slug: dbSurvey.slug,
          display_order: dbSurvey.display_order,
          reward_amount: rewardAmount,
          reward_currency: dbSurvey.reward_currency,
          is_active: dbSurvey.is_active,
        },
        completed: !!response,
        completed_at: response?.completed_at?.toISOString() ?? null,
        reward_status: response?.reward?.status ?? null,
        reward_amount: response?.reward ? Number(response.reward.amount) : null,
      };
    });

    return { surveys, total_earned: totalEarned, total_available: totalAvailable };
  });

  // GET /api/surveys/:slug — get specific survey status + answers if completed
  app.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const userId = request.user!.id;
    const { slug } = request.params;

    // Verify slug is valid
    const surveyDef = getSurveyBySlug(slug);
    if (!surveyDef) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Survey not found',
      });
    }

    const dbSurvey = await prisma.surveyDefinition.findUnique({
      where: { slug },
    });

    if (!dbSurvey || !dbSurvey.is_active) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Survey not found',
      });
    }

    const response = await prisma.surveyResponse.findUnique({
      where: { survey_id_user_id: { survey_id: dbSurvey.id, user_id: userId } },
      include: { answers: true, reward: true },
    });

    if (!response) {
      return {
        completed: false,
        survey_slug: slug,
        answers: [],
        reward_amount: null,
        reward_status: null,
      };
    }

    return {
      id: response.id,
      completed: true,
      survey_slug: slug,
      completed_at: response.completed_at.toISOString(),
      answers: response.answers.map((a) => ({
        question_id: a.question_id,
        answer: a.answer,
      })),
      reward_amount: response.reward ? Number(response.reward.amount) : null,
      reward_status: response.reward?.status ?? null,
    };
  });

  // POST /api/surveys/:slug — submit survey answers
  app.post<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const userId = request.user!.id;
    const { slug } = request.params;

    // 1. Validate slug exists in SURVEY_DEFINITIONS
    const surveyDef = getSurveyBySlug(slug);
    if (!surveyDef) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Survey not found',
      });
    }

    const dbSurvey = await prisma.surveyDefinition.findUnique({
      where: { slug },
    });

    if (!dbSurvey || !dbSurvey.is_active) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Survey not found or inactive',
      });
    }

    // 2. Check unique constraint — 409 if already completed
    const existing = await prisma.surveyResponse.findUnique({
      where: { survey_id_user_id: { survey_id: dbSurvey.id, user_id: userId } },
    });

    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Survey already completed',
      });
    }

    // 3. Validate answers
    const parsed = SurveySubmitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const { answers } = parsed.data;

    // Evaluate visible questions based on submitted answers to determine which are required
    const visibleQuestions = getVisibleQuestions(surveyDef, answers);
    const requiredIds = visibleQuestions.filter((q) => q.required).map((q) => q.id);

    // Check all required visible questions are answered
    const missingRequired = requiredIds.filter((id) => {
      const answer = answers[id];
      return answer === undefined || answer === null || answer === '';
    });

    if (missingRequired.length > 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Missing required answers: ${missingRequired.join(', ')}`,
      });
    }

    // 4. Transaction: create response + answers + reward
    const rewardAmount = Number(dbSurvey.reward_amount);

    const response = await prisma.$transaction(async (tx) => {
      const resp = await tx.surveyResponse.create({
        data: {
          survey_id: dbSurvey.id,
          user_id: userId,
        },
      });

      // Create answer rows for visible questions only
      const visibleIds = new Set(visibleQuestions.map((q) => q.id));
      const answerRows = Object.entries(answers)
        .filter(([qId]) => visibleIds.has(qId))
        .map(([questionId, answer]) => ({
          response_id: resp.id,
          question_id: questionId,
          answer: answer as any,
        }));

      if (answerRows.length > 0) {
        await tx.surveyAnswer.createMany({ data: answerRows });
      }

      // Create reward record
      await tx.surveyReward.create({
        data: {
          response_id: resp.id,
          amount: rewardAmount,
          currency: dbSurvey.reward_currency,
          status: 'PENDING',
        },
      });

      return resp;
    });

    // 5. Trigger disbursement (non-blocking, outside transaction)
    triggerSurveyReward(
      userId,
      response.id,
      slug,
      rewardAmount,
      dbSurvey.reward_currency,
    ).catch(() => {});

    // 6. Generate entity pack PDF and upload to R2 (non-blocking)
    generateAndUploadEntityPack(userId).catch(() => {});

    return reply.status(201).send({
      id: response.id,
      survey_slug: slug,
      completed_at: response.completed_at.toISOString(),
      reward_amount: rewardAmount,
      reward_status: 'PENDING',
    });
  });
};
