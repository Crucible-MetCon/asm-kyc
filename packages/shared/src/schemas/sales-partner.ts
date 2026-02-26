import { z } from 'zod';

export const SalesPartnerAddSchema = z.object({
  partner_id: z.string().uuid('Invalid partner ID'),
});

export type SalesPartnerAddInput = z.infer<typeof SalesPartnerAddSchema>;
