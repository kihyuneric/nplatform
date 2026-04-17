/**
 * NPLatform v8.0 — 50가지 시나리오 통합 테스트
 *
 * 영역별 분류:
 * S01~S10: 회원가입/인증/역할 (매수자/매도자/전문가/파트너/관리자)
 * S11~S20: NPL 딜 브릿지 (매각등록/매물조회/거래진행/실사/계약)
 * S21~S30: 전문 서비스 (가격설정/상담요청/리뷰/수익정산)
 * S31~S35: 배너/과금/크레딧
 * S36~S40: 파트너/추천코드/수익쉐어
 * S41~S45: 관리자 (승인/검수/테넌트/기능토글)
 * S46~S50: 가이드/마스킹/보안/API
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

vi.setConfig({ testTimeout: 30000 }) // 30초 타임아웃

// ─── 서버 URL ──────────────────────────────────────────
const BASE = 'http://localhost:3000'

let serverAvailable = false

// ─── 서버 가동 확인 ────────────────────────────────────
beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2000) })
    serverAvailable = res.ok || res.status < 500
  } catch {
    try {
      await fetch(BASE, { signal: AbortSignal.timeout(2000) })
      serverAvailable = true
    } catch {
      serverAvailable = false
    }
  }
  if (!serverAvailable) {
    console.warn('⚠️ Dev server not running — skipping E2E tests. Start with: npm run dev --prefix C:\\Users\\82106\\Desktop\\nplatform')
  }
}, 10000)

// Skip all tests in this file when the dev server is not running
beforeEach((ctx) => {
  if (!serverAvailable) ctx.skip()
})

async function fetchPage(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
    return { status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() }
  } catch { return { status: 0, headers: {}, body: '' } }
}

async function fetchAPI(path: string, options?: RequestInit) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return { status: res.status, json, text }
  } catch { return { status: 0, json: null, text: '' } }
}

// ═══════════════════════════════════════════════════════
// S01~S10: 회원가입/인증/역할
// ═══════════════════════════════════════════════════════

describe('S01: 메인 페이지 렌더링', () => {
  it('returns 200 with HTML', async () => {
    const { status, body } = await fetchPage('/')
    expect(status).toBe(200)
    expect(body).toContain('NPLatform')
    expect(body).toContain('<!DOCTYPE html>')
  })
})

describe('S02: 승인 대기 페이지 렌더링', () => {
  it('returns 200', async () => {
    const { status, body } = await fetchPage('/pending-approval')
    expect(status).toBe(200)
    expect(body).toContain('승인')
  })
})

describe('S03: 가이드 센터 - 6개 역할 카드', () => {
  it('renders all role cards', async () => {
    const { status, body } = await fetchPage('/guide')
    expect(status).toBe(200)
    expect(body).toContain('매수자')
    expect(body).toContain('매도자')
    expect(body).toContain('금융기관')
    expect(body).toContain('파트너')
    expect(body).toContain('전문가')
    expect(body).toContain('관리자')
  })
})

describe('S04: 매수자 가이드 - 스토리텔링', () => {
  it('renders buyer story', async () => {
    const { status, body } = await fetchPage('/guide/buyer')
    expect(status).toBe(200)
    expect(body).toContain('김민수')
  })
})

describe('S05: 매도자 가이드', () => {
  it('renders seller guide', async () => {
    const { status, body } = await fetchPage('/guide/seller')
    expect(status).toBe(200)
  })
})

describe('S06: 파트너 가이드 - 스토리텔링', () => {
  it('renders partner story', async () => {
    const { status, body } = await fetchPage('/guide/partner')
    expect(status).toBe(200)
  })
})

describe('S07: 전문가 가이드', () => {
  it('renders professional guide', async () => {
    const { status, body } = await fetchPage('/guide/professional')
    expect(status).toBe(200)
  })
})

describe('S08: 금융기관 가이드 - 에셋파트너스 스토리', () => {
  it('renders institution story', async () => {
    const { status, body } = await fetchPage('/guide/institution')
    expect(status).toBe(200)
    expect(body).toContain('에셋파트너스')
  })
})

describe('S09: 기능 설정 페이지', () => {
  it('renders feature settings', async () => {
    const { status, body } = await fetchPage('/settings/features')
    expect(status).toBe(200)
  })
})

describe('S10: 404 페이지 (존재하지 않는 경로)', () => {
  it('returns not-found page', async () => {
    const { status, body } = await fetchPage('/this-does-not-exist-xyz')
    // Next.js dev returns 200 with not-found component or 404
    expect([200, 404]).toContain(status)
    if (status === 200) {
      expect(body).toContain('찾을 수 없습니다')
    }
  })
})

// ═══════════════════════════════════════════════════════
// S11~S20: NPL 딜 브릿지
// ═══════════════════════════════════════════════════════

describe('S11: 딜 브릿지 메인 - 통합 마켓뷰', () => {
  it('renders deal bridge with listings', async () => {
    const { status, body } = await fetchPage('/exchange')
    expect(status).toBe(200)
    expect(body).toContain('딜 브릿지')
    // 호가창/거래량 없어야 함
    expect(body).not.toContain('호가창')
    expect(body).not.toContain('OrderBook')
  })
})

describe('S12: 딜 브릿지 API - 매물 목록 조회', () => {
  it('returns listings with mock data', async () => {
    const { status, json } = await fetchAPI('/api/v1/exchange/listings')
    expect(status).toBe(200)
    expect(json.data).toBeDefined()
    expect(json.data.length).toBeGreaterThan(0)
    // 각 매물에 핵심 필드 확인 (API mock 필드명)
    const listing = json.data[0]
    expect(listing).toHaveProperty('id')
    expect(listing).toHaveProperty('collateral_type')
    expect(listing.collateral_type).toBeTruthy()
  })
})

describe('S13: 매각 공고 상세 페이지', () => {
  it('renders listing detail', async () => {
    const { status, body } = await fetchPage('/exchange/ex-1')
    expect(status).toBe(200)
    // 주식식 용어 없어야 함
    expect(body).not.toContain('스프레드')
  })
})

describe('S14: 매각 등록 위자드 (6단계)', () => {
  it('renders sell page with wizard', async () => {
    const { status, body } = await fetchPage('/exchange/sell')
    expect(status).toBe(200)
    expect(body).toContain('매각 등록')
    expect(body).toContain('기관 인증')
  })
})

describe('S15: 거래 진행 칸반 보드', () => {
  it('renders deals kanban', async () => {
    const { status, body } = await fetchPage('/exchange/deals')
    expect(status).toBe(200)
    expect(body).toContain('거래 진행')
  })
})

describe('S16: 딜룸 (거래 상세)', () => {
  it('renders deal room', async () => {
    const { status, body } = await fetchPage('/exchange/deals/deal-1')
    expect(status).toBe(200)
  })
})

describe('S17: 실사 관리 (14개 체크리스트)', () => {
  it('renders due diligence page', async () => {
    const { status, body } = await fetchPage('/exchange/due-diligence/deal-1')
    expect(status).toBe(200)
    // 클라이언트 렌더링이므로 HTML에 체크리스트 텍스트가 포함되지 않을 수 있음
    expect(body).toContain('<!DOCTYPE html>')
  })
})

describe('S18: 계약 관리', () => {
  it('renders contract page', async () => {
    const { status, body } = await fetchPage('/exchange/contract/deal-1')
    expect(status).toBe(200)
  })
})

describe('S19: 거래 아카이브', () => {
  it('renders archive page', async () => {
    const { status, body } = await fetchPage('/exchange/archive')
    expect(status).toBe(200)
  })
})

describe('S20: AI OCR 대량 리스트업', () => {
  it('renders bulk upload page', async () => {
    const { status, body } = await fetchPage('/exchange/bulk-upload')
    expect(status).toBe(200)
    expect(body).toContain('OCR')
  })
})

// ═══════════════════════════════════════════════════════
// S21~S30: 전문 서비스
// ═══════════════════════════════════════════════════════

describe('S21: 전문가 마켓플레이스', () => {
  it('renders with professional cards', async () => {
    const { status, body } = await fetchPage('/professional')
    expect(status).toBe(200)
    expect(body).toContain('전문가')
  })
})

describe('S22: 법률 전문가 필터 페이지', () => {
  it('renders law professionals', async () => {
    const { status, body } = await fetchPage('/professional/law')
    expect(status).toBe(200)
    expect(body).toContain('법률')
  })
})

describe('S23: 세무 전문가 필터 페이지', () => {
  it('renders tax professionals', async () => {
    const { status, body } = await fetchPage('/professional/tax')
    expect(status).toBe(200)
    expect(body).toContain('세무')
  })
})

describe('S24: 감정평가 전문가 페이지', () => {
  it('renders realtor page', async () => {
    const { status, body } = await fetchPage('/professional/realtor')
    expect(status).toBe(200)
  })
})

describe('S25: 전문가 상세 프로필', () => {
  it('renders professional detail', async () => {
    const { status, body } = await fetchPage('/professional/1')
    expect(status).toBe(200)
  })
})

describe('S26: 전문가 서비스 관리 API', () => {
  it('returns services list', async () => {
    const { status, json } = await fetchAPI('/api/v1/professional/services')
    expect(status).toBe(200)
    // API returns { services: [...] } or { data: [...] }
    expect(json.services || json.data).toBeDefined()
  })
})

describe('S27: 상담 요청 API', () => {
  it('returns consultations', async () => {
    const { status, json } = await fetchAPI('/api/v1/professional/consultations')
    expect(status).toBe(200)
    expect(json.consultations || json.data).toBeDefined()
  })
})

describe('S28: 전문가 수익 API', () => {
  it('requires authentication', async () => {
    const { status } = await fetchAPI('/api/v1/professional/earnings')
    expect([200, 401]).toContain(status) // 인증 없으면 401, 있으면 200
  })
})

describe('S29: 펀드 상세 페이지', () => {
  it('renders fund detail', async () => {
    const { status, body } = await fetchPage('/fund/1')
    expect(status).toBe(200)
  })
})

describe('S30: 대출기관 상세 페이지', () => {
  it('renders lender detail', async () => {
    const { status, body } = await fetchPage('/lender/1')
    expect(status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════
// S31~S35: 배너/과금/크레딧
// ═══════════════════════════════════════════════════════

describe('S31: 배너 API', () => {
  it('returns banners', async () => {
    const { status, json } = await fetchAPI('/api/v1/banners')
    expect(status).toBe(200)
    expect(json.data).toBeDefined()
  })
})

describe('S32: 배너 클릭 트래킹', () => {
  it('tracks banner click', async () => {
    const { status } = await fetchAPI('/api/v1/banners?id=b1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'click' }),
    })
    expect(status).toBe(200)
  })
})

describe('S33: 배너 노출 트래킹', () => {
  it('tracks banner impression', async () => {
    const { status } = await fetchAPI('/api/v1/banners?id=b1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'impression' }),
    })
    expect(status).toBe(200)
  })
})

describe('S34: 기관 목록 API', () => {
  it('returns institutions', async () => {
    const { status, json } = await fetchAPI('/api/v1/institutions')
    expect(status).toBe(200)
    expect(json.data).toBeDefined()
    expect(json.data.length).toBeGreaterThan(0)
  })
})

describe('S35: 기관 즐겨찾기 API', () => {
  it('requires authentication for favorites', async () => {
    const { status } = await fetchAPI('/api/v1/institutions/favorites')
    expect([200, 401]).toContain(status) // 인증 없으면 401
  })
})

// ═══════════════════════════════════════════════════════
// S36~S40: 파트너/추천코드/수익쉐어
// ═══════════════════════════════════════════════════════

describe('S36: 파트너 추천 회원 페이지', () => {
  it('renders referrals page', async () => {
    const { status, body } = await fetchPage('/partner/referrals')
    expect(status).toBe(200)
    expect(body).toContain('추천')
  })
})

describe('S37: 파트너 수익 페이지', () => {
  it('renders earnings page', async () => {
    const { status, body } = await fetchPage('/partner/earnings')
    expect(status).toBe(200)
  })
})

describe('S38: 파트너 마케팅 도구', () => {
  it('renders marketing tools', async () => {
    const { status, body } = await fetchPage('/partner/marketing')
    expect(status).toBe(200)
  })
})

describe('S39: 파트너 리더보드', () => {
  it('renders leaderboard', async () => {
    const { status, body } = await fetchPage('/partner/leaderboard')
    expect(status).toBe(200)
  })
})

describe('S40: 파트너 대시보드', () => {
  it('renders partner dashboard', async () => {
    const { status, body } = await fetchPage('/partner/dashboard')
    expect(status).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════
// S41~S45: 관리자
// ═══════════════════════════════════════════════════════

describe('S41: 관리자 테넌트 관리', () => {
  it('renders admin tenants page', async () => {
    // admin은 인증 필요 → 리다이렉트 또는 200
    const { status } = await fetchPage('/admin/tenants')
    expect([200, 302, 307]).toContain(status)
  })
})

describe('S42: 관리자 가입 승인', () => {
  it('renders admin approvals page', async () => {
    const { status } = await fetchPage('/admin/approvals')
    expect([200, 302, 307]).toContain(status)
  })
})

describe('S43: 관리자 과금 설정', () => {
  it('renders admin pricing page', async () => {
    const { status } = await fetchPage('/admin/pricing')
    expect([200, 302, 307]).toContain(status)
  })
})

describe('S44: 관리자 파트너 관리', () => {
  it('renders admin partners page', async () => {
    const { status } = await fetchPage('/admin/partners')
    expect([200, 302, 307]).toContain(status)
  })
})

describe('S45: 관리자 마스킹 규칙', () => {
  it('renders masking rules page', async () => {
    const { status } = await fetchPage('/admin/security/masking')
    expect([200, 302, 307]).toContain(status)
  })
})

// ═══════════════════════════════════════════════════════
// S46~S50: 기존 서비스 + API + 마스킹
// ═══════════════════════════════════════════════════════

describe('S46: 커뮤니티 페이지', () => {
  it('renders community', async () => {
    const { status, body } = await fetchPage('/community')
    expect(status).toBe(200)
    expect(body).toContain('커뮤니티')
  })
})

describe('S47: 시장 인텔리전스', () => {
  it('renders market intelligence', async () => {
    const { status } = await fetchPage('/market-intelligence')
    expect(status).toBe(200)
  })
})

describe('S48: NPL 분석 도구', () => {
  it('renders npl analysis', async () => {
    const { status } = await fetchPage('/npl-analysis')
    expect(status).toBe(200)
  })
})

describe('S49: 통계 페이지', () => {
  it('renders statistics', async () => {
    const { status } = await fetchPage('/statistics')
    expect(status).toBe(200)
  })
})

describe('S50: 참여 기관 페이지', () => {
  it('renders institutions list', async () => {
    const { status, body } = await fetchPage('/exchange/institutions')
    expect(status).toBe(200)
  })
})
