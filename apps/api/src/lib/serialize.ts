import type {
  MinerProfile,
  Record as PrismaRecord,
  RecordPhoto,
  User,
  Purchase,
  PurchaseItem,
  MineSite,
  MetalPurity,
  RecordReceipt,
} from '@asm-kyc/database';
import type {
  UserProfile,
  RecordResponse,
  RecordPhotoResponse,
  RecordListItem,
  PurchaseResponse,
  PurchaseListItem,
  PurchaseItemResponse,
  AvailableRecordListItem,
  MetalPurityResponse,
  RecordReceiptResponse,
  MineSiteResponse,
} from '@asm-kyc/shared';

export function serializeProfile(p: MinerProfile | null): UserProfile | null {
  if (!p) return null;
  return {
    full_name: p.full_name,
    counterparty_type: p.counterparty_type,
    home_language: p.home_language,
    nrc_number: p.nrc_number,
    date_of_birth: p.date_of_birth?.toISOString() ?? null,
    gender: p.gender,
    mine_site_name: p.mine_site_name,
    mine_site_location: p.mine_site_location,
    mining_license_number: p.mining_license_number,
    profile_completed_at: p.profile_completed_at?.toISOString() ?? null,
    consent_version: p.consent_version,
    consented_at: p.consented_at?.toISOString() ?? null,
  };
}

export function serializeRecordPhoto(p: RecordPhoto): RecordPhotoResponse {
  return {
    id: p.id,
    photo_data: p.photo_data,
    mime_type: p.mime_type,
    taken_at: p.taken_at.toISOString(),
  };
}

export function serializeMineSite(s: MineSite): MineSiteResponse {
  return {
    id: s.id,
    name: s.name,
    gps_latitude: s.gps_latitude ? Number(s.gps_latitude) : null,
    gps_longitude: s.gps_longitude ? Number(s.gps_longitude) : null,
    mining_license_number: s.mining_license_number,
    is_default: s.is_default,
    created_at: s.created_at.toISOString(),
  };
}

export function serializeMetalPurity(p: MetalPurity): MetalPurityResponse {
  return {
    id: p.id,
    element: p.element,
    purity: Number(p.purity),
    sort_order: p.sort_order,
  };
}

export function serializeReceipt(
  r: RecordReceipt & {
    receiver: User & { miner_profile: MinerProfile | null };
    purities: MetalPurity[];
  },
): RecordReceiptResponse {
  return {
    id: r.id,
    record_id: r.record_id,
    received_by: r.received_by,
    receiver_name: r.receiver.miner_profile?.full_name ?? r.receiver.username,
    receipt_weight: r.receipt_weight ? Number(r.receipt_weight) : null,
    has_scale_photo: !!r.scale_photo_data,
    has_xrf_photo: !!r.xrf_photo_data,
    gps_latitude: r.gps_latitude ? Number(r.gps_latitude) : null,
    gps_longitude: r.gps_longitude ? Number(r.gps_longitude) : null,
    country: r.country,
    locality: r.locality,
    purities: r.purities.map(serializeMetalPurity),
    received_at: r.received_at.toISOString(),
  };
}

type RecordWithRelations = PrismaRecord & {
  photos: RecordPhoto[];
  purchased_by_user?: (User & { miner_profile: MinerProfile | null }) | null;
  mine_site?: MineSite | null;
  intended_buyer?: (User & { miner_profile: MinerProfile | null }) | null;
  metal_purities?: MetalPurity[];
  receipts?: Array<RecordReceipt & {
    receiver: User & { miner_profile: MinerProfile | null };
    purities: MetalPurity[];
  }>;
};

