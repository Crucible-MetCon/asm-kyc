import { z } from 'zod';

export const PurchaseCreateSchema = z.object({
  record_ids: z
    .array(z.string().uuid('Each record ID must be a valid UUID'))
    .min(1, 'At least one record is required')
    .max(50, 'Maximum 50 records per purchase'),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type PurchaseCreate = z.infer<typeof PurchaseCreateSchema>;
