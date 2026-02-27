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
  const refinerHash = await hash('refiner123');

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

  const miner1User = await prisma.user.upsert({
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

  const trader1User = await prisma.user.upsert({
    where: { username: 'trader1' },
    update: {},
    create: {
      username: 'trader1',
      phone_e164: '+260600000003',
      password_hash: traderHash,
      role: 'TRADER_USER',
      miner_profile: {
        create: {
          full_name: 'Test Trader',
          counterparty_type: 'TRADER_AGGREGATOR',
          home_language: 'en',
          profile_completed_at: new Date(),
        },
      },
    },
  });

  // Ensure trader has a profile (handles case where user existed before profile)
  const traderProfile = await prisma.minerProfile.findUnique({
    where: { user_id: trader1User.id },
  });
  if (!traderProfile) {
    await prisma.minerProfile.create({
      data: {
        user_id: trader1User.id,
        full_name: 'Test Trader',
        counterparty_type: 'TRADER_AGGREGATOR',
        home_language: 'en',
        profile_completed_at: new Date(),
      },
    });
    console.log('  Created missing trader1 profile');
  }

  // Second miner for variety
  const miner2User = await prisma.user.upsert({
    where: { username: 'miner2' },
    update: {},
    create: {
      username: 'miner2',
      phone_e164: '+260600000004',
      password_hash: minerHash,
      role: 'MINER_USER',
      miner_profile: {
        create: {
          full_name: 'Jane Mwila',
          counterparty_type: 'COOPERATIVE',
          home_language: 'bem',
          nrc_number: '654321/21/2',
          date_of_birth: new Date('1990-06-15'),
          gender: 'female',
          mine_site_name: 'Kasempa Gold Mine',
          mine_site_location: '-13.45, 26.80 (Kasempa District)',
          mining_license_number: 'ZM-KAS-2025-002',
          profile_completed_at: new Date(),
          consent_version: 'v1.0',
          consented_at: new Date(),
        },
      },
    },
  });

  // Refiner user
  const refiner1User = await prisma.user.upsert({
    where: { username: 'refiner1' },
    update: {},
    create: {
      username: 'refiner1',
      phone_e164: '+260600000005',
      password_hash: refinerHash,
      role: 'REFINER_USER',
      miner_profile: {
        create: {
          full_name: 'Zambia Gold Refinery',
          counterparty_type: 'TRADER_AGGREGATOR',
          home_language: 'en',
          profile_completed_at: new Date(),
        },
      },
    },
  });

  // Ensure refiner has a profile
  const refinerProfile = await prisma.minerProfile.findUnique({
    where: { user_id: refiner1User.id },
  });
  if (!refinerProfile) {
    await prisma.minerProfile.create({
      data: {
        user_id: refiner1User.id,
        full_name: 'Zambia Gold Refinery',
        counterparty_type: 'TRADER_AGGREGATOR',
        home_language: 'en',
        profile_completed_at: new Date(),
      },
    });
    console.log('  Created missing refiner1 profile');
  }

  // Sales partner relationships
  // miner1 sells to trader1 and refiner1
  await prisma.salesPartner.upsert({
    where: { miner_id_partner_id: { miner_id: miner1User.id, partner_id: trader1User.id } },
    update: {},
    create: { miner_id: miner1User.id, partner_id: trader1User.id },
  });
  await prisma.salesPartner.upsert({
    where: { miner_id_partner_id: { miner_id: miner1User.id, partner_id: refiner1User.id } },
    update: {},
    create: { miner_id: miner1User.id, partner_id: refiner1User.id },
  });
  // miner2 sells to trader1 only
  await prisma.salesPartner.upsert({
    where: { miner_id_partner_id: { miner_id: miner2User.id, partner_id: trader1User.id } },
    update: {},
    create: { miner_id: miner2User.id, partner_id: trader1User.id },
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

  // Sample records for miner1
  await prisma.record.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      created_by: miner1User.id,
      status: 'SUBMITTED',
      weight_grams: 125.5,
      estimated_purity: 85.0,
      origin_mine_site: 'Mumbwa Mine Site',
      extraction_date: new Date('2026-02-20'),
      gold_type: 'RAW_GOLD',
      notes: 'Sample submitted record',
    },
  });

  await prisma.record.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      created_by: miner1User.id,
      status: 'DRAFT',
      weight_grams: 50.0,
      gold_type: 'BAR',
      origin_mine_site: 'Mumbwa Mine Site',
    },
  });

  await prisma.record.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      created_by: miner1User.id,
      status: 'SUBMITTED',
      weight_grams: 200.0,
      estimated_purity: 90.5,
      origin_mine_site: 'Mumbwa Mine Site',
      extraction_date: new Date('2026-02-22'),
      gold_type: 'BAR',
      notes: 'High purity bar',
    },
  });

  // Records for miner2
  await prisma.record.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      created_by: miner2User.id,
      status: 'SUBMITTED',
      weight_grams: 75.0,
      estimated_purity: 80.0,
      origin_mine_site: 'Kasempa Gold Mine',
      extraction_date: new Date('2026-02-18'),
      gold_type: 'RAW_GOLD',
      notes: 'From Kasempa cooperative batch',
    },
  });

  await prisma.record.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      created_by: miner2User.id,
      status: 'SUBMITTED',
      weight_grams: 300.0,
      estimated_purity: 88.0,
      origin_mine_site: 'Kasempa Gold Mine',
      extraction_date: new Date('2026-02-24'),
      gold_type: 'LOT',
    },
  });

  // Sample purchase: trader1 purchases miner2's first record
  const existingPurchase = await prisma.purchase.findFirst({
    where: { id: '00000000-0000-0000-0000-000000000010' },
  });
  if (!existingPurchase) {
    await prisma.$transaction(async (tx) => {
      await tx.purchase.create({
        data: {
          id: '00000000-0000-0000-0000-000000000010',
          trader_id: trader1User.id,
          total_weight: 75.0,
          total_items: 1,
          notes: 'First test purchase',
          items: {
            create: {
              record_id: '00000000-0000-0000-0000-000000000004',
            },
          },
        },
      });
      await tx.record.update({
        where: { id: '00000000-0000-0000-0000-000000000004' },
        data: {
          status: 'PURCHASED',
          purchased_by: trader1User.id,
          purchased_at: new Date(),
        },
      });
    });
  }

  // Phase 5: Sample compliance reviews
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (adminUser) {
    await prisma.complianceReview.upsert({
      where: { id: '00000000-0000-0000-0000-000000000020' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000020',
        record_id: '00000000-0000-0000-0000-000000000001',
        reviewer_id: adminUser.id,
        status: 'APPROVED',
        notes: 'Record verified. Origin mine site confirmed, weight and purity within expected range.',
      },
    });

    await prisma.complianceReview.upsert({
      where: { id: '00000000-0000-0000-0000-000000000021' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000021',
        record_id: '00000000-0000-0000-0000-000000000005',
        reviewer_id: adminUser.id,
        status: 'FLAGGED',
        notes: 'High weight lot (300g) from single site. Additional verification of source documentation needed.',
      },
    });

    // Sample audit log
    await prisma.auditLog.upsert({
      where: { id: '00000000-0000-0000-0000-000000000030' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000030',
        user_id: adminUser.id,
        action: 'COMPLIANCE_REVIEW_CREATED',
        entity: 'ComplianceReview',
        entity_id: '00000000-0000-0000-0000-000000000020',
        meta: { status: 'APPROVED', record_id: '00000000-0000-0000-0000-000000000001' },
      },
    });
    console.log('  2 sample compliance reviews + 1 audit log');
  }

  // Phase 6: Add payment data to existing purchase (when payment model exists)
  try {
    const existingPayment = await prisma.payment.findFirst({
      where: { purchase_id: '00000000-0000-0000-0000-000000000010' },
    });
    if (!existingPayment) {
      await prisma.purchase.update({
        where: { id: '00000000-0000-0000-0000-000000000010' },
        data: {
          price_per_gram: 850.00,
          total_price: 63750.00,
          currency: 'ZMW',
          payment_status: 'COMPLETED',
        },
      });

      await prisma.payment.create({
        data: {
          id: '00000000-0000-0000-0000-000000000040',
          purchase_id: '00000000-0000-0000-0000-000000000010',
          yellowcard_txn_id: 'yc_sandbox_test_001',
          type: 'COLLECTION',
          amount: 63750.00,
          currency: 'ZMW',
          status: 'COMPLETE',
          payment_method: 'MOBILE_MONEY',
          fee_amount: 1275.00,
          fee_currency: 'ZMW',
          yellowcard_meta: { sandbox: true, test: true },
          webhook_received_at: new Date(),
        },
      });
      console.log('  1 sample payment (COLLECTION for purchase)');
    }
  } catch {
    // Payment model may not exist yet if migration hasn't run
    console.log('  Skipped payment seed (model not yet available)');
  }

  // Phase 6 Part C: Mine sites, record numbers, metal purities, receipt
  try {
    // Initialize record counter
    await prisma.recordCounter.upsert({
      where: { id: 'singleton' },
      update: { value: 5 },
      create: { id: 'singleton', value: 5 },
    });

    // Assign record numbers to existing records
    const recordIds = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005',
    ];
    for (let i = 0; i < recordIds.length; i++) {
      const rn = `GT-2026-${String(i + 1).padStart(5, '0')}`;
      await prisma.record.update({
        where: { id: recordIds[i] },
        data: { record_number: rn },
      }).catch(() => {}); // Ignore if already set
    }

    // Mine sites for miner1
    const mineSite1 = await prisma.mineSite.upsert({
      where: { id: '00000000-0000-0000-0000-000000000050' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000050',
        miner_id: miner1User.id,
        name: 'Mumbwa Mine Site',
        gps_latitude: -15.2833,
        gps_longitude: 27.0500,
        mining_license_number: 'ZM-MBW-2025-001',
        is_default: true,
      },
    });

    await prisma.mineSite.upsert({
      where: { id: '00000000-0000-0000-0000-000000000051' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000051',
        miner_id: miner1User.id,
        name: 'Chibuluma South',
        gps_latitude: -12.3800,
        gps_longitude: 28.0500,
      },
    });

    // Mine site for miner2
    await prisma.mineSite.upsert({
      where: { id: '00000000-0000-0000-0000-000000000052' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000052',
        miner_id: miner2User.id,
        name: 'Kasempa Gold Mine',
        gps_latitude: -13.45,
        gps_longitude: 26.80,
        mining_license_number: 'ZM-KAS-2025-002',
        is_default: true,
      },
    });

    // Link records to mine sites
    await prisma.record.update({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      data: {
        mine_site_id: mineSite1.id,
        gps_latitude: -15.2833,
        gps_longitude: 27.0500,
        country: 'Zambia',
        locality: 'Mumbwa',
      },
    }).catch(() => {});

    // Metal purities for record 1 (the submitted RAW_GOLD record)
    const existingPurities = await prisma.metalPurity.count({
      where: { record_id: '00000000-0000-0000-0000-000000000001', receipt_id: null },
    });
    if (existingPurities === 0) {
      await prisma.metalPurity.createMany({
        data: [
          { id: '00000000-0000-0000-0000-000000000060', record_id: '00000000-0000-0000-0000-000000000001', element: 'Au', purity: 85.00, sort_order: 0 },
          { id: '00000000-0000-0000-0000-000000000061', record_id: '00000000-0000-0000-0000-000000000001', element: 'Ag', purity: 8.50, sort_order: 1 },
          { id: '00000000-0000-0000-0000-000000000062', record_id: '00000000-0000-0000-0000-000000000001', element: 'Cu', purity: 4.20, sort_order: 2 },
        ],
      });
    }

    // Sample receipt: trader1 measured record 4 (the purchased one)
    const existingReceipt = await prisma.recordReceipt.findFirst({
      where: { record_id: '00000000-0000-0000-0000-000000000004' },
    });
    if (!existingReceipt) {
      const receipt = await prisma.recordReceipt.create({
        data: {
          id: '00000000-0000-0000-0000-000000000070',
          record_id: '00000000-0000-0000-0000-000000000004',
          received_by: trader1User.id,
          receipt_weight: 74.8, // Slightly different from miner's 75g
          gps_latitude: -15.4167,
          gps_longitude: 28.2833,
          country: 'Zambia',
          locality: 'Lusaka',
        },
      });
      await prisma.metalPurity.createMany({
        data: [
          { record_id: '00000000-0000-0000-0000-000000000004', receipt_id: receipt.id, element: 'Au', purity: 79.50, sort_order: 0 },
          { record_id: '00000000-0000-0000-0000-000000000004', receipt_id: receipt.id, element: 'Ag', purity: 12.30, sort_order: 1 },
        ],
      });
    }

    console.log('  3 mine sites, record numbers assigned, metal purities, 1 receipt');
  } catch (err) {
    console.log('  Skipped Phase 6 Part C seed:', err instanceof Error ? err.message : 'unknown error');
  }

  console.log('Seed complete:');
  console.log('  admin   / admin123   (ADMIN_USER)');
  console.log('  miner1  / miner123   (MINER_USER)');
  console.log('  miner2  / miner123   (MINER_USER)');
  console.log('  trader1 / trader123  (TRADER_USER)');
  console.log('  refiner1/ refiner123 (REFINER_USER)');
  console.log('  consent v1.0 (en + bem)');
  console.log('  5 sample records (3 submitted, 1 draft, 1 purchased)');
  console.log('  1 sample purchase (trader1 → miner2 record) with payment data');
  console.log('  Sales partners:');
  console.log('    miner1 → trader1, refiner1');
  console.log('    miner2 → trader1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
