import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { prisma } from '@asm-kyc/database';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

  await app.register(cors, {
    origin: allowedOrigins,
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
