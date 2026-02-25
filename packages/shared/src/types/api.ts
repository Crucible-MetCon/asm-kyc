export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface UserProfile {
  full_name: string;
  counterparty_type: string;
  home_language: string;
  nrc_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  mine_site_name: string | null;
  mine_site_location: string | null;
  mining_license_number: string | null;
  profile_completed_at: string | null;
  consent_version: string | null;
  consented_at: string | null;
}

export interface MeResponse {
  id: string;
  username: string;
  role: string;
  profile: UserProfile | null;
}

export interface ConsentVersionResponse {
  version: string;
  text: string;
}
