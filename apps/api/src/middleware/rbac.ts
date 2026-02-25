import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Role } from '@asm-kyc/database';

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Not authenticated',
      });
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}
