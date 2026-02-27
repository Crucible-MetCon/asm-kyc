const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public body: unknown,
  ) {
    super(`API Error ${statusCode}`);
    this.name = 'ApiError';
  }
}

/**
 * Thrown when a fetch fails due to network connectivity (offline, DNS failure, etc.)
 * Distinct from ApiError which means the server responded with an error status.
 */
export class NetworkError extends Error {
  constructor(message = 'Network request failed — you may be offline') {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  if (options?.body) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    // fetch() throws TypeError on network failure (offline, DNS, CORS preflight fail, etc.)
    throw new NetworkError(
      err instanceof Error ? err.message : 'Network request failed',
    );
  }

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError(401, null);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }

  return res.json() as Promise<T>;
}
