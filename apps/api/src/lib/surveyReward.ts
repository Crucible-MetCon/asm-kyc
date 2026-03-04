import { featureFlags } from './featureFlags.js';
import { prisma } from '@asm-kyc/database';

/**
 * Triggers a survey reward disbursement after survey completion.
 * - No-op when Yellow Card is disabled
 * - Creates a Payment record with type=DISBURSEMENT
 */
export async function triggerSurveyReward(
  userId: string,
  responseId: string,
  surveySlug: string,
  amount: number,
  currency: string,
): Promise<void> {
  if (!featureFlags.yellowCardEnabled) {
    return; // No-op when payments disabled
  }

  try {
    await prisma.payment.create({
      data: {
        purchase_id: '00000000-0000-0000-0000-000000000000', // placeholder — no purchase for survey reward
        recipient_id: userId,
        type: 'DISBURSEMENT',
        amount,
        currency,
        status: 'PENDING',
        payment_method: 'MOBILE_MONEY',
        yellowcard_meta: {
          reason: 'SURVEY_REWARD',
          surveySlug,
          responseId,
        },
      },
    });
  } catch {
    // Silently fail — reward is non-critical
  }
}
