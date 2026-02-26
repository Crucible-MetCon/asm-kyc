import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import {
  RecordCreateSchema,
  RecordUpdateSchema,
  RecordSubmitSchema,
  RecordPhotoUploadSchema,
} from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  serializeRecord,
  serializeRecordListItem,
  serializeRecordPhoto,
} from '../lib/serialize.js';

export const recordRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // POST /records — create a new draft
  app.post('/', {
    preHandler: [requireRole('MINER_USER')],
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

      const record = await prisma.record.create({
        data: {
          created_by: user.id,
          status: 'DRAFT',
          weight_grams: data.weight_grams,
          estimated_purity: data.estimated_purity,
          origin_mine_site: data.origin_mine_site || null,
          extraction_date: data.extraction_date ? new Date(data.extraction_date) : null,
          gold_type: data.gold_type ?? null,
          notes: data.notes || null,
        },
        include: { photos: true },
      });

      return reply.status(201).send(serializeRecord(record));
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
      include: { photos: true },
    });

    if (!record) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Record not found' });
    }
    if (record.created_by !== user.id) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not your record' });
    }

    return reply.send(serializeRecord(record));
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
    const record = await prisma.record.update({
      where: { id: request.params.id },
      data: {
        weight_grams: data.weight_grams,
        estimated_purity: data.estimated_purity,
        origin_mine_site: data.origin_mine_site || null,
        extraction_date: data.extraction_date ? new Date(data.extraction_date) : null,
        gold_type: data.gold_type ?? null,
        notes: data.notes || null,
      },
      include: { photos: true },
    });

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

    const record = await prisma.record.update({
      where: { id: request.params.id },
      data: { status: 'SUBMITTED' },
      include: { photos: true },
    });

    return reply.send(serializeRecord(record));
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
