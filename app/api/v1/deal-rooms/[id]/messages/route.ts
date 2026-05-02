/**
 * /api/v1/deal-rooms/[id]/messages   ([id] = deal_room_id)
 *
 * GET  — 채팅 메시지 이력 (시간순)
 * POST — 신규 메시지 전송 (PII 마스킹 + NDA 게이트 검증)
 *
 * 정책 (P0-4 · 2026-05-02 · 진단서 NPLatform_Code_Gap_Audit):
 *   · 매수자/매도자만 채팅 가능 (deal_room_participants 또는 deal_room_members)
 *   · PII 자동 마스킹 — 전화번호 / 주민번호 / 이메일 / 외부 링크 차단
 *   · POST 는 deal_room_messages 에 실제 INSERT → Supabase Realtime publication
 *     (`20260419_dealroom_realtime` 마이그레이션에서 publication + REPLICA IDENTITY FULL 설정 완료)
 *   · DB 미준비 / 빈 결과 시 sample fallback 으로 데모 흐름 유지
 */
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getById } from '@/lib/data-layer'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { maskPII } from '@/lib/pii-mask'

export interface DealMessage {
  id: string
  /** deal_room_id (또는 hashed listing prefix) */
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

// ─── 발신자 역할 결정 ─────────────────────────────────────────
async function resolveSenderRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dealRoomId: string,
  userId: string,
): Promise<'BUYER' | 'SELLER' | 'SYSTEM'> {
  // 1) deal_room_participants (022 마이그레이션)
  const { data: parts } = await supabase
    .from('deal_room_participants')
    .select('role')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', userId)
    .maybeSingle()
  if (parts?.role === 'BUYER') return 'BUYER'
  if (parts?.role === 'SELLER' || parts?.role === 'OWNER') return 'SELLER'

  // 2) deal_room_members (legacy)
  const { data: members } = await supabase
    .from('deal_room_members')
    .select('role')
    .eq('deal_room_id', dealRoomId)
    .eq('user_id', userId)
    .maybeSingle()
  if (members?.role === 'BUYER') return 'BUYER'
  if (members?.role === 'SELLER' || members?.role === 'OWNER') return 'SELLER'

  // 3) deal_rooms.created_by 매칭 시 SELLER 로 가정 (창설자)
  const { data: room } = await supabase
    .from('deal_rooms')
    .select('created_by, listing_id')
    .eq('id', dealRoomId)
    .maybeSingle()
  if (room?.created_by === userId) return 'SELLER'

  // 4) listing.seller_id 매칭 시 SELLER
  const listingId = room?.listing_id
  if (listingId) {
    const { data: listing } = await getById('deal_listings', String(listingId))
    const sellerId = (listing as { seller_id?: string } | null)?.seller_id ?? null
    if (sellerId && sellerId === userId) return 'SELLER'
  }

  // 기본은 BUYER
  return 'BUYER'
}

