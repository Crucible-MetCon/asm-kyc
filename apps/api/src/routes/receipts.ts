import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const receiptRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // POST /records/:id/receipt — create a receipt for a record
  app.post<{ Params: { id: string } }>('/:id/receipt', {
    preHandler: [requireRole('TRADER_USER', 'REFINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const recordId = request.params.id;

      // Find the record
      const record = await prisma.record.findUnique({
        where: { id: recordId },
        include: { creator: true },
      });

      if (!record) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
      }

      if (record.status !== 'SUBMITTED') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Record must be in SUBMITTED status' });
      }

      // Verify sales partnership
      const partnership = await prisma.salesPartner.findFirst({
        where: { miner_id: record.created_by, partner_id: user.id },
      });

      if (!partnership) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'No sales partnership with this miner' });
      }

      const body = request.body as {
        receipt_weight?: number;
        scale_photo_data?: string;
        scale_photo_mime?: string;
        xrf_photo_data?: string;
        xrf_photo_mime?: string;
        gps_latitude?: number;
        gps_longitude?: number;
        country?: string;
        locality?: string;
        purities?: { element: string; purity: number }[];
      };

      // Create receipt and purities in a transaction
      const receipt = await prisma.$transaction(async (tx) => {
        const created = await tx.recordReceipt.create({
          data: {
            record_id: recordId,
            received_by: user.id,
            receipt_weight: body.receipt_weight,
            scale_photo_data: body.scale_photo_data || null,
            scale_photo_mime: body.scale_photo_mime || null,
            xrf_photo_data: body.xrf_photo_data || null,
            xrf_photo_mime: body.xrf_photo_mime || null,
            gps_latitude: body.gps_latitude,
            gps_longitude: body.gps_longitude,
            country: body.country || null,
            locality: body.locality || null,
          },
        });

        // Create metal purity entries if provided
        if (body.purities && body.purities.length > 0) {
          await tx.metalPurity.createMany({
            data: body.purities.slice(0, 5).map((p, i) => ({
              record_id: recordId,
              receipt_id: created.id,
              element: p.element.substring(0, 5),
              purity: Math.min(100, Math.max(0, p.purity)),
              sort_order: i,
            })),
          });
        }

        // Fetch with purities
        return tx.recordReceipt.findUnique({
          where: { id: created.id },
          include: {
            purities: { orderBy: { sort_order: 'asc' } },
            receiver: { include: { miner_profile: true } },
          },
        });
      });

      if (!receipt) {
        return reply.status(500).send({ statusCode: 500, error: 'Server Error', message: 'Failed to create receipt' });
      }

      return reply.status(201).send({
        id: receipt.id,
        record_id: receipt.record_id,
        received_by: receipt.received_by,
        receiver_name: receipt.receiver.miner_profile?.full_name ?? receipt.receiver.username,
        receipt_weight: receipt.receipt_weight ? Number(receipt.receipt_weight) : null,
        has_scale_photo: !!receipt.scale_photo_data,
        has_xrf_photo: !!receipt.xrf_photo_data,
        gps_latitude: receipt.gps_latitude ? Number(receipt.gps_latitude) : null,
        gps_longitude: receipt.gps_longitude ? Number(receipt.gps_longitude) : null,
        country: receipt.country,
        locality: receipt.locality,
        purities: receipt.purities.map((p) => ({
          id: p.id,
          element: p.element,
          purity: Number(p.purity),
          sort_order: p.sort_order,
        })),
        received_at: receipt.received_at.toISOString(),
      });
    },
  });
};
