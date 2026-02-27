import Anthropic from '@anthropic-ai/sdk';

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

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
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

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
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
