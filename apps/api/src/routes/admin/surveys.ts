import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { SurveyRewardUpdateSchema } from '@asm-kyc/shared';

export const adminSurveyRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/surveys — list surveys with completion stats
  app.get('/', async () => {
    const totalMiners = await prisma.user.count({
      where: { role: 'MINER_USER' },
    });

    const surveys = await prisma.surveyDefinition.findMany({
      orderBy: { display_order: 'asc' },
      include: {
        _count: { select: { responses: true } },
        responses: {
          include: { reward: true },
        },
      },
    });

    const items = surveys.map((s) => {
      const completionCount = s._count.responses;
      const totalRewardsPaid = s.responses.reduce((sum, r) => {
        if (r.reward?.status === 'PAID') {
          return sum + Number(r.reward.amount);
        }
        return sum;
      }, 0);

      return {
        id: s.id,
        slug: s.slug,
        display_order: s.display_order,
        reward_amount: Number(s.reward_amount),
        reward_currency: s.reward_currency,
        is_active: s.is_active,
        completion_count: completionCount,
        completion_percentage: totalMiners > 0
          ? Math.round((completionCount / totalMiners) * 100)
          : 0,
        total_rewards_paid: totalRewardsPaid,
      };
    });

    return { surveys: items, total_miners: totalMiners };
  });

  // PATCH /api/admin/surveys/:id — update reward amount
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const parsed = SurveyRewardUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const survey = await prisma.surveyDefinition.findUnique({ where: { id } });
    if (!survey) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Survey not found',
      });
    }

    const updated = await prisma.surveyDefinition.update({
      where: { id },
      data: { reward_amount: parsed.data.reward_amount },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: request.user!.id,
        action: 'SURVEY_REWARD_UPDATED',
        entity: 'SurveyDefinition',
        entity_id: id,
        meta: {
          slug: survey.slug,
          old_amount: Number(survey.reward_amount),
          new_amount: parsed.data.reward_amount,
        },
      },
    });

    return {
      id: updated.id,
      slug: updated.slug,
      reward_amount: Number(updated.reward_amount),
      reward_currency: updated.reward_currency,
    };
  });
};
