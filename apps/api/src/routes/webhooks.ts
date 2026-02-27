import type { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'node:crypto';
import { prisma } from '@asm-kyc/database';

/**
 * Webhook routes — registered OUTSIDE authenticated scope.
 * Yellow Card webhooks deliver payment status updates.
 */
export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/webhooks/yellowcard
  app.post('/yellowcard', async (request, reply) => {
    // Verify HMAC signature
    const signature = request.headers['x-yc-signature'] as string | undefined;
    const webhookSecret = process.env.YELLOWCARD_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const rawBody = JSON.stringify(request.body);
      const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (signature !== expected) {
        return reply.status(401).send({ error: 'Invalid webhook signature' });
      }
    }

    const body = request.body as {
      event?: string;
      data?: {
        id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        fee?: number;
        feeCurrency?: string;
        [key: string]: unknown;
      };
    };

    if (!body.data?.id) {
      return reply.status(400).send({ error: 'Missing payment ID' });
    }

    const ycTxnId = body.data.id;
    const status = (body.data.status || '').toLowerCase();

    // Find the payment record by Yellow Card transaction ID
    const payment = await prisma.payment.findFirst({
      where: { yellowcard_txn_id: ycTxnId },
      include: { purchase: true },
    });

    if (!payment) {
      app.log.warn(`Webhook received for unknown payment: ${ycTxnId}`);
      return reply.status(200).send({ received: true });
    }

    // Map Yellow Card status to our status
    let ourStatus = payment.status;
    if (status === 'complete' || status === 'completed') {
      ourStatus = 'COMPLETE';
    } else if (status === 'failed' || status === 'expired' || status === 'cancelled') {
      ourStatus = 'FAILED';
    } else if (status === 'process' || status === 'processing') {
      ourStatus = 'PROCESS';
    } else if (status === 'pending') {
      ourStatus = 'PENDING';
    }

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: ourStatus,
        yellowcard_meta: body.data as object,
        webhook_received_at: new Date(),
        fee_amount: body.data.fee != null ? body.data.fee : payment.fee_amount,
        fee_currency: body.data.feeCurrency || payment.fee_currency,
      },
    });

    // Update purchase status based on payment outcome
    if (ourStatus === 'COMPLETE') {
      // Payment succeeded — mark purchase as COMPLETED and records as PURCHASED
      await prisma.$transaction(async (tx) => {
        await tx.purchase.update({
          where: { id: payment.purchase_id },
          data: { payment_status: 'COMPLETED' },
        });

        // Get all record IDs for this purchase
        const items = await tx.purchaseItem.findMany({
          where: { purchase_id: payment.purchase_id },
          select: { record_id: true },
        });

        await tx.record.updateMany({
          where: { id: { in: items.map((i) => i.record_id) } },
          data: {
            status: 'PURCHASED',
            purchased_by: payment.purchase.trader_id,
            purchased_at: new Date(),
          },
        });
      });
    } else if (ourStatus === 'FAILED') {
      // Payment failed — update purchase, records stay SUBMITTED
      await prisma.purchase.update({
        where: { id: payment.purchase_id },
        data: { payment_status: 'FAILED' },
      });
    }

    return reply.status(200).send({ received: true });
  });
};
