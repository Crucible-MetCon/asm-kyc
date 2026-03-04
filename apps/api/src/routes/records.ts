import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import {
  RecordCreateSchema,
  RecordUpdateSchema,
  RecordSubmitSchema,
  MinerRecordSubmitSchema,
  RecordPhotoUploadSchema,
} from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  serializeRecord,
  serializeRecordListItem,
  serializeRecordPhoto,
  serializeAvailableRecord,
} from '../lib/serialize.js';
import { estimateFromPhotos } from '../lib/visionService.js';
import {
  uploadToR2,
  base64ToBuffer,
  buildRecordPhotoKey,
} from '../lib/r2Client.js';

// Include relations needed for full record serialization
const RECORD_FULL_INCLUDE = {
  photos: true,
  mine_site: true,
  intended_buyer: { include: { miner_profile: true } },
  metal_purities: { orderBy: { sort_order: 'asc' as const } },
  receipts: {
    include: {
      receiver: { include: { miner_profile: true } },
      purities: { orderBy: { sort_order: 'asc' as const } },
    },
    orderBy: { created_at: 'desc' as const },
  },
};

/**
 * Generate the next record number in format GT-YYYY-NNNNN.
 * Uses a counter table for atomicity.
 */
async function generateRecordNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await prisma.recordCounter.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', value: 1 },
    update: { value: { increment: 1 } },
  });
  const padded = String(counter.value).padStart(5, '0');
  return `GT-${year}-${padded}`;
}

