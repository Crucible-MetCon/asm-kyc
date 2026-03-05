import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { listR2Objects, getPresignedUrl } from '../../lib/r2Client.js';

export const adminEntityPackBrowserRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/entity-packs — list all entity packs grouped by user
  app.get('/', async () => {
    const allObjects = await listR2Objects('entity-packs/');

    // Group by userId (second path segment: entity-packs/{userId}/filename.pdf)
    const byUser = new Map<string, { key: string; size: number; lastModified: Date | undefined }[]>();

    for (const obj of allObjects) {
      const parts = obj.key.split('/');
      const userId = parts[1];
      if (!userId) continue;

      if (!byUser.has(userId)) byUser.set(userId, []);
      byUser.get(userId)!.push(obj);
    }

    // Look up user names for the user IDs
    const userIds = Array.from(byUser.keys());

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { miner_profile: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const folders = userIds.map((id) => {
      const user = userMap.get(id);
      const objects = byUser.get(id) ?? [];

      // Sort newest first
      objects.sort((a, b) => {
        const ta = a.lastModified?.getTime() ?? 0;
        const tb = b.lastModified?.getTime() ?? 0;
        return tb - ta;
      });

      return {
        user_id: id,
        user_name: user?.miner_profile?.full_name ?? user?.username ?? 'Unknown',
        user_role: user?.role ?? 'UNKNOWN',
        pack_count: objects.length,
        latest_date: objects[0]?.lastModified?.toISOString() ?? null,
        packs: objects.map((o) => ({
          key: o.key,
          filename: o.key.split('/').pop() ?? o.key,
          size: o.size,
          last_modified: o.lastModified?.toISOString() ?? null,
        })),
      };
    });

    // Sort folders by latest date descending
    folders.sort((a, b) => {
      const ta = a.latest_date ? new Date(a.latest_date).getTime() : 0;
      const tb = b.latest_date ? new Date(b.latest_date).getTime() : 0;
      return tb - ta;
    });

    return { folders, total_packs: allObjects.length };
  });

  // GET /api/admin/entity-packs/download?key=... — presigned download URL
  app.get<{ Querystring: { key: string } }>('/download', async (request, reply) => {
    const { key } = request.query;

    if (!key || !key.startsWith('entity-packs/')) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid key — must start with entity-packs/',
      });
    }

    const url = await getPresignedUrl(key, 300); // 5-minute expiry

    if (!url) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'R2 storage is not configured',
      });
    }

    return { url };
  });
};
