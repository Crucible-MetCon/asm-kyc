import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    const user = request.user!;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      profile: user.miner_profile
        ? {
            full_name: user.miner_profile.full_name,
            counterparty_type: user.miner_profile.counterparty_type,
            home_language: user.miner_profile.home_language,
          }
        : null,
    };
  });
};
