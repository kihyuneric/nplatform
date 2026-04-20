/**
 * Phase 2-G — Slack Incoming Webhook 발송 헬퍼
 *
 * 환경변수:
 *   SLACK_WEBHOOK_URL  — Slack incoming webhook URL (없으면 no-op + 콘솔 로그)
 *   SLACK_DEFAULT_CHANNEL  — 선택: 기본 채널 (webhook 자체에 채널이 묶여 있으면 무시됨)
 *
 * 사용:
 *   import { sendSlack, sendSlackBlocks } from '@/lib/notifications/slack'
 *   await sendSlack({ text: '🔔 새 매물 등록' })
 *   await sendSlackBlocks({ text: 'fallback', blocks: [...] })
 *
 * 정책:
 *   - 실패해도 throw 하지 않음 (모니터링/알림이 본 비즈니스 흐름을 막지 않도록)
 *   - dev/test 환경에서는 webhook 미설정 시 console.info 로 출력
 *   - 5초 timeout — Slack hang 방지
 */

const TIMEOUT_MS = 5_000

type SlackBlock = Record<string, unknown>

export interface SlackPayload {
  text: string
  channel?: string
  username?: string
  icon_emoji?: string
  blocks?: SlackBlock[]
  attachments?: SlackBlock[]
}

export interface SlackResult {
  ok: boolean
  reason?: 'no-webhook' | 'http-error' | 'timeout' | 'exception'
  status?: number
  message?: string
}

function getWebhookUrl(): string | null {
  const url = process.env.SLACK_WEBHOOK_URL?.trim()
  if (!url) return null
  if (!url.startsWith('https://hooks.slack.com/')) {
    console.warn('[slack] SLACK_WEBHOOK_URL does not look like a Slack webhook')
  }
  return url
}

/**
 * 텍스트 또는 블록 메시지를 Slack 으로 발송.
 * webhook 미설정 시 콘솔에 로그만 남기고 ok:false, reason:'no-webhook' 반환.
 */
export async function sendSlack(payload: SlackPayload): Promise<SlackResult> {
  const webhook = getWebhookUrl()
  const channel = payload.channel ?? process.env.SLACK_DEFAULT_CHANNEL

  if (!webhook) {
    console.info('[slack:no-webhook]', payload.text, channel ? `→ ${channel}` : '')
    return { ok: false, reason: 'no-webhook' }
  }

  const body = {
    text: payload.text,
    ...(channel ? { channel } : {}),
    ...(payload.username ? { username: payload.username } : {}),
    ...(payload.icon_emoji ? { icon_emoji: payload.icon_emoji } : {}),
    ...(payload.blocks ? { blocks: payload.blocks } : {}),
    ...(payload.attachments ? { attachments: payload.attachments } : {}),
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[slack:http-error]', res.status, text)
      return { ok: false, reason: 'http-error', status: res.status, message: text }
    }
    return { ok: true, status: res.status }
  } catch (err) {
    clearTimeout(timer)
    const isAbort = err instanceof DOMException && err.name === 'AbortError'
    const message = err instanceof Error ? err.message : String(err)
    console.warn(isAbort ? '[slack:timeout]' : '[slack:exception]', message)
    return { ok: false, reason: isAbort ? 'timeout' : 'exception', message }
  }
}

/**
 * Block-kit 메시지 단축 헬퍼.
 * fallback `text` 는 알림 푸시·미리보기에 쓰이므로 항상 전달.
 */
export async function sendSlackBlocks(args: {
  text: string
  blocks: SlackBlock[]
  channel?: string
}): Promise<SlackResult> {
  return sendSlack({ text: args.text, blocks: args.blocks, channel: args.channel })
}

// ── Block 빌더 단축 함수 ────────────────────────────────────────

export const slackBlocks = {
  header: (text: string): SlackBlock => ({
    type: 'header',
    text: { type: 'plain_text', text, emoji: true },
  }),

  section: (markdown: string): SlackBlock => ({
    type: 'section',
    text: { type: 'mrkdwn', text: markdown },
  }),

  context: (markdownLines: string[]): SlackBlock => ({
    type: 'context',
    elements: markdownLines.map((t) => ({ type: 'mrkdwn', text: t })),
  }),

  divider: (): SlackBlock => ({ type: 'divider' }),

  fields: (pairs: Array<{ label: string; value: string }>): SlackBlock => ({
    type: 'section',
    fields: pairs.map((p) => ({ type: 'mrkdwn', text: `*${p.label}*\n${p.value}` })),
  }),

  actionLink: (text: string, url: string): SlackBlock => ({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text, emoji: true },
        url,
      },
    ],
  }),
}
