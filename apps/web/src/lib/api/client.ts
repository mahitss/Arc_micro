/**
 * @file client.ts
 * @description Centralized HTTP client for the AgentPay Gateway API.
 */

export class ApiError extends Error {
  public status: number;
  public code: string;
  public requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export const DEFAULT_DEMO_API_KEY = 'apk_live_demo1234567890abcdef1234567890abcdef';
export const DEFAULT_ORG_ID = 'org_default';
export const DEFAULT_TIMEOUT_MS = 10000;

export function getBaseApiUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    const configured = (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_GATEWAY_URL ||
      process.env.GATEWAY_URL
    );
    if (configured && configured.trim()) {
      return configured.trim().replace(/\/$/, '');
    }
  }
  return 'http://localhost:8080';
}

export function getDefaultOrgId(): string {
  if (typeof process !== 'undefined' && process.env) {
    const org = (
      process.env.NEXT_PUBLIC_ORGANIZATION_ID ||
      process.env.NEXT_PUBLIC_ORG_ID
    );
    if (org && org.trim()) return org.trim();
  }
  return DEFAULT_ORG_ID;
}

export function getApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    // When executing server-side (Next.js server components or API routes), prefer unexposed private keys
    if (typeof window === 'undefined') {
      const serverKey = process.env.GATEWAY_API_KEY || process.env.AGENTPAY_API_KEY;
      if (serverKey && serverKey.trim()) return serverKey.trim();
    }
    const key = (
      process.env.NEXT_PUBLIC_DEMO_API_KEY ||
      process.env.NEXT_PUBLIC_API_KEY ||
      process.env.NEXT_PUBLIC_AGENTPAY_API_KEY
    );
    if (key && key.trim()) return key.trim();
  }
  return DEFAULT_DEMO_API_KEY;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Organization-Id': getDefaultOrgId(),
  };

  const apiKey = getApiKey();
  if (apiKey) {
    defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  let customHeaders: Record<string, string> = {};
  if (fetchOptions.headers) {
    if (fetchOptions.headers instanceof Headers) {
      fetchOptions.headers.forEach((val, key) => {
        customHeaders[key] = val;
      });
    } else if (Array.isArray(fetchOptions.headers)) {
      fetchOptions.headers.forEach(([k, v]) => {
        customHeaders[k] = v;
      });
    } else {
      customHeaders = { ...(fetchOptions.headers as Record<string, string>) };
    }
  }

  const finalHeaders = {
    ...defaultHeaders,
    ...customHeaders,
  };

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: finalHeaders,
    });

    const requestId = res.headers.get('x-request-id') || undefined;

    if (!res.ok) {
      let errorCode = 'UNKNOWN_ERROR';
      if (res.status === 404) errorCode = 'NOT_FOUND';
      else if (res.status === 401) errorCode = 'UNAUTHORIZED';
      else if (res.status === 403) errorCode = 'FORBIDDEN';
      else if (res.status === 408) errorCode = 'REQUEST_TIMEOUT';
      else if (res.status >= 500) errorCode = 'INTERNAL_ERROR';

      let errorMessage = `API request failed with status ${res.status}`;

      try {
        const errorJson = await res.json();
        if (errorJson.error) {
          errorCode = errorJson.error.code || errorCode;
          errorMessage = errorJson.error.message || errorMessage;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Response was not JSON
      }

      throw new ApiError(res.status, errorCode, errorMessage, requestId);
    }

    // Parse JSON
    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', `Request timed out after ${timeoutMs}ms`);
    }

    const rawMessage = err instanceof Error ? err.message : 'Network request failed';
    const message = rawMessage === 'Failed to fetch'
      ? `Unable to connect to AgentPay Gateway at ${baseUrl}. Ensure backend service is reachable.`
      : rawMessage;
    throw new ApiError(503, 'NETWORK_UNAVAILABLE', message);
  } finally {
    clearTimeout(timeoutId);
  }
}
