import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { authenticate } from '../middleware/auth.js';
import { serializeProfile } from '../lib/serialize.js';

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    const user = request.user!;
    const documents = await prisma.document.findMany({
      where: { user_id: user.id },
      select: { doc_type: true },
    });
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      profile: serializeProfile(user.miner_profile),
      uploaded_doc_types: documents.map(d => d.doc_type),
    };
  });
};
