import type { FastifyPluginAsync } from 'fastify';
import { buildTraceabilityPreview, generateTraceabilityPdf } from '../../lib/traceabilityReport.js';
import { uploadToR2, buildTraceabilityReportKey, getPresignedUrl } from '../../lib/r2Client.js';

export const adminTraceabilityRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/records/:id/traceability — JSON preview
  app.get('/:id/traceability', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const preview = await buildTraceabilityPreview(id);
      return reply.send(preview);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(404).send({ message });
    }
  });

  // POST /api/admin/records/:id/traceability/pdf — generate PDF
  app.post('/:id/traceability/pdf', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const { buffer, docCode } = await generateTraceabilityPdf(id);

      // Try to upload to R2
      const r2Key = buildTraceabilityReportKey(id, docCode);
      const uploaded = await uploadToR2(r2Key, buffer, 'application/pdf');

      if (uploaded) {
        const url = await getPresignedUrl(r2Key, 3600);
        return reply.send({ url, doc_code: docCode });
      }

      // Fallback: stream PDF directly
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="${docCode}.pdf"`)
        .send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(404).send({ message });
    }
  });
};
