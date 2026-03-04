import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { generateEntityPack } from '../../lib/entityPack.js';

export const adminEntityPackRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/users/:id/entity-pack — generate & download PDF Entity Pack
  app.get<{ Params: { id: string } }>('/:id/entity-pack', async (request, reply) => {
    const { id } = request.params;

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

    const pdfBuffer = await generateEntityPack(id);

    const filename = `entity-pack-${user.miner_profile?.full_name?.replace(/\s+/g, '-') ?? user.username}-${new Date().toISOString().slice(0, 10)}.pdf`;

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  });
};
