/** Typed response envelope returned by all API routes */
export interface ApiResponse<T> {
  data: T
  meta?: Record<string, unknown>
  _source?: string
  _mock?: boolean
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, body: unknown) {
    const b = body as { error?: { message?: string; code?: string }; message?: string } | null
    super(b?.error?.message ?? b?.message ?? `HTTP ${status}`)
    this.status = status
    this.code = b?.error?.code
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number
}

export async function apiClient<T>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    })

    if (!res.ok) {
      const body: unknown = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body)
    }

    return res.json() as Promise<ApiResponse<T>>
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── Retry wrapper for resilient fetching ────────────────

export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retries?: number; retryDelay?: number }
): Promise<Response> {
  const { retries = 2, retryDelay = 1000, ...fetchOptions } = options || {}

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions)
      if (res.ok || res.status < 500) return res // Don't retry client errors
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)))
        continue
      }
      return res
    } catch (error) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// Convenience methods — callers provide T explicitly for type safety
export const api = {
  get:    <T>(url: string)                      => apiClient<T>(url),
  post:   <T>(url: string, data: unknown)       => apiClient<T>(url, { method: 'POST',   body: JSON.stringify(data) }),
  patch:  <T>(url: string, data: unknown)       => apiClient<T>(url, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: <T>(url: string)                      => apiClient<T>(url, { method: 'DELETE' }),
}
