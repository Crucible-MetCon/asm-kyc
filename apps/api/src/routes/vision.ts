import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { extractWeight, extractXrfPurities, estimateFromPhotos, extractDocumentFields } from '../lib/visionService.js';

export const visionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // POST /vision/extract-weight — extract weight from scale photo
  app.post('/extract-weight', async (request, reply) => {
    const body = request.body as { image_data: string; mime_type?: string };

    if (!body.image_data) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'image_data is required (base64)',
      });
    }

    const mimeType = body.mime_type || 'image/jpeg';
    const result = await extractWeight(body.image_data, mimeType);

    return reply.send(result);
  });

  // POST /vision/extract-xrf — extract metal purities from XRF gun photo
  app.post('/extract-xrf', async (request, reply) => {
    const body = request.body as { image_data: string; mime_type?: string };

    if (!body.image_data) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'image_data is required (base64)',
      });
    }

    const mimeType = body.mime_type || 'image/jpeg';
    const result = await extractXrfPurities(body.image_data, mimeType);

    return reply.send(result);
  });

  // POST /vision/estimate-gold — estimate weight/purity from 2 photos
  app.post('/estimate-gold', async (request, reply) => {
    const body = request.body as {
      top_photo: string;
      side_photo: string;
      gold_type?: string;
    };

    if (!body.top_photo || !body.side_photo) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'top_photo and side_photo are required (base64)',
      });
    }

    const result = await estimateFromPhotos(
      body.top_photo,
      body.side_photo,
      body.gold_type || 'RAW_GOLD',
    );

    return reply.send(result);
  });

  // POST /vision/extract-document — extract fields from a document photo
  app.post('/extract-document', async (request, reply) => {
    const body = request.body as {
      image_data: string;
      mime_type?: string;
      doc_type: string;
    };

    if (!body.image_data || !body.doc_type) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'image_data and doc_type are required',
      });
    }

    const mimeType = body.mime_type || 'image/jpeg';
    const result = await extractDocumentFields(body.image_data, mimeType, body.doc_type);

    return reply.send(result);
  });
};
