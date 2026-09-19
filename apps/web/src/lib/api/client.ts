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

const DEFAULT_TIMEOUT_MS = 10000;

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GATEWAY_URL) {
    return process.env.NEXT_PUBLIC_GATEWAY_URL;
  }
  return 'http://localhost:8080';
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

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
    });

    const requestId = res.headers.get('x-request-id') || undefined;

    if (!res.ok) {
      let errorCode = 'UNKNOWN_ERROR';
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

    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(503, 'NETWORK_UNAVAILABLE', message);
  } finally {
    clearTimeout(timeoutId);
  }
}
