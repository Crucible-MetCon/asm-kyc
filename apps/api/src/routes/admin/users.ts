import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import type { AdminUserListItem, AdminUserDetail } from '@asm-kyc/shared';
import { serializeProfile } from '../../lib/serialize.js';

export const adminUserRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/users — paginated user list
  app.get('/', async (request, reply) => {
    const { role, search, page = '1', limit = '20' } = request.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { miner_profile: { full_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { miner_profile: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    const items: AdminUserListItem[] = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      phone_e164: u.phone_e164,
      is_disabled: u.is_disabled,
      profile_name: u.miner_profile?.full_name ?? null,
      profile_completed: !!u.miner_profile?.profile_completed_at,
      consented: !!u.miner_profile?.consented_at,
      created_at: u.created_at.toISOString(),
    }));

    return reply.send({ users: items, total });
  });

  // GET /api/admin/users/:id — user detail
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: { miner_profile: true },
    });

    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const [recordCount, purchaseCount] = await Promise.all([
      prisma.record.count({ where: { created_by: id } }),
      prisma.purchase.count({ where: { trader_id: id } }),
    ]);

    const detail: AdminUserDetail = {
      id: user.id,
      username: user.username,
      role: user.role,
      phone_e164: user.phone_e164,
      is_disabled: user.is_disabled,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      profile: serializeProfile(user.miner_profile),
      record_count: recordCount,
      purchase_count: purchaseCount,
    };

    return reply.send(detail);
  });

  // PATCH /api/admin/users/:id/disable — toggle is_disabled
  app.patch('/:id/disable', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { is_disabled } = request.body as { is_disabled: boolean };
    const adminUser = request.user!;

    if (id === adminUser.id) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot disable your own account',
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    await prisma.user.update({
      where: { id },
      data: { is_disabled: !!is_disabled },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: adminUser.id,
        action: is_disabled ? 'USER_DISABLED' : 'USER_ENABLED',
        entity: 'User',
        entity_id: id,
        meta: { username: user.username, role: user.role },
      },
    });

    // If disabling, delete all their sessions to immediately revoke access
    if (is_disabled) {
      await prisma.session.deleteMany({ where: { user_id: id } });
    }

    return reply.send({ success: true, is_disabled: !!is_disabled });
  });
};
