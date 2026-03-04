import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { adminDashboardRoutes } from './dashboard.js';
import { adminUserRoutes } from './users.js';
import { adminRecordRoutes } from './records.js';
import { adminComplianceRoutes } from './compliance.js';
import { adminSurveyRoutes } from './surveys.js';
import { adminRiskRoutes } from './risk.js';
import { adminEntityPackRoutes } from './entity-pack.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All admin routes require authentication + ADMIN_USER role
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireRole('ADMIN_USER'));

  await app.register(adminDashboardRoutes);
  await app.register(adminUserRoutes, { prefix: '/users' });
  await app.register(adminRecordRoutes, { prefix: '/records' });
  await app.register(adminComplianceRoutes, { prefix: '/compliance' });
  await app.register(adminSurveyRoutes, { prefix: '/surveys' });
  await app.register(adminRiskRoutes, { prefix: '/users' });
  await app.register(adminEntityPackRoutes, { prefix: '/users' });
};
