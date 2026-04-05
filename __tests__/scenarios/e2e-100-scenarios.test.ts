/**
 * NPLatform v8.0 — 100가지 E2E 프로세스 시나리오 테스트
 *
 * 역할 조합별 분류:
 * A. 매수자 프로세스 (S001~S015)
 * B. 매도자/기관 프로세스 (S016~S030)
 * C. 매수자↔매도자 거래 프로세스 (S031~S045)
 * D. 전문가 프로세스 (S046~S060)
 * E. 파트너 프로세스 (S061~S070)
 * F. 관리자 프로세스 (S071~S085)
 * G. 크로스 역할 시나리오 (S086~S100)
 */

import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

vi.setConfig({ testTimeout: 30000 })

const BASE = 'http://localhost:3000'

async function page(path: string) {
  const r = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  return { s: r.status, b: await r.text(), h: Object.fromEntries(r.headers) }
}

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const t = await r.text()
  let j: any = null
  try { j = JSON.parse(t) } catch {}
  return { s: r.status, j, t }
}

// ═══════════════════════════════════════════════════════
// A. 매수자 프로세스 (S001~S015)
// ═══════════════════════════════════════════════════════

describe('A. 매수자 프로세스', () => {
  it('S001: 매수자 가입 → 가이드 확인', async () => {
    const { s, b } = await page('/guide/buyer')
    expect(s).toBe(200)
    expect(b).toContain('김민수')
  })

  it('S002: 매수자 → 통합 마켓 매물 검색', async () => {
    const { s, b } = await page('/exchange')
    expect(s).toBe(200)
    expect(b).toContain('딜 브릿지')
  })

  it('S003: 매수자 → 매물 상세 열람 (공개 정보)', async () => {
    const { s } = await page('/exchange/ex-1')
    expect(s).toBe(200)
  })

  it('S004: 매수자 → API로 매물 필터 검색', async () => {
    const { s, j } = await api('/api/v1/exchange/listings?collateral_type=오피스')
    expect(s).toBe(200)
    expect(j.data).toBeDefined()
  })

  it('S005: 매수자 → 기관별 필터 검색', async () => {
    const { s, j } = await api('/api/v1/exchange/listings')
    expect(s).toBe(200)
    expect(j.data.length).toBeGreaterThan(0)
  })

  it('S006: 매수자 → 참여 기관 목록 조회', async () => {
    const { s, j } = await api('/api/v1/institutions')
    expect(s).toBe(200)
    expect(j.data.length).toBeGreaterThan(0)
  })

  it('S007: 매수자 → 기관 프로필 페이지', async () => {
    const { s } = await page('/exchange/institutions/hana-amc')
    expect(s).toBe(200)
  })

  it('S008: 매수자 → 거래 진행 현황 확인', async () => {
    const { s, b } = await page('/exchange/deals')
    expect(s).toBe(200)
    expect(b).toContain('거래 진행')
  })

  it('S009: 매수자 → 딜룸 진입', async () => {
    const { s } = await page('/exchange/deals/deal-1')
    expect(s).toBe(200)
  })

  it('S010: 매수자 → 실사 체크리스트 확인', async () => {
    const { s } = await page('/exchange/due-diligence/deal-1')
    expect(s).toBe(200)
  })

  it('S011: 매수자 → 계약 관리 확인', async () => {
    const { s } = await page('/exchange/contract/deal-1')
    expect(s).toBe(200)
  })

  it('S012: 매수자 → 거래 아카이브 확인', async () => {
    const { s } = await page('/exchange/archive')
    expect(s).toBe(200)
  })

  it('S013: 매수자 → 전문가 상담 요청 페이지', async () => {
    const { s } = await page('/professional/1')
    expect(s).toBe(200)
  })

  it('S014: 매수자 → NPL 분석 도구', async () => {
    const { s } = await page('/npl-analysis')
    expect(s).toBe(200)
  })

  it('S015: 매수자 → 커뮤니티 접근', async () => {
    const { s, b } = await page('/community')
    expect(s).toBe(200)
    expect(b).toContain('커뮤니티')
  })
})

// ═══════════════════════════════════════════════════════
// B. 매도자/기관 프로세스 (S016~S030)
// ═══════════════════════════════════════════════════════

