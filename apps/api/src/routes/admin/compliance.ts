import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { ComplianceReviewCreateSchema } from '@asm-kyc/shared';
import type { ComplianceReviewResponse, ComplianceReviewListItem } from '@asm-kyc/shared';

export const adminComplianceRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/admin/compliance — create a compliance review
  app.post('/', async (request, reply) => {
    const parsed = ComplianceReviewCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const { record_id, status, notes } = parsed.data;
    const adminUser = request.user!;

    // Verify record exists
    const record = await prisma.record.findUnique({ where: { id: record_id } });
    if (!record) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Record not found',
      });
    }

    const review = await prisma.complianceReview.create({
      data: {
        record_id,
        reviewer_id: adminUser.id,
        status,
        notes: notes || null,
      },
      include: {
        reviewer: { include: { miner_profile: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: adminUser.id,
        action: 'COMPLIANCE_REVIEW_CREATED',
        entity: 'ComplianceReview',
        entity_id: review.id,
        meta: { status, record_id },
      },
    });

    const response: ComplianceReviewResponse = {
      id: review.id,
      status: review.status,
      notes: review.notes,
      reviewer_name: review.reviewer.miner_profile?.full_name ?? review.reviewer.username,
      reviewed_at: review.reviewed_at.toISOString(),
    };

    return reply.status(201).send(response);
  });

  // GET /api/admin/compliance — list all compliance reviews
  app.get('/', async (request, reply) => {
    const { status, page = '1', limit = '20' } = request.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [reviews, total] = await Promise.all([
      prisma.complianceReview.findMany({
        where,
        include: {
          reviewer: { include: { miner_profile: true } },
          record: {
            include: {
              creator: { include: { miner_profile: true } },
            },
          },
        },
        orderBy: { reviewed_at: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.complianceReview.count({ where }),
    ]);

    const items: ComplianceReviewListItem[] = reviews.map((cr) => ({
      id: cr.id,
      status: cr.status,
      notes: cr.notes,
      reviewer_name: cr.reviewer.miner_profile?.full_name ?? cr.reviewer.username,
      reviewed_at: cr.reviewed_at.toISOString(),
      record_id: cr.record_id,
      record_weight: cr.record.weight_grams ? Number(cr.record.weight_grams) : null,
      record_gold_type: cr.record.gold_type,
      record_mine_site: cr.record.origin_mine_site,
      miner_name: cr.record.creator.miner_profile?.full_name ?? cr.record.creator.username,
    }));

    return reply.send({ reviews: items, total });
  });
};
