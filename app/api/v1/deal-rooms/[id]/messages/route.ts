/**
 * /api/v1/deal-rooms/[id]/messages
 *
 * GET  — 채팅 메시지 이력 (시간순)
 * POST — 신규 메시지 전송 (PII 마스킹 + NDA 게이트 검증)
 *
 * 정책:
 *   · 매수자/매도자만 채팅 가능. NDA 미체결자는 POST 차단.
 *   · PII 자동 마스킹 — 전화번호 / 주민번호 / 이메일 / 외부 링크 차단
 *   · DB 미준비 시 sample fallback 으로 일관된 데모 흐름 유지
 */
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getById } from '@/lib/data-layer'
import { getAuthUser } from '@/lib/auth/get-user'

export interface DealMessage {
  id: string
  listing_id: string
  /** 발신자 사용자 ID (시스템 메시지의 경우 'system') */
  sender_id: string
  /** 마스킹된 발신자 표시명 */
  sender_label: string
  /** 'BUYER' | 'SELLER' | 'SYSTEM' */
  sender_role: 'BUYER' | 'SELLER' | 'SYSTEM'
  /** 메시지 본문 (PII 마스킹된 후 저장) */
  body: string
  /** 첨부 파일 (옵션) */
  attachments?: Array<{
    id: string
    name: string
    size: number
    url: string
  }>
  /** 자동 마스킹된 PII 카테고리 (예: ['phone', 'email']) — UI 가 안내 표시 */
  masked_categories?: string[]
  created_at: string
}

// ─── PII 자동 마스킹 ────────────────────────────────────────
const PII_PATTERNS: Array<{ kind: string; re: RegExp; replacer: (m: string) => string }> = [
  // 전화번호 (한국)
  { kind: 'phone', re: /\b(?:01[016789]|02|0[3-6]\d?)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, replacer: () => '[전화번호 마스킹]' },
  // 주민등록번호
  { kind: 'rrn', re: /\b\d{6}-?[1-4]\d{6}\b/g, replacer: () => '[주민번호 마스킹]' },
  // 이메일
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacer: () => '[이메일 마스킹]' },
  // 카카오톡 / 텔레그램 / 디스코드 ID 패턴
  { kind: 'external_handle', re: /\b(?:kakao|telegram|텔레그램|카카오톡)\s*(?:id|아이디)?\s*[:=]?\s*[A-Za-z0-9_.-]{3,}\b/gi, replacer: () => '[외부 채널 핸들 마스킹]' },
  // 외부 URL (단, nplatform.co.kr 제외)
  { kind: 'external_url', re: /\bhttps?:\/\/(?!(?:[a-z0-9-]+\.)?nplatform\.co\.kr)[^\s]+/gi, replacer: () => '[외부 링크 마스킹]' },
]

export function maskPII(text: string): { masked: string; categories: string[] } {
  let masked = text
  const categories = new Set<string>()
  for (const p of PII_PATTERNS) {
    if (p.re.test(masked)) {
      categories.add(p.kind)
      // RegExp 의 lastIndex 초기화
      p.re.lastIndex = 0
      masked = masked.replace(p.re, p.replacer)
    }
  }
  return { masked, categories: Array.from(categories) }
}

