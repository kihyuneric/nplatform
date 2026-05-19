/**
 * lib/contract/docusign.ts
 *
 * DocuSign Envelope 생성/조회 어댑터.
 *
 * 환경변수:
 *   DOCUSIGN_BASE_URL          (예: https://demo.docusign.net/restapi)
 *   DOCUSIGN_INTEGRATION_KEY   (Client ID)
 *   DOCUSIGN_USER_ID           (Impersonation User ID)
 *   DOCUSIGN_ACCOUNT_ID
 *   DOCUSIGN_RSA_PRIVATE_KEY   (JWT grant 용 PEM · base64)
 *
 * JWT Grant 흐름:
 *   1) RS256 으로 JWT 서명 (iss=intKey, sub=userId, scope='signature impersonation')
 *   2) /oauth/token 으로 교환 → access_token
 *   3) Envelopes API 호출
 *
 * 미설정 시 → mock envelope 반환 (개발용)
 */

import { logger } from '@/lib/logger'

export interface DocuSignSigner {
  email: string
  name: string
  recipientId: string
  routingOrder?: number
  /** PDF 위 서명 위치 (anchor text 기준) */
  signAnchorText?: string
}

export interface DocuSignEnvelopeInput {
  documentBase64: string       // 계약서 PDF base64
  documentName: string         // 예: '종로구 홍지동 NPL 매매계약.pdf'
  emailSubject: string         // 메일 제목
  signers: DocuSignSigner[]    // 매도자·매수자 (최대 5명)
  /** 콜백 URL (서명 완료 시) */
  webhookUrl?: string
  /** 추가 메타 (Supabase deal_id 등) */
  customFields?: Record<string, string>
}

export interface DocuSignEnvelopeResult {
  envelopeId: string
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided' | 'mock'
  signingUrls?: Record<string, string>   // recipientId → embedded signing URL
  createdAt: string
  /** mock 시 true */
  _mock?: boolean
}

const isConfigured = () =>
  !!process.env.DOCUSIGN_INTEGRATION_KEY &&
  !!process.env.DOCUSIGN_USER_ID &&
  !!process.env.DOCUSIGN_ACCOUNT_ID &&
  !!process.env.DOCUSIGN_RSA_PRIVATE_KEY

/**
 * JWT 발급 + Access Token 교환.
 * 실제 운영 시 docusign-esign SDK 권장.
 */
async function getAccessToken(): Promise<string> {
  // TODO: docusign-esign SDK 또는 jose 로 JWT 서명 + /oauth/token 교환
  // 현재는 placeholder — 실 환경변수 설정 후 구현
  throw new Error('DocuSign access token 발급 미구현 (docusign-esign SDK 통합 필요)')
}

/**
 * Envelope 생성 + 발송.
 * 미설정 환경 → mock 응답 (envelopeId='mock-...')
 */
export async function createEnvelope(input: DocuSignEnvelopeInput): Promise<DocuSignEnvelopeResult> {
  if (!isConfigured()) {
    logger.warn('[docusign] not configured — returning mock envelope', { signers: input.signers.length })
    return {
      envelopeId: `mock-${Date.now().toString(36)}`,
      status: 'mock',
      createdAt: new Date().toISOString(),
      _mock: true,
    }
  }

  // 실 호출 — 운영 환경
  const token = await getAccessToken()
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!
  const base = process.env.DOCUSIGN_BASE_URL!

  const body = {
    emailSubject: input.emailSubject,
    documents: [
      {
        documentBase64: input.documentBase64,
        name: input.documentName,
        fileExtension: 'pdf',
        documentId: '1',
      },
    ],
    recipients: {
      signers: input.signers.map((s) => ({
        email: s.email,
        name: s.name,
        recipientId: s.recipientId,
        routingOrder: s.routingOrder ?? 1,
        tabs: s.signAnchorText
          ? {
              signHereTabs: [
                {
                  anchorString: s.signAnchorText,
                  anchorXOffset: '0',
                  anchorYOffset: '0',
                  anchorUnits: 'pixels',
                },
              ],
            }
          : undefined,
      })),
    },
    status: 'sent',
    eventNotification: input.webhookUrl
      ? {
          url: input.webhookUrl,
          envelopeEvents: [
            { envelopeEventStatusCode: 'completed' },
            { envelopeEventStatusCode: 'declined' },
            { envelopeEventStatusCode: 'voided' },
          ],
        }
      : undefined,
    customFields: input.customFields
      ? {
          textCustomFields: Object.entries(input.customFields).map(([name, value]) => ({
            name,
            value,
            required: 'false',
            show: 'false',
          })),
        }
      : undefined,
  }

  const res = await fetch(`${base}/v2.1/accounts/${accountId}/envelopes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DocuSign API error: HTTP ${res.status} — ${text}`)
  }

  const data = (await res.json()) as { envelopeId: string; status: string; statusDateTime: string }
  return {
    envelopeId: data.envelopeId,
    status: data.status as DocuSignEnvelopeResult['status'],
    createdAt: data.statusDateTime,
  }
}

/** Envelope 상태 조회 */
export async function getEnvelopeStatus(envelopeId: string): Promise<DocuSignEnvelopeResult> {
  if (!isConfigured() || envelopeId.startsWith('mock-')) {
    return {
      envelopeId,
      status: 'mock',
      createdAt: new Date().toISOString(),
      _mock: true,
    }
  }
  const token = await getAccessToken()
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!
  const base = process.env.DOCUSIGN_BASE_URL!
  const res = await fetch(`${base}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`DocuSign status fetch failed: HTTP ${res.status}`)
  const data = (await res.json()) as { envelopeId: string; status: string; statusDateTime: string }
  return {
    envelopeId: data.envelopeId,
    status: data.status as DocuSignEnvelopeResult['status'],
    createdAt: data.statusDateTime,
  }
}
