import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { evaluateRisk } from '@asm-kyc/shared';

export const adminRiskRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/users/:id/risk — compute risk assessment from survey answers
  app.get<{ Params: { id: string } }>('/:id/risk', async (request, reply) => {
    const { id } = request.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const responses = await prisma.surveyResponse.findMany({
      where: { user_id: id },
      include: {
        survey: true,
        answers: true,
      },
    });

    // Build answersBySlug for risk evaluation
    const answersBySlug: Record<string, Record<string, unknown>> = {};
    for (const resp of responses) {
      const slugAnswers: Record<string, unknown> = {};
      for (const a of resp.answers) {
        slugAnswers[a.question_id] = a.answer;
      }
      answersBySlug[resp.survey.slug] = slugAnswers;
    }

    const result = evaluateRisk(answersBySlug);

    return {
      level: result.level,
      flags: result.flags.map((f) => ({
        survey_slug: f.surveySlug,
        question_id: f.questionId,
        severity: f.severity,
        label_key: f.labelKey,
      })),
    };
  });
};
