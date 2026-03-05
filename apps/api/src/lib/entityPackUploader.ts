import { prisma } from '@asm-kyc/database';
import { generateEntityPack } from './entityPack.js';
import { uploadToR2, buildEntityPackKey, isR2Configured } from './r2Client.js';

/**
 * Generate entity pack PDF and upload to R2.
 * Designed for fire-and-forget usage — errors are logged but never thrown.
 */
export async function generateAndUploadEntityPack(userId: string): Promise<void> {
  if (!isR2Configured()) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { miner_profile: true },
    });

    if (!user) return;

    const name = (user.miner_profile?.full_name ?? user.username)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const date = new Date().toISOString().slice(0, 10);
    const filename = `entity-pack-${name}-${date}.pdf`;
    const key = buildEntityPackKey(userId, filename);

    const pdfBuffer = await generateEntityPack(userId);
    await uploadToR2(key, pdfBuffer, 'application/pdf');

    console.log(`[EntityPack] Uploaded ${key} (${pdfBuffer.length} bytes)`);
  } catch (err) {
    console.error('[EntityPack] Failed to generate/upload:', err);
  }
}
