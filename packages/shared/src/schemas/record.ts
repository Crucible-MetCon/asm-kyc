import { z } from 'zod';

export const GoldTypeEnum = z.enum(['RAW_GOLD', 'BAR', 'LOT']);

// Lenient schema for creating/updating drafts (all fields optional)
export const RecordCreateSchema = z.object({
  weight_grams: z
    .number()
    .positive('Weight must be greater than 0')
    .max(100000, 'Weight cannot exceed 100kg')
    .optional(),
  estimated_purity: z
    .number()
    .min(0, 'Purity must be 0-100')
    .max(100, 'Purity must be 0-100')
    .optional(),
  origin_mine_site: z.string().max(500).optional().or(z.literal('')),
  extraction_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date')
    .optional()
    .or(z.literal('')),
  gold_type: GoldTypeEnum.optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
});
export type RecordCreate = z.infer<typeof RecordCreateSchema>;

export const RecordUpdateSchema = RecordCreateSchema;
export type RecordUpdate = z.infer<typeof RecordUpdateSchema>;

// Strict schema for submission (all required fields must be present)
export const RecordSubmitSchema = z.object({
  weight_grams: z.number().positive('Weight is required to submit'),
  estimated_purity: z.number().min(0).max(100, 'Purity must be 0-100'),
  origin_mine_site: z.string().min(1, 'Origin mine site is required'),
  extraction_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid date is required'),
  gold_type: GoldTypeEnum,
});
export type RecordSubmit = z.infer<typeof RecordSubmitSchema>;

// Photo upload validation
export const RecordPhotoUploadSchema = z.object({
  photo_data: z
    .string()
    .min(1, 'Photo data is required')
    .refine((val) => val.startsWith('data:image/'), 'Must be a base64 data URI'),
});
export type RecordPhotoUpload = z.infer<typeof RecordPhotoUploadSchema>;
