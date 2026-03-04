import Anthropic from '@anthropic-ai/sdk';
import { extractGpsFromExif } from './exifExtractor.js';

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

export interface WeightExtractionResult {
  weight_grams: number | null;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  raw_description: string;
}

export interface XrfExtractionResult {
  purities: { element: string; purity: number }[];
  confidence: 'high' | 'medium' | 'low';
  raw_description: string;
}

/**
 * Extract weight from a scale photo using Claude Vision (Haiku for cost efficiency).
 */
export async function extractWeight(
  imageBase64: string,
  mimeType: string,
): Promise<WeightExtractionResult> {
  const client = getClient();
  if (!client) {
    return { weight_grams: null, unit: 'g', confidence: 'low', raw_description: 'Vision service not configured (no ANTHROPIC_API_KEY)' };
  }

  // Strip data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, '');
  const mediaType = mimeType.replace(/^data:/, '').replace(/;base64.*/, '') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `You are analysing a photo of a physical scale displaying a weight measurement.
Extract the numeric weight value and unit shown on the display.
Respond with ONLY a JSON object (no markdown, no explanation):
{"weight_grams": <number or null>, "unit": "<g|kg|oz|dwt>", "confidence": "<high|medium|low>", "raw_description": "<brief description of what you see>"}

Rules:
- If the unit is kg, convert to grams (multiply by 1000)
- If the unit is oz, convert to grams (multiply by 28.3495)
- If the unit is dwt (pennyweight), convert to grams (multiply by 1.55517)
- weight_grams should always be in grams
- confidence: high = clearly readable, medium = partially readable, low = barely/not readable
- If you cannot read the display, set weight_grams to null`,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        weight_grams: typeof parsed.weight_grams === 'number' ? parsed.weight_grams : null,
        unit: parsed.unit || 'g',
        confidence: parsed.confidence || 'low',
        raw_description: parsed.raw_description || '',
      };
    }

    return { weight_grams: null, unit: 'g', confidence: 'low', raw_description: 'Could not parse response' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { weight_grams: null, unit: 'g', confidence: 'low', raw_description: `Error: ${message}` };
  }
}

/**
 * Extract metal purities from an XRF gun photo using Claude Vision.
 */
export async function extractXrfPurities(
  imageBase64: string,
  mimeType: string,
): Promise<XrfExtractionResult> {
  const client = getClient();
  if (!client) {
    return { purities: [], confidence: 'low', raw_description: 'Vision service not configured (no ANTHROPIC_API_KEY)' };
  }

  const base64Data = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, '');
  const mediaType = mimeType.replace(/^data:/, '').replace(/;base64.*/, '') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `You are analysing a photo of an XRF (X-Ray Fluorescence) gun display showing element analysis results.
Extract all visible element symbols and their purity/concentration percentages.
Respond with ONLY a JSON object (no markdown, no explanation):
{"purities": [{"element": "<symbol>", "purity": <number>}], "confidence": "<high|medium|low>", "raw_description": "<brief description of what you see>"}

Rules:
- Common elements: Au (gold), Ag (silver), Cu (copper), Pt (platinum), Pd (palladium), Fe (iron), Zn (zinc), Ni (nickel)
- purity is a percentage (0-100)
- Sort by purity descending (highest first)
- Return at most 5 element/purity pairs
- confidence: high = clearly readable, medium = partially readable, low = barely/not readable
- If you cannot read the display, return empty purities array`,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const purities = Array.isArray(parsed.purities)
        ? parsed.purities
            .filter((p: { element?: string; purity?: number }) => typeof p.element === 'string' && typeof p.purity === 'number')
            .slice(0, 5)
            .map((p: { element: string; purity: number }) => ({
              element: p.element.substring(0, 5),
              purity: Math.min(100, Math.max(0, p.purity)),
            }))
        : [];

      return {
        purities,
        confidence: parsed.confidence || 'low',
        raw_description: parsed.raw_description || '',
      };
    }

    return { purities: [], confidence: 'low', raw_description: 'Could not parse response' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { purities: [], confidence: 'low', raw_description: `Error: ${message}` };
  }
}

// ─── Phase 8: Gold estimation from 2 photos ────────────────

