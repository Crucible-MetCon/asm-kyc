import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let client: S3Client | null = null;
let configured = false;

function getClient(): S3Client | null {
  if (configured) return client;
  configured = true;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('[R2] Not configured — falling back to base64-in-DB storage');
    return null;
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log('[R2] Client initialized');
  return client;
}

function getBucket(): string {
  return process.env.R2_BUCKET || 'asm-gold-trace';
}

/** Upload a buffer to R2. Returns the object key, or null if R2 not configured. */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const s3 = getClient();
  if (!s3) return null;

  await s3.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return key;
}

/** Get a presigned URL for a given R2 key. Returns null if R2 not configured. */
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string | null> {
  const s3 = getClient();
  if (!s3) return null;

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn },
  );
}

/** Delete an object from R2. Returns true if deleted, false if R2 not configured. */
export async function deleteFromR2(key: string): Promise<boolean> {
  const s3 = getClient();
  if (!s3) return false;

  await s3.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );

  return true;
}

/** Check if R2 is configured and available. */
export function isR2Configured(): boolean {
  return getClient() !== null;
}

/** Convert a base64 data URI to a Buffer + mime type. */
export function base64ToBuffer(dataUri: string): { buffer: Buffer; mimeType: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    // Assume raw base64 JPEG if no data URI prefix
    return { buffer: Buffer.from(dataUri, 'base64'), mimeType: 'image/jpeg' };
  }
  return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1] };
}

/** Build an R2 key for a record photo. */
export function buildRecordPhotoKey(
  userId: string,
  recordId: string,
  filename: string,
): string {
  return `records/${userId}/${recordId}/${filename}`;
}

/** Build an R2 key for a profile document. */
export function buildDocumentKey(
  userId: string,
  docType: string,
  ext: string,
): string {
  return `documents/${userId}/${docType}.${ext}`;
}

/** Object returned by listR2Objects. */
export interface R2Object {
  key: string;
  size: number;
  lastModified: Date | undefined;
}

/** List objects in R2 with a given prefix. Paginates automatically. Returns [] if R2 not configured. */
export async function listR2Objects(prefix: string): Promise<R2Object[]> {
  const s3 = getClient();
  if (!s3) return [];

  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of response.Contents ?? []) {
      if (obj.Key) {
        objects.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified,
        });
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

/** Build an R2 key for an entity pack PDF. */
export function buildEntityPackKey(userId: string, filename: string): string {
  return `entity-packs/${userId}/${filename}`;
}
