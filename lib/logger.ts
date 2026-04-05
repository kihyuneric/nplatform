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

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info:  (message: string, context?: LogContext) => log('info', message, context),
  warn:  (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}
