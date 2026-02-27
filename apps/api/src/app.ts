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
import { adminRoutes } from './routes/admin/index.js';
import { webhookRoutes } from './routes/webhooks.js';
import { mineSiteRoutes } from './routes/mine-sites.js';
import { visionRoutes } from './routes/vision.js';
import { receiptRoutes } from './routes/receipts.js';
import { featureFlags } from './lib/featureFlags.js';

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
      // Public endpoint: feature flags (no auth required)
      api.get('/feature-flags', async () => ({
        yellowcard_enabled: featureFlags.yellowCardEnabled,
      }));

      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(meRoutes);
      await api.register(profileRoutes);
      await api.register(recordRoutes, { prefix: '/records' });
      await api.register(purchaseRoutes, { prefix: '/purchases' });
      await api.register(salesPartnerRoutes, { prefix: '/sales-partners' });
      await api.register(mineSiteRoutes, { prefix: '/mine-sites' });
      await api.register(visionRoutes, { prefix: '/vision' });
      await api.register(receiptRoutes, { prefix: '/records' });
      await api.register(adminRoutes, { prefix: '/admin' });

      // Webhook routes: no auth middleware (verified by signature)
      await api.register(webhookRoutes, { prefix: '/webhooks' });
    },
    { prefix: '/api' },
  );

  // Serve static files in production
  const __dirname = resolve(fileURLToPath(import.meta.url), '..');

  // Miner PWA static files
  const pwaDistPath = resolve(__dirname, '../miner-pwa-dist');
  const pwaDistPathAlt = resolve(__dirname, '../../../apps/miner-pwa/dist');
  const staticRoot = existsSync(pwaDistPath)
    ? pwaDistPath
    : existsSync(pwaDistPathAlt)
    ? pwaDistPathAlt
    : null;

  // Admin web static files
  const adminDistPath = resolve(__dirname, '../admin-web-dist');
  const adminDistPathAlt = resolve(__dirname, '../../../apps/admin-web/dist');
  const adminRoot = existsSync(adminDistPath)
    ? adminDistPath
    : existsSync(adminDistPathAlt)
    ? adminDistPathAlt
    : null;

  if (staticRoot) {
    app.log.info(`Serving PWA from: ${staticRoot}`);
    await app.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
      wildcard: false,
    });
  }

  if (adminRoot) {
    app.log.info(`Serving admin-web from: ${adminRoot}`);
    await app.register(fastifyStatic, {
      root: adminRoot,
      prefix: '/admin/',
      decorateReply: false,
    });
  }

  // SPA fallback: serve index.html for non-API routes
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Route not found',
      });
    }

    // Admin SPA fallback
    if (request.url.startsWith('/admin')) {
      if (adminRoot) {
        return reply.sendFile('index.html', adminRoot);
      }
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Admin app not available',
      });
    }

    // Miner PWA SPA fallback
    if (staticRoot) {
      return reply.sendFile('index.html');
    }

    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not found',
    });
  });

  return app;
}
