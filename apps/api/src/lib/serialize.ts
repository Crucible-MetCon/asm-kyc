import type { MinerProfile } from '@asm-kyc/database';
import type { UserProfile } from '@asm-kyc/shared';

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
