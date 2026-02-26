import { z } from 'zod';

export const ComplianceReviewStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED']);

export const ComplianceReviewCreateSchema = z.object({
  record_id: z.string().uuid('Record ID must be a valid UUID'),
  status: ComplianceReviewStatusEnum,
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type ComplianceReviewCreate = z.infer<typeof ComplianceReviewCreateSchema>;
