import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import type { AdminRecordListItem, AdminRecordDetail, ComplianceReviewResponse } from '@asm-kyc/shared';
import { serializeRecordPhoto } from '../../lib/serialize.js';

export const adminRecordRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/records — all records with filters
  app.get('/', async (request, reply) => {
    const { status, search, page = '1', limit = '20' } = request.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { origin_mine_site: { contains: search, mode: 'insensitive' } },
        { creator: { username: { contains: search, mode: 'insensitive' } } },
        { creator: { miner_profile: { full_name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        include: {
          creator: { include: { miner_profile: true } },
          _count: { select: { photos: true } },
          compliance_reviews: {
            orderBy: { reviewed_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.record.count({ where }),
    ]);

    const items: AdminRecordListItem[] = records.map((r) => ({
      id: r.id,
      status: r.status,
      weight_grams: r.weight_grams ? Number(r.weight_grams) : null,
      estimated_purity: r.estimated_purity ? Number(r.estimated_purity) : null,
      gold_type: r.gold_type,
      origin_mine_site: r.origin_mine_site,
      extraction_date: r.extraction_date?.toISOString() ?? null,
      miner_name: r.creator.miner_profile?.full_name ?? r.creator.username,
      miner_username: r.creator.username,
      photo_count: r._count.photos,
      review_status: r.compliance_reviews[0]?.status ?? null,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    }));

    return reply.send({ records: items, total });
  });

  // GET /api/admin/records/:id — full record detail
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const record = await prisma.record.findUnique({
      where: { id },
      include: {
        creator: { include: { miner_profile: true } },
        photos: { orderBy: { taken_at: 'asc' } },
        compliance_reviews: {
          include: {
            reviewer: { include: { miner_profile: true } },
          },
          orderBy: { reviewed_at: 'desc' },
        },
      },
    });

    if (!record) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Record not found',
      });
    }

    // Get purchaser name if purchased
    let purchasedByName: string | null = null;
    if (record.purchased_by) {
      const purchaser = await prisma.user.findUnique({
        where: { id: record.purchased_by },
        include: { miner_profile: true },
      });
      purchasedByName = purchaser?.miner_profile?.full_name ?? purchaser?.username ?? null;
    }

    const reviews: ComplianceReviewResponse[] = record.compliance_reviews.map((cr) => ({
      id: cr.id,
      status: cr.status,
      notes: cr.notes,
      reviewer_name: cr.reviewer.miner_profile?.full_name ?? cr.reviewer.username,
      reviewed_at: cr.reviewed_at.toISOString(),
    }));

    const detail: AdminRecordDetail = {
      id: record.id,
      status: record.status,
      weight_grams: record.weight_grams ? Number(record.weight_grams) : null,
      estimated_purity: record.estimated_purity ? Number(record.estimated_purity) : null,
      gold_type: record.gold_type,
      origin_mine_site: record.origin_mine_site,
      extraction_date: record.extraction_date?.toISOString() ?? null,
      notes: record.notes,
      miner_name: record.creator.miner_profile?.full_name ?? record.creator.username,
      miner_username: record.creator.username,
      purchased_by_name: purchasedByName,
      purchased_at: record.purchased_at?.toISOString() ?? null,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      photos: record.photos.map(serializeRecordPhoto),
      compliance_reviews: reviews,
    };

    return reply.send(detail);
  });
};
