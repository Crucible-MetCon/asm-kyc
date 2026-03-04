import exifReader from 'exif-reader';

interface GpsResult {
  latitude: number | null;
  longitude: number | null;
}

/**
 * Extract GPS coordinates from JPEG EXIF data.
 * Returns null coordinates if EXIF or GPS data not present.
 */
export function extractGpsFromExif(imageBuffer: Buffer): GpsResult {
  try {
    // Find EXIF marker in JPEG (starts after FFD8 SOI marker)
    const exifStart = findExifOffset(imageBuffer);
    if (exifStart === -1) {
      return { latitude: null, longitude: null };
    }

    // Extract the EXIF APP1 segment
    const length = imageBuffer.readUInt16BE(exifStart + 2);
    const exifData = imageBuffer.subarray(exifStart + 4, exifStart + 2 + length);

    const tags = exifReader(exifData);

    if (!tags.gps) {
      return { latitude: null, longitude: null };
    }

    const gps = tags.gps;
    const latitude = gps.GPSLatitude ?? null;
    const longitude = gps.GPSLongitude ?? null;

    if (latitude === null || longitude === null) {
      return { latitude: null, longitude: null };
    }

    return {
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
    };
  } catch {
    // Not a valid JPEG or no EXIF data
    return { latitude: null, longitude: null };
  }
}

/** Find the offset of the APP1 (EXIF) marker in a JPEG buffer. */
function findExifOffset(buffer: Buffer): number {
  if (buffer.length < 4) return -1;
  // JPEG starts with FFD8
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return -1;

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) return -1;
    const marker = buffer[offset + 1];
    // APP1 marker = 0xE1
    if (marker === 0xe1) return offset;
    // Skip to next marker
    if (offset + 3 >= buffer.length) return -1;
    const segLen = buffer.readUInt16BE(offset + 2);
    offset += 2 + segLen;
  }
  return -1;
}
