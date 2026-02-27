import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { PurchaseCreateSchema } from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  serializePurchaseListItem,
  serializePurchase,
} from '../lib/serialize.js';
import { featureFlags } from '../lib/featureFlags.js';
import { createPayment } from '../lib/yellowcard.js';

export const purchaseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // GET /purchases — list trader's/refiner's purchases
  app.get('/', {
    preHandler: [requireRole('TRADER_USER', 'REFINER_USER')],
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
    preHandler: [requireRole('TRADER_USER', 'REFINER_USER')],
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

  // GET /purchases/:id/payment-status — poll payment status
  app.get<{ Params: { id: string } }>('/:id/payment-status', {
    preHandler: [requireRole('TRADER_USER', 'REFINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;

      const purchase = await prisma.purchase.findUnique({
        where: { id: request.params.id },
        include: { payments: { orderBy: { created_at: 'desc' }, take: 1 } },
      });

      if (!purchase) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Purchase not found' });
      }
      if (purchase.trader_id !== user.id) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your purchase' });
      }

      const latestPayment = purchase.payments[0] ?? null;

      return reply.send({
        purchase_id: purchase.id,
        payment_status: purchase.payment_status ?? 'NONE',
        latest_payment: latestPayment
          ? {
              id: latestPayment.id,
              type: latestPayment.type,
              amount: Number(latestPayment.amount),
              currency: latestPayment.currency,
              status: latestPayment.status,
              payment_method: latestPayment.payment_method,
              created_at: latestPayment.created_at.toISOString(),
            }
          : null,
      });
    },
  });

  // POST /purchases — create a purchase (atomic transaction)
  app.post('/', {
    preHandler: [requireRole('TRADER_USER', 'REFINER_USER')],
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
      const { record_ids, notes, price_per_gram, payment_method } = parsed.data;
      const ycEnabled = featureFlags.yellowCardEnabled;

      // When YC enabled, require price_per_gram and payment_method
      if (ycEnabled) {
        if (!price_per_gram) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: 'price_per_gram is required when payments are enabled',
          });
        }
        if (!payment_method) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: 'payment_method is required when payments are enabled',
          });
        }
      }

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

      // Validate that trader/refiner has a sales partnership with each record's miner
      const minerIds = [...new Set(records.map((r) => r.created_by))];
      const partnerships = await prisma.salesPartner.findMany({
        where: { partner_id: user.id, miner_id: { in: minerIds } },
        select: { miner_id: true },
      });
      const partnerMinerIds = new Set(partnerships.map((sp) => sp.miner_id));
      const unauthorizedMiners = minerIds.filter((id) => !partnerMinerIds.has(id));
      if (unauthorizedMiners.length > 0) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have a sales partnership with one or more miners for these records',
        });
      }

      // Calculate total weight
      const totalWeight = records.reduce(
        (sum, r) => sum + (r.weight_grams ? Number(r.weight_grams) : 0),
        0,
      );

      // Calculate pricing when YC is enabled
      const totalPrice = ycEnabled && price_per_gram ? totalWeight * price_per_gram : undefined;

      if (!ycEnabled) {
        // ── Flag OFF: instant purchase (original behaviour) ──
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

          // Mark all records as PURCHASED immediately
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
      }

      // ── Flag ON: create purchase with PENDING payment ──
      const purchase = await prisma.$transaction(async (tx) => {
        // Calculate per-item pricing
        const itemsData = uniqueIds.map((recordId) => {
          const rec = records.find((r) => r.id === recordId)!;
          const wt = rec.weight_grams ? Number(rec.weight_grams) : 0;
          const lineTotal = price_per_gram! * wt;
          return {
            record_id: recordId,
            price_per_gram: price_per_gram!,
            line_total: lineTotal,
          };
        });

        const p = await tx.purchase.create({
          data: {
            trader_id: user.id,
            total_weight: totalWeight,
            total_items: uniqueIds.length,
            notes: notes || null,
            price_per_gram: price_per_gram!,
            total_price: totalPrice!,
            currency: 'ZMW',
            payment_status: 'PENDING',
            items: {
              create: itemsData,
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

        return p;
      });

      // Initiate Yellow Card collection (fire-and-forget, don't block response)
      try {
        const ycPayment = await createPayment({
          amount: totalPrice!,
          currency: 'ZMW',
          channelId: payment_method === 'MOBILE_MONEY' ? 'mobile_money_zm' : 'bank_transfer_zm',
          reason: `Gold purchase ${purchase.id}`,
          sender: { name: user.username, country: 'ZM' },
        });

        // Create local payment record
        await prisma.payment.create({
          data: {
            purchase_id: purchase.id,
            yellowcard_txn_id: ycPayment.id,
            type: 'COLLECTION',
            amount: totalPrice!,
            currency: 'ZMW',
            status: 'PENDING',
            payment_method: payment_method!,
            yellowcard_meta: ycPayment as object,
          },
        });
      } catch (err) {
        app.log.error(`Yellow Card payment initiation failed for purchase ${purchase.id}: ${err}`);
        // Purchase was created with PENDING — admin can retry or it can be updated via webhook
      }

      return reply.status(201).send(serializePurchase(purchase));
    },
  });
};
