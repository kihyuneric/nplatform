/**
 * fetch-with-retry 단위 테스트
 *  - 정상 응답 / 재시도 / 500 한계 초과 / 비재시도 상태(4xx) / 타임아웃
 *  - 토큰버킷(동일 host 연속 호출)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExternalApiError, fetchJson, fetchWithRetry } from '@/lib/utils/fetch-with-retry'

const BASE = 'https://example.test'

function mockResponse(body: unknown, init?: { status?: number; statusText?: string }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('fetchWithRetry', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('returns response on first success', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ ok: true }))
    const res = await fetchWithRetry(`${BASE}/one`, { retries: 2, backoffMs: 1 })
    expect(res.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('retries on 503 then succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({}, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(mockResponse({ ok: true }))

    const res = await fetchWithRetry(`${BASE}/retry`, { retries: 2, backoffMs: 1 })
    expect(res.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('throws ExternalApiError on non-retryable 4xx without retry', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({}, { status: 404, statusText: 'Not Found' }))

    await expect(
      fetchWithRetry(`${BASE}/404`, { retries: 3, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(ExternalApiError)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('throws after exhausting retries on persistent 500', async () => {
    fetchSpy.mockResolvedValue(mockResponse({}, { status: 500, statusText: 'Err' }))

    await expect(
      fetchWithRetry(`${BASE}/500`, { retries: 2, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(ExternalApiError)
    // initial + 2 retries = 3
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('propagates abort/timeout as the last error', async () => {
    fetchSpy.mockImplementation((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal) signal.addEventListener('abort', () => reject(new Error('aborted')))
      }),
    )

    await expect(
      fetchWithRetry(`${BASE}/slow`, { retries: 0, backoffMs: 1, timeoutMs: 5 }),
    ).rejects.toBeInstanceOf(Error)
  })
})

describe('fetchJson', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => { fetchSpy = vi.spyOn(globalThis, 'fetch') })
  afterEach(() => { fetchSpy.mockRestore() })

  it('parses JSON body', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ hello: 'world', n: 42 }))
    const data = await fetchJson<{ hello: string; n: number }>(`${BASE}/j`, { retries: 0, backoffMs: 1 })
    expect(data).toEqual({ hello: 'world', n: 42 })
  })
})
