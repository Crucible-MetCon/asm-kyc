import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { extractWeight, extractXrfPurities } from '../lib/visionService.js';

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
};
