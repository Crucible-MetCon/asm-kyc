import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { serializeProfile } from '../lib/serialize.js';

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    const user = request.user!;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      profile: serializeProfile(user.miner_profile),
    };
  });
};
