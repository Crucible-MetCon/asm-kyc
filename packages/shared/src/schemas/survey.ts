import { z } from 'zod';

/** Schema for submitting survey answers */
export const SurveySubmitSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  ),
});

export type SurveySubmitInput = z.infer<typeof SurveySubmitSchema>;

/** Schema for admin updating a survey's reward amount */
export const SurveyRewardUpdateSchema = z.object({
  reward_amount: z.number().min(0).max(100),
});

export type SurveyRewardUpdateInput = z.infer<typeof SurveyRewardUpdateSchema>;
