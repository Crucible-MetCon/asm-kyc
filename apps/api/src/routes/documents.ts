import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { DOCUMENT_TYPES } from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import {
  uploadToR2,
  getPresignedUrl,
  deleteFromR2,
  base64ToBuffer,
  buildDocumentKey,
} from '../lib/r2Client.js';
import { extractDocumentFields } from '../lib/visionService.js';

function serializeDocument(doc: {
  id: string;
  doc_type: string;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  ai_extracted: unknown;
  ai_confidence: string | null;
  uploaded_at: Date;
}) {
  return {
    id: doc.id,
    doc_type: doc.doc_type,
    file_url: doc.file_url,
    file_size: doc.file_size,
    mime_type: doc.mime_type,
    ai_extracted: doc.ai_extracted as Record<string, unknown> | null,
    ai_confidence: doc.ai_confidence,
    uploaded_at: doc.uploaded_at.toISOString(),
  };
}

export const documentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // GET /documents — list all document slots + uploaded docs
  app.get('/', async (request, reply) => {
    const user = request.user!;
    const documents = await prisma.document.findMany({
      where: { user_id: user.id },
      orderBy: { uploaded_at: 'desc' },
    });

    // Generate presigned URLs for documents with R2 paths
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let fileUrl = doc.file_url;
        if (doc.file_path && !fileUrl) {
          fileUrl = await getPresignedUrl(doc.file_path);
        }
        return serializeDocument({ ...doc, file_url: fileUrl });
      }),
    );

    return reply.send({
      documents: docsWithUrls,
      slots: [...DOCUMENT_TYPES],
    });
  });

  // GET /documents/:docType — get specific document
  app.get<{ Params: { docType: string } }>('/:docType', async (request, reply) => {
    const user = request.user!;
    const { docType } = request.params;

    if (!DOCUMENT_TYPES.includes(docType as typeof DOCUMENT_TYPES[number])) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Invalid doc_type. Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      });
    }

    const doc = await prisma.document.findUnique({
      where: { user_id_doc_type: { user_id: user.id, doc_type: docType } },
    });

    if (!doc) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found',
      });
    }

    let fileUrl = doc.file_url;
    if (doc.file_path && !fileUrl) {
      fileUrl = await getPresignedUrl(doc.file_path);
    }

    return reply.send(serializeDocument({ ...doc, file_url: fileUrl }));
  });

  // POST /documents/:docType — upload/replace document
  app.post<{ Params: { docType: string } }>('/:docType', async (request, reply) => {
    const user = request.user!;
    const { docType } = request.params;
    const body = request.body as { image_data: string };

    if (!DOCUMENT_TYPES.includes(docType as typeof DOCUMENT_TYPES[number])) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Invalid doc_type. Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      });
    }

    if (!body.image_data) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'image_data is required (base64)',
      });
    }

    // Parse the image
    const { buffer, mimeType } = base64ToBuffer(body.image_data);
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const r2Key = buildDocumentKey(user.id, docType, ext);

    // Upload to R2
    const uploadedKey = await uploadToR2(r2Key, buffer, mimeType);
    const filePath = uploadedKey || r2Key;

    // Run AI extraction
    const extraction = await extractDocumentFields(body.image_data, mimeType, docType);

    // Get presigned URL for response
    const fileUrl = await getPresignedUrl(filePath);

    // Upsert document record
    const doc = await prisma.document.upsert({
      where: { user_id_doc_type: { user_id: user.id, doc_type: docType } },
      create: {
        user_id: user.id,
        doc_type: docType,
        file_path: filePath,
        file_url: fileUrl,
        file_size: buffer.length,
        mime_type: mimeType,
        ai_extracted: extraction.fields,
        ai_confidence: extraction.confidence,
        ai_raw_response: extraction.raw_description,
      },
      update: {
        file_path: filePath,
        file_url: fileUrl,
        file_size: buffer.length,
        mime_type: mimeType,
        ai_extracted: extraction.fields,
        ai_confidence: extraction.confidence,
        ai_raw_response: extraction.raw_description,
        uploaded_at: new Date(),
      },
    });

    return reply.status(201).send({
      document: serializeDocument({ ...doc, file_url: fileUrl }),
      extraction: {
        fields: extraction.fields,
        confidence: extraction.confidence,
        raw_description: extraction.raw_description,
      },
    });
  });

  // DELETE /documents/:docType — remove document
  app.delete<{ Params: { docType: string } }>('/:docType', async (request, reply) => {
    const user = request.user!;
    const { docType } = request.params;

    const doc = await prisma.document.findUnique({
      where: { user_id_doc_type: { user_id: user.id, doc_type: docType } },
    });

    if (!doc) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Document not found',
      });
    }

    // Delete from R2
    if (doc.file_path) {
      await deleteFromR2(doc.file_path);
    }

    // Delete from DB
    await prisma.document.delete({
      where: { id: doc.id },
    });

    return reply.send({ ok: true });
  });
};
