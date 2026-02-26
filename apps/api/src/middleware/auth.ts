import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@asm-kyc/database';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies.session_id;

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
    reply.clearCookie('session_id', { path: '/' });
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Session expired',
    });
  }

  if (session.user.is_disabled) {
    reply.clearCookie('session_id', { path: '/' });
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Account disabled',
    });
  }

  request.user = session.user;
}
