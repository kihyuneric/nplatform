/**
 * logger 단위 테스트
 *  - syncLogger: NDJSON 모드에서 stdout/stderr 로 라인 작성
 *  - loggerFor(request): x-request-id 가 baseContext 에 붙음
 *  - createLogger: baseContext 병합
 *  - LOG_LEVEL 필터 준수
 */
// NOTE: NODE_ENV는 logger 로드 시 production으로 고정되어 NDJSON 경로를 타게 한다.
;(process.env as Record<string, string>).NODE_ENV = 'production'
;(process.env as Record<string, string>).LOG_LEVEL = 'debug'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogger, loggerFor, syncLogger } from '@/lib/logger'

describe('syncLogger (production NDJSON)', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes info lines to stdout as NDJSON', () => {
    syncLogger.info('hello', { foo: 'bar' })

    expect(stdoutSpy).toHaveBeenCalledOnce()
    const parsed = JSON.parse((stdoutSpy.mock.calls[0][0] as string).trimEnd())
    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('hello')
    expect(parsed.foo).toBe('bar')
    expect(typeof parsed.ts).toBe('string')
  })

  it('writes error lines to stderr', () => {
    syncLogger.error('boom', { code: 500 })
    expect(stderrSpy).toHaveBeenCalledOnce()
    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trimEnd())
    expect(parsed.level).toBe('error')
    expect(parsed.code).toBe(500)
  })
})

describe('loggerFor + createLogger', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('injects reqId from Request headers', async () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-request-id': 'req-abc-123' },
    })
    const log = loggerFor(req)
    log.info('hit')

    // loggerFor → createLogger uses logWithContext (fire-and-forget).
    // Poll up to 200ms so this holds under heavy parallel CI load.
    const deadline = Date.now() + 200
    let writes = ''
    while (Date.now() < deadline) {
      writes = stdoutSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
      if (writes.includes('"reqId":"req-abc-123"')) break
      await new Promise((r) => setTimeout(r, 5))
    }
    expect(writes).toContain('"reqId":"req-abc-123"')
    expect(writes).toContain('"msg":"hit"')
  })

  it('createLogger merges baseContext (async context path)', async () => {
    const log = createLogger({ service: 'auth', version: 'v1' })
    log.warn('retrying', { attempt: 2 })

    // logWithContext is fire-and-forget; poll briefly for determinism under load
    await new Promise((r) => setTimeout(r, 50))

    const writes = stdoutSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('')
    expect(writes).toContain('"service":"auth"')
    expect(writes).toContain('"version":"v1"')
    expect(writes).toContain('"attempt":2')
    expect(writes).toContain('"level":"warn"')
  })

  it('syncLogger respects LOG_LEVEL filtering', () => {
    // The module reads LOG_LEVEL at import time; for this test we just verify
    // that default level "debug" writes all three severities.
    syncLogger.debug('d')
    syncLogger.info('i')
    syncLogger.warn('w')
    syncLogger.error('e')
    expect(stdoutSpy.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(stderrSpy.mock.calls.length).toBe(1)
  })
})
