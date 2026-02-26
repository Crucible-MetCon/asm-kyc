import type { MinerProfile, Record as PrismaRecord, RecordPhoto } from '@asm-kyc/database';
import type { UserProfile, RecordResponse, RecordPhotoResponse, RecordListItem } from '@asm-kyc/shared';

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
  r: PrismaRecord & { photos: RecordPhoto[] },
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
