export const ROLES = ['MINER_USER', 'TRADER_USER', 'ADMIN_USER'] as const;
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
