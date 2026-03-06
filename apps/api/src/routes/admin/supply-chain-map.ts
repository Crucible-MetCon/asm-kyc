import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@asm-kyc/database';
import type {
  SupplyChainMapResponse,
  SupplyChainActor,
  SupplyChainRecord,
  SupplyChainFlow,
} from '@asm-kyc/shared';

export const adminSupplyChainMapRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/supply-chain-map
  app.get('/', async (_request, reply) => {
    // 1. Fetch all non-admin, non-disabled users with GPS-relevant relations
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['MINER_USER', 'TRADER_USER', 'REFINER_USER', 'AGGREGATOR_USER', 'MELTER_USER', 'PROCESSOR_USER'],
        },
        is_disabled: false,
      },
      include: {
        miner_profile: true,
        mine_sites: {
          where: { is_default: true },
          take: 1,
        },
        record_receipts: {
          orderBy: { received_at: 'desc' },
          take: 1,
        },
        records: {
          select: { weight_grams: true },
        },
      },
    });

    const actors: SupplyChainActor[] = [];

    for (const u of users) {
      let lat: number | null = null;
      let lng: number | null = null;

      if (u.role === 'MINER_USER') {
        const site = u.mine_sites[0];
        if (site?.gps_latitude && site?.gps_longitude) {
          lat = Number(site.gps_latitude);
          lng = Number(site.gps_longitude);
        }
      } else {
        const receipt = u.record_receipts[0];
        if (receipt?.gps_latitude && receipt?.gps_longitude) {
          lat = Number(receipt.gps_latitude);
          lng = Number(receipt.gps_longitude);
        }
      }

      if (lat !== null && lng !== null) {
        const totalWeight = u.records.reduce(
          (sum, r) => sum + (r.weight_grams ? Number(r.weight_grams) : 0),
          0,
        );

        actors.push({
          userId: u.id,
          name: u.miner_profile?.full_name ?? u.username,
          role: u.role,
          lat,
          lng,
          recordCount: u.records.length,
          totalWeight,
        });
      }
    }

    // 2. Fetch all records with GPS coordinates
    const records = await prisma.record.findMany({
      where: {
        gps_latitude: { not: null },
        gps_longitude: { not: null },
      },
      include: {
        creator: { include: { miner_profile: true } },
        receipts: {
          include: {
            receiver: { include: { miner_profile: true } },
          },
          orderBy: { received_at: 'desc' },
        },
      },
    });

    const recordItems: SupplyChainRecord[] = records.map((r) => ({
      id: r.id,
      recordNumber: r.record_number ?? null,
      status: r.status,
      weight: r.weight_grams ? Number(r.weight_grams) : null,
      goldType: r.gold_type,
      lat: Number(r.gps_latitude),
      lng: Number(r.gps_longitude),
      minerName: r.creator.miner_profile?.full_name ?? r.creator.username,
    }));

    // 3. Build flow lines: record GPS → receipt GPS
    const flows: SupplyChainFlow[] = [];

    for (const r of records) {
      for (const receipt of r.receipts) {
        if (receipt.gps_latitude && receipt.gps_longitude) {
          flows.push({
            fromLat: Number(r.gps_latitude),
            fromLng: Number(r.gps_longitude),
            toLat: Number(receipt.gps_latitude),
            toLng: Number(receipt.gps_longitude),
            weight: r.weight_grams ? Number(r.weight_grams) : null,
            status: r.status,
            recordNumber: r.record_number ?? null,
            minerName: r.creator.miner_profile?.full_name ?? r.creator.username,
            buyerName:
              receipt.receiver.miner_profile?.full_name ?? receipt.receiver.username,
          });
        }
      }
    }

    const response: SupplyChainMapResponse = {
      actors,
      records: recordItems,
      flows,
    };

    return reply.send(response);
  });
};
