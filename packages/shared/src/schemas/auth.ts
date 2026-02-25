import { z } from 'zod';

export const RoleEnum = z.enum(['MINER_USER', 'TRADER_USER', 'ADMIN_USER']);

export const CounterpartyTypeEnum = z.enum([
  'INDIVIDUAL_ASM',
  'COOPERATIVE',
  'SMALL_SCALE_OPERATOR',
  'TRADER_AGGREGATOR',
]);

export const RegisterInputSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  phone_e164: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format (e.g. +260971234567)'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  full_name: z.string().min(1, 'Full name is required').max(200),
  counterparty_type: CounterpartyTypeEnum,
  home_language: z.string().default('en'),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;
