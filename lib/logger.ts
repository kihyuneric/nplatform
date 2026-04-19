/**
 * Structured logger for server-side use.
 *
 * - Development: pretty colored console output
 * - Production: newline-delimited JSON (NDJSON) for log aggregation (Datadog, Axiom, etc.)
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('Listing fetched', { listingId, userId })
 *   logger.error('DB error', { error: err, route: '/api/exchange/listings' })
 *
 * Do NOT import this in client components ('use client'). Use browser console there.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function log(level: LogLevel, message: string, context?: LogContext) {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return

  if (process.env.NODE_ENV === 'production') {
    // NDJSON — structured, machine-parseable. One object per line.
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg: message,
      ...context,
    })
    if (level === 'error') {
      process.stderr.write(entry + '\n')
    } else {
      process.stdout.write(entry + '\n')
    }
  } else {
    // Pretty dev output
    const prefix: Record<LogLevel, string> = {
      debug: '\x1b[90m[DEBUG]\x1b[0m',
      info:  '\x1b[36m[INFO ]\x1b[0m',
      warn:  '\x1b[33m[WARN ]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
    }
    const ts = new Date().toISOString().slice(11, 23)
    const ctx = context ? ' ' + JSON.stringify(context) : ''
    const line = `${prefix[level]} ${ts} ${message}${ctx}`
    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }
  }
}

async function getRequestContext(): Promise<LogContext> {
  if (typeof process === 'undefined' || process.env.NEXT_RUNTIME === 'edge') return {}
  try {
    // next/headers는 App Router 서버 컨텍스트에서만 호출 가능. 없으면 조용히 무시.
    const { headers } = await import('next/headers')
    const h = await headers()
    const reqId = h.get('x-request-id')
    return reqId ? { reqId } : {}
  } catch {
    return {}
  }
}

function logWithContext(level: LogLevel, message: string, context?: LogContext) {
  void getRequestContext().then((reqCtx) => {
    log(level, message, { ...reqCtx, ...context })
  }).catch(() => {
    log(level, message, context)
  })
}

export const logger = {
  debug: (message: string, context?: LogContext) => logWithContext('debug', message, context),
  info:  (message: string, context?: LogContext) => logWithContext('info', message, context),
  warn:  (message: string, context?: LogContext) => logWithContext('warn', message, context),
  error: (message: string, context?: LogContext) => logWithContext('error', message, context),
}

/**
 * 요청 컨텍스트 밖(백그라운드 작업, cron 등)에서 쓰는 동기 로거.
 * next/headers 조회를 건너뛰므로 reqId가 붙지 않습니다.
 */
export const syncLogger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info:  (message: string, context?: LogContext) => log('info', message, context),
  warn:  (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}

/**
 * 요청 객체(NextRequest·Request·Headers)에서 request-id를 추출한 로거를 만듭니다.
 * API 라우트 handler 상단에서:
 *   const log = loggerFor(req)
 *   log.info('listing fetched', { listingId })
 */
export function loggerFor(reqOrHeaders: Request | { headers: Headers | Record<string, string> } | Headers) {
  let reqId: string | null = null
  try {
    const h =
      reqOrHeaders instanceof Headers ? reqOrHeaders :
      'headers' in reqOrHeaders ? (reqOrHeaders.headers as Headers) : null
    reqId = h?.get?.('x-request-id') ?? null
  } catch { /* noop */ }
  return reqId ? createLogger({ reqId }) : syncLogger
}

/** 고정 메타데이터(서비스·버전·사용자 id 등)를 붙인 로거 생성 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) => logWithContext('debug', message, { ...baseContext, ...context }),
    info:  (message: string, context?: LogContext) => logWithContext('info',  message, { ...baseContext, ...context }),
    warn:  (message: string, context?: LogContext) => logWithContext('warn',  message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) => logWithContext('error', message, { ...baseContext, ...context }),
  }
}