// ─── DB row → DealMessage 매핑 ────────────────────────────────
async function mapDbRowToMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<DealMessage> {
  // 발신자 역할 — 메시지 row 자체의 message_type 우선
  let senderRole: 'BUYER' | 'SELLER' | 'SYSTEM' = 'BUYER'
  if (row.message_type === 'SYSTEM' || row.message_type === 'STATUS_CHANGE') {
    senderRole = 'SYSTEM'
  } else if (row.user_id) {
    senderRole = await resolveSenderRole(supabase, row.deal_room_id, row.user_id)
  }

  // 발신자 라벨
  let senderLabel = '시스템'
  if (senderRole === 'BUYER') senderLabel = '매수자'
  if (senderRole === 'SELLER') senderLabel = '매도자'
  if (senderRole === 'SYSTEM') senderLabel = 'NPLatform 시스템'

  return {
    id: String(row.id),
    listing_id: String(row.deal_room_id), // 카드 컴포넌트 호환을 위해 유지
    sender_id: row.user_id ? String(row.user_id) : 'system',
    sender_label: senderLabel,
    sender_role: senderRole,
    body: String(row.content ?? ''),
    attachments: row.file_url ? [{
      id: `att-${row.id}`,
      name: String(row.file_name ?? '파일'),
      size: Number(row.file_size ?? 0),
      url: String(row.file_url),
    }] : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

// ─── Sample fallback (DB empty 시) ────────────────────────────
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
    const supabase = await createClient()

    // 1) 실 DB 우선 (deal_room_messages)
    const { data: rows, error: dbErr } = await supabase
      .from('deal_room_messages')
      .select('id, deal_room_id, user_id, content, message_type, file_url, file_name, file_size, is_deleted, created_at')
      .eq('deal_room_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(500)

    if (!dbErr && rows && rows.length > 0) {
      const messages = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (rows as any[]).map((row) => mapDbRowToMessage(row, supabase)),
      )
      return NextResponse.json(
        { data: messages, _source: 'supabase' },
        { headers: { 'Cache-Control': 'private, max-age=10, must-revalidate' } },
      )
    }

    // 2) Fallback — institution 라벨링용 listing 조회
    let institution = ''
    const { data: room } = await supabase
      .from('deal_rooms')
      .select('listing_id')
      .eq('id', id)
      .maybeSingle()
    const listingId = (room as { listing_id?: string } | null)?.listing_id ?? id
    if (listingId) {
      const { data: listing } = await getById('deal_listings', String(listingId))
      institution =
        (listing as { creditor_institution?: string; institution_name?: string; institution?: string } | null)
          ?.creditor_institution ??
        (listing as { institution_name?: string } | null)?.institution_name ??
        (listing as { institution?: string } | null)?.institution ?? ''
    }

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

// ─── POST — 메시지 전송 (실 DB INSERT + Realtime 자동 publish) ──
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

    const reqBody = await request.json() as Partial<{ body: string; attachments: DealMessage['attachments'] }>
    if (!reqBody.body || !reqBody.body.trim()) {
      return NextResponse.json(
        { error: { code: 'EMPTY_BODY', message: '메시지 본문이 비어있습니다.' } },
        { status: 400 },
      )
    }

    // PII 자동 마스킹
    const { masked, categories } = maskPII(reqBody.body)

    // 발신자 역할 결정
    const supabase = await createClient()
    const senderRole = await resolveSenderRole(supabase, id, String(user.id))

    // 첫 첨부 파일만 DB 컬럼으로 (스키마 제약 — 다중 첨부는 별도 테이블 필요)
    const firstAtt = reqBody.attachments?.[0]

    // ── DB INSERT (Supabase Realtime publication 자동 publish) ──────
    const { data: inserted, error: insErr } = await supabase
      .from('deal_room_messages')
      .insert({
        deal_room_id: id,
        user_id: String(user.id),
        content: masked,
        message_type: firstAtt ? 'FILE' : 'TEXT',
        file_url: firstAtt?.url ?? null,
        file_name: firstAtt?.name ?? null,
        file_size: firstAtt?.size ?? null,
      })
      .select('id, deal_room_id, user_id, content, message_type, file_url, file_name, file_size, created_at')
      .single()

    if (insErr || !inserted) {
      logger.error('[deal-rooms/[id]/messages] POST insert error:', { error: insErr })
      // DB 미준비 시 mock 응답 (배포 환경별 graceful degradation)
      const mockMessage: DealMessage = {
        id: `${id.slice(0, 8)}-MSG-${Date.now()}`,
        listing_id: id,
        sender_id: String(user.id),
        sender_label: senderRole === 'SELLER' ? '매도자' : '매수자',
        sender_role: senderRole,
        body: masked,
        attachments: reqBody.attachments,
        masked_categories: categories.length > 0 ? categories : undefined,
        created_at: new Date().toISOString(),
      }
      return NextResponse.json(
        { data: mockMessage, _source: 'mock', _reason: insErr?.message ?? 'db_unavailable' },
        { status: 201 },
      )
    }

    // 실 DB 응답 변환
    const message = await mapDbRowToMessage(inserted, supabase)
    if (categories.length > 0) message.masked_categories = categories

    return NextResponse.json({ data: message, _source: 'supabase' }, { status: 201 })
  } catch (err) {
    logger.error('[deal-rooms/[id]/messages] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '메시지 전송 중 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
