import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { prisma } from '@asm-kyc/database';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { profileRoutes } from './routes/profile.js';
import { recordRoutes } from './routes/records.js';
import { purchaseRoutes } from './routes/purchases.js';
import { salesPartnerRoutes } from './routes/sales-partners.js';

export async function buildApp() {
  const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });

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

  // All API routes under /api prefix
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(meRoutes);
      await api.register(profileRoutes);
      await api.register(recordRoutes, { prefix: '/records' });
      await api.register(purchaseRoutes, { prefix: '/purchases' });
      await api.register(salesPartnerRoutes, { prefix: '/sales-partners' });
    },
    { prefix: '/api' },
  );

  // Serve PWA static files in production
  // __dirname = apps/api/src  →  ../miner-pwa-dist = apps/api/miner-pwa-dist (Docker)
  const __dirname = resolve(fileURLToPath(import.meta.url), '..');
  const pwaDistPath = resolve(__dirname, '../miner-pwa-dist');
  const pwaDistPathAlt = resolve(__dirname, '../../../apps/miner-pwa/dist');
  const staticRoot = existsSync(pwaDistPath)
    ? pwaDistPath
    : existsSync(pwaDistPathAlt)
    ? pwaDistPathAlt
    : null;

  if (staticRoot) {
    app.log.info(`Serving PWA from: ${staticRoot}`);

    await app.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback: serve index.html for any non-API, non-file route
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Route not found',
        });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
