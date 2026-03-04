import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { DOCUMENT_TYPES } from '@asm-kyc/shared';
import { getPresignedUrl } from '../../lib/r2Client.js';

export const adminDocumentRoutes: FastifyPluginAsync = async (app) => {
  // GET /admin/users/:id/documents — view user's documents
  app.get<{ Params: { id: string } }>('/:id/documents', async (request, reply) => {
    const { id } = request.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' });
    }

    const documents = await prisma.document.findMany({
      where: { user_id: id },
      orderBy: { uploaded_at: 'desc' },
    });

    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let fileUrl = doc.file_url;
        if (doc.file_path && !fileUrl) {
          fileUrl = await getPresignedUrl(doc.file_path);
        }
        return {
          id: doc.id,
          doc_type: doc.doc_type,
          file_url: fileUrl,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          ai_extracted: doc.ai_extracted as Record<string, unknown> | null,
          ai_confidence: doc.ai_confidence,
          uploaded_at: doc.uploaded_at.toISOString(),
        };
      }),
    );

    return reply.send({
      documents: docsWithUrls,
      slots: [...DOCUMENT_TYPES],
    });
  });
};
