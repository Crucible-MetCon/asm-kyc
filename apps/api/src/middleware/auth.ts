import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@asm-kyc/database';
import { getCookieName } from '../routes/auth.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const cookieName = getCookieName(request);
  const sessionId = request.cookies[cookieName];

  if (!sessionId) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'No session',
    });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { miner_profile: true } } },
  });

  if (!session || session.expires_at < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
    reply.clearCookie(cookieName, { path: '/' });
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Session expired',
    });
  }

  if (session.user.is_disabled) {
    reply.clearCookie(cookieName, { path: '/' });
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Account disabled',
    });
  }

  request.user = session.user;
}
