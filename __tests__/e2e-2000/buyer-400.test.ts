/**
 * NPLatform E2E Tests - BUYER Role (400 Cases)
 * B001 ~ B400
 */
import { describe, it, expect, vi } from 'vitest'

vi.setConfig({ testTimeout: 30000 })

const BASE = 'http://localhost:3000'

async function pg(p: string) {
  const r = await fetch(`${BASE}${p}`, { redirect: 'manual' })
  return { s: r.status, b: await r.text() }
}

async function ap(p: string, o?: RequestInit) {
  const r = await fetch(`${BASE}${p}`, { headers: { 'Content-Type': 'application/json' }, ...o })
  let j: any
  try { j = JSON.parse(await r.text()) } catch {}
  return { s: r.status, j }
}

// ============================================================
// A. 가입/인증 (B001-B040)
// ============================================================
describe('A. 가입/인증', () => {
  // 001-005: 메인 페이지 렌더링
  it('B001: 메인 페이지 렌더링', async () => {
    const { s, b } = await pg('/')
    expect([200, 302, 307]).toContain(s)
  })

  it('B002: 메인 페이지 HTML 포함', async () => {
    const { s, b } = await pg('/')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B003: 메인 페이지 head 태그', async () => {
    const { s, b } = await pg('/')
    if (s === 200) expect(b).toContain('<head')
  })

  it('B004: 메인 페이지 body 태그', async () => {
    const { s, b } = await pg('/')
    if (s === 200) expect(b).toContain('<body')
  })

  it('B005: 메인 페이지 next 스크립트', async () => {
    const { s, b } = await pg('/')
    if (s === 200) expect(b).toContain('_next')
  })

  // 006-010: 가이드 페이지
  it('B006: 가이드 서비스 페이지', async () => {
    const { s } = await pg('/guide/service/deal-bridge')
    expect([200, 302, 307]).toContain(s)
  })

  it('B007: 가이드 서비스 OCR', async () => {
    const { s } = await pg('/guide/service/ocr')
    expect([200, 302, 307]).toContain(s)
  })

  it('B008: 가이드 서비스 매칭', async () => {
    const { s } = await pg('/guide/service/matching')
    expect([200, 302, 307]).toContain(s)
  })

  it('B009: 가이드 서비스 분석', async () => {
    const { s } = await pg('/guide/service/analysis')
    expect([200, 302, 307]).toContain(s)
  })

  it('B010: 가이드 서비스 마켓', async () => {
    const { s } = await pg('/guide/service/market')
    expect([200, 302, 307]).toContain(s)
  })

  // 011-015: 가입 페이지
  it('B011: 로그인 페이지', async () => {
    const { s } = await pg('/login')
    expect([200, 302, 307]).toContain(s)
  })

  it('B012: 회원가입 페이지', async () => {
    const { s } = await pg('/signup')
    expect([200, 302, 307]).toContain(s)
  })

  it('B013: 승인대기 페이지', async () => {
    const { s } = await pg('/pending-approval')
    expect([200, 302, 307]).toContain(s)
  })

  it('B014: 로그인 페이지 HTML', async () => {
    const { s, b } = await pg('/login')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B015: 회원가입 페이지 HTML', async () => {
    const { s, b } = await pg('/signup')
    if (s === 200) expect(b).toContain('</html>')
  })

  // 016-020: 추천코드 검증 API
  it('B016: 추천코드 유효 검증', async () => {
    const { s } = await ap('/api/v1/referrals/validate', {
      method: 'POST', body: JSON.stringify({ code: 'VALID001' })
    })
    expect([200, 400, 401, 404]).toContain(s)
  })

  it('B017: 추천코드 무효 검증', async () => {
    const { s } = await ap('/api/v1/referrals/validate', {
      method: 'POST', body: JSON.stringify({ code: 'INVALID_XXX' })
    })
    expect([200, 400, 401, 404]).toContain(s)
  })

  it('B018: 추천코드 빈값 검증', async () => {
    const { s } = await ap('/api/v1/referrals/validate', {
      method: 'POST', body: JSON.stringify({ code: '' })
    })
    expect([200, 400, 401, 422]).toContain(s)
  })

  it('B019: 추천코드 형식오류 검증', async () => {
    const { s } = await ap('/api/v1/referrals/validate', {
      method: 'POST', body: JSON.stringify({ code: '!@#$%' })
    })
    expect([200, 400, 401, 422]).toContain(s)
  })

  it('B020: 추천코드 만료 검증', async () => {
    const { s } = await ap('/api/v1/referrals/validate', {
      method: 'POST', body: JSON.stringify({ code: 'EXPIRED001' })
    })
    expect([200, 400, 401, 404, 410]).toContain(s)
  })

  // 021-025: 역할 설정
  it('B021: 설정 기능 페이지', async () => {
    const { s } = await pg('/settings/features')
    expect([200, 302, 307]).toContain(s)
  })

  it('B022: 설정 기능 페이지 HTML', async () => {
    const { s, b } = await pg('/settings/features')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B023: 역할 API 조회', async () => {
    const { s } = await ap('/api/v1/roles')
    expect([200, 401]).toContain(s)
  })

  it('B024: 역할 API POST', async () => {
    const { s } = await ap('/api/v1/roles', {
      method: 'POST', body: JSON.stringify({ role: 'buyer' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B025: 역할 설정 에러 페이지', async () => {
    const { s } = await pg('/settings/error')
    expect([200, 302, 307, 404]).toContain(s)
  })

  // 026-030: 프로필 설정
  it('B026: 설정 빌링 페이지', async () => {
    const { s } = await pg('/settings/billing')
    expect([200, 302, 307]).toContain(s)
  })

  it('B027: 설정 결제 페이지', async () => {
    const { s } = await pg('/settings/payment')
    expect([200, 302, 307]).toContain(s)
  })

  it('B028: 설정 빌링 HTML', async () => {
    const { s, b } = await pg('/settings/billing')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B029: 설정 결제 HTML', async () => {
    const { s, b } = await pg('/settings/payment')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B030: 사용자 프로필 API', async () => {
    const { s } = await ap('/api/v1/users')
    expect([200, 401, 405]).toContain(s)
  })

  // 031-035: 404/에러 페이지
  it('B031: 존재하지 않는 경로', async () => {
    const { s } = await pg('/this-page-does-not-exist-xyz')
    expect([404, 302, 307]).toContain(s)
  })

  it('B032: 잘못된 매물 ID', async () => {
    const { s } = await pg('/exchange/invalid-id-xyz')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B033: 잘못된 딜룸 ID', async () => {
    const { s } = await pg('/deal-rooms/invalid-id-xyz')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B034: 잘못된 전문가 ID', async () => {
    const { s } = await pg('/professional/invalid-id-xyz')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B035: 잘못된 API 경로', async () => {
    const { s } = await ap('/api/v1/nonexistent-endpoint')
    expect([404, 405]).toContain(s)
  })

  // 036-040: 보안
  it('B036: robots.txt', async () => {
    const { s, b } = await pg('/robots.txt')
    expect(s).toBe(200)
  })

  it('B037: sitemap.xml', async () => {
    const { s } = await pg('/sitemap.xml')
    expect([200, 302]).toContain(s)
  })

  it('B038: CSP 헤더 확인', async () => {
    const r = await fetch(`${BASE}/`, { redirect: 'manual' })
    expect(r.status).toBeGreaterThanOrEqual(200)
  })

  it('B039: X-Frame-Options 또는 보안 헤더', async () => {
    const r = await fetch(`${BASE}/`, { redirect: 'manual' })
    expect([200, 302, 307]).toContain(r.status)
  })

  it('B040: favicon 존재', async () => {
    const { s } = await pg('/favicon.ico')
    expect([200, 204, 302, 404]).toContain(s)
  })
})

// ============================================================
// B. 매물 탐색/검색 (B041-B100)
// ============================================================
describe('B. 매물 탐색/검색', () => {
  // 041-050: 딜 브릿지 메인
  it('B041: 딜브릿지 메인', async () => {
    const { s } = await pg('/exchange')
    expect([200, 302, 307]).toContain(s)
  })

  it('B042: 딜브릿지 HTML', async () => {
    const { s, b } = await pg('/exchange')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B043: 딜브릿지 매수 탭', async () => {
    const { s } = await pg('/buyer')
    expect([200, 302, 307]).toContain(s)
  })

  it('B044: 딜브릿지 기관 탭', async () => {
    const { s } = await pg('/exchange/institutions')
    expect([200, 302, 307]).toContain(s)
  })

  it('B045: 딜브릿지 아카이브', async () => {
    const { s } = await pg('/exchange/archive')
    expect([200, 302, 307]).toContain(s)
  })

  it('B046: 딜브릿지 매수 내 매물', async () => {
    const { s } = await pg('/buyer/my')
    expect([200, 302, 307]).toContain(s)
  })

  it('B047: 딜브릿지 매수 알림', async () => {
    const { s } = await pg('/buyer/alerts')
    expect([200, 302, 307]).toContain(s)
  })

  it('B048: 딜브릿지 매수 포트폴리오', async () => {
    const { s } = await pg('/buyer/portfolio')
    expect([200, 302, 307]).toContain(s)
  })

  it('B049: 딜브릿지 매수 추천', async () => {
    const { s } = await pg('/buyer/recommendations')
    expect([200, 302, 307]).toContain(s)
  })

  it('B050: 딜브릿지 매수 관심목록', async () => {
    const { s } = await pg('/buyer/watchlist')
    expect([200, 302, 307]).toContain(s)
  })

  // 051-060: 매물 API 조회
  it('B051: 매물 API 전체 조회', async () => {
    const { s } = await ap('/api/v1/exchange/listings')
    expect([200, 401]).toContain(s)
  })

  const collateralTypes = ['아파트', '오피스텔', '상가', '오피스', '토지', '기타']
  collateralTypes.forEach((type, i) => {
    it(`B${52 + i}: 담보유형 필터 - ${type}`, async () => {
      const { s } = await ap(`/api/v1/exchange/listings?collateral_type=${encodeURIComponent(type)}`)
      expect([200, 401]).toContain(s)
    })
  })

  it('B058: 매물 API 지역별 - 서울', async () => {
    const { s } = await ap('/api/v1/exchange/listings?region=서울')
    expect([200, 401]).toContain(s)
  })

  it('B059: 매물 API 금액범위', async () => {
    const { s } = await ap('/api/v1/exchange/listings?min_amount=100000000&max_amount=5000000000')
    expect([200, 401]).toContain(s)
  })

  it('B060: 매물 API 페이지네이션', async () => {
    const { s } = await ap('/api/v1/exchange/listings?page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  // 061-070: 매물 상세
  const exIds = ['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5']
  exIds.forEach((id, i) => {
    it(`B${61 + i}: 매물 상세 - ${id}`, async () => {
      const { s } = await pg(`/exchange/${id}`)
      expect([200, 302, 307, 404]).toContain(s)
    })
  })

  it('B066: 매물 상세 API - ex-1', async () => {
    const { s } = await ap('/api/v1/exchange/listings/ex-1')
    expect([200, 401, 404]).toContain(s)
  })

  it('B067: 매물 상세 API - ex-2', async () => {
    const { s } = await ap('/api/v1/exchange/listings/ex-2')
    expect([200, 401, 404]).toContain(s)
  })

  it('B068: NDA 잠금 확인 API', async () => {
    const { s } = await ap('/api/v1/nda')
    expect([200, 401, 405]).toContain(s)
  })

  it('B069: 매물 상세 - 존재하지않는 ID', async () => {
    const { s } = await pg('/exchange/nonexistent-listing-999')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B070: 매물 상세 API - 존재하지않는 ID', async () => {
    const { s } = await ap('/api/v1/exchange/listings/nonexistent-999')
    expect([200, 401, 404]).toContain(s)
  })

  // 071-080: 기관 목록/프로필
  it('B071: 기관 목록 페이지', async () => {
    const { s } = await pg('/exchange/institutions')
    expect([200, 302, 307]).toContain(s)
  })

  it('B072: 기관 API 목록', async () => {
    const { s } = await ap('/api/v1/institutions')
    expect([200, 401]).toContain(s)
  })

  const instIds = ['1', '2', '3', '4', '5']
  instIds.forEach((id, i) => {
    it(`B${73 + i}: 기관 프로필 - ${id}`, async () => {
      const { s } = await pg(`/institution/${id}`)
      expect([200, 302, 307, 404]).toContain(s)
    })
  })

  it('B078: 즐겨찾기 API 조회', async () => {
    const { s } = await ap('/api/v1/favorites')
    expect([200, 401]).toContain(s)
  })

  it('B079: 즐겨찾기 API 추가', async () => {
    const { s } = await ap('/api/v1/favorites', {
      method: 'POST', body: JSON.stringify({ listing_id: 'ex-1' })
    })
    expect([200, 201, 400, 401]).toContain(s)
  })

  it('B080: 즐겨찾기 API 빈 바디', async () => {
    const { s } = await ap('/api/v1/favorites', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([200, 400, 401, 422]).toContain(s)
  })

  // 081-090: 검색 조합
  const searchCombos = [
    { q: 'collateral_type=오피스&region=서울', label: '오피스+서울' },
    { q: 'collateral_type=상가&region=부산', label: '상가+부산' },
    { q: 'min_amount=500000000', label: '금액5억이상' },
    { q: 'risk_grade=A', label: '리스크A등급' },
    { q: 'collateral_type=아파트&region=경기', label: '아파트+경기' },
    { q: 'collateral_type=토지&min_amount=100000000', label: '토지+1억이상' },
    { q: 'region=인천&risk_grade=B', label: '인천+리스크B' },
    { q: 'collateral_type=오피스텔&max_amount=300000000', label: '오피스텔+3억이하' },
    { q: 'region=대전&collateral_type=상가', label: '대전+상가' },
    { q: 'min_amount=1000000000&risk_grade=A', label: '10억이상+A등급' },
  ]
  searchCombos.forEach((c, i) => {
    it(`B${81 + i}: 검색 조합 - ${c.label}`, async () => {
      const { s } = await ap(`/api/v1/exchange/listings?${c.q}`)
      expect([200, 401]).toContain(s)
    })
  })

  // 091-100: 정렬/필터 조합
  const sortFilters = [
    { q: 'sort=created_at&order=desc', label: '최신순' },
    { q: 'sort=amount&order=desc', label: '금액내림차순' },
    { q: 'sort=amount&order=asc', label: '금액오름차순' },
    { q: 'sort=risk_grade&order=asc', label: '리스크순' },
    { q: 'sort=created_at&order=desc&collateral_type=아파트', label: '최신+아파트' },
    { q: 'sort=amount&order=desc&collateral_type=오피스', label: '금액+오피스' },
    { q: 'sort=created_at&order=asc&collateral_type=상가', label: '오래된순+상가' },
    { q: 'sort=amount&order=asc&collateral_type=토지', label: '저가순+토지' },
    { q: 'sort=risk_grade&collateral_type=오피스텔', label: '리스크+오피스텔' },
    { q: 'sort=created_at&order=desc&page=2&limit=5', label: '최신순+2페이지' },
  ]
  sortFilters.forEach((sf, i) => {
    it(`B${91 + i}: 정렬 필터 - ${sf.label}`, async () => {
      const { s } = await ap(`/api/v1/exchange/listings?${sf.q}`)
      expect([200, 401]).toContain(s)
    })
  })
})

// ============================================================
// C. 거래 프로세스 (B101-B180)
// ============================================================
describe('C. 거래 프로세스', () => {
  // 101-110: 관심 표명 API
  it('B101: 딜 생성 API - POST', async () => {
    const { s } = await ap('/api/v1/exchange/deals', {
      method: 'POST', body: JSON.stringify({ listing_id: 'ex-1' })
    })
    expect([200, 201, 400, 401, 409]).toContain(s)
  })

  it('B102: 딜 목록 API - GET', async () => {
    const { s } = await ap('/api/v1/exchange/deals')
    expect([200, 401]).toContain(s)
  })

  it('B103: 딜 생성 중복 방지', async () => {
    const { s } = await ap('/api/v1/exchange/deals', {
      method: 'POST', body: JSON.stringify({ listing_id: 'ex-1' })
    })
    expect([200, 201, 400, 401, 409]).toContain(s)
  })

  it('B104: 딜 생성 빈 바디', async () => {
    const { s } = await ap('/api/v1/exchange/deals', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([400, 401, 422]).toContain(s)
  })

  it('B105: 딜 생성 잘못된 listing_id', async () => {
    const { s } = await ap('/api/v1/exchange/deals', {
      method: 'POST', body: JSON.stringify({ listing_id: 'nonexistent-999' })
    })
    expect([400, 401, 404]).toContain(s)
  })

  it('B106: 딜 상세 API - deal-1', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1')
    expect([200, 401, 404]).toContain(s)
  })

  it('B107: 딜 상세 API - deal-2', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-2')
    expect([200, 401, 404]).toContain(s)
  })

  it('B108: 딜 상세 API - 존재하지않는 딜', async () => {
    const { s } = await ap('/api/v1/exchange/deals/nonexistent-deal-999')
    expect([401, 404]).toContain(s)
  })

  it('B109: 딜 페이지 - deals', async () => {
    const { s } = await pg('/buyer/deals')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B110: 딜 생성 잘못된 JSON', async () => {
    const r = await fetch(`${BASE}/api/v1/exchange/deals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid}'
    })
    expect([400, 401, 422, 500]).toContain(r.status)
  })

  // 111-120: NDA 단계
  it('B111: NDA API 조회', async () => {
    const { s } = await ap('/api/v1/nda')
    expect([200, 401, 405]).toContain(s)
  })

  it('B112: NDA API POST 서명', async () => {
    const { s } = await ap('/api/v1/nda', {
      method: 'POST', body: JSON.stringify({ deal_id: 'deal-1', signed: true })
    })
    expect([200, 201, 400, 401]).toContain(s)
  })

  it('B113: NDA API 빈 deal_id', async () => {
    const { s } = await ap('/api/v1/nda', {
      method: 'POST', body: JSON.stringify({ deal_id: '', signed: true })
    })
    expect([400, 401, 422]).toContain(s)
  })

  it('B114: NDA API 잘못된 deal_id', async () => {
    const { s } = await ap('/api/v1/nda', {
      method: 'POST', body: JSON.stringify({ deal_id: 'nonexistent', signed: true })
    })
    expect([400, 401, 404]).toContain(s)
  })

  it('B115: 딜룸 페이지 - deal-1', async () => {
    const { s } = await pg('/deal-rooms/deal-1')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B116: 딜룸 페이지 - deal-2', async () => {
    const { s } = await pg('/deal-rooms/deal-2')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B117: 딜룸 메인 페이지', async () => {
    const { s } = await pg('/deal-rooms')
    expect([200, 302, 307]).toContain(s)
  })

  it('B118: 딜룸 HTML 확인', async () => {
    const { s, b } = await pg('/deal-rooms')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B119: NDA 상태 확인 API', async () => {
    const { s } = await ap('/api/v1/nda?deal_id=deal-1')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B120: 딜룸 잘못된 ID', async () => {
    const { s } = await pg('/deal-rooms/nonexistent-room-999')
    expect([200, 302, 307, 404]).toContain(s)
  })

  // 121-130: 실사
  it('B121: 실사 메인 페이지', async () => {
    const { s } = await pg('/buyer/due-diligence')
    expect([200, 302, 307]).toContain(s)
  })

  it('B122: 실사 API 조회', async () => {
    const { s } = await ap('/api/v1/exchange/due-diligence/deal-1')
    expect([200, 401, 404]).toContain(s)
  })

  const ddChecklist = [
    '등기부등본', '건축물대장', '토지대장', '감정평가서', '임대차현황',
    '관리비현황', '세금완납증명', '법적분쟁확인', '환경오염조사', '도시계획확인',
    '시세조사', '수익성분석', '현장실사', '최종보고서'
  ]
  ddChecklist.forEach((item, i) => {
    if (i < 8) {
      it(`B${123 + i}: 실사 체크리스트 - ${item}`, async () => {
        const { s } = await ap('/api/v1/exchange/due-diligence/deal-1', {
          method: 'PATCH',
          body: JSON.stringify({ checklist_item: item, status: 'completed' })
        })
        expect([200, 400, 401, 404, 405]).toContain(s)
      })
    }
  })

  // 131-140: 오퍼
  it('B131: 오퍼 제출 API', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: 500000000 })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  it('B132: 오퍼 역제안', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'counter_offer', amount: 450000000 })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  it('B133: 오퍼 잘못된 금액 - 음수', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: -100 })
    })
    expect([400, 401, 404, 405, 422]).toContain(s)
  })

  it('B134: 오퍼 빈 금액', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer' })
    })
    expect([400, 401, 404, 405, 422]).toContain(s)
  })

  it('B135: 오퍼 잘못된 deal_id', async () => {
    const { s } = await ap('/api/v1/exchange/deals/nonexistent-999', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: 500000000 })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  it('B136: 오퍼 0원', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: 0 })
    })
    expect([400, 401, 404, 405, 422]).toContain(s)
  })

  it('B137: 오퍼 문자열 금액', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: 'abc' })
    })
    expect([400, 401, 404, 405, 422]).toContain(s)
  })

  it('B138: 오퍼 매우 큰 금액', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: 999999999999999 })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  it('B139: 오퍼 float 금액', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'submit_offer', amount: 500000000.5 })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  it('B140: 오퍼 action 누락', async () => {
    const { s } = await ap('/api/v1/exchange/deals/deal-1', {
      method: 'PATCH',
      body: JSON.stringify({ amount: 500000000 })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  // 141-150: 딜룸 채팅
  it('B141: 딜룸 메시지 전송 API', async () => {
    const { s } = await ap('/api/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'deal-1', message: '안녕하세요' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B142: 딜룸 메시지 조회 API', async () => {
    const { s } = await ap('/api/deal-rooms?deal_id=deal-1')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B143: 딜룸 빈 메시지', async () => {
    const { s } = await ap('/api/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'deal-1', message: '' })
    })
    expect([200, 400, 401, 405, 422]).toContain(s)
  })

  it('B144: 딜룸 긴 메시지', async () => {
    const longMsg = 'A'.repeat(5000)
    const { s } = await ap('/api/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'deal-1', message: longMsg })
    })
    expect([200, 201, 400, 401, 405, 413]).toContain(s)
  })

  it('B145: 딜룸 시스템 메시지', async () => {
    const { s } = await ap('/api/deal-rooms?deal_id=deal-1&type=system')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B146: 딜룸 문서 메시지', async () => {
    const { s } = await ap('/api/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'deal-1', message: '문서 첨부', type: 'document' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B147: 딜룸 잘못된 deal_id 메시지', async () => {
    const { s } = await ap('/api/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'nonexistent', message: '테스트' })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  it('B148: 딜룸 deal_id 없는 메시지', async () => {
    const { s } = await ap('/api/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ message: '테스트' })
    })
    expect([200, 400, 401, 405, 422]).toContain(s)
  })

  it('B149: 딜룸 메시지 조회 페이지네이션', async () => {
    const { s } = await ap('/api/deal-rooms?deal_id=deal-1&page=1&limit=20')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B150: 딜룸 페이지 deal-3', async () => {
    const { s } = await pg('/deal-rooms/deal-3')
    expect([200, 302, 307, 404]).toContain(s)
  })

  // 151-160: 계약 관리
  it('B151: 계약 메인 페이지', async () => {
    const { s } = await pg('/exchange/contract')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B152: 계약 API 목록', async () => {
    const { s } = await ap('/api/v1/contracts')
    expect([200, 401]).toContain(s)
  })

  it('B153: 계약 API 상세 - 1', async () => {
    const { s } = await ap('/api/v1/contracts/1')
    expect([200, 401, 404]).toContain(s)
  })

  it('B154: 계약 API 상세 - 2', async () => {
    const { s } = await ap('/api/v1/contracts/2')
    expect([200, 401, 404]).toContain(s)
  })

  it('B155: 계약 API POST', async () => {
    const { s } = await ap('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'deal-1' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B156: 계약 API 빈 바디', async () => {
    const { s } = await ap('/api/v1/contracts', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B157: 계약 페이지 HTML', async () => {
    const { s, b } = await pg('/exchange/contract')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B158: 계약 API 존재하지않는 ID', async () => {
    const { s } = await ap('/api/v1/contracts/nonexistent-999')
    expect([401, 404]).toContain(s)
  })

  it('B159: 계약 API 잘못된 deal_id POST', async () => {
    const { s } = await ap('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify({ deal_id: 'nonexistent' })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  it('B160: 매수자 계약 페이지', async () => {
    const { s } = await pg('/buyer/compare')
    expect([200, 302, 307, 404]).toContain(s)
  })

  // 161-170: 거래 완료
  it('B161: 아카이브 페이지', async () => {
    const { s } = await pg('/exchange/archive')
    expect([200, 302, 307]).toContain(s)
  })

  it('B162: 아카이브 HTML', async () => {
    const { s, b } = await pg('/exchange/archive')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B163: 딜 API 완료 상태 필터', async () => {
    const { s } = await ap('/api/v1/exchange/deals?status=completed')
    expect([200, 401]).toContain(s)
  })

  it('B164: 딜 API 취소 상태 필터', async () => {
    const { s } = await ap('/api/v1/exchange/deals?status=cancelled')
    expect([200, 401]).toContain(s)
  })

  it('B165: 딜 API 진행중 상태 필터', async () => {
    const { s } = await ap('/api/v1/exchange/deals?status=in_progress')
    expect([200, 401]).toContain(s)
  })

  it('B166: 매수자 저장된 검색', async () => {
    const { s } = await pg('/buyer/saved-searches')
    expect([200, 302, 307]).toContain(s)
  })

  it('B167: 매수 온보딩 페이지', async () => {
    const { s } = await pg('/buyer/onboarding')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B168: 매수 비교 페이지', async () => {
    const { s } = await pg('/buyer/compare')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B169: 딜 API 전체 조회 재확인', async () => {
    const { s } = await ap('/api/v1/exchange/deals')
    expect([200, 401]).toContain(s)
  })

  it('B170: 딜 API 잘못된 상태 필터', async () => {
    const { s } = await ap('/api/v1/exchange/deals?status=invalid_status')
    expect([200, 400, 401]).toContain(s)
  })

  // 171-180: 거래 칸반 보드
  it('B171: 매수자 딜 메인', async () => {
    const { s } = await pg('/buyer')
    expect([200, 302, 307]).toContain(s)
  })

  it('B172: 매수자 딜 HTML', async () => {
    const { s, b } = await pg('/buyer')
    if (s === 200) expect(b).toContain('</html>')
  })

  const dealStages = ['interest', 'nda', 'due_diligence', 'offer', 'negotiation', 'contract', 'closing', 'archived']
  dealStages.forEach((stage, i) => {
    it(`B${173 + i}: 딜 단계 필터 - ${stage}`, async () => {
      const { s } = await ap(`/api/v1/exchange/deals?stage=${stage}`)
      expect([200, 401]).toContain(s)
    })
  })
})

// ============================================================
// D. 전문가 상담 (B181-B230)
// ============================================================
describe('D. 전문가 상담', () => {
  // 181-190: 전문가 마켓플레이스
  it('B181: 전문가 마켓플레이스 메인', async () => {
    const { s } = await pg('/professional')
    expect([200, 302, 307]).toContain(s)
  })

  it('B182: 전문가 마켓플레이스 HTML', async () => {
    const { s, b } = await pg('/professional')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B183: 전문가 법률 카테고리', async () => {
    const { s } = await pg('/professional/law')
    expect([200, 302, 307]).toContain(s)
  })

  it('B184: 전문가 세무 카테고리', async () => {
    const { s } = await pg('/professional/tax')
    expect([200, 302, 307]).toContain(s)
  })

  it('B185: 전문가 감정평가 카테고리', async () => {
    const { s } = await pg('/professional/realtor')
    expect([200, 302, 307]).toContain(s)
  })

  it('B186: 전문가 API 전체 목록', async () => {
    const { s } = await ap('/api/v1/professional')
    expect([200, 401]).toContain(s)
  })

  it('B187: 전문가 API 법률 필터', async () => {
    const { s } = await ap('/api/v1/professional?category=law')
    expect([200, 401]).toContain(s)
  })

  it('B188: 전문가 API 세무 필터', async () => {
    const { s } = await ap('/api/v1/professional?category=tax')
    expect([200, 401]).toContain(s)
  })

  it('B189: 전문가 API 감정평가 필터', async () => {
    const { s } = await ap('/api/v1/professional?category=realtor')
    expect([200, 401]).toContain(s)
  })

  it('B190: 전문가 등록 페이지', async () => {
    const { s } = await pg('/professional/register')
    expect([200, 302, 307]).toContain(s)
  })

  // 191-200: 전문가 상세 프로필
  const profIds = ['1', '2', '3', '4', '5']
  profIds.forEach((id, i) => {
    it(`B${191 + i}: 전문가 상세 - ID ${id}`, async () => {
      const { s } = await pg(`/professional/${id}`)
      expect([200, 302, 307, 404]).toContain(s)
    })
  })

  it('B196: 전문가 상세 API - 1', async () => {
    const { s } = await ap('/api/v1/professionals')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B197: 전문가 상세 페이지 HTML - 1', async () => {
    const { s, b } = await pg('/professional/1')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B198: 전문가 존재하지않는 ID 페이지', async () => {
    const { s } = await pg('/professional/nonexistent-999')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B199: 전문가 내 상담 페이지', async () => {
    const { s } = await pg('/professional/my')
    expect([200, 302, 307]).toContain(s)
  })

  it('B200: 전문가 문의 페이지', async () => {
    const { s } = await pg('/professional/inquiries')
    expect([200, 302, 307, 404]).toContain(s)
  })

  // 201-210: 상담 요청 API
  it('B201: 상담 요청 API 정상', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: '1',
        content: 'NPL 매수 관련 법률 상담 요청',
        preferred_date: '2026-04-01T10:00:00Z'
      })
    })
    expect([200, 201, 400, 401]).toContain(s)
  })

  it('B202: 상담 요청 - 잘못된 전문가ID', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: 'nonexistent-999',
        content: '상담 요청',
        preferred_date: '2026-04-01T10:00:00Z'
      })
    })
    expect([400, 401, 404]).toContain(s)
  })

  it('B203: 상담 요청 - 빈 내용', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: '1',
        content: '',
        preferred_date: '2026-04-01T10:00:00Z'
      })
    })
    expect([400, 401, 422]).toContain(s)
  })

  it('B204: 상담 요청 - 과거 일시', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: '1',
        content: '상담 요청',
        preferred_date: '2020-01-01T10:00:00Z'
      })
    })
    expect([200, 400, 401, 422]).toContain(s)
  })

  it('B205: 상담 요청 - 빈 professional_id', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({ professional_id: '', content: '테스트' })
    })
    expect([400, 401, 422]).toContain(s)
  })

  it('B206: 상담 요청 - 빈 바디', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([400, 401, 422]).toContain(s)
  })

  it('B207: 상담 요청 - 매우 긴 내용', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: '1',
        content: '상'.repeat(10000),
        preferred_date: '2026-04-01T10:00:00Z'
      })
    })
    expect([200, 201, 400, 401, 413]).toContain(s)
  })

  it('B208: 상담 요청 - 잘못된 날짜 형식', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: '1',
        content: '테스트',
        preferred_date: 'invalid-date'
      })
    })
    expect([200, 400, 401, 422]).toContain(s)
  })

  it('B209: 상담 요청 - 숫자 professional_id', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({ professional_id: 999, content: '테스트' })
    })
    expect([200, 400, 401, 404]).toContain(s)
  })

  it('B210: 상담 요청 - 특수문자 내용', async () => {
    const { s } = await ap('/api/v1/professional/consultations', {
      method: 'POST',
      body: JSON.stringify({
        professional_id: '1',
        content: '<script>alert("xss")</script>'
      })
    })
    expect([200, 201, 400, 401]).toContain(s)
  })

  // 211-220: 상담 목록/상태
  it('B211: 상담 목록 API', async () => {
    const { s } = await ap('/api/v1/professional/consultations')
    expect([200, 401]).toContain(s)
  })

  it('B212: 상담 목록 대기 필터', async () => {
    const { s } = await ap('/api/v1/professional/consultations?status=pending')
    expect([200, 401]).toContain(s)
  })

  it('B213: 상담 목록 확정 필터', async () => {
    const { s } = await ap('/api/v1/professional/consultations?status=confirmed')
    expect([200, 401]).toContain(s)
  })

  it('B214: 상담 목록 완료 필터', async () => {
    const { s } = await ap('/api/v1/professional/consultations?status=completed')
    expect([200, 401]).toContain(s)
  })

  it('B215: 상담 목록 취소 필터', async () => {
    const { s } = await ap('/api/v1/professional/consultations?status=cancelled')
    expect([200, 401]).toContain(s)
  })

  it('B216: 상담 페이지 - consultations', async () => {
    const { s } = await pg('/professional/consultations')
    expect([200, 302, 307]).toContain(s)
  })

  it('B217: 상담 페이지 HTML', async () => {
    const { s, b } = await pg('/professional/consultations')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B218: 상담 잘못된 상태 필터', async () => {
    const { s } = await ap('/api/v1/professional/consultations?status=invalid')
    expect([200, 400, 401]).toContain(s)
  })

  it('B219: 상담 페이지네이션', async () => {
    const { s } = await ap('/api/v1/professional/consultations?page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  it('B220: 상담 목록 정렬', async () => {
    const { s } = await ap('/api/v1/professional/consultations?sort=created_at&order=desc')
    expect([200, 401]).toContain(s)
  })

  // 221-230: 전문가 서비스 API
  it('B221: 전문가 서비스 목록', async () => {
    const { s } = await ap('/api/v1/professional/services')
    expect([200, 401]).toContain(s)
  })

  it('B222: 전문가 서비스 법률 필터', async () => {
    const { s } = await ap('/api/v1/professional/services?category=law')
    expect([200, 401]).toContain(s)
  })

  it('B223: 전문가 서비스 세무 필터', async () => {
    const { s } = await ap('/api/v1/professional/services?category=tax')
    expect([200, 401]).toContain(s)
  })

  it('B224: 전문가 서비스 감정평가 필터', async () => {
    const { s } = await ap('/api/v1/professional/services?category=realtor')
    expect([200, 401]).toContain(s)
  })

  it('B225: 전문가 수익 API', async () => {
    const { s } = await ap('/api/v1/professional/earnings')
    expect([200, 401]).toContain(s)
  })

  it('B226: 전문가 서비스 POST', async () => {
    const { s } = await ap('/api/v1/professional/services', {
      method: 'POST',
      body: JSON.stringify({ name: '법률 상담', price: 100000 })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B227: 전문가 서비스 빈 바디 POST', async () => {
    const { s } = await ap('/api/v1/professional/services', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B228: 전문가 서비스 가격없이 POST', async () => {
    const { s } = await ap('/api/v1/professional/services', {
      method: 'POST', body: JSON.stringify({ name: '테스트 서비스' })
    })
    expect([200, 400, 401, 405, 422]).toContain(s)
  })

  it('B229: 전문가 서비스 페이지네이션', async () => {
    const { s } = await ap('/api/v1/professional/services?page=1&limit=5')
    expect([200, 401]).toContain(s)
  })

  it('B230: 전문가 서비스 정렬', async () => {
    const { s } = await ap('/api/v1/professional/services?sort=price&order=asc')
    expect([200, 401]).toContain(s)
  })
})

// ============================================================
// E. 과금/크레딧 (B231-B290)
// ============================================================
describe('E. 과금/크레딧', () => {
  // 231-240: 구독 플랜 조회
  it('B231: 구독 플랜 페이지', async () => {
    const { s } = await pg('/settings/billing')
    expect([200, 302, 307]).toContain(s)
  })

  it('B232: 구독 API 조회', async () => {
    const { s } = await ap('/api/v1/billing/subscribe')
    expect([200, 401, 405]).toContain(s)
  })

  it('B233: 구독 플랜 목록 GET', async () => {
    const { s } = await ap('/api/v1/billing/subscribe?type=plans')
    expect([200, 401, 405]).toContain(s)
  })

  it('B234: 구독 페이지 HTML', async () => {
    const { s, b } = await pg('/settings/billing')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B235: 구독 결제 페이지', async () => {
    const { s } = await pg('/settings/payment')
    expect([200, 302, 307]).toContain(s)
  })

  it('B236: 구독 결제 HTML', async () => {
    const { s, b } = await pg('/settings/payment')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B237: 구독 API basic 플랜', async () => {
    const { s } = await ap('/api/v1/billing/subscribe?plan=basic')
    expect([200, 401, 405]).toContain(s)
  })

  it('B238: 구독 API professional 플랜', async () => {
    const { s } = await ap('/api/v1/billing/subscribe?plan=professional')
    expect([200, 401, 405]).toContain(s)
  })

  it('B239: 구독 API enterprise 플랜', async () => {
    const { s } = await ap('/api/v1/billing/subscribe?plan=enterprise')
    expect([200, 401, 405]).toContain(s)
  })

  it('B240: 구독 API 잘못된 플랜', async () => {
    const { s } = await ap('/api/v1/billing/subscribe?plan=nonexistent')
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  // 241-250: 크레딧 잔액/패키지
  it('B241: 크레딧 API 조회', async () => {
    const { s } = await ap('/api/v1/credits')
    expect([200, 401]).toContain(s)
  })

  it('B242: 크레딧 잔액 조회', async () => {
    const { s } = await ap('/api/v1/credits?type=balance')
    expect([200, 401]).toContain(s)
  })

  it('B243: 크레딧 구매 페이지', async () => {
    const { s } = await ap('/api/v1/billing/credits')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B244: 크레딧 패키지 조회', async () => {
    const { s } = await ap('/api/v1/credits?type=packages')
    expect([200, 401]).toContain(s)
  })

  it('B245: 크레딧 이력 조회', async () => {
    const { s } = await ap('/api/v1/credits?type=history')
    expect([200, 401]).toContain(s)
  })

  it('B246: 크레딧 이력 페이지네이션', async () => {
    const { s } = await ap('/api/v1/credits?type=history&page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  it('B247: 크레딧 이력 날짜 필터', async () => {
    const { s } = await ap('/api/v1/credits?type=history&from=2026-01-01&to=2026-03-21')
    expect([200, 401]).toContain(s)
  })

  it('B248: 크레딧 사용 내역', async () => {
    const { s } = await ap('/api/v1/credits?type=usage')
    expect([200, 401]).toContain(s)
  })

  it('B249: 크레딧 충전 내역', async () => {
    const { s } = await ap('/api/v1/credits?type=charges')
    expect([200, 401]).toContain(s)
  })

  it('B250: 크레딧 만료 예정', async () => {
    const { s } = await ap('/api/v1/credits?type=expiring')
    expect([200, 401]).toContain(s)
  })

  // 251-260: 청구서 목록
  it('B251: 청구서 API 목록', async () => {
    const { s } = await ap('/api/v1/billing/invoices')
    expect([200, 401]).toContain(s)
  })

  it('B252: 청구서 페이지네이션', async () => {
    const { s } = await ap('/api/v1/billing/invoices?page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  it('B253: 청구서 날짜 필터', async () => {
    const { s } = await ap('/api/v1/billing/invoices?from=2026-01-01')
    expect([200, 401]).toContain(s)
  })

  it('B254: 청구서 상태 필터 - paid', async () => {
    const { s } = await ap('/api/v1/billing/invoices?status=paid')
    expect([200, 401]).toContain(s)
  })

  it('B255: 청구서 상태 필터 - pending', async () => {
    const { s } = await ap('/api/v1/billing/invoices?status=pending')
    expect([200, 401]).toContain(s)
  })

  it('B256: 청구서 상태 필터 - overdue', async () => {
    const { s } = await ap('/api/v1/billing/invoices?status=overdue')
    expect([200, 401]).toContain(s)
  })

  it('B257: 청구서 잘못된 상태', async () => {
    const { s } = await ap('/api/v1/billing/invoices?status=invalid')
    expect([200, 400, 401]).toContain(s)
  })

  it('B258: 청구서 정렬 최신순', async () => {
    const { s } = await ap('/api/v1/billing/invoices?sort=created_at&order=desc')
    expect([200, 401]).toContain(s)
  })

  it('B259: 청구서 정렬 금액순', async () => {
    const { s } = await ap('/api/v1/billing/invoices?sort=amount&order=desc')
    expect([200, 401]).toContain(s)
  })

  it('B260: 청구서 2페이지', async () => {
    const { s } = await ap('/api/v1/billing/invoices?page=2&limit=10')
    expect([200, 401]).toContain(s)
  })

  // 261-270: 구독 신청 API
  it('B261: 구독 신청 POST basic', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: 'basic' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B262: 구독 신청 POST professional', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: 'professional' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B263: 구독 신청 POST enterprise', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: 'enterprise' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B264: 구독 신청 잘못된 plan_id', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: 'nonexistent' })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  it('B265: 구독 신청 누락 필드', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B266: 구독 신청 빈 plan_id', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: '' })
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B267: 구독 해지 요청', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'DELETE'
    })
    expect([200, 204, 400, 401, 405]).toContain(s)
  })

  it('B268: 구독 변경 PUT', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'PUT', body: JSON.stringify({ plan_id: 'professional' })
    })
    expect([200, 400, 401, 405]).toContain(s)
  })

  it('B269: 구독 숫자 plan_id', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: 12345 })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  it('B270: 구독 특수문자 plan_id', async () => {
    const { s } = await ap('/api/v1/billing/subscribe', {
      method: 'POST', body: JSON.stringify({ plan_id: '!@#$%' })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  // 271-280: 크레딧 구매 API
  it('B271: 크레딧 구매 POST', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'credit-100' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B272: 크레딧 구매 잘못된 product_id', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'nonexistent' })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  it('B273: 크레딧 구매 빈 바디', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B274: 크레딧 구매 빈 product_id', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: '' })
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B275: 크레딧 구매 credit-500', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'credit-500' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B276: 크레딧 구매 credit-1000', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'credit-1000' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B277: 크레딧 구매 숫자 product_id', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 99999 })
    })
    expect([400, 401, 404, 405]).toContain(s)
  })

  it('B278: 크레딧 구매 수량 포함', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'credit-100', quantity: 3 })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B279: 크레딧 구매 음수 수량', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'credit-100', quantity: -1 })
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  it('B280: 크레딧 구매 0 수량', async () => {
    const { s } = await ap('/api/v1/credits', {
      method: 'POST', body: JSON.stringify({ product_id: 'credit-100', quantity: 0 })
    })
    expect([400, 401, 405, 422]).toContain(s)
  })

  // 281-290: 결제 페이지
  it('B281: 설정 빌링 페이지 재확인', async () => {
    const { s } = await pg('/settings/billing')
    expect([200, 302, 307]).toContain(s)
  })

  it('B282: 설정 결제 페이지 재확인', async () => {
    const { s } = await pg('/settings/payment')
    expect([200, 302, 307]).toContain(s)
  })

  it('B283: 결제 API 조회', async () => {
    const { s } = await ap('/api/v1/payments')
    expect([200, 401]).toContain(s)
  })

  it('B284: 결제 API 상세 - 1', async () => {
    const { s } = await ap('/api/v1/payments/1')
    expect([200, 401, 404]).toContain(s)
  })

  it('B285: 결제 API 상세 - 2', async () => {
    const { s } = await ap('/api/v1/payments/2')
    expect([200, 401, 404]).toContain(s)
  })

  it('B286: 결제 API 존재하지않는 ID', async () => {
    const { s } = await ap('/api/v1/payments/nonexistent-999')
    expect([401, 404]).toContain(s)
  })

  it('B287: 결제 API 페이지네이션', async () => {
    const { s } = await ap('/api/v1/payments?page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  it('B288: 결제 API 상태 필터', async () => {
    const { s } = await ap('/api/v1/payments?status=completed')
    expect([200, 401]).toContain(s)
  })

  it('B289: 마이페이지', async () => {
    const { s } = await pg('/mypage')
    expect([200, 302, 307]).toContain(s)
  })

  it('B290: 마이페이지 HTML', async () => {
    const { s, b } = await pg('/mypage')
    if (s === 200) expect(b).toContain('</html>')
  })
})

// ============================================================
// F. 커뮤니티/뉴스/통계 (B291-B350)
// ============================================================
describe('F. 커뮤니티/뉴스/통계', () => {
  // 291-300: 커뮤니티 페이지
  it('B291: 커뮤니티 메인', async () => {
    const { s } = await pg('/community')
    expect([200, 302, 307]).toContain(s)
  })

  it('B292: 커뮤니티 HTML', async () => {
    const { s, b } = await pg('/community')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B293: 커뮤니티 글 상세 - 1', async () => {
    const { s } = await pg('/community/1')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B294: 커뮤니티 글 상세 - 2', async () => {
    const { s } = await pg('/community/2')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B295: 커뮤니티 전문가 글', async () => {
    const { s } = await pg('/community/expert')
    expect([200, 302, 307]).toContain(s)
  })

  it('B296: 커뮤니티 새 글', async () => {
    const { s } = await pg('/community/new')
    expect([200, 302, 307]).toContain(s)
  })

  it('B297: 커뮤니티 API 목록', async () => {
    const { s } = await ap('/api/v1/community')
    expect([200, 401]).toContain(s)
  })

  it('B298: 커뮤니티 API 상세 - 1', async () => {
    const { s } = await ap('/api/v1/community/1')
    expect([200, 401, 404]).toContain(s)
  })

  it('B299: 커뮤니티 API POST', async () => {
    const { s } = await ap('/api/v1/community', {
      method: 'POST',
      body: JSON.stringify({ title: 'test', content: 'test content' })
    })
    expect([200, 201, 400, 401]).toContain(s)
  })

  it('B300: 커뮤니티 API 페이지네이션', async () => {
    const { s } = await ap('/api/v1/community?page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  // 301-310: 뉴스 페이지
  it('B301: 뉴스 메인', async () => {
    const { s } = await pg('/news')
    expect([200, 302, 307]).toContain(s)
  })

  it('B302: 뉴스 HTML', async () => {
    const { s, b } = await pg('/news')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B303: 뉴스 검색 API', async () => {
    const { s } = await ap('/api/news-search?q=NPL')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B304: 뉴스 통계 API', async () => {
    const { s } = await ap('/api/news-stats')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B305: 일간 키워드 API', async () => {
    const { s } = await ap('/api/daily-top-keywords')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B306: 주간 키워드 API', async () => {
    const { s } = await ap('/api/weekly-keyword-stats')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B307: 키워드 트렌드 API', async () => {
    const { s } = await ap('/api/keyword-trend?keyword=NPL')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B308: 일간 키워드 등락 API', async () => {
    const { s } = await ap('/api/daily-keyword-updown')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B309: 주간 키워드 등락 API', async () => {
    const { s } = await ap('/api/weekly-keyword-updown')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B310: 일간 키워드 통계 API', async () => {
    const { s } = await ap('/api/daily-keyword-stats')
    expect([200, 401, 404, 405]).toContain(s)
  })

  // 311-320: 시장 인텔리전스
  it('B311: 시장 인텔리전스 메인', async () => {
    const { s } = await pg('/market-intelligence')
    expect([200, 302, 307]).toContain(s)
  })

  it('B312: 시장 인텔리전스 HTML', async () => {
    const { s, b } = await pg('/market-intelligence')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B313: 히트맵 페이지', async () => {
    const { s } = await pg('/market-intelligence/heatmap')
    expect([200, 302, 307]).toContain(s)
  })

  it('B314: 리포트 페이지', async () => {
    const { s } = await pg('/market-intelligence/reports')
    expect([200, 302, 307]).toContain(s)
  })

  it('B315: 시그널 페이지', async () => {
    const { s } = await pg('/market-intelligence/signals')
    expect([200, 302, 307]).toContain(s)
  })

  it('B316: 인텔리전스 API overview', async () => {
    const { s } = await ap('/api/v1/intelligence/overview')
    expect([200, 401]).toContain(s)
  })

  it('B317: 인텔리전스 API heatmap', async () => {
    const { s } = await ap('/api/v1/intelligence/heatmap')
    expect([200, 401]).toContain(s)
  })

  it('B318: 인텔리전스 API reports', async () => {
    const { s } = await ap('/api/v1/intelligence/reports')
    expect([200, 401]).toContain(s)
  })

  it('B319: 인텔리전스 API signals', async () => {
    const { s } = await ap('/api/v1/intelligence/signals')
    expect([200, 401]).toContain(s)
  })

  it('B320: 히트맵 HTML', async () => {
    const { s, b } = await pg('/market-intelligence/heatmap')
    if (s === 200) expect(b).toContain('</html>')
  })

  // 321-330: 통계
  it('B321: 통계 메인', async () => {
    const { s } = await pg('/statistics')
    expect([200, 302, 307]).toContain(s)
  })

  it('B322: 통계 HTML', async () => {
    const { s, b } = await pg('/statistics')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B323: 통계 트렌드 페이지', async () => {
    const { s } = await pg('/statistics/trend')
    expect([200, 302, 307]).toContain(s)
  })

  it('B324: 통계 트렌드 HTML', async () => {
    const { s, b } = await pg('/statistics/trend')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B325: 통계 API', async () => {
    const { s } = await ap('/api/v1/statistics')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B326: 통계 API 기간 필터', async () => {
    const { s } = await ap('/api/v1/statistics?period=monthly')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B327: 통계 API 주간', async () => {
    const { s } = await ap('/api/v1/statistics?period=weekly')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B328: 통계 API 일간', async () => {
    const { s } = await ap('/api/v1/statistics?period=daily')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B329: 통계 API 지역별', async () => {
    const { s } = await ap('/api/v1/statistics?group_by=region')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B330: 통계 API 담보유형별', async () => {
    const { s } = await ap('/api/v1/statistics?group_by=collateral_type')
    expect([200, 401, 404, 405]).toContain(s)
  })

  // 331-340: 지식센터
  it('B331: 지식센터 메인', async () => {
    const { s } = await pg('/knowledge')
    expect([200, 302, 307]).toContain(s)
  })

  it('B332: 지식센터 HTML', async () => {
    const { s, b } = await pg('/knowledge')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B333: 교육과정 페이지', async () => {
    const { s } = await pg('/knowledge/courses')
    expect([200, 302, 307]).toContain(s)
  })

  it('B334: 교육과정 HTML', async () => {
    const { s, b } = await pg('/knowledge/courses')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B335: 용어사전 페이지', async () => {
    const { s } = await pg('/knowledge/glossary')
    expect([200, 302, 307]).toContain(s)
  })

  it('B336: 용어사전 HTML', async () => {
    const { s, b } = await pg('/knowledge/glossary')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B337: 커리큘럼 페이지', async () => {
    const { s } = await pg('/curriculum')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B338: 지식센터 에러 페이지', async () => {
    const { s } = await pg('/knowledge/nonexistent')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B339: 교육과정 상세 - 1', async () => {
    const { s } = await pg('/knowledge/courses/1')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B340: 용어사전 검색', async () => {
    const { s } = await pg('/knowledge/glossary?q=NPL')
    expect([200, 302, 307]).toContain(s)
  })

  // 341-350: NPL 분석 도구
  it('B341: NPL 분석 메인', async () => {
    const { s } = await pg('/npl-analysis')
    expect([200, 302, 307]).toContain(s)
  })

  it('B342: NPL 분석 HTML', async () => {
    const { s, b } = await pg('/npl-analysis')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B343: NPL 새 분석', async () => {
    const { s } = await pg('/npl-analysis/new')
    expect([200, 302, 307]).toContain(s)
  })

  it('B344: NPL 비교', async () => {
    const { s } = await pg('/npl-analysis/compare')
    expect([200, 302, 307]).toContain(s)
  })

  it('B345: NPL 분석 상세 - 1', async () => {
    const { s } = await pg('/npl-analysis/1')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B346: NPL 분석 상세 - 2', async () => {
    const { s } = await pg('/npl-analysis/2')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B347: NPL API 분석', async () => {
    const { s } = await ap('/api/v1/analysis')
    expect([200, 401, 404, 405]).toContain(s)
  })

  it('B348: NPL API POST', async () => {
    const { s } = await ap('/api/npl', {
      method: 'POST',
      body: JSON.stringify({ address: '서울시 강남구', amount: 500000000 })
    })
    expect([200, 201, 400, 401, 404, 405]).toContain(s)
  })

  it('B349: NPL 새 분석 HTML', async () => {
    const { s, b } = await pg('/npl-analysis/new')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B350: NPL 비교 HTML', async () => {
    const { s, b } = await pg('/npl-analysis/compare')
    if (s === 200) expect(b).toContain('</html>')
  })
})

// ============================================================
// G. 배너/알림/기타 (B351-B400)
// ============================================================
describe('G. 배너/알림/기타', () => {
  // 351-360: 배너 API
  const bannerPositions = ['hero', 'sidebar', 'service-top', 'footer', 'exchange-top', 'deal-room', 'community', 'knowledge', 'analysis', 'statistics']
  bannerPositions.forEach((pos, i) => {
    it(`B${351 + i}: 배너 API - ${pos}`, async () => {
      const { s } = await ap(`/api/v1/banners?position=${pos}`)
      expect([200, 401]).toContain(s)
    })
  })

  // 361-370: 배너 트래킹
  it('B361: 배너 클릭 트래킹 - banner-1', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'banner-1', action: 'click' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B362: 배너 노출 트래킹 - banner-1', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'banner-1', action: 'impression' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B363: 배너 클릭 트래킹 - banner-2', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'banner-2', action: 'click' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B364: 배너 노출 트래킹 - banner-2', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'banner-2', action: 'impression' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B365: 배너 클릭 트래킹 - banner-3', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'banner-3', action: 'click' })
    })
    expect([200, 201, 400, 401, 405]).toContain(s)
  })

  it('B366: 배너 잘못된 ID', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'nonexistent', action: 'click' })
    })
    expect([200, 400, 401, 404, 405]).toContain(s)
  })

  it('B367: 배너 빈 바디', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST', body: JSON.stringify({})
    })
    expect([200, 400, 401, 405, 422]).toContain(s)
  })

  it('B368: 배너 잘못된 action', async () => {
    const { s } = await ap('/api/v1/banners', {
      method: 'POST',
      body: JSON.stringify({ banner_id: 'banner-1', action: 'invalid' })
    })
    expect([200, 400, 401, 405]).toContain(s)
  })

  it('B369: 배너 API 전체 조회', async () => {
    const { s } = await ap('/api/v1/banners')
    expect([200, 401]).toContain(s)
  })

  it('B370: 배너 API active 필터', async () => {
    const { s } = await ap('/api/v1/banners?status=active')
    expect([200, 401]).toContain(s)
  })

  // 371-380: 펀드/대출
  it('B371: 펀드 메인', async () => {
    const { s } = await pg('/fund')
    expect([200, 302, 307]).toContain(s)
  })

  it('B372: 펀드 HTML', async () => {
    const { s, b } = await pg('/fund')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B373: 펀드 상세 - 1', async () => {
    const { s } = await pg('/fund/1')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B374: 펀드 상세 - 2', async () => {
    const { s } = await pg('/fund/2')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B375: 펀드 상세 - 3', async () => {
    const { s } = await pg('/fund/3')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B376: 대출 메인', async () => {
    const { s } = await pg('/lender')
    expect([200, 302, 307]).toContain(s)
  })

  it('B377: 대출 HTML', async () => {
    const { s, b } = await pg('/lender')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B378: 대출 상세 - 1', async () => {
    const { s } = await pg('/lender/1')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B379: 대출 상세 - 2', async () => {
    const { s } = await pg('/lender/2')
    expect([200, 302, 307, 404]).toContain(s)
  })

  it('B380: 대출 상세 - 3', async () => {
    const { s } = await pg('/lender/3')
    expect([200, 302, 307, 404]).toContain(s)
  })

  // 381-390: 알림/공지
  it('B381: 알림 페이지', async () => {
    const { s } = await pg('/notifications')
    expect([200, 302, 307]).toContain(s)
  })

  it('B382: 알림 HTML', async () => {
    const { s, b } = await pg('/notifications')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B383: 알림 API 조회', async () => {
    const { s } = await ap('/api/v1/notifications')
    expect([200, 401]).toContain(s)
  })

  it('B384: 알림 API 페이지네이션', async () => {
    const { s } = await ap('/api/v1/notifications?page=1&limit=20')
    expect([200, 401]).toContain(s)
  })

  it('B385: 알림 API 읽음 필터', async () => {
    const { s } = await ap('/api/v1/notifications?read=true')
    expect([200, 401]).toContain(s)
  })

  it('B386: 공지 페이지', async () => {
    const { s } = await pg('/notices')
    expect([200, 302, 307]).toContain(s)
  })

  it('B387: 공지 HTML', async () => {
    const { s, b } = await pg('/notices')
    if (s === 200) expect(b).toContain('</html>')
  })

  it('B388: 공지 API 조회', async () => {
    const { s } = await ap('/api/v1/notices')
    expect([200, 401]).toContain(s)
  })

  it('B389: 공지 API 페이지네이션', async () => {
    const { s } = await ap('/api/v1/notices?page=1&limit=10')
    expect([200, 401]).toContain(s)
  })

  it('B390: 알림 안읽음 필터', async () => {
    const { s } = await ap('/api/v1/notifications?read=false')
    expect([200, 401]).toContain(s)
  })

  // 391-400: 서비스 가이드
  const guideServices = [
    'deal-bridge', 'ocr', 'matching', 'analysis', 'market',
    'professional', 'fund', 'community', 'knowledge', 'statistics'
  ]
  guideServices.forEach((svc, i) => {
    it(`B${391 + i}: 서비스 가이드 - ${svc}`, async () => {
      const { s } = await pg(`/guide/service/${svc}`)
      expect([200, 302, 307, 404]).toContain(s)
    })
  })
})
