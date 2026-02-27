import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const mineSiteRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // GET /mine-sites — list miner's sites
  app.get('/', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const sites = await prisma.mineSite.findMany({
        where: { miner_id: user.id },
        orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
      });

      return reply.send({
        sites: sites.map((s) => ({
          id: s.id,
          name: s.name,
          gps_latitude: s.gps_latitude ? Number(s.gps_latitude) : null,
          gps_longitude: s.gps_longitude ? Number(s.gps_longitude) : null,
          mining_license_number: s.mining_license_number,
          is_default: s.is_default,
          created_at: s.created_at.toISOString(),
        })),
        total: sites.length,
      });
    },
  });

  // POST /mine-sites — create new site
  app.post('/', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const body = request.body as {
        name: string;
        gps_latitude?: number;
        gps_longitude?: number;
        mining_license_number?: string;
        is_default?: boolean;
      };

      if (!body.name || body.name.trim().length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: 'Site name is required',
        });
      }

      // If this is the first site or marked as default, unset other defaults
      const existingCount = await prisma.mineSite.count({ where: { miner_id: user.id } });
      const shouldBeDefault = body.is_default || existingCount === 0;

      if (shouldBeDefault) {
        await prisma.mineSite.updateMany({
          where: { miner_id: user.id, is_default: true },
          data: { is_default: false },
        });
      }

      const site = await prisma.mineSite.create({
        data: {
          miner_id: user.id,
          name: body.name.trim(),
          gps_latitude: body.gps_latitude,
          gps_longitude: body.gps_longitude,
          mining_license_number: body.mining_license_number || null,
          is_default: shouldBeDefault,
        },
      });

      return reply.status(201).send({
        id: site.id,
        name: site.name,
        gps_latitude: site.gps_latitude ? Number(site.gps_latitude) : null,
        gps_longitude: site.gps_longitude ? Number(site.gps_longitude) : null,
        mining_license_number: site.mining_license_number,
        is_default: site.is_default,
        created_at: site.created_at.toISOString(),
      });
    },
  });

  // PATCH /mine-sites/:id — update site
  app.patch<{ Params: { id: string } }>('/:id', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const existing = await prisma.mineSite.findUnique({ where: { id: request.params.id } });

      if (!existing || existing.miner_id !== user.id) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Mine site not found' });
      }

      const body = request.body as {
        name?: string;
        gps_latitude?: number;
        gps_longitude?: number;
        mining_license_number?: string;
      };

      const site = await prisma.mineSite.update({
        where: { id: request.params.id },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.gps_latitude !== undefined && { gps_latitude: body.gps_latitude }),
          ...(body.gps_longitude !== undefined && { gps_longitude: body.gps_longitude }),
          ...(body.mining_license_number !== undefined && { mining_license_number: body.mining_license_number || null }),
        },
      });

      return reply.send({
        id: site.id,
        name: site.name,
        gps_latitude: site.gps_latitude ? Number(site.gps_latitude) : null,
        gps_longitude: site.gps_longitude ? Number(site.gps_longitude) : null,
        mining_license_number: site.mining_license_number,
        is_default: site.is_default,
        created_at: site.created_at.toISOString(),
      });
    },
  });

  // DELETE /mine-sites/:id — delete site (only if no records linked)
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const existing = await prisma.mineSite.findUnique({
        where: { id: request.params.id },
        include: { _count: { select: { records: true } } },
      });

      if (!existing || existing.miner_id !== user.id) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Mine site not found' });
      }

      if (existing._count.records > 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot delete a mine site with linked records',
        });
      }

      await prisma.mineSite.delete({ where: { id: request.params.id } });

      // If deleted site was default, set another as default
      if (existing.is_default) {
        const nextSite = await prisma.mineSite.findFirst({
          where: { miner_id: user.id },
          orderBy: { created_at: 'desc' },
        });
        if (nextSite) {
          await prisma.mineSite.update({
            where: { id: nextSite.id },
            data: { is_default: true },
          });
        }
      }

      return reply.send({ ok: true });
    },
  });

  // PATCH /mine-sites/:id/default — set as default site
  app.patch<{ Params: { id: string } }>('/:id/default', {
    preHandler: [requireRole('MINER_USER')],
    handler: async (request, reply) => {
      const user = request.user!;
      const existing = await prisma.mineSite.findUnique({ where: { id: request.params.id } });

      if (!existing || existing.miner_id !== user.id) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Mine site not found' });
      }

      // Unset all defaults, then set this one
      await prisma.mineSite.updateMany({
        where: { miner_id: user.id, is_default: true },
        data: { is_default: false },
      });

      const site = await prisma.mineSite.update({
        where: { id: request.params.id },
        data: { is_default: true },
      });

      return reply.send({
        id: site.id,
        name: site.name,
        gps_latitude: site.gps_latitude ? Number(site.gps_latitude) : null,
        gps_longitude: site.gps_longitude ? Number(site.gps_longitude) : null,
        mining_license_number: site.mining_license_number,
        is_default: site.is_default,
        created_at: site.created_at.toISOString(),
      });
    },
  });
};