export interface GoldEstimationResult {
  estimated_weight: number | null;
  estimated_purity: number | null;
  weight_confidence: 'high' | 'medium' | 'low';
  purity_confidence: 'high' | 'medium' | 'low';
  reference_object: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  raw_description: string;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function cleanBase64(dataUri: string): { base64: string; mediaType: ImageMediaType } {
  const base64 = dataUri.replace(/^data:image\/[a-z+]+;base64,/, '');
  const mediaType = (dataUri.match(/^data:(image\/[a-z+]+);base64,/)?.[1] || 'image/jpeg') as ImageMediaType;
  return { base64, mediaType };
}

/**
 * Estimate weight and purity from two miner photos (top + side) with a reference object.
 * Also extracts GPS from EXIF data in the top photo.
 */
export async function estimateFromPhotos(
  topPhotoBase64: string,
  sidePhotoBase64: string,
  goldType: string,
): Promise<GoldEstimationResult> {
  const client = getClient();
  if (!client) {
    return {
      estimated_weight: null, estimated_purity: null,
      weight_confidence: 'low', purity_confidence: 'low',
      reference_object: null, gps_latitude: null, gps_longitude: null,
      raw_description: 'Vision service not configured (no ANTHROPIC_API_KEY)',
    };
  }

  const top = cleanBase64(topPhotoBase64);
  const side = cleanBase64(sidePhotoBase64);

  // Extract GPS from EXIF (top photo, typically the first taken)
  let gps = { latitude: null as number | null, longitude: null as number | null };
  try {
    const topBuffer = Buffer.from(top.base64, 'base64');
    gps = extractGpsFromExif(topBuffer);
  } catch {
    // EXIF extraction failed, continue without GPS
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: top.mediaType, data: top.base64 },
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: side.mediaType, data: side.base64 },
            },
            {
              type: 'text',
              text: `You are analysing two photos of a gold sample (type: ${goldType}).
The first photo is a TOP-DOWN view and the second is a SIDE view.
The miner has placed a common reference object next to the gold for scale (e.g. coin, lighter, matchbox, finger, pen).

Your task:
1. Identify the reference object and its approximate real-world size
2. Estimate the gold sample dimensions relative to the reference
3. Estimate weight in grams based on size and gold type (raw gold density ~15-16 g/cm³, bar ~18-19 g/cm³)
4. Estimate purity percentage based on visual characteristics (colour, lustre, visible inclusions)
   - Bright yellow = higher purity (85-95%)
   - Reddish tint = copper alloy, lower purity (70-85%)
   - Dull/dark = significant impurities (50-70%)

Respond with ONLY a JSON object (no markdown):
{"estimated_weight": <grams or null>, "estimated_purity": <0-100 or null>, "weight_confidence": "<high|medium|low>", "purity_confidence": "<high|medium|low>", "reference_object": "<what reference object you see>", "raw_description": "<brief analysis>"}

Rules:
- weight_confidence: high = clear reference + good angle, medium = reasonable estimate, low = uncertain
- purity_confidence: high = clear visual indicators, medium = some indicators, low = cannot determine
- If no reference object visible, try to estimate anyway with low confidence
- Be conservative in estimates`,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        estimated_weight: typeof parsed.estimated_weight === 'number' ? parsed.estimated_weight : null,
        estimated_purity: typeof parsed.estimated_purity === 'number' ? parsed.estimated_purity : null,
        weight_confidence: parsed.weight_confidence || 'low',
        purity_confidence: parsed.purity_confidence || 'low',
        reference_object: parsed.reference_object || null,
        gps_latitude: gps.latitude,
        gps_longitude: gps.longitude,
        raw_description: parsed.raw_description || '',
      };
    }

    return {
      estimated_weight: null, estimated_purity: null,
      weight_confidence: 'low', purity_confidence: 'low',
      reference_object: null, gps_latitude: gps.latitude, gps_longitude: gps.longitude,
      raw_description: 'Could not parse response',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      estimated_weight: null, estimated_purity: null,
      weight_confidence: 'low', purity_confidence: 'low',
      reference_object: null, gps_latitude: gps.latitude, gps_longitude: gps.longitude,
      raw_description: `Error: ${message}`,
    };
  }
}

// ─── Phase 8: Document field extraction ────────────────────

export interface DocumentFieldExtractionResult {
  fields: Record<string, string | null>;
  confidence: 'high' | 'medium' | 'low';
  raw_description: string;
}

const DOC_TYPE_PROMPTS: Record<string, string> = {
  NRC: `Extract fields from this Zambian National Registration Card (NRC):
{"nrc_number": "<XX/XXXXXX/XX/X format>", "full_name": "<name>", "date_of_birth": "<YYYY-MM-DD>", "gender": "<male|female>"}`,

  MINING_LICENSE: `Extract fields from this mining license:
{"license_number": "<number>", "holder_name": "<name>", "site_name": "<mine site name>", "expiry_date": "<YYYY-MM-DD>"}`,

  PASSPORT: `Extract fields from this passport:
{"passport_number": "<number>", "full_name": "<name>", "nationality": "<country>", "date_of_birth": "<YYYY-MM-DD>", "expiry_date": "<YYYY-MM-DD>"}`,

  COOPERATIVE_CERT: `Extract fields from this cooperative certificate:
{"cooperative_name": "<name>", "registration_number": "<number>", "members_count": "<number or null>"}`,
};

/**
 * Extract structured fields from a document photo using Claude Vision.
 */
export async function extractDocumentFields(
  imageBase64: string,
  mimeType: string,
  docType: string,
): Promise<DocumentFieldExtractionResult> {
  const client = getClient();
  if (!client) {
    return { fields: {}, confidence: 'low', raw_description: 'Vision service not configured (no ANTHROPIC_API_KEY)' };
  }

  const { base64, mediaType } = cleanBase64(imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`);

  const docPrompt = DOC_TYPE_PROMPTS[docType] || `Extract any visible text fields from this document:
{"type": "<document type>", "fields": {}}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `You are analysing a photo of a document for identity verification.
${docPrompt}

Respond with ONLY a JSON object (no markdown):
{"fields": {<extracted fields>}, "confidence": "<high|medium|low>", "raw_description": "<what you see in the document>"}

Rules:
- confidence: high = all fields clearly readable, medium = some fields readable, low = poor quality
- Set unreadable fields to null
- For dates, use YYYY-MM-DD format
- For NRC numbers, use the standard Zambian format (XX/XXXXXX/XX/X)`,
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const text = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        fields: parsed.fields || {},
        confidence: parsed.confidence || 'low',
        raw_description: parsed.raw_description || '',
      };
    }

    return { fields: {}, confidence: 'low', raw_description: 'Could not parse response' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { fields: {}, confidence: 'low', raw_description: `Error: ${message}` };
  }
}
