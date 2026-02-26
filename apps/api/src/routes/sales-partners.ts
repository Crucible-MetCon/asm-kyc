import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { SalesPartnerAddSchema } from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const salesPartnerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // GET /sales-partners — list my sales partners (miner's perspective)
  app.get('/', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;

      const partners = await prisma.salesPartner.findMany({
        where: { miner_id: user.id },
        include: {
          partner: { include: { miner_profile: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      return reply.send({
        partners: partners.map((sp) => ({
          id: sp.id,
          partner_id: sp.partner_id,
          partner_name: sp.partner.miner_profile?.full_name ?? sp.partner.username,
          partner_username: sp.partner.username,
          partner_role: sp.partner.role,
          created_at: sp.created_at.toISOString(),
        })),
        total: partners.length,
      });
    },
  });

  // GET /sales-partners/available — list all traders/refiners a miner can choose from
  app.get('/available', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;

      // Get IDs of already-selected partners
      const existing = await prisma.salesPartner.findMany({
        where: { miner_id: user.id },
        select: { partner_id: true },
      });
      const existingIds = existing.map((sp) => sp.partner_id);

      // Find all traders and refiners NOT already selected
      const partners = await prisma.user.findMany({
        where: {
          role: { in: ['TRADER_USER', 'REFINER_USER'] },
          id: { notIn: existingIds.length > 0 ? existingIds : ['no-match'] },
        },
        include: { miner_profile: true },
        orderBy: { created_at: 'asc' },
      });

      return reply.send({
        partners: partners.map((u) => ({
          id: u.id,
          username: u.username,
          full_name: u.miner_profile?.full_name ?? u.username,
          role: u.role,
        })),
        total: partners.length,
      });
    },
  });

  // POST /sales-partners — add a sales partner
  app.post('/', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const parsed = SalesPartnerAddSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parsed.error.issues,
        });
      }

      const user = request.user!;
      const { partner_id } = parsed.data;

      // Verify the partner is a trader or refiner
      const partner = await prisma.user.findUnique({
        where: { id: partner_id },
      });

      if (!partner || (partner.role !== 'TRADER_USER' && partner.role !== 'REFINER_USER')) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid partner: must be a trader or refiner',
        });
      }

      // Check for duplicate
      const existing = await prisma.salesPartner.findUnique({
        where: { miner_id_partner_id: { miner_id: user.id, partner_id } },
      });

      if (existing) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'This partner is already selected',
        });
      }

      const sp = await prisma.salesPartner.create({
        data: {
          miner_id: user.id,
          partner_id,
        },
        include: {
          partner: { include: { miner_profile: true } },
        },
      });

      return reply.status(201).send({
        id: sp.id,
        partner_id: sp.partner_id,
        partner_name: sp.partner.miner_profile?.full_name ?? sp.partner.username,
        partner_username: sp.partner.username,
        partner_role: sp.partner.role,
        created_at: sp.created_at.toISOString(),
      });
    },
  });

  // DELETE /sales-partners/:partnerId — remove a sales partner
  app.delete<{ Params: { partnerId: string } }>('/:partnerId', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const { partnerId } = request.params;

      const sp = await prisma.salesPartner.findFirst({
        where: { miner_id: user.id, partner_id: partnerId },
      });

      if (!sp) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Sales partner not found',
        });
      }

      await prisma.salesPartner.delete({ where: { id: sp.id } });

      return reply.send({ ok: true });
    },
  });
};