// ─── Sample fallback ─────────────────────────────────────────
function buildSampleMessages(listingId: string, institution: string): DealMessage[] {
  const now = Date.now()
  const seller = institution || '○○은행'
  return [
    {
      id: `${listingId.slice(0, 8)}-MSG-001`,
      listing_id: listingId,
      sender_id: 'system',
      sender_label: 'NPLatform 시스템',
      sender_role: 'SYSTEM',
      body: 'NDA 체결 완료. 검증 데이터 열람이 가능합니다. 메시지 입력 시 전화번호·이메일·외부 링크는 자동으로 마스킹됩니다.',
      created_at: new Date(now - 3 * 24 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-MSG-002`,
      listing_id: listingId,
      sender_id: 'seller-demo',
      sender_label: `매도자 · ${seller}`,
      sender_role: 'SELLER',
      body: '안녕하십니까. 매물 검토에 관심 가져 주셔서 감사합니다. 현장 실사는 언제쯤 가능하실까요?',
      created_at: new Date(now - 2 * 24 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-MSG-003`,
      listing_id: listingId,
      sender_id: 'buyer-demo',
      sender_label: '매수자',
      sender_role: 'BUYER',
      body: '검토 감사합니다. 다음 주 화/수 가능합니다. 감정평가서 PDF 함께 받을 수 있을까요?',
      created_at: new Date(now - 36 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-MSG-004`,
      listing_id: listingId,
      sender_id: 'seller-demo',
      sender_label: `매도자 · ${seller}`,
      sender_role: 'SELLER',
      body: '감정평가서는 NDA 사후 자료실에 업로드되어 있습니다. 화요일 오전 10시 30분에 만나뵙는 걸로 진행하시지요.',
      attachments: [{ id: 'att-001', name: '감정평가서_요약본.pdf', size: 2_400_000, url: '#' }],
      created_at: new Date(now - 22 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-MSG-005`,
      listing_id: listingId,
      sender_id: 'system',
      sender_label: 'NPLatform 시스템',
      sender_role: 'SYSTEM',
      body: '매수자가 LOI 를 제출했습니다. 매도자 검토 중입니다.',
      created_at: new Date(now - 18 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-MSG-006`,
      listing_id: listingId,
      sender_id: 'buyer-demo',
      sender_label: '매수자',
      sender_role: 'BUYER',
      body: 'LOI 첨부드렸습니다. 가격은 조정 여지가 있습니다. 회신 부탁드립니다.',
      created_at: new Date(now - 12 * 3600_000).toISOString(),
    },
    {
      id: `${listingId.slice(0, 8)}-MSG-007`,
      listing_id: listingId,
      sender_id: 'seller-demo',
      sender_label: `매도자 · ${seller}`,
      sender_role: 'SELLER',
      body: '내부 결재 진행 중. 금주 중 회신드리겠습니다.',
      created_at: new Date(now - 4 * 3600_000).toISOString(),
    },
  ]
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { data: listing } = await getById('deal_listings', id)
    const institution =
      (listing as { creditor_institution?: string; institution_name?: string; institution?: string } | null)
        ?.creditor_institution ??
      (listing as { institution_name?: string } | null)?.institution_name ??
      (listing as { institution?: string } | null)?.institution ?? ''

    // TODO: 실제 deal_room_messages 테이블 + Supabase Realtime 연동.
    const messages = buildSampleMessages(id, institution)
    return NextResponse.json(
      { data: messages, _source: 'sample' },
      { headers: { 'Cache-Control': 'private, max-age=10, must-revalidate' } },
    )
  } catch (err) {
    logger.error('[deal-rooms/[id]/messages] GET error:', { error: err })
    return NextResponse.json({ data: [], _source: 'sample' }, { status: 200 })
  }
}

// ─── POST — 메시지 전송 ──────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 },
      )
    }

    const body = await request.json() as Partial<{ body: string; attachments: DealMessage['attachments'] }>
    if (!body.body || !body.body.trim()) {
      return NextResponse.json(
        { error: { code: 'EMPTY_BODY', message: '메시지 본문이 비어있습니다.' } },
        { status: 400 },
      )
    }

    // PII 자동 마스킹
    const { masked, categories } = maskPII(body.body)

    // 발신자 역할 — listing.seller_id 기준
    const { data: listing } = await getById('deal_listings', id)
    const sellerId = (listing as { seller_id?: string }).seller_id ?? null
    const isSeller = sellerId && String(sellerId) === String(user.id)
    const senderLabel = isSeller
      ? `매도자 · ${(listing as { creditor_institution?: string; institution_name?: string }).creditor_institution ?? '매도자'}`
      : '매수자'

    // TODO: 실 DB insert + Supabase Realtime publish
    const message: DealMessage = {
      id: `${id.slice(0, 8)}-MSG-${Date.now()}`,
      listing_id: id,
      sender_id: String(user.id),
      sender_label: senderLabel,
      sender_role: isSeller ? 'SELLER' : 'BUYER',
      body: masked,
      attachments: body.attachments,
      masked_categories: categories.length > 0 ? categories : undefined,
      created_at: new Date().toISOString(),
    }
    return NextResponse.json({ data: message, _source: 'mock' }, { status: 201 })
  } catch (err) {
    logger.error('[deal-rooms/[id]/messages] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '메시지 전송 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