export const recordRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // POST /records — create a new draft (all non-admin roles)
  app.post('/', {
    preHandler: [requireRole('MINER_USER', 'TRADER_USER', 'AGGREGATOR_USER', 'REFINER_USER', 'MELTER_USER')],
    handler: async (request, reply) => {
      const parsed = RecordCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: parsed.error.issues,
        });
      }

      const user = request.user!;
      const data = parsed.data;
      const body = request.body as Record<string, unknown>;

      // Generate record number
      const recordNumber = await generateRecordNumber();

      const record = await prisma.record.create({
        data: {
          created_by: user.id,
          record_number: recordNumber,
          status: 'DRAFT',
          weight_grams: data.weight_grams,
          estimated_purity: data.estimated_purity,
          origin_mine_site: data.origin_mine_site || null,
          extraction_date: data.extraction_date ? new Date(data.extraction_date) : null,
          gold_type: data.gold_type ?? null,
          notes: data.notes || null,
          // Phase 6: enhanced fields
          scale_photo_data: typeof body.scale_photo_data === 'string' ? body.scale_photo_data : null,
          scale_photo_mime: typeof body.scale_photo_mime === 'string' ? body.scale_photo_mime : null,
          xrf_photo_data: typeof body.xrf_photo_data === 'string' ? body.xrf_photo_data : null,
          xrf_photo_mime: typeof body.xrf_photo_mime === 'string' ? body.xrf_photo_mime : null,
          gps_latitude: typeof body.gps_latitude === 'number' ? body.gps_latitude : null,
          gps_longitude: typeof body.gps_longitude === 'number' ? body.gps_longitude : null,
          country: typeof body.country === 'string' ? body.country : null,
          locality: typeof body.locality === 'string' ? body.locality : null,
          mine_site_id: typeof body.mine_site_id === 'string' ? body.mine_site_id : null,
          buyer_id: typeof body.buyer_id === 'string' ? body.buyer_id : null,
        },
        include: RECORD_FULL_INCLUDE,
      });

      // Create metal purities if provided
      if (Array.isArray(body.metal_purities) && body.metal_purities.length > 0) {
        const purities = (body.metal_purities as Array<{ element: string; purity: number }>).slice(0, 5);
        await prisma.metalPurity.createMany({
          data: purities.map((p, i) => ({
            record_id: record.id,
            element: String(p.element).substring(0, 5),
            purity: Math.min(100, Math.max(0, Number(p.purity))),
            sort_order: i,
          })),
        });

        // Re-fetch with purities
        const full = await prisma.record.findUnique({
          where: { id: record.id },
          include: RECORD_FULL_INCLUDE,
        });
        return reply.status(201).send(serializeRecord(full!));
      }

      return reply.status(201).send(serializeRecord(record));
    },
  });

  // GET /records/available — list SUBMITTED records for traders/refiners
  // Only shows records from miners who have this trader/refiner as a sales partner
  app.get('/available', {
    preHandler: [requireRole('TRADER_USER', 'REFINER_USER', 'AGGREGATOR_USER', 'MELTER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;

      // Find miners who have selected this trader/refiner as a sales partner
      const partnerships = await prisma.salesPartner.findMany({
        where: { partner_id: user.id },
        select: { miner_id: true },
      });
      const partnerMinerIds = partnerships.map((sp) => sp.miner_id);

      // If no miners have selected this trader, return empty
      if (partnerMinerIds.length === 0) {
        return reply.send({ records: [], total: 0 });
      }

      const where = {
        status: 'SUBMITTED' as const,
        created_by: { in: partnerMinerIds },
      };

      const [records, total] = await Promise.all([
        prisma.record.findMany({
          where,
          include: {
            creator: { include: { miner_profile: true } },
            _count: { select: { photos: true } },
          },
          orderBy: { updated_at: 'desc' },
        }),
        prisma.record.count({ where }),
      ]);

      return reply.send({
        records: records.map(serializeAvailableRecord),
        total,
      });
    },
  });

  // GET /records — list my records
  app.get('/', async (request, reply) => {
    const user = request.user!;

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where: { created_by: user.id },
        include: { _count: { select: { photos: true } } },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.record.count({ where: { created_by: user.id } }),
    ]);

    return reply.send({
      records: records.map(serializeRecordListItem),
      total,
    });
  });

  // GET /records/:id — single record detail
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user!;
    const record = await prisma.record.findUnique({
      where: { id: request.params.id },
      include: RECORD_FULL_INCLUDE,
    });

    if (!record) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
    }
    // Allow access: record owner OR trader who purchased it OR intended buyer
    if (record.created_by !== user.id && record.purchased_by !== user.id && record.buyer_id !== user.id) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
    }

    // Load purchaser info for miner-side transparency
    let purchasedByUser = null;
    if (record.purchased_by) {
      purchasedByUser = await prisma.user.findUnique({
        where: { id: record.purchased_by },
        include: { miner_profile: true },
      });
    }

    return reply.send(serializeRecord({ ...record, purchased_by_user: purchasedByUser }));
  });

  // PATCH /records/:id — update a draft
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user!;
    const existing = await prisma.record.findUnique({ where: { id: request.params.id } });

    if (!existing) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
    }
    if (existing.created_by !== user.id) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
    }
    if (existing.status !== 'DRAFT') {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot edit a submitted record' });
    }

    const parsed = RecordUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const data = parsed.data;
    const body = request.body as Record<string, unknown>;

    const record = await prisma.record.update({
      where: { id: request.params.id },
      data: {
        weight_grams: data.weight_grams,
        estimated_purity: data.estimated_purity,
        origin_mine_site: data.origin_mine_site || null,
        extraction_date: data.extraction_date ? new Date(data.extraction_date) : null,
        gold_type: data.gold_type ?? null,
        notes: data.notes || null,
        // Phase 6: enhanced fields (only update if provided)
        ...(body.scale_photo_data !== undefined && { scale_photo_data: body.scale_photo_data as string | null }),
        ...(body.scale_photo_mime !== undefined && { scale_photo_mime: body.scale_photo_mime as string | null }),
        ...(body.xrf_photo_data !== undefined && { xrf_photo_data: body.xrf_photo_data as string | null }),
        ...(body.xrf_photo_mime !== undefined && { xrf_photo_mime: body.xrf_photo_mime as string | null }),
        ...(body.gps_latitude !== undefined && { gps_latitude: body.gps_latitude as number | null }),
        ...(body.gps_longitude !== undefined && { gps_longitude: body.gps_longitude as number | null }),
        ...(body.country !== undefined && { country: body.country as string | null }),
        ...(body.locality !== undefined && { locality: body.locality as string | null }),
        ...(body.mine_site_id !== undefined && { mine_site_id: body.mine_site_id as string | null }),
        ...(body.buyer_id !== undefined && { buyer_id: body.buyer_id as string | null }),
      },
      include: RECORD_FULL_INCLUDE,
    });

    // Update metal purities if provided
    if (Array.isArray(body.metal_purities)) {
      // Delete existing and recreate
      await prisma.metalPurity.deleteMany({
        where: { record_id: record.id, receipt_id: null },
      });
      const purities = (body.metal_purities as Array<{ element: string; purity: number }>).slice(0, 5);
      if (purities.length > 0) {
        await prisma.metalPurity.createMany({
          data: purities.map((p, i) => ({
            record_id: record.id,
            element: String(p.element).substring(0, 5),
            purity: Math.min(100, Math.max(0, Number(p.purity))),
            sort_order: i,
          })),
        });
      }

      // Re-fetch
      const full = await prisma.record.findUnique({
        where: { id: record.id },
        include: RECORD_FULL_INCLUDE,
      });
      return reply.send(serializeRecord(full!));
    }

    return reply.send(serializeRecord(record));
  });

  // POST /records/:id/submit — submit a draft
  app.post<{ Params: { id: string } }>('/:id/submit', async (request, reply) => {
    const user = request.user!;
    const existing = await prisma.record.findUnique({ where: { id: request.params.id } });

    if (!existing) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
    }
    if (existing.created_by !== user.id) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
    }
    if (existing.status !== 'DRAFT') {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Record already submitted' });
    }

    // Validate that all required fields are present
    // For miners: AI estimates fill weight/purity, so use relaxed schema
    const isMiner = user.role === 'MINER_USER';

    if (isMiner) {
      // Miners need gold_type, origin, and date — weight/purity come from AI or manual
      const minerSubmitData = {
        gold_type: existing.gold_type ?? undefined,
        origin_mine_site: existing.origin_mine_site ?? undefined,
        extraction_date: existing.extraction_date?.toISOString() ?? undefined,
      };
      const minerCheck = MinerRecordSubmitSchema.safeParse(minerSubmitData);
      if (!minerCheck.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Incomplete Record',
          message: minerCheck.error.issues,
        });
      }
      // Miners must have either manual or AI weight
      const hasWeight = existing.weight_grams || existing.ai_estimated_weight;
      if (!hasWeight) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Incomplete Record',
          message: 'Weight is required — take photos for AI estimation or enter manually',
        });
      }
    } else {
      const submitData = {
        weight_grams: existing.weight_grams ? Number(existing.weight_grams) : undefined,
        estimated_purity: existing.estimated_purity ? Number(existing.estimated_purity) : undefined,
        origin_mine_site: existing.origin_mine_site ?? undefined,
        extraction_date: existing.extraction_date?.toISOString() ?? undefined,
        gold_type: existing.gold_type ?? undefined,
      };
      const submitCheck = RecordSubmitSchema.safeParse(submitData);
      if (!submitCheck.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Incomplete Record',
          message: submitCheck.error.issues,
        });
      }
    }

    const record = await prisma.record.update({
      where: { id: request.params.id },
      data: { status: 'SUBMITTED' },
      include: RECORD_FULL_INCLUDE,
    });

    return reply.send(serializeRecord(record));
  });

  // POST /records/:id/estimate — run AI estimation from 2 photos (miner only)
  app.post<{ Params: { id: string } }>('/:id/estimate', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const body = request.body as {
        top_photo: string;
        side_photo: string;
        gold_type: string;
      };

      if (!body.top_photo || !body.side_photo) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: 'top_photo and side_photo are required (base64)',
        });
      }

      const existing = await prisma.record.findUnique({ where: { id: request.params.id } });
      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
      }
      if (existing.created_by !== user.id) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
      }
      if (existing.status !== 'DRAFT') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot estimate on submitted record' });
      }

      // Upload photos to R2 if configured
      const topParsed = base64ToBuffer(body.top_photo);
      const sideParsed = base64ToBuffer(body.side_photo);
      const topKey = buildRecordPhotoKey(user.id, existing.id, 'top.jpg');
      const sideKey = buildRecordPhotoKey(user.id, existing.id, 'side.jpg');

      const topUrl = await uploadToR2(topKey, topParsed.buffer, topParsed.mimeType);
      const sideUrl = await uploadToR2(sideKey, sideParsed.buffer, sideParsed.mimeType);

      // Run AI estimation
      const estimation = await estimateFromPhotos(
        body.top_photo,
        body.side_photo,
        body.gold_type || 'RAW_GOLD',
      );

      // Update record with estimation results + photo keys
      const record = await prisma.record.update({
        where: { id: existing.id },
        data: {
          top_photo_url: topUrl,
          side_photo_url: sideUrl,
          ai_estimated_weight: estimation.estimated_weight,
          ai_estimated_purity: estimation.estimated_purity,
          ai_weight_confidence: estimation.weight_confidence,
          ai_purity_confidence: estimation.purity_confidence,
          ai_estimation_raw: estimation.raw_description,
          // Pre-fill GPS from EXIF if available and not already set
          ...(estimation.gps_latitude && !existing.gps_latitude
            ? { gps_latitude: estimation.gps_latitude }
            : {}),
          ...(estimation.gps_longitude && !existing.gps_longitude
            ? { gps_longitude: estimation.gps_longitude }
            : {}),
          // If no manual weight/purity, use AI estimates
          ...(!existing.weight_grams && estimation.estimated_weight
            ? { weight_grams: estimation.estimated_weight }
            : {}),
          ...(!existing.estimated_purity && estimation.estimated_purity
            ? { estimated_purity: estimation.estimated_purity }
            : {}),
        },
        include: RECORD_FULL_INCLUDE,
      });

      return reply.send({
        record: serializeRecord(record),
        estimation: {
          estimated_weight: estimation.estimated_weight,
          estimated_purity: estimation.estimated_purity,
          weight_confidence: estimation.weight_confidence,
          purity_confidence: estimation.purity_confidence,
          reference_object: estimation.reference_object,
          gps_latitude: estimation.gps_latitude,
          gps_longitude: estimation.gps_longitude,
          raw_description: estimation.raw_description,
        },
      });
    },
  });

  // POST /records/:id/photos — upload a photo
  app.post<{ Params: { id: string } }>('/:id/photos', async (request, reply) => {
    const user = request.user!;
    const existing = await prisma.record.findUnique({
      where: { id: request.params.id },
      include: { _count: { select: { photos: true } } },
    });

    if (!existing) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
    }
    if (existing.created_by !== user.id) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
    }
    if (existing.status !== 'DRAFT') {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot add photos to a submitted record' });
    }
    if (existing._count.photos >= 5) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Maximum 5 photos per record' });
    }

    const parsed = RecordPhotoUploadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const dataUri = parsed.data.photo_data;
    const mimeMatch = dataUri.match(/^data:(image\/[a-z+]+);/);
    const mime_type = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const photo = await prisma.recordPhoto.create({
      data: {
        record_id: request.params.id,
        photo_data: dataUri,
        mime_type,
      },
    });

    return reply.status(201).send(serializeRecordPhoto(photo));
  });

  // DELETE /records/:id/photos/:photoId — remove a photo
  app.delete<{ Params: { id: string; photoId: string } }>(
    '/:id/photos/:photoId',
    async (request, reply) => {
      const user = request.user!;
      const existing = await prisma.record.findUnique({ where: { id: request.params.id } });

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
      }
      if (existing.created_by !== user.id) {
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
      }
      if (existing.status !== 'DRAFT') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Cannot remove photos from a submitted record' });
      }

      const photo = await prisma.recordPhoto.findUnique({
        where: { id: request.params.photoId },
      });

      if (!photo || photo.record_id !== request.params.id) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Photo not found' });
      }

      await prisma.recordPhoto.delete({ where: { id: request.params.photoId } });

      return reply.send({ ok: true });
    },
  );
};
