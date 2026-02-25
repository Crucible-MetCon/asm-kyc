import type { User, MinerProfile } from '@asm-kyc/database';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User & { miner_profile: MinerProfile | null };
  }
}