export function serializeRecord(r: RecordWithRelations): RecordResponse {
  return {
    id: r.id,
    status: r.status,
    weight_grams: r.weight_grams ? Number(r.weight_grams) : null,
    estimated_purity: r.estimated_purity ? Number(r.estimated_purity) : null,
    origin_mine_site: r.origin_mine_site,
    extraction_date: r.extraction_date?.toISOString() ?? null,
    gold_type: r.gold_type,
    notes: r.notes,
    purchased_by_name: r.purchased_by_user?.miner_profile?.full_name
      ?? r.purchased_by_user?.username ?? null,
    purchased_at: r.purchased_at?.toISOString() ?? null,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
    photos: r.photos.map(serializeRecordPhoto),
    // Phase 6: enhanced fields
    record_number: r.record_number ?? null,
    mine_site: r.mine_site ? serializeMineSite(r.mine_site) : null,
    intended_buyer_name: r.intended_buyer?.miner_profile?.full_name
      ?? r.intended_buyer?.username ?? null,
    gps_latitude: r.gps_latitude ? Number(r.gps_latitude) : null,
    gps_longitude: r.gps_longitude ? Number(r.gps_longitude) : null,
    country: r.country ?? null,
    locality: r.locality ?? null,
    has_scale_photo: !!r.scale_photo_data,
    has_xrf_photo: !!r.xrf_photo_data,
    metal_purities: (r.metal_purities ?? []).map(serializeMetalPurity),
    receipts: (r.receipts ?? []).map(serializeReceipt),
  };
}

export function serializeRecordListItem(
  r: PrismaRecord & { _count: { photos: number } },
): RecordListItem {
  return {
    id: r.id,
    record_number: r.record_number ?? null,
    status: r.status,
    weight_grams: r.weight_grams ? Number(r.weight_grams) : null,
    gold_type: r.gold_type,
    origin_mine_site: r.origin_mine_site,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
    photo_count: r._count.photos,
  };
}

// Phase 4: trader purchase serializers

export function serializeAvailableRecord(
  r: PrismaRecord & {
    creator: User & { miner_profile: MinerProfile | null };
    _count: { photos: number };
  },
): AvailableRecordListItem {
  return {
    id: r.id,
    weight_grams: r.weight_grams ? Number(r.weight_grams) : null,
    estimated_purity: r.estimated_purity ? Number(r.estimated_purity) : null,
    gold_type: r.gold_type,
    origin_mine_site: r.origin_mine_site,
    extraction_date: r.extraction_date?.toISOString() ?? null,
    miner_name: r.creator.miner_profile?.full_name ?? r.creator.username,
    photo_count: r._count.photos,
    created_at: r.created_at.toISOString(),
  };
}

export function serializePurchaseListItem(
  p: Purchase,
): PurchaseListItem {
  return {
    id: p.id,
    total_weight: Number(p.total_weight),
    total_items: p.total_items,
    notes: p.notes,
    purchased_at: p.purchased_at.toISOString(),
    created_at: p.created_at.toISOString(),
    payment_status: p.payment_status ?? null,
  };
}

export function serializePurchaseItem(
  pi: PurchaseItem & {
    record: PrismaRecord & {
      creator: User & { miner_profile: MinerProfile | null };
      _count: { photos: number };
    };
  },
): PurchaseItemResponse {
  return {
    id: pi.id,
    record_id: pi.record_id,
    record: {
      id: pi.record.id,
      weight_grams: pi.record.weight_grams ? Number(pi.record.weight_grams) : null,
      estimated_purity: pi.record.estimated_purity ? Number(pi.record.estimated_purity) : null,
      gold_type: pi.record.gold_type,
      origin_mine_site: pi.record.origin_mine_site,
      extraction_date: pi.record.extraction_date?.toISOString() ?? null,
      miner_name: pi.record.creator.miner_profile?.full_name ?? pi.record.creator.username,
      photo_count: pi.record._count.photos,
    },
  };
}

export function serializePurchase(
  p: Purchase & {
    items: Array<
      PurchaseItem & {
        record: PrismaRecord & {
          creator: User & { miner_profile: MinerProfile | null };
          _count: { photos: number };
        };
      }
    >;
  },
): PurchaseResponse {
  return {
    id: p.id,
    trader_id: p.trader_id,
    total_weight: Number(p.total_weight),
    total_items: p.total_items,
    notes: p.notes,
    purchased_at: p.purchased_at.toISOString(),
    created_at: p.created_at.toISOString(),
    items: p.items.map(serializePurchaseItem),
    price_per_gram: p.price_per_gram ? Number(p.price_per_gram) : null,
    total_price: p.total_price ? Number(p.total_price) : null,
    currency: p.currency ?? null,
    payment_status: p.payment_status ?? null,
  };
}
