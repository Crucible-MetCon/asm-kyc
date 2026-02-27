import { createHmac } from 'node:crypto';
import { featureFlags } from './featureFlags.js';

const SANDBOX_URL = 'https://sandbox.api.yellowcard.io';
const PRODUCTION_URL = 'https://api.yellowcard.io';

function getBaseUrl(): string {
  return process.env.YELLOWCARD_SANDBOX === 'false' ? PRODUCTION_URL : SANDBOX_URL;
}

function getApiKey(): string {
  const key = process.env.YELLOWCARD_API_KEY;
  if (!key) throw new Error('YELLOWCARD_API_KEY is not configured');
  return key;
}

function getSecretKey(): string {
  const secret = process.env.YELLOWCARD_SECRET_KEY;
  if (!secret) throw new Error('YELLOWCARD_SECRET_KEY is not configured');
  return secret;
}

/**
 * Build HMAC-SHA256 signature for Yellow Card API.
 * Scheme: YcHmacV1 {apiKey}:{signature}
 * Signature = HMAC-SHA256(secretKey, timestamp + path + body)
 */
function signRequest(
  method: string,
  path: string,
  body: string,
  timestamp: string,
): { authorization: string; timestamp: string } {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();

  const message = timestamp + path + body;
  const signature = createHmac('sha256', secretKey).update(message).digest('hex');

  return {
    authorization: `YcHmacV1 ${apiKey}:${signature}`,
    timestamp,
  };
}

async function ycFetch<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  if (!featureFlags.yellowCardEnabled) {
    throw new Error('Yellow Card integration is disabled');
  }

  const baseUrl = getBaseUrl();
  const bodyStr = body ? JSON.stringify(body) : '';
  const timestamp = new Date().toISOString();

  const { authorization, timestamp: ts } = signRequest(method, path, bodyStr, timestamp);

  const headers: Record<string, string> = {
    Authorization: authorization,
    'X-YC-Timestamp': ts,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Yellow Card API error ${res.status}: ${errBody}`);
  }

  return res.json() as Promise<T>;
}

/* ── Public API methods ── */

export interface YcPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  fee?: number;
  feeCurrency?: string;
  [key: string]: unknown;
}

export interface YcChannelResponse {
  id: string;
  name: string;
  countryCode: string;
  currency: string;
  type: string;
  [key: string]: unknown;
}

export interface YcRateResponse {
  code: string;
  buy: number;
  sell: number;
  [key: string]: unknown;
}

export async function createPayment(data: {
  amount: number;
  currency: string;
  channelId: string;
  reason: string;
  sender?: { name: string; country: string };
  destination?: { accountNumber: string; accountType: string; networkId?: string };
}): Promise<YcPaymentResponse> {
  return ycFetch<YcPaymentResponse>('POST', '/business/payments', data);
}

export async function getPayment(paymentId: string): Promise<YcPaymentResponse> {
  return ycFetch<YcPaymentResponse>('GET', `/business/payments/${paymentId}`);
}

export async function getChannels(countryCode = 'ZM'): Promise<YcChannelResponse[]> {
  return ycFetch<YcChannelResponse[]>('GET', `/business/channels?countryCode=${countryCode}`);
}

export async function getRates(currency = 'ZMW'): Promise<YcRateResponse[]> {
  return ycFetch<YcRateResponse[]>('GET', `/business/rates?currency=${currency}`);
}
