import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { prisma } from '@asm-kyc/database';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(meRoutes);

  return app;
}
