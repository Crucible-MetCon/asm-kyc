import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { PurchaseCreateSchema } from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  serializePurchaseListItem,
  serializePurchase,
} from '../lib/serialize.js';

export const purchaseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // GET /purchases — list trader's purchases
  app.get('/', {
    preHandler: [requireRole('TRADER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;

      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where: { trader_id: user.id },
          orderBy: { purchased_at: 'desc' },
        }),
        prisma.purchase.count({ where: { trader_id: user.id } }),
      ]);

      return reply.send({
        purchases: purchases.map(serializePurchaseListItem),
        total,
      });
    },
  });

  // GET /purchases/:id — purchase detail with linked records
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: [requireRole('TRADER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;

      const purchase = await prisma.purchase.findUnique({
        where: { id: request.params.id },
        include: {
          items: {
            include: {
              record: {
                include: {
                  creator: { include: { miner_profile: true } },
                  _count: { select: { photos: true } },
                },
              },
            },
          },
        },
      });

      if (!purchase) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Purchase not found',
        });
      }
      if (purchase.trader_id !== user.id) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Not your purchase',
        });
      }

      return reply.send(serializePurchase(purchase));
    },
  });

  // POST /purchases — create a purchase (atomic transaction)
  app.post('/', {
    preHandler: [requireRole('TRADER_USER')],
    handler: async (request, reply) => {
      const parsed = PurchaseCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parsed.error.issues,
        });
      }

      const user = request.user!;
      const { record_ids, notes } = parsed.data;

      // Deduplicate
      const uniqueIds = [...new Set(record_ids)];

      // Verify all records exist and are SUBMITTED
      const records = await prisma.record.findMany({
        where: { id: { in: uniqueIds } },
      });

      if (records.length !== uniqueIds.length) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'One or more record IDs not found',
        });
      }

      const notSubmitted = records.filter((r) => r.status !== 'SUBMITTED');
      if (notSubmitted.length > 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Records not available for purchase: ${notSubmitted.map((r) => r.id).join(', ')}`,
        });
      }

      // Calculate total weight
      const totalWeight = records.reduce(
        (sum, r) => sum + (r.weight_grams ? Number(r.weight_grams) : 0),
        0,
      );

      // Atomic transaction: create purchase + items + update record statuses
      const purchase = await prisma.$transaction(async (tx) => {
        const p = await tx.purchase.create({
          data: {
            trader_id: user.id,
            total_weight: totalWeight,
            total_items: uniqueIds.length,
            notes: notes || null,
            items: {
              create: uniqueIds.map((recordId) => ({
                record_id: recordId,
              })),
            },
          },
          include: {
            items: {
              include: {
                record: {
                  include: {
                    creator: { include: { miner_profile: true } },
                    _count: { select: { photos: true } },
                  },
                },
              },
            },
          },
        });

        // Mark all records as PURCHASED
        await tx.record.updateMany({
          where: { id: { in: uniqueIds } },
          data: {
            status: 'PURCHASED',
            purchased_by: user.id,
            purchased_at: new Date(),
          },
        });

        return p;
      });

      return reply.status(201).send(serializePurchase(purchase));
    },
  });
};
