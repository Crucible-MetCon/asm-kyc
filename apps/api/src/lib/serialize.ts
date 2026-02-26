import type {
  MinerProfile,
  Record as PrismaRecord,
  RecordPhoto,
  User,
  Purchase,
  PurchaseItem,
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

export function serializeRecord(
  r: PrismaRecord & {
    photos: RecordPhoto[];
    purchased_by_user?: (User & { miner_profile: MinerProfile | null }) | null;
  },
): RecordResponse {
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
  };
}

export function serializeRecordListItem(
  r: PrismaRecord & { _count: { photos: number } },
): RecordListItem {
  return {
    id: r.id,
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
  };
}
