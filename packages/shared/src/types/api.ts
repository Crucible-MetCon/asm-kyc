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
  purchased_by_name: string | null;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
  photos: RecordPhotoResponse[];
  // Phase 6: enhanced fields
  record_number: string | null;
  mine_site: MineSiteResponse | null;
  intended_buyer_name: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  country: string | null;
  locality: string | null;
  has_scale_photo: boolean;
  has_xrf_photo: boolean;
  metal_purities: MetalPurityResponse[];
  receipts: RecordReceiptResponse[];
}

export interface RecordListItem {
  id: string;
  record_number: string | null;
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

// Phase 4: trader purchase types

export interface AvailableRecordListItem {
  id: string;
  weight_grams: number | null;
  estimated_purity: number | null;
  gold_type: string | null;
  origin_mine_site: string | null;
  extraction_date: string | null;
  miner_name: string | null;
  photo_count: number;
  created_at: string;
}

export interface AvailableRecordListResponse {
  records: AvailableRecordListItem[];
  total: number;
}

export interface PurchaseItemResponse {
  id: string;
  record_id: string;
  record: {
    id: string;
    weight_grams: number | null;
    estimated_purity: number | null;
    gold_type: string | null;
    origin_mine_site: string | null;
    extraction_date: string | null;
    miner_name: string | null;
    photo_count: number;
  };
}

export interface PurchaseResponse {
  id: string;
  trader_id: string;
  total_weight: number;
  total_items: number;
  notes: string | null;
  purchased_at: string;
  created_at: string;
  items: PurchaseItemResponse[];
  // Phase 6: payment fields (present when Yellow Card enabled)
  price_per_gram?: number | null;
  total_price?: number | null;
  currency?: string | null;
  payment_status?: string | null;
}

export interface PurchaseListItem {
  id: string;
  total_weight: number;
  total_items: number;
  notes: string | null;
  purchased_at: string;
  created_at: string;
  // Phase 6: payment fields
  payment_status?: string | null;
}

export interface PurchaseListResponse {
  purchases: PurchaseListItem[];
  total: number;
}

// Phase 6: Feature flags
export interface FeatureFlagsResponse {
  yellowcard_enabled: boolean;
}

// Phase 6: Payment summary
export interface PaymentSummary {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

// Sales partner types

export interface SalesPartnerListItem {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_username: string;
  partner_role: string;
  created_at: string;
}

export interface SalesPartnerListResponse {
  partners: SalesPartnerListItem[];
  total: number;
}

export interface AvailablePartnerListItem {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

export interface AvailablePartnerListResponse {
  partners: AvailablePartnerListItem[];
  total: number;
}

// Phase 5: Admin dashboard types

export interface AdminDashboardStats {
  total_users: number;
  total_miners: number;
  total_traders: number;
  total_refiners: number;
  total_records: number;
  records_by_status: { status: string; count: number }[];
  total_purchases: number;
  total_compliance_reviews: number;
  pending_reviews: number;
  // Phase 6: Payment stats
  total_payments?: number;
  completed_payments?: number;
  pending_payments?: number;
  failed_payments?: number;
}

export interface AdminUserListItem {
  id: string;
  username: string;
  role: string;
  phone_e164: string;
  is_disabled: boolean;
  profile_name: string | null;
  profile_completed: boolean;
  consented: boolean;
  created_at: string;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  role: string;
  phone_e164: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
  profile: UserProfile | null;
  record_count: number;
  purchase_count: number;
}

export interface AdminRecordListItem {
  id: string;
  record_number: string | null;
  status: string;
  weight_grams: number | null;
  estimated_purity: number | null;
  gold_type: string | null;
  origin_mine_site: string | null;
  extraction_date: string | null;
  miner_name: string;
  miner_username: string;
  photo_count: number;
  review_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminRecordListResponse {
  records: AdminRecordListItem[];
  total: number;
}

export interface ComplianceReviewResponse {
  id: string;
  status: string;
  notes: string | null;
  reviewer_name: string;
  reviewed_at: string;
}

export interface AdminRecordDetail {
  id: string;
  status: string;
  weight_grams: number | null;
  estimated_purity: number | null;
  gold_type: string | null;
  origin_mine_site: string | null;
  extraction_date: string | null;
  notes: string | null;
  miner_name: string;
  miner_username: string;
  purchased_by_name: string | null;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
  photos: RecordPhotoResponse[];
  compliance_reviews: ComplianceReviewResponse[];
  // Phase 6: enhanced fields
  record_number: string | null;
  mine_site_name: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  country: string | null;
  locality: string | null;
  has_scale_photo: boolean;
  has_xrf_photo: boolean;
  metal_purities: MetalPurityResponse[];
  receipts: RecordReceiptResponse[];
}

export interface ComplianceReviewListItem {
  id: string;
  status: string;
  notes: string | null;
  reviewer_name: string;
  reviewed_at: string;
  record_id: string;
  record_weight: number | null;
  record_gold_type: string | null;
  record_mine_site: string | null;
  miner_name: string;
}

export interface ComplianceReviewListResponse {
  reviews: ComplianceReviewListItem[];
  total: number;
}

// Phase 6: Mine Sites
export interface MineSiteResponse {
  id: string;
  name: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  mining_license_number: string | null;
  is_default: boolean;
  created_at: string;
}

export interface MineSiteListResponse {
  sites: MineSiteResponse[];
  total: number;
}

// Phase 6: Metal Purities
export interface MetalPurityResponse {
  id: string;
  element: string;
  purity: number;
  sort_order: number;
}

// Phase 6: Record Receipts
export interface RecordReceiptResponse {
  id: string;
  record_id: string;
  received_by: string;
  receiver_name: string;
  receipt_weight: number | null;
  has_scale_photo: boolean;
  has_xrf_photo: boolean;
  gps_latitude: number | null;
  gps_longitude: number | null;
  country: string | null;
  locality: string | null;
  purities: MetalPurityResponse[];
  received_at: string;
}

// Phase 6: Vision extraction responses
export interface VisionWeightResult {
  weight_grams: number | null;
  unit: string;
  confidence: string;
  raw_description: string;
}

export interface VisionXrfResult {
  purities: { element: string; purity: number }[];
  confidence: string;
  raw_description: string;
}