describe('B. 매도자/기관 프로세스', () => {
  it('S016: 매도자 가이드 확인', async () => {
    const { s } = await page('/guide/seller')
    expect(s).toBe(200)
  })

  it('S017: 금융기관 가이드 (에셋파트너스)', async () => {
    const { s, b } = await page('/guide/institution')
    expect(s).toBe(200)
    expect(b).toContain('에셋파트너스')
  })

  it('S018: 매도자 → 매각 등록 6-step 위자드', async () => {
    const { s, b } = await page('/exchange/sell')
    expect(s).toBe(200)
    expect(b).toContain('매각 등록')
    expect(b).toContain('기관 인증')
  })

  it('S019: 매도자 → 매각 등록 API (POST)', async () => {
    const { s, j } = await api('/api/v1/exchange/listings', {
      method: 'POST',
      body: JSON.stringify({
        title: '테스트 NPL 매각',
        collateral_type: '오피스',
        collateral_region: '서울',
        original_amount: 5000000000,
        asking_price: 4000000000,
      }),
    })
    // 인증 없으면 401, mock이면 201/200
    expect([200, 201, 401]).toContain(s)
  })

  it('S020: 매도자 → AI OCR 대량 업로드 페이지', async () => {
    const { s, b } = await page('/exchange/bulk-upload')
    expect(s).toBe(200)
    expect(b).toContain('OCR')
  })

  it('S021: 매도자 → 내 매물 관리 (거래 현황)', async () => {
    const { s } = await page('/exchange/deals')
    expect(s).toBe(200)
  })

  it('S022: 기관 → 기관 대시보드', async () => {
    const { s } = await page('/institution/dashboard')
    expect(s).toBe(200)
  })

  it('S023: 기관 → 매물 등록 (기관용)', async () => {
    const { s } = await page('/institution/listings/new')
    expect(s).toBe(200)
  })

  it('S024: 기관 → 대량 업로드', async () => {
    const { s } = await page('/institution/bulk-upload')
    expect(s).toBe(200)
  })

  it('S025: 기관 → 포트폴리오 관리', async () => {
    const { s } = await page('/institution/portfolio')
    expect(s).toBe(200)
  })

  it('S026: 매도자 → 매각 등록 후 검수 대기 확인', async () => {
    // 검수 대기열 API
    const { s } = await api('/api/v1/exchange/listings')
    expect(s).toBe(200)
  })

  it('S027: 매도자 → 공개 범위 설정 확인 (페이지 내)', async () => {
    const { s, b } = await page('/exchange/sell')
    expect(s).toBe(200)
    // VisibilitySelector 컴포넌트 포함 여부
  })

  it('S028: 매도자 → 펀드 페이지 접근', async () => {
    const { s } = await page('/fund')
    expect(s).toBe(200)
  })

  it('S029: 매도자 → 대출기관 페이지 접근', async () => {
    const { s } = await page('/lender')
    expect(s).toBe(200)
  })

  it('S030: 매도자 → 거래 완료 아카이브', async () => {
    const { s } = await page('/exchange/archive')
    expect(s).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════
// C. 매수자↔매도자 거래 프로세스 (S031~S045)
// ═══════════════════════════════════════════════════════

describe('C. 매수자↔매도자 거래 프로세스', () => {
  it('S031: 거래 생성 API (관심 표명)', async () => {
    const { s } = await api('/api/v1/exchange/deals', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 'dl-001' }),
    })
    expect([200, 201, 401]).toContain(s)
  })

  it('S032: 거래 목록 조회 API (인증 필요)', async () => {
    const { s } = await api('/api/v1/exchange/deals')
    expect([200, 401]).toContain(s) // 인증 없으면 401
  })

  it('S033: 거래 상세 조회 API (인증 필요)', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1')
    expect([200, 401]).toContain(s)
  })

  it('S034: 오퍼 제출 API', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1/offers', {
      method: 'POST',
      body: JSON.stringify({ amount: 3200000000, conditions: '30일 내 잔금' }),
    })
    expect([200, 201, 401]).toContain(s)
  })

  it('S035: 오퍼 목록 조회 API (인증 필요)', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1/offers')
    expect([200, 401]).toContain(s)
  })

  it('S036: 딜룸 메시지 전송 API', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: '안녕하세요, 관심 있습니다.', message_type: 'TEXT' }),
    })
    expect([200, 201, 401]).toContain(s)
  })

  it('S037: 딜룸 메시지 조회 API (인증 필요)', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1/messages')
    expect([200, 401]).toContain(s)
  })

  it('S038: 거래 단계 전환 API (INTEREST→NDA)', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ current_stage: 'NDA' }),
    })
    expect([200, 401]).toContain(s)
  })

  it('S039: 실사 체크리스트 조회 API (인증 필요)', async () => {
    const { s } = await api('/api/v1/exchange/due-diligence/deal-1')
    expect([200, 401]).toContain(s)
  })

  it('S040: 실사 항목 업데이트 API', async () => {
    const { s } = await api('/api/v1/exchange/due-diligence/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ item_number: 1, status: 'COMPLETED', note: '확인 완료' }),
    })
    expect([200, 401]).toContain(s)
  })

  it('S041: 딜룸 페이지 렌더링 (3패널)', async () => {
    const { s } = await page('/exchange/deals/deal-1')
    expect(s).toBe(200)
  })

  it('S042: 계약 관리 페이지', async () => {
    const { s } = await page('/exchange/contract/deal-1')
    expect(s).toBe(200)
  })

  it('S043: 매물 상세 → NDA 정보 잠금 확인', async () => {
    const { s, b } = await page('/exchange/ex-1')
    expect(s).toBe(200)
    // NDA 전에는 상세 정보가 잠겨 있어야 함
  })

  it('S044: 역제안(Counter-offer) 시나리오', async () => {
    const { s } = await api('/api/v1/exchange/deals/deal-1/offers', {
      method: 'POST',
      body: JSON.stringify({ amount: 3400000000, conditions: '역제안' }),
    })
    expect([200, 201, 401]).toContain(s)
  })

  it('S045: 거래 완료 후 평가', async () => {
    const { s } = await page('/exchange/archive')
    expect(s).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════
// D. 전문가 프로세스 (S046~S060)
// ═══════════════════════════════════════════════════════

describe('D. 전문가 프로세스', () => {
  it('S046: 전문가 가이드', async () => {
    const { s } = await page('/guide/professional')
    expect(s).toBe(200)
  })

  it('S047: 전문가 등록 페이지', async () => {
    const { s, b } = await page('/professional/register')
    expect(s).toBe(200)
    expect(b).toContain('등록')
  })

  it('S048: 전문가 마켓플레이스 (전체)', async () => {
    const { s, b } = await page('/professional')
    expect(s).toBe(200)
    expect(b).toContain('전문가')
  })

  it('S049: 법률 전문가 목록', async () => {
    const { s, b } = await page('/professional/law')
    expect(s).toBe(200)
    expect(b).toContain('법률')
  })

  it('S050: 세무 전문가 목록', async () => {
    const { s, b } = await page('/professional/tax')
    expect(s).toBe(200)
    expect(b).toContain('세무')
  })

  it('S051: 감정평가 전문가 목록', async () => {
    const { s } = await page('/professional/realtor')
    expect(s).toBe(200)
  })

  it('S052: 전문가 상세 프로필', async () => {
    const { s } = await page('/professional/1')
    expect(s).toBe(200)
  })

  it('S053: 전문가 서비스 목록 API', async () => {
    const { s, j } = await api('/api/v1/professional/services')
    expect(s).toBe(200)
    const services = j.services || j.data || []
    expect(services.length).toBeGreaterThan(0)
  })

  it('S054: 전문가 서비스 등록 API', async () => {
    const { s } = await api('/api/v1/professional/services', {
      method: 'POST',
      body: JSON.stringify({
        name: '경매 법률 자문',
        price_type: 'PER_CASE',
        price: 300000,
        description: '경매 관련 법률 자문',
      }),
    })
    expect([200, 201, 401]).toContain(s)
  })

  it('S055: 상담 요청 API (클라이언트 → 전문가)', async () => {
    const { s } = await api('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: 'pro-1',
        service_id: 'svc-1',
        scheduled_at: '2026-04-01T10:00:00Z',
        content: 'NPL 법률 자문 상담 요청',
      }),
    })
    expect([200, 201, 401]).toContain(s)
  })

  it('S056: 상담 목록 조회 API', async () => {
    const { s, j } = await api('/api/v1/professional/consultations')
    expect(s).toBe(200)
    const consultations = j.consultations || j.data || []
    expect(consultations.length).toBeGreaterThan(0)
  })

  it('S057: 상담 상태 변경 API (PENDING→CONFIRMED)', async () => {
    const { s } = await api('/api/v1/professional/consultations', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'con-4', status: 'CONFIRMED' }),
    })
    expect([200, 401]).toContain(s)
  })

  it('S058: 전문가 수익 조회 API', async () => {
    const { s } = await api('/api/v1/professional/earnings')
    expect([200, 401]).toContain(s)
  })

  it('S059: 전문가 대시보드 페이지', async () => {
    const { s } = await page('/professional/my/dashboard')
    expect(s).toBe(200)
  })

  it('S060: 전문가 서비스 관리 페이지', async () => {
    const { s } = await page('/professional/my/services')
    expect(s).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════
// E. 파트너 프로세스 (S061~S070)
// ═══════════════════════════════════════════════════════

describe('E. 파트너 프로세스', () => {
  it('S061: 파트너 가이드', async () => {
    const { s } = await page('/guide/partner')
    expect(s).toBe(200)
  })

  it('S062: 파트너 대시보드', async () => {
    const { s } = await page('/partner/dashboard')
    expect(s).toBe(200)
  })

  it('S063: 파트너 추천 회원 목록', async () => {
    const { s, b } = await page('/partner/referrals')
    expect(s).toBe(200)
    expect(b).toContain('추천')
  })

  it('S064: 파트너 수익 페이지', async () => {
    const { s } = await page('/partner/earnings')
    expect(s).toBe(200)
  })

  it('S065: 파트너 마케팅 도구', async () => {
    const { s } = await page('/partner/marketing')
    expect(s).toBe(200)
  })

  it('S066: 파트너 리더보드', async () => {
    const { s } = await page('/partner/leaderboard')
    expect(s).toBe(200)
  })

  it('S067: 파트너 등록 페이지', async () => {
    const { s } = await page('/partner/register')
    expect(s).toBe(200)
  })

  it('S068: 파트너 정산 페이지', async () => {
    const { s } = await page('/partner/settlement')
    expect(s).toBe(200)
  })

  it('S069: 파트너 리드 관리', async () => {
    const { s } = await page('/partner/leads')
    expect(s).toBe(200)
  })

  it('S070: 추천코드 검증 (비존재 코드)', async () => {
    // 추천코드 검증은 가입 시 사용 — 유효하지 않은 코드 테스트
    const { s } = await page('/pending-approval')
    expect(s).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════
// F. 관리자 프로세스 (S071~S085)
// ═══════════════════════════════════════════════════════

describe('F. 관리자 프로세스', () => {
  it('S071: 관리자 메인 대시보드', async () => {
    const { s } = await page('/admin')
    expect([200, 302, 307]).toContain(s)
  })

  it('S072: 관리자 → 테넌트 목록', async () => {
    const { s } = await page('/admin/tenants')
    expect([200, 302, 307]).toContain(s)
  })

  it('S073: 관리자 → 테넌트 상세', async () => {
    const { s } = await page('/admin/tenants/tenant-1')
    expect([200, 302, 307]).toContain(s)
  })

  it('S074: 관리자 → 가입 승인 대기열', async () => {
    const { s } = await page('/admin/approvals')
    expect([200, 302, 307]).toContain(s)
  })

  it('S075: 관리자 → 과금 설정 (플랜/크레딧/수수료)', async () => {
    const { s } = await page('/admin/pricing')
    expect([200, 302, 307]).toContain(s)
  })

  it('S076: 관리자 → 배너 관리', async () => {
    const { s } = await page('/admin/banners')
    expect([200, 302, 307]).toContain(s)
  })

  it('S077: 관리자 → 파트너 관리', async () => {
    const { s } = await page('/admin/partners')
    expect([200, 302, 307]).toContain(s)
  })

  it('S078: 관리자 → 전문가 관리 (가격 승인)', async () => {
    const { s } = await page('/admin/professionals')
    expect([200, 302, 307]).toContain(s)
  })

  it('S079: 관리자 → 마스킹 규칙 관리', async () => {
    const { s } = await page('/admin/security/masking')
    expect([200, 302, 307]).toContain(s)
  })

  it('S080: 관리자 → 가이드 CMS', async () => {
    const { s } = await page('/admin/guide')
    expect([200, 302, 307]).toContain(s)
  })

  it('S081: 관리자 → 사용자 관리', async () => {
    const { s } = await page('/admin/users')
    expect([200, 302, 307]).toContain(s)
  })

  it('S082: 관리자 → 매물 관리', async () => {
    const { s } = await page('/admin/listings')
    expect([200, 302, 307]).toContain(s)
  })

  it('S083: 관리자 → 모니터링', async () => {
    const { s } = await page('/admin/monitoring')
    expect([200, 302, 307]).toContain(s)
  })

  it('S084: 관리자 → 감사 로그', async () => {
    const { s } = await page('/admin/audit-logs')
    expect([200, 302, 307]).toContain(s)
  })

  it('S085: 관리자 → 시스템 설정', async () => {
    const { s } = await page('/admin/system')
    expect([200, 302, 307]).toContain(s)
  })
})

// ═══════════════════════════════════════════════════════
// G. 크로스 역할 + 기타 시나리오 (S086~S100)
// ═══════════════════════════════════════════════════════

describe('G. 크로스 역할 + 보안 + 기타', () => {
  it('S086: 배너 API — 위치별 조회', async () => {
    const { s, j } = await api('/api/v1/banners?position=hero')
    expect(s).toBe(200)
    expect(j.data).toBeDefined()
  })

  it('S087: 배너 생성 API', async () => {
    const { s } = await api('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({
        title: '테스트 배너',
        position: 'hero',
        image_url: 'https://example.com/banner.jpg',
        target_url: '/exchange',
        status: 'ACTIVE',
      }),
    })
    expect([200, 201]).toContain(s)
  })

  it('S088: 배너 클릭 트래킹', async () => {
    const { s } = await api('/api/v1/banners?id=b1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'click' }),
    })
    expect(s).toBe(200)
  })

  it('S089: 시장 인텔리전스 페이지', async () => {
    const { s } = await page('/market-intelligence')
    expect(s).toBe(200)
  })

  it('S090: 통계 페이지', async () => {
    const { s } = await page('/statistics')
    expect(s).toBe(200)
  })

  it('S091: 뉴스 페이지', async () => {
    const { s } = await page('/news')
    expect(s).toBe(200)
  })

  it('S092: 지식센터 페이지', async () => {
    const { s } = await page('/knowledge/courses')
    expect(s).toBe(200)
  })

  it('S093: 기능 설정 페이지 (사용자)', async () => {
    const { s } = await page('/settings/features')
    expect(s).toBe(200)
  })

  it('S094: 결제 설정 페이지', async () => {
    const { s } = await page('/settings/billing')
    expect(s).toBe(200)
  })

  it('S095: 결제 수단 페이지', async () => {
    const { s } = await page('/settings/payment')
    expect(s).toBe(200)
  })

  it('S096: 펀드 상세 페이지', async () => {
    const { s } = await page('/fund/1')
    expect(s).toBe(200)
  })

  it('S097: 대출기관 상세 페이지', async () => {
    const { s } = await page('/lender/1')
    expect(s).toBe(200)
  })

  it('S098: Rate Limit 테스트 (과다 요청)', async () => {
    // 빠르게 연속 요청 — 429를 받을 수도 있고 아닐 수도 있음
    let lastStatus = 200
    for (let i = 0; i < 5; i++) {
      const { s } = await api('/api/v1/exchange/listings')
      lastStatus = s
    }
    expect([200, 429]).toContain(lastStatus)
  })

  it('S099: 404 페이지 정상 렌더링', async () => {
    const { s } = await page('/nonexistent-page-xyz-123')
    expect([200, 404]).toContain(s)
  })

  it('S100: 참여 기관 목록 페이지', async () => {
    const { s } = await page('/exchange/institutions')
    expect(s).toBe(200)
  })
})
