export const ROLES = ['MINER_USER', 'TRADER_USER', 'REFINER_USER', 'ADMIN_USER'] as const;
export type Role = (typeof ROLES)[number];

export const COUNTERPARTY_TYPES = [
  'INDIVIDUAL_ASM',
  'COOPERATIVE',
  'SMALL_SCALE_OPERATOR',
  'TRADER_AGGREGATOR',
] as const;
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number];

export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
export type Gender = (typeof GENDERS)[number];

export const LANGUAGES = ['en', 'bem'] as const;
export type Language = (typeof LANGUAGES)[number];

export const GOLD_TYPES = ['RAW_GOLD', 'BAR', 'LOT'] as const;
export type GoldType = (typeof GOLD_TYPES)[number];

export const RECORD_STATUSES = ['DRAFT', 'SUBMITTED', 'PURCHASED'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const COMPLIANCE_REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'] as const;
export type ComplianceReviewStatus = (typeof COMPLIANCE_REVIEW_STATUSES)[number];

// Phase 6: Payment constants
export const PAYMENT_STATUSES = ['NONE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TYPES = ['COLLECTION', 'DISBURSEMENT'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'MOBILE_MONEY'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const METAL_ELEMENTS = ['Au', 'Ag', 'Cu', 'Pt', 'Pd', 'Fe', 'Zn', 'Ni'] as const;
export type MetalElement = (typeof METAL_ELEMENTS)[number];

export const VISION_CONFIDENCE = ['high', 'medium', 'low'] as const;
export type VisionConfidence = (typeof VISION_CONFIDENCE)[number];
