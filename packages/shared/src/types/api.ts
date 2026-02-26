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

export interface RecordPhotoResponse {
  id: string;
  photo_data: string;
  mime_type: string;
  taken_at: string;
}

export interface RecordResponse {
  id: string;
  status: string;
  weight_grams: number | null;
  estimated_purity: number | null;
  origin_mine_site: string | null;
  extraction_date: string | null;
  gold_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  photos: RecordPhotoResponse[];
}

export interface RecordListItem {
  id: string;
  status: string;
  weight_grams: number | null;
  gold_type: string | null;
  origin_mine_site: string | null;
  created_at: string;
  updated_at: string;
  photo_count: number;
}

export interface RecordListResponse {
  records: RecordListItem[];
  total: number;
}
