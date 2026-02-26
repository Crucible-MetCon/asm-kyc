import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import type { AdminDashboardStats } from '@asm-kyc/shared';

export const adminDashboardRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/dashboard — aggregated stats
  app.get('/dashboard', async (_request, reply) => {
    const [
      totalUsers,
      totalMiners,
      totalTraders,
      totalRefiners,
      totalRecords,
      recordsByStatus,
      totalPurchases,
      totalReviews,
      pendingReviews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'MINER_USER' } }),
      prisma.user.count({ where: { role: 'TRADER_USER' } }),
      prisma.user.count({ where: { role: 'REFINER_USER' } }),
      prisma.record.count(),
      prisma.record.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.purchase.count(),
      prisma.complianceReview.count(),
      prisma.complianceReview.count({ where: { status: 'PENDING' } }),
    ]);

    const stats: AdminDashboardStats = {
      total_users: totalUsers,
      total_miners: totalMiners,
      total_traders: totalTraders,
      total_refiners: totalRefiners,
      total_records: totalRecords,
      records_by_status: recordsByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      total_purchases: totalPurchases,
      total_compliance_reviews: totalReviews,
      pending_reviews: pendingReviews,
    };

    return reply.send(stats);
  });
};
