import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { RegisterInputSchema, LoginInputSchema } from '@asm-kyc/shared';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { serializeProfile } from '../lib/serialize.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DURATION_MS / 1000,
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const parsed = RegisterInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const { username, phone_e164, password, full_name, counterparty_type, home_language } =
      parsed.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { phone_e164 }] },
    });
    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message:
          existing.username === username
            ? 'Username already taken'
            : 'Phone number already registered',
      });
    }

    const password_hash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        phone_e164,
        password_hash,
        role: 'MINER_USER',
        miner_profile: {
          create: {
            full_name,
            counterparty_type,
            home_language,
          },
        },
      },
      include: { miner_profile: true },
    });

    const session = await prisma.session.create({
      data: {
        user_id: user.id,
        expires_at: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    reply.setCookie('session_id', session.id, COOKIE_OPTIONS);

    return reply.status(201).send({
      id: user.id,
      username: user.username,
      role: user.role,
      profile: serializeProfile(user.miner_profile),
    });
  });

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const parsed = LoginInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: parsed.error.issues,
      });
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username },
      include: { miner_profile: true },
    });

    if (!user || !user.password_hash) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    const session = await prisma.session.create({
      data: {
        user_id: user.id,
        expires_at: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });

    reply.setCookie('session_id', session.id, COOKIE_OPTIONS);

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      profile: serializeProfile(user.miner_profile),
    };
  });

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    const sessionId = request.cookies.session_id;
    if (sessionId) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
    reply.clearCookie('session_id', { path: '/' });
    return { ok: true };
  });
};
