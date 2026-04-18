export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { renderNewsletterHtml, renderAINewsletterHtml } from '@/lib/newsletter-renderer'
import { generateNewsletterPdf } from '@/lib/pdf-generator'
import type { LegacyNewsletterData } from '@/lib/newsletter-data'
import type { NewsletterData } from '@/lib/ebook-types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsletter_data, recipients, attach_pdf } = body as {
      newsletter_data: any
      recipients: string[]
      attach_pdf?: boolean
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: '수신자를 입력해주세요.' }, { status: 400 })
    }

    // Check SMTP config
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({
        error: 'SMTP 설정이 필요합니다. 환경변수를 확인해주세요: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS',
      }, { status: 503 })
    }

    // Dynamic import nodemailer
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: (smtpPort || '587') === '465',
      auth: { user: smtpUser, pass: smtpPass },
    })

    // Detect AI vs legacy newsletter
    const isAI = !!newsletter_data.newsletter_type
    const html = isAI
      ? renderAINewsletterHtml(newsletter_data as NewsletterData)
      : renderNewsletterHtml(newsletter_data as LegacyNewsletterData)

    const subject = isAI
      ? `부동산 투자 교육 뉴스레터 — ${newsletter_data.title || '오늘의 학습'}`
      : `부동산 온톨로지 뉴스레터 — ${newsletter_data.period_start} ~ ${newsletter_data.period_end}`

    // Prepare attachment if requested
    const attachments: any[] = []
    if (attach_pdf && !isAI) {
      const pdfBytes = generateNewsletterPdf(newsletter_data as LegacyNewsletterData)
      attachments.push({
        filename: `뉴스레터_${newsletter_data.generated_at}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      })
    }

    // Send to each recipient
    const results = { sent: 0, failed: [] as string[] }
    for (const email of recipients) {
      const trimmed = email.trim()
      if (!trimmed) continue
      try {
        await transporter.sendMail({
          from: smtpUser,
          to: trimmed,
          subject,
          html,
          attachments,
        })
        results.sent++
      } catch {
        results.failed.push(trimmed)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('[newsletter/send] Error:', error)
    return NextResponse.json(
      { error: '이메일 발송 중 오류가 발생했습니다.', detail: error?.message },
      { status: 500 }
    )
  }
}
