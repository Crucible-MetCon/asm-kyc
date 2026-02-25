import { PrismaClient } from '../generated/prisma/index.js';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function hash(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('Seeding database...');

  const adminHash = await hash('admin123');
  const minerHash = await hash('miner123');
  const traderHash = await hash('trader123');

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      phone_e164: '+260600000001',
      password_hash: adminHash,
      role: 'ADMIN_USER',
    },
  });

  await prisma.user.upsert({
    where: { username: 'miner1' },
    update: {},
    create: {
      username: 'miner1',
      phone_e164: '+260600000002',
      password_hash: minerHash,
      role: 'MINER_USER',
      miner_profile: {
        create: {
          full_name: 'Test Miner',
          counterparty_type: 'INDIVIDUAL_ASM',
          home_language: 'en',
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { username: 'trader1' },
    update: {},
    create: {
      username: 'trader1',
      phone_e164: '+260600000003',
      password_hash: traderHash,
      role: 'TRADER_USER',
    },
  });

  console.log('Seed complete:');
  console.log('  admin  / admin123  (ADMIN_USER)');
  console.log('  miner1 / miner123  (MINER_USER)');
  console.log('  trader1/ trader123  (TRADER_USER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
