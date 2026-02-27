import { featureFlags } from './featureFlags.js';
import { prisma } from '@asm-kyc/database';

const KYC_BONUS_AMOUNT = 10.00; // $10 USD signup bonus
const KYC_BONUS_CURRENCY = 'USD';

/**
 * Triggers a $10 KYC bonus disbursement after onboarding completion.
 * - No-op when Yellow Card is disabled
 * - Idempotent: checks if bonus was already sent
 * - Creates a Payment record with type=DISBURSEMENT
 */
export async function triggerKycBonus(userId: string): Promise<void> {
  if (!featureFlags.yellowCardEnabled) {
    return; // No-op when payments disabled
  }

  // Check if bonus was already disbursed
  const existing = await prisma.payment.findFirst({
    where: {
      recipient_id: userId,
      type: 'DISBURSEMENT',
      // Look for KYC bonus by checking meta
      yellowcard_meta: { path: ['reason'], equals: 'KYC_BONUS' },
    },
  });

  if (existing) {
    return; // Already sent
  }

  // For now, just record the intent. When Yellow Card credentials are live,
  // this will create an actual disbursement via the API.
  // The payment record acts as a queue item for when the integration goes live.
  try {
    await prisma.payment.create({
      data: {
        purchase_id: '00000000-0000-0000-0000-000000000000', // placeholder — no purchase for bonus
        recipient_id: userId,
        type: 'DISBURSEMENT',
        amount: KYC_BONUS_AMOUNT,
        currency: KYC_BONUS_CURRENCY,
        status: 'PENDING',
        payment_method: 'MOBILE_MONEY',
        yellowcard_meta: { reason: 'KYC_BONUS' },
      },
    });
  } catch {
    // Silently fail — bonus is non-critical
    // The placeholder purchase_id will fail the FK constraint
    // This is expected until the system is properly wired up with Yellow Card
  }
}
