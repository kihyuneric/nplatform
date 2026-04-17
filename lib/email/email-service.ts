/**
 * NPLatform Email Service
 * Uses Resend HTTP API (no package required).
 * Falls back to console.log in development if RESEND_API_KEY is absent.
 *
 * Usage:
 *   import { sendEmail } from '@/lib/email/email-service'
 *   import { dealStageEmail } from '@/lib/email/templates'
 *
 *   await sendEmail({
 *     to: 'user@example.com',
 *     ...dealStageEmail({ name: '홍길동', dealTitle: '강남 오피스텔 NPL', stage: 'NDA_SIGNED', dealId: 'abc' }),
 *   })
 */

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'NPLatform <no-reply@nplatform.kr>'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  tags?: Array<{ name: string; value: string }>
}

export interface EmailResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * Send a transactional email via Resend.
 * In development (no API key), logs to console and returns { ok: true }.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  // Development / no-key fallback: log only
  if (!apiKey || apiKey === 'placeholder') {
    console.info('[email:dev]', {
      to: opts.to,
      subject: opts.subject,
      preview: opts.html.slice(0, 200).replace(/<[^>]+>/g, ''),
    })
    return { ok: true, id: `dev-${Date.now()}` }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo,
        cc: opts.cc,
        bcc: opts.bcc,
        tags: opts.tags,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', res.status, err)
      return { ok: false, error: `Resend ${res.status}: ${err}` }
    }

    const data = await res.json() as { id: string }
    return { ok: true, id: data.id }
  } catch (err) {
    console.error('[email] fetch error:', err)
    return { ok: false, error: String(err) }
  }
}

/**
 * Send to multiple recipients in parallel (max 10 at a time to avoid rate limits).
 */
export async function sendBulkEmail(
  recipients: Array<{ to: string; subject: string; html: string }>,
  concurrency = 5,
): Promise<EmailResult[]> {
  const results: EmailResult[] = []
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((r) => sendEmail(r)))
    results.push(...batchResults)
  }
  return results
}

/**
 * Get user email from Supabase auth by userId.
 * Convenience helper for server-side triggers.
 * Uses `any` to remain compatible with all SupabaseClient generics.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserEmail(supabase: any, userId: string): Promise<{ email: string | null; name: string }> {
  try {
    const { data } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()
    const row = data as { email?: string; name?: string } | null
    return { email: row?.email ?? null, name: row?.name ?? '고객' }
  } catch {
    return { email: null, name: '고객' }
  }
}
