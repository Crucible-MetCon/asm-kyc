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

  // Consent version v1.0
  await prisma.consentVersion.upsert({
    where: { version: 'v1.0' },
    update: {},
    create: {
      version: 'v1.0',
      text_en: `CONSENT FOR DATA COLLECTION AND PROCESSING — ASM Gold Trace

By accepting these terms, I acknowledge and consent to the following:

1. IDENTITY VERIFICATION: I consent to the collection and verification of my personal information, including my name, National Registration Card (NRC) number, date of birth, and contact details, for the purposes of due diligence as required under the LBMA Responsible Gold Guidance and the OECD Due Diligence Guidance for Responsible Supply Chains.

2. SOURCE TRACING: I consent to the recording and tracking of gold source information, including mine site location, production quantities, and related details, to ensure responsible sourcing and compliance with applicable regulations.

3. DATA SHARING: I understand that my information may be shared with compliance officers, auditors, and regulatory authorities as required for due diligence purposes. My data will only be shared with authorised parties and in accordance with Zambian data protection laws.

4. DATA RETENTION: My personal data and transaction records will be retained for a minimum of five (5) years as required by LBMA and OECD guidelines, after which they may be securely deleted unless further retention is required by law.

5. RIGHT TO WITHDRAW: I understand that I may withdraw my consent at any time by contacting the programme administrator. However, withdrawal of consent may affect my ability to participate in the traceability programme and sell gold through compliant channels.

6. DATA SECURITY: I understand that reasonable measures are taken to protect my personal information from unauthorised access, loss, or misuse.

I confirm that I have read and understood these terms, and I voluntarily provide my consent.`,
      text_bem: `UKUSUMINA KWA UKUSONKAPO NA UKUPANGA DATA — ASM Gold Trace

Nga nasumina ifi fyalembwa, ndaishiba no kusumina ifyo:

1. UKUSHIMIKILA UMUNTU: Ndasumina ukuti bakonke amashina yandi, inambala ya NRC, ubushiku bwa kupyalwa, na ifyo bangenamo, pa mulandu wa ukushimikila kwa LBMA Responsible Gold Guidance na OECD Due Diligence Guidance.

2. UKUKONKA UMWELA WA GOLIDE: Ndasumina ukuti balembe no kukonka amashiwi ya golide, pamo na incende ya mushimbi, ubwingi bwa golide, na fyonse ifyauma mu mushimbi.

3. UKUPEELA AMASHIWI: Ndaishiba ukuti amashiwi yandi yalapeelwa ku ba compliance officers, ba auditors, na ba boma nga fyafwaikwa. Amashiwi yandi yalapeelwa fye ku bantu abasuminishiwa.

4. UKUSUNGA AMASHIWI: Amashiwi yandi yalasunga imyaka itano (5) nga filya LBMA na OECD balanda, elyo yalafumishiwa nga pali ifunde ilya kusunga.

5. INSAMBU YA UKUFUMAMO: Ndaishiba ukuti nkafumamo inshita yonse. Lelo ukufumamo kulalenga ukuti nshingashitishe golide mu nshila isuma.

6. UKUCINGILILA AMASHIWI: Ndaishiba ukuti balabomfya inshila isuma ya ukucingilila amashiwi yandi.

Ndasumina ukuti nabelenga no kumfwikisha ifyo fyalembwa, kabili ndasumina pa kuti kwandi.`,
    },
  });

  console.log('Seed complete:');
  console.log('  admin  / admin123  (ADMIN_USER)');
  console.log('  miner1 / miner123  (MINER_USER)');
  console.log('  trader1/ trader123  (TRADER_USER)');
  console.log('  consent v1.0 (en + bem)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
