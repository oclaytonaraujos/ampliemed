/**
 * API Request Wrapper with Versioning and Error Handling
 * Provides uniform request/response handling with API versioning
 */

import { API_VERSIONS } from '../constants';

/**
 * Represents API version for request headers
 */
export type ApiVersion = typeof API_VERSIONS[keyof typeof API_VERSIONS];

export interface RequestOptions extends RequestInit {
  version?: ApiVersion;
  timeout?: number;
  retries?: number;
}

/**
 * Makes an HTTP request with API versioning support
 * @param url The URL to request
 * @param options Request options including version, timeout, retries
 * @returns Response as JSON
 *
 * @example
 * const data = await apiRequest('/api/patients', {
 *   version: API_VERSIONS.V2,
 *   method: 'GET'
 * });
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    version = API_VERSIONS.V1,
    timeout = 10000,
    retries = 3,
    ...fetchOptions
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Version': version,
    'User-Agent': 'AmplieMed/2.0',
    ...(fetchOptions.headers as Record<string, string>),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `API Error [${response.status}]: ${response.statusText}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (
        lastError.message.includes('AbortError') ||
        lastError.message.includes('Network Error')
      ) {
        // On timeout, don't retry, fail fast
        if (lastError.message.includes('AbortError')) {
          throw new Error('Request timed out');
        }
      }

      // Exponential backoff for retries
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Creates a typed API client for a specific endpoint
 * @param baseUrl Base URL for the endpoint
 * @param defaultVersion Default API version for this client
 * @returns Typed API client object
 *
 * @example
 * const patientsApi = createApiClient('/api/patients');
 * const patient = await patientsApi.get(patientId);
 */
export function createApiClient<T = any>(
  baseUrl: string,
  defaultVersion: ApiVersion = API_VERSIONS.V1
) {
  return {
    async get(id?: string, options?: RequestOptions): Promise<T> {
      const url = id ? `${baseUrl}/${id}` : baseUrl;
      return apiRequest<T>(url, {
        method: 'GET',
        version: defaultVersion,
        ...options,
      });
    },

    async create(data: Partial<T>, options?: RequestOptions): Promise<T> {
      return apiRequest<T>(baseUrl, {
        method: 'POST',
        body: JSON.stringify(data),
        version: defaultVersion,
        ...options,
      });
    },

    async update(id: string, data: Partial<T>, options?: RequestOptions): Promise<T> {
      return apiRequest<T>(`${baseUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        version: defaultVersion,
        ...options,
      });
    },

    async delete(id: string, options?: RequestOptions): Promise<void> {
      await apiRequest<void>(`${baseUrl}/${id}`, {
        method: 'DELETE',
        version: defaultVersion,
        ...options,
      });
    },

    async list(params?: Record<string, any>, options?: RequestOptions): Promise<T[]> {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const url = searchParams.toString()
        ? `${baseUrl}?${searchParams}`
        : baseUrl;
      return apiRequest<T[]>(url, {
        method: 'GET',
        version: defaultVersion,
        ...options,
      });
    },
  };
}

/**
 * Adds request/response interceptors to all API calls
 */
export function createApiInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    // Log request
    const url = typeof input === 'string' ? input : input.url;
    console.log(`[API] ${init?.method || 'GET'} ${url}`);

    try {
      const response = await originalFetch(input, init);

      // Log response status
      if (!response.ok) {
        console.error(`[API] Response ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`[API] Request failed:`, error);
      throw error;
    }
  } as typeof fetch;
}
