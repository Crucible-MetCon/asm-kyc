import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { ProfileUpdateSchema, ConsentAcceptSchema, LanguageUpdateSchema } from '@asm-kyc/shared';
import { authenticate } from '../middleware/auth.js';
import { serializeProfile } from '../lib/serialize.js';
import { triggerKycBonus } from '../lib/kycBonus.js';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // PUT /me/profile — update profile fields
  app.put('/me/profile', async (request, reply) => {
    const parsed = ProfileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const user = request.user!;
    const data = parsed.data;

    const profile = await prisma.minerProfile.update({
      where: { user_id: user.id },
      data: {
        full_name: data.full_name,
        nrc_number: data.nrc_number,
        date_of_birth: new Date(data.date_of_birth),
        gender: data.gender,
        mine_site_name: data.mine_site_name,
        mine_site_location: data.mine_site_location,
        mining_license_number: data.mining_license_number || null,
        profile_completed_at: new Date(),
      },
    });

    // Trigger KYC bonus after profile completion (no-op when Yellow Card disabled)
    triggerKycBonus(user.id).catch(() => {});

    return reply.send({ ok: true, profile: serializeProfile(profile) });
  });

  // POST /me/consent — accept consent version
  app.post('/me/consent', async (request, reply) => {
    const parsed = ConsentAcceptSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const user = request.user!;

    const version = await prisma.consentVersion.findUnique({
      where: { version: parsed.data.consent_version },
    });
    if (!version) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Consent version not found',
      });
    }

    const profile = await prisma.minerProfile.update({
      where: { user_id: user.id },
      data: {
        consent_version: parsed.data.consent_version,
        consented_at: new Date(),
      },
    });

    return reply.send({ ok: true, profile: serializeProfile(profile) });
  });

  // PUT /me/language — update language preference
  app.put('/me/language', async (request, reply) => {
    const parsed = LanguageUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const user = request.user!;
    const profile = await prisma.minerProfile.update({
      where: { user_id: user.id },
      data: { home_language: parsed.data.home_language },
    });

    return reply.send({ ok: true, profile: serializeProfile(profile) });
  });

  // GET /consent/latest — get latest consent text in user's language
  app.get('/consent/latest', async (request, reply) => {
    const user = request.user!;
    const lang = user.miner_profile?.home_language || 'en';

    const latest = await prisma.consentVersion.findFirst({
      orderBy: { published_at: 'desc' },
    });

    if (!latest) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'No consent version found',
      });
    }

    return reply.send({
      version: latest.version,
      text: lang === 'bem' ? latest.text_bem : latest.text_en,
    });
  });
};
