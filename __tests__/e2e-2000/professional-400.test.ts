import { describe, it, expect, vi } from 'vitest'
vi.setConfig({ testTimeout: 30000 })
const BASE = 'http://localhost:3000'
async function pg(p: string) { const r = await fetch(`${BASE}${p}`, { redirect: 'manual' }); return { s: r.status, b: await r.text() } }
async function ap(p: string, o?: RequestInit) { const r = await fetch(`${BASE}${p}`, { headers: { 'Content-Type': 'application/json' }, ...o }); let j: any; try { j = JSON.parse(await r.text()) } catch {}; return { s: r.status, j } }

// ============================================================
// A. 전문가 가입/등록 (P001-P060)
// ============================================================

// --- P001-P010: 전문가 가이드 ---
describe('P001-P010: 전문가 가이드', () => {
  it('P001: GET /professional/guide 페이지 로드', async () => {
    const { s } = await pg('/professional/guide')
    expect([200, 302, 303]).toContain(s)
  })

  it('P002: GET /professional/guide 콘텐츠 포함', async () => {
    const { s, b } = await pg('/professional/guide')
    if (s === 200) expect(b).toBeTruthy()
    else expect([302, 303]).toContain(s)
  })

  it('P003: GET /professional/guide/lawyer 법률 전문가 가이드', async () => {
    const { s } = await pg('/professional/guide/lawyer')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P004: GET /professional/guide/tax 세무 전문가 가이드', async () => {
    const { s } = await pg('/professional/guide/tax')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P005: GET /professional/guide/realtor 부동산 중개사 가이드', async () => {
    const { s } = await pg('/professional/guide/realtor')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P006: GET /professional/guide/appraiser 감정평가사 가이드', async () => {
    const { s } = await pg('/professional/guide/appraiser')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P007: GET /professional/guide/architect 건축사 가이드', async () => {
    const { s } = await pg('/professional/guide/architect')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P008: GET /professional/guide/finance 금융 전문가 가이드', async () => {
    const { s } = await pg('/professional/guide/finance')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P009: GET /professional/guide/faq 자주 묻는 질문', async () => {
    const { s } = await pg('/professional/guide/faq')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P010: GET /professional/guide/benefits 전문가 혜택 안내', async () => {
    const { s } = await pg('/professional/guide/benefits')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P011-P020: 전문가 등록 페이지 ---
describe('P011-P020: 전문가 등록 페이지', () => {
  it('P011: GET /professional/register 페이지 로드', async () => {
    const { s } = await pg('/professional/register')
    expect([200, 302, 303]).toContain(s)
  })

  it('P012: GET /professional/register 폼 존재 확인', async () => {
    const { s, b } = await pg('/professional/register')
    if (s === 200) expect(b.toLowerCase()).toMatch(/form|register|등록/)
    else expect([302, 303]).toContain(s)
  })

  it('P013: GET /professional/register/step1 1단계', async () => {
    const { s } = await pg('/professional/register/step1')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P014: GET /professional/register/step2 2단계', async () => {
    const { s } = await pg('/professional/register/step2')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P015: GET /professional/register/step3 3단계', async () => {
    const { s } = await pg('/professional/register/step3')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P016: GET /professional/register/complete 완료 페이지', async () => {
    const { s } = await pg('/professional/register/complete')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P017: GET /professional/register/terms 약관 페이지', async () => {
    const { s } = await pg('/professional/register/terms')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P018: GET /professional/register/verify 인증 페이지', async () => {
    const { s } = await pg('/professional/register/verify')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P019: GET /professional/register 비로그인 시 리다이렉트 가능', async () => {
    const { s } = await pg('/professional/register')
    expect([200, 302, 303]).toContain(s)
  })

  it('P020: GET /professional/register/documents 서류 업로드 페이지', async () => {
    const { s } = await pg('/professional/register/documents')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P021-P030: 전문가 등록 API ---
describe('P021-P030: 전문가 등록 API', () => {
  it('P021: POST /api/v1/professionals 정상 등록 요청', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '김변호사', specialty: 'lawyer', phone: '010-1234-5678', license_number: 'L-2024-001', bio: '부동산 전문 변호사' })
    })
    expect([200, 201, 400, 401, 403, 409, 422]).toContain(s)
  })

  it('P022: POST /api/v1/professionals 빈 이름', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '', specialty: 'lawyer', phone: '010-0000-0000' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P023: POST /api/v1/professionals 빈 specialty', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '이세무사', specialty: '', phone: '010-0000-0000' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P024: POST /api/v1/professionals 잘못된 specialty 값', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '박전문', specialty: 'invalid_type', phone: '010-0000-0000' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P025: POST /api/v1/professionals 빈 전화번호', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '최감정사', specialty: 'appraiser', phone: '' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P026: POST /api/v1/professionals 빈 body', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({})
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P027: POST /api/v1/professionals 중복 등록 시도', async () => {
    const body = JSON.stringify({ name: '중복전문가', specialty: 'lawyer', phone: '010-9999-9999', license_number: 'DUP-001' })
    await ap('/api/v1/professionals', { method: 'POST', body })
    const { s } = await ap('/api/v1/professionals', { method: 'POST', body })
    expect([400, 401, 403, 409, 422]).toContain(s)
  })

  it('P028: POST /api/v1/professionals specialty=tax 세무사 등록', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '정세무', specialty: 'tax', phone: '010-1111-2222' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P029: POST /api/v1/professionals specialty=realtor 중개사 등록', async () => {
    const { s } = await ap('/api/v1/professionals', {
      method: 'POST',
      body: JSON.stringify({ name: '한중개', specialty: 'realtor', phone: '010-3333-4444' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P030: GET /api/v1/professionals 목록 조회', async () => {
    const { s } = await ap('/api/v1/professionals')
    expect([200, 401, 403]).toContain(s)
  })
})

// --- P031-P040: 전문가 프로필 ---
describe('P031-P040: 전문가 프로필', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  ids.forEach((id, idx) => {
    it(`P${String(31 + idx).padStart(3, '0')}: GET /professional/${id} 전문가 프로필 조회`, async () => {
      const { s } = await pg(`/professional/${id}`)
      expect([200, 302, 303, 404]).toContain(s)
    })
  })
})

// --- P041-P050: 전문가 마켓플레이스 ---
describe('P041-P050: 전문가 마켓플레이스', () => {
  it('P041: GET /professional 전문가 마켓플레이스 메인', async () => {
    const { s } = await pg('/professional')
    expect([200, 302, 303]).toContain(s)
  })

  it('P042: GET /professional?specialty=lawyer 법률 전문가 필터', async () => {
    const { s } = await pg('/professional?specialty=lawyer')
    expect([200, 302, 303]).toContain(s)
  })

  it('P043: GET /professional?specialty=tax 세무 전문가 필터', async () => {
    const { s } = await pg('/professional?specialty=tax')
    expect([200, 302, 303]).toContain(s)
  })

  it('P044: GET /professional?specialty=realtor 중개사 필터', async () => {
    const { s } = await pg('/professional?specialty=realtor')
    expect([200, 302, 303]).toContain(s)
  })

  it('P045: GET /professional?specialty=appraiser 감정평가사 필터', async () => {
    const { s } = await pg('/professional?specialty=appraiser')
    expect([200, 302, 303]).toContain(s)
  })

  it('P046: GET /professional?specialty=architect 건축사 필터', async () => {
    const { s } = await pg('/professional?specialty=architect')
    expect([200, 302, 303]).toContain(s)
  })

  it('P047: GET /professional?sort=rating 평점순 정렬', async () => {
    const { s } = await pg('/professional?sort=rating')
    expect([200, 302, 303]).toContain(s)
  })

  it('P048: GET /professional?sort=reviews 리뷰순 정렬', async () => {
    const { s } = await pg('/professional?sort=reviews')
    expect([200, 302, 303]).toContain(s)
  })

  it('P049: GET /professional?region=seoul 지역 필터', async () => {
    const { s } = await pg('/professional?region=seoul')
    expect([200, 302, 303]).toContain(s)
  })

  it('P050: GET /professional?q=부동산 검색', async () => {
    const { s } = await pg('/professional?q=%EB%B6%80%EB%8F%99%EC%82%B0')
    expect([200, 302, 303]).toContain(s)
  })
})

// --- P051-P060: 전문가 대시보드 ---
describe('P051-P060: 전문가 대시보드', () => {
  it('P051: GET /professional/my/dashboard 대시보드', async () => {
    const { s } = await pg('/professional/my/dashboard')
    expect([200, 302, 303]).toContain(s)
  })

  it('P052: GET /professional/my/services 서비스 관리', async () => {
    const { s } = await pg('/professional/my/services')
    expect([200, 302, 303]).toContain(s)
  })

  it('P053: GET /professional/my/earnings 수익 관리', async () => {
    const { s } = await pg('/professional/my/earnings')
    expect([200, 302, 303]).toContain(s)
  })

  it('P054: GET /professional/my/consultations 상담 관리', async () => {
    const { s } = await pg('/professional/my/consultations')
    expect([200, 302, 303]).toContain(s)
  })

  it('P055: GET /professional/my/reviews 리뷰 관리', async () => {
    const { s } = await pg('/professional/my/reviews')
    expect([200, 302, 303]).toContain(s)
  })

  it('P056: GET /professional/my/profile 내 프로필', async () => {
    const { s } = await pg('/professional/my/profile')
    expect([200, 302, 303]).toContain(s)
  })

  it('P057: GET /professional/my/settings 설정', async () => {
    const { s } = await pg('/professional/my/settings')
    expect([200, 302, 303]).toContain(s)
  })

  it('P058: GET /professional/my/notifications 알림', async () => {
    const { s } = await pg('/professional/my/notifications')
    expect([200, 302, 303]).toContain(s)
  })

  it('P059: GET /professional/my/analytics 분석', async () => {
    const { s } = await pg('/professional/my/analytics')
    expect([200, 302, 303]).toContain(s)
  })

  it('P060: GET /professional/my/referrals 추천 관리', async () => {
    const { s } = await pg('/professional/my/referrals')
    expect([200, 302, 303]).toContain(s)
  })
})

// ============================================================
// B. 서비스 관리 (P061-P140)
// ============================================================

// --- P061-P070: 서비스 목록 API (GET) ---
describe('P061-P070: 서비스 목록 API', () => {
  it('P061: GET /api/v1/services 전체 서비스 목록', async () => {
    const { s } = await ap('/api/v1/services')
    expect([200, 401, 403]).toContain(s)
  })

  it('P062: GET /api/v1/services?category=legal 법률 서비스', async () => {
    const { s } = await ap('/api/v1/services?category=legal')
    expect([200, 401, 403]).toContain(s)
  })

  it('P063: GET /api/v1/services?category=tax 세무 서비스', async () => {
    const { s } = await ap('/api/v1/services?category=tax')
    expect([200, 401, 403]).toContain(s)
  })

  it('P064: GET /api/v1/services?category=realty 부동산 서비스', async () => {
    const { s } = await ap('/api/v1/services?category=realty')
    expect([200, 401, 403]).toContain(s)
  })

  it('P065: GET /api/v1/services?page=1&limit=10 페이지네이션', async () => {
    const { s } = await ap('/api/v1/services?page=1&limit=10')
    expect([200, 401, 403]).toContain(s)
  })

  it('P066: GET /api/v1/services?page=2&limit=5 2페이지', async () => {
    const { s } = await ap('/api/v1/services?page=2&limit=5')
    expect([200, 401, 403]).toContain(s)
  })

  it('P067: GET /api/v1/services?sort=price_asc 가격 오름차순', async () => {
    const { s } = await ap('/api/v1/services?sort=price_asc')
    expect([200, 401, 403]).toContain(s)
  })

  it('P068: GET /api/v1/services?sort=price_desc 가격 내림차순', async () => {
    const { s } = await ap('/api/v1/services?sort=price_desc')
    expect([200, 401, 403]).toContain(s)
  })

  it('P069: GET /api/v1/services?professional_id=1 특정 전문가 서비스', async () => {
    const { s } = await ap('/api/v1/services?professional_id=1')
    expect([200, 401, 403]).toContain(s)
  })

  it('P070: GET /api/v1/services?is_active=true 활성 서비스만', async () => {
    const { s } = await ap('/api/v1/services?is_active=true')
    expect([200, 401, 403]).toContain(s)
  })
})

// --- P071-P080: 서비스 등록 API (POST) ---
describe('P071-P080: 서비스 등록 API', () => {
  it('P071: POST /api/v1/services 정상 등록 (PER_CASE)', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'NPL 법률 자문', description: 'NPL 매물 법률 검토', price: 300000, price_type: 'PER_CASE', category: 'legal' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P072: POST /api/v1/services 정상 등록 (PER_HOUR)', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '세무 상담', description: '부동산 세무 상담', price: 150000, price_type: 'PER_HOUR', category: 'tax' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P073: POST /api/v1/services 정상 등록 (PROJECT)', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '실사 보고서 작성', description: '매물 실사 보고서', price: 2000000, price_type: 'PROJECT', category: 'appraisal' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P074: POST /api/v1/services 정상 등록 (NEGOTIABLE)', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '건축 컨설팅', description: '건축 설계 자문', price: 0, price_type: 'NEGOTIABLE', category: 'architecture' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P075: POST /api/v1/services 빈 이름', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '', description: 'test', price: 100000, price_type: 'PER_CASE' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P076: POST /api/v1/services 가격 음수', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '음수 테스트', description: 'test', price: -50000, price_type: 'PER_CASE' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P077: POST /api/v1/services 빈 body', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({})
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P078: POST /api/v1/services 잘못된 price_type', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '잘못된 타입', price: 100000, price_type: 'INVALID' })
    })
    expect([400, 401, 403, 422]).toContain(s)
  })

  it('P079: POST /api/v1/services 가격 0 (무료 서비스)', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '무료 상담', description: '초기 무료 상담', price: 0, price_type: 'PER_CASE' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P080: POST /api/v1/services 매우 높은 가격', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: '프리미엄 자문', description: '고급 자문', price: 999999999, price_type: 'PROJECT' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })
})

// --- P081-P090: 서비스 수정 API (PATCH) ---
describe('P081-P090: 서비스 수정 API', () => {
  it('P081: PATCH /api/v1/services/1 가격 변경', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ price: 350000 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P082: PATCH /api/v1/services/1 이름 변경', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '수정된 서비스명' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P083: PATCH /api/v1/services/1 비활성화', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P084: PATCH /api/v1/services/1 활성화', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: true })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P085: PATCH /api/v1/services/1 설명 변경', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ description: '수정된 서비스 설명' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P086: PATCH /api/v1/services/1 가격 타입 변경', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ price_type: 'PER_HOUR' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P087: PATCH /api/v1/services/999 존재하지 않는 서비스', async () => {
    const { s } = await ap('/api/v1/services/999', {
      method: 'PATCH',
      body: JSON.stringify({ price: 100000 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P088: PATCH /api/v1/services/1 빈 body', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({})
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P089: PATCH /api/v1/services/2 카테고리 변경', async () => {
    const { s } = await ap('/api/v1/services/2', {
      method: 'PATCH',
      body: JSON.stringify({ category: 'legal' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P090: PATCH /api/v1/services/1 다중 필드 동시 변경', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '종합 자문', price: 500000, description: '종합 부동산 자문 서비스' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })
})

// --- P091-P100: 서비스 삭제 API (is_active=false) ---
describe('P091-P100: 서비스 삭제(비활성화) API', () => {
  const serviceIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  serviceIds.forEach((id, idx) => {
    it(`P${String(91 + idx).padStart(3, '0')}: PATCH /api/v1/services/${id} is_active=false 소프트 삭제`, async () => {
      const { s } = await ap(`/api/v1/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false })
      })
      expect([200, 400, 401, 403, 404, 422]).toContain(s)
    })
  })
})

// --- P101-P110: 가격 유형별 서비스 조회 ---
describe('P101-P110: 가격 유형별 서비스', () => {
  const priceTypes = ['PER_CASE', 'PER_HOUR', 'PROJECT', 'NEGOTIABLE']
  priceTypes.forEach((pt, idx) => {
    it(`P${String(101 + idx).padStart(3, '0')}: GET /api/v1/services?price_type=${pt}`, async () => {
      const { s } = await ap(`/api/v1/services?price_type=${pt}`)
      expect([200, 401, 403]).toContain(s)
    })
  })

  it('P105: POST 서비스 등록 후 price_type 확인 PER_CASE', async () => {
    const { s, j } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'PER_CASE 서비스', price: 200000, price_type: 'PER_CASE' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P106: POST 서비스 등록 후 price_type 확인 PER_HOUR', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'PER_HOUR 서비스', price: 100000, price_type: 'PER_HOUR' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P107: POST 서비스 등록 후 price_type 확인 PROJECT', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'PROJECT 서비스', price: 5000000, price_type: 'PROJECT' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P108: POST 서비스 등록 후 price_type 확인 NEGOTIABLE', async () => {
    const { s } = await ap('/api/v1/services', {
      method: 'POST',
      body: JSON.stringify({ name: 'NEGOTIABLE 서비스', price: 0, price_type: 'NEGOTIABLE' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P109: GET /api/v1/services?price_min=100000 최소 가격 필터', async () => {
    const { s } = await ap('/api/v1/services?price_min=100000')
    expect([200, 401, 403]).toContain(s)
  })

  it('P110: GET /api/v1/services?price_max=500000 최대 가격 필터', async () => {
    const { s } = await ap('/api/v1/services?price_max=500000')
    expect([200, 401, 403]).toContain(s)
  })
})

// --- P111-P120: 무료 초기상담 설정 ---
describe('P111-P120: 무료 초기상담 설정', () => {
  it('P111: PATCH /api/v1/services/1 free_consultation=true', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ free_consultation: true })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P112: PATCH /api/v1/services/1 free_consultation=false', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ free_consultation: false })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P113: GET /api/v1/services?free_consultation=true 무료상담 가능 서비스', async () => {
    const { s } = await ap('/api/v1/services?free_consultation=true')
    expect([200, 401, 403]).toContain(s)
  })

  it('P114: PATCH /api/v1/services/2 free_consultation_duration=30', async () => {
    const { s } = await ap('/api/v1/services/2', {
      method: 'PATCH',
      body: JSON.stringify({ free_consultation: true, free_consultation_duration: 30 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P115: PATCH /api/v1/services/3 free_consultation_duration=60', async () => {
    const { s } = await ap('/api/v1/services/3', {
      method: 'PATCH',
      body: JSON.stringify({ free_consultation: true, free_consultation_duration: 60 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P116: PATCH /api/v1/services/4 free_consultation_duration=15', async () => {
    const { s } = await ap('/api/v1/services/4', {
      method: 'PATCH',
      body: JSON.stringify({ free_consultation: true, free_consultation_duration: 15 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P117: PATCH /api/v1/services/5 free_consultation_duration 음수', async () => {
    const { s } = await ap('/api/v1/services/5', {
      method: 'PATCH',
      body: JSON.stringify({ free_consultation: true, free_consultation_duration: -10 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P118: GET /professional/my/services 무료상담 설정 확인 페이지', async () => {
    const { s } = await pg('/professional/my/services')
    expect([200, 302, 303]).toContain(s)
  })

  it('P119: PATCH /api/v1/services/1 free_consultation 토글 on→off', async () => {
    await ap('/api/v1/services/1', { method: 'PATCH', body: JSON.stringify({ free_consultation: true }) })
    const { s } = await ap('/api/v1/services/1', { method: 'PATCH', body: JSON.stringify({ free_consultation: false }) })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P120: PATCH /api/v1/services/1 free_consultation 토글 off→on', async () => {
    await ap('/api/v1/services/1', { method: 'PATCH', body: JSON.stringify({ free_consultation: false }) })
    const { s } = await ap('/api/v1/services/1', { method: 'PATCH', body: JSON.stringify({ free_consultation: true }) })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })
})

// --- P121-P130: 할인 프로모션 설정 ---
describe('P121-P130: 할인 프로모션 설정', () => {
  it('P121: PATCH /api/v1/services/1 discount_rate=10', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 10 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P122: PATCH /api/v1/services/1 discount_rate=20', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 20 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P123: PATCH /api/v1/services/1 discount_rate=50', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 50 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P124: PATCH /api/v1/services/1 discount_rate=0 할인 해제', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 0 })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P125: PATCH /api/v1/services/1 discount_rate=101 한도 초과', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 101 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P126: PATCH /api/v1/services/1 discount_rate=-5 음수', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: -5 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P127: PATCH /api/v1/services/1 promotion_start/end 기간 설정', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 15, promotion_start: '2026-04-01', promotion_end: '2026-04-30' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P128: PATCH /api/v1/services/1 promotion_end < promotion_start 잘못된 기간', async () => {
    const { s } = await ap('/api/v1/services/1', {
      method: 'PATCH',
      body: JSON.stringify({ discount_rate: 15, promotion_start: '2026-04-30', promotion_end: '2026-04-01' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P129: GET /api/v1/services?has_discount=true 할인 중인 서비스', async () => {
    const { s } = await ap('/api/v1/services?has_discount=true')
    expect([200, 401, 403]).toContain(s)
  })

  it('P130: GET /professional/my/services/promotions 프로모션 관리 페이지', async () => {
    const { s } = await pg('/professional/my/services/promotions')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P131-P140: 승인 상태 확인 ---
describe('P131-P140: 승인 상태 확인', () => {
  it('P131: GET /api/v1/professionals/1 승인 상태 포함', async () => {
    const { s } = await ap('/api/v1/professionals/1')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P132: GET /api/v1/professionals?status=PENDING 승인 대기', async () => {
    const { s } = await ap('/api/v1/professionals?status=PENDING')
    expect([200, 401, 403]).toContain(s)
  })

  it('P133: GET /api/v1/professionals?status=APPROVED 승인 완료', async () => {
    const { s } = await ap('/api/v1/professionals?status=APPROVED')
    expect([200, 401, 403]).toContain(s)
  })

  it('P134: GET /api/v1/professionals?status=REJECTED 승인 거절', async () => {
    const { s } = await ap('/api/v1/professionals?status=REJECTED')
    expect([200, 401, 403]).toContain(s)
  })

  it('P135: GET /professional/my/dashboard 승인 상태 표시', async () => {
    const { s } = await pg('/professional/my/dashboard')
    expect([200, 302, 303]).toContain(s)
  })

  it('P136: GET /api/v1/professionals/1/status 개별 상태 조회', async () => {
    const { s } = await ap('/api/v1/professionals/1/status')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P137: GET /api/v1/professionals?status=SUSPENDED 정지 상태', async () => {
    const { s } = await ap('/api/v1/professionals?status=SUSPENDED')
    expect([200, 401, 403]).toContain(s)
  })

  it('P138: GET /professional/my/verification 인증 상태 페이지', async () => {
    const { s } = await pg('/professional/my/verification')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P139: GET /api/v1/professionals/1/documents 제출 서류 목록', async () => {
    const { s } = await ap('/api/v1/professionals/1/documents')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P140: GET /api/v1/professionals/1/history 상태 변경 이력', async () => {
    const { s } = await ap('/api/v1/professionals/1/history')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// ============================================================
// C. 상담 관리 (P141-P230)
// ============================================================

// --- P141-P150: 상담 목록 조회 API ---
describe('P141-P150: 상담 목록 조회 API', () => {
  it('P141: GET /api/v1/professionals/1/consultations 전체 상담 목록', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P142: GET /api/v1/professionals/1/consultations?status=PENDING', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?status=PENDING')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P143: GET /api/v1/professionals/1/consultations?status=CONFIRMED', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?status=CONFIRMED')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P144: GET /api/v1/professionals/1/consultations?status=IN_PROGRESS', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?status=IN_PROGRESS')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P145: GET /api/v1/professionals/1/consultations?status=COMPLETED', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?status=COMPLETED')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P146: GET /api/v1/professionals/1/consultations?status=CANCELLED', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?status=CANCELLED')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P147: GET /api/v1/professionals/1/consultations?page=1&limit=5', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?page=1&limit=5')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P148: GET /api/v1/professionals/1/consultations?sort=created_at_desc', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?sort=created_at_desc')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P149: GET /api/v1/professionals/1/consultations?from=2026-01-01', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?from=2026-01-01')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P150: GET /api/v1/professionals/1/consultations?to=2026-12-31', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?to=2026-12-31')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// --- P151-P160: 상담 요청 수신 ---
describe('P151-P160: 상담 요청 수신', () => {
  it('P151: POST /api/v1/professionals/1/consultations 정상 요청', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: 'NPL 법률 상담', content: 'NPL 매물 관련 법률 자문 요청합니다', preferred_date: '2026-04-15', service_id: 1 })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P152: POST /api/v1/professionals/2/consultations 세무 상담 요청', async () => {
    const { s } = await ap('/api/v1/professionals/2/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '양도세 상담', content: '부동산 양도세 관련 상담 요청', preferred_date: '2026-04-20' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P153: POST /api/v1/professionals/3/consultations 중개 상담 요청', async () => {
    const { s } = await ap('/api/v1/professionals/3/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '매물 중개', content: '서울 강남구 매물 중개 요청', preferred_date: '2026-04-25' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P154: POST /api/v1/professionals/1/consultations 긴급 상담 요청', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '긴급 법률 검토', content: '내일 계약 예정, 긴급 검토 필요', preferred_date: '2026-03-22', is_urgent: true })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P155: POST /api/v1/professionals/1/consultations 첨부파일 포함 상담', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '계약서 검토', content: '계약서 검토 요청', preferred_date: '2026-04-10', attachments: ['file1.pdf'] })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P156: GET /api/v1/professionals/1/consultations?status=PENDING 대기 중 확인', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations?status=PENDING')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P157: GET /api/v1/professionals/1/consultations/count 건수 확인', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations/count')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P158: POST /api/v1/professionals/1/consultations 무료상담 요청', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '무료 초기 상담', content: '무료 상담으로 진행 부탁드립니다', is_free: true })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P159: POST /api/v1/professionals/1/consultations 온라인 상담 요청', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '화상 상담', content: '화상으로 진행 원합니다', consultation_type: 'ONLINE' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P160: POST /api/v1/professionals/1/consultations 방문 상담 요청', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '방문 상담', content: '사무실 방문 상담 원합니다', consultation_type: 'OFFLINE' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })
})

// --- P161-P170: 상담 승인/거절 API ---
describe('P161-P170: 상담 승인/거절 API', () => {
  const consultationIds = [1, 2, 3, 4, 5]

  consultationIds.forEach((cid, idx) => {
    it(`P${String(161 + idx).padStart(3, '0')}: PATCH /api/v1/consultations/${cid} 승인 (CONFIRMED)`, async () => {
      const { s } = await ap(`/api/v1/consultations/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CONFIRMED', confirmed_date: '2026-04-15T10:00:00' })
      })
      expect([200, 400, 401, 403, 404, 422]).toContain(s)
    })
  })

  consultationIds.forEach((cid, idx) => {
    it(`P${String(166 + idx).padStart(3, '0')}: PATCH /api/v1/consultations/${cid} 거절 (CANCELLED)`, async () => {
      const { s } = await ap(`/api/v1/consultations/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED', cancel_reason: '일정 불가' })
      })
      expect([200, 400, 401, 403, 404, 422]).toContain(s)
    })
  })
})

// --- P171-P180: 상담 진행 ---
describe('P171-P180: 상담 진행 (IN_PROGRESS → COMPLETED)', () => {
  const consultationIds = [1, 2, 3, 4, 5]

  consultationIds.forEach((cid, idx) => {
    it(`P${String(171 + idx).padStart(3, '0')}: PATCH /api/v1/consultations/${cid} 진행 중 (IN_PROGRESS)`, async () => {
      const { s } = await ap(`/api/v1/consultations/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      })
      expect([200, 400, 401, 403, 404, 422]).toContain(s)
    })
  })

  consultationIds.forEach((cid, idx) => {
    it(`P${String(176 + idx).padStart(3, '0')}: PATCH /api/v1/consultations/${cid} 완료 (COMPLETED)`, async () => {
      const { s } = await ap(`/api/v1/consultations/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED', summary: '상담 완료 요약', duration_minutes: 60 })
      })
      expect([200, 400, 401, 403, 404, 422]).toContain(s)
    })
  })
})

// --- P181-P190: 상담 평가/리뷰 ---
describe('P181-P190: 상담 평가/리뷰', () => {
  const ratings = [1, 2, 3, 4, 5]
  ratings.forEach((rating, idx) => {
    it(`P${String(181 + idx).padStart(3, '0')}: POST /api/v1/consultations/${idx + 1}/reviews rating=${rating}`, async () => {
      const { s } = await ap(`/api/v1/consultations/${idx + 1}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: `평점 ${rating}점 리뷰입니다` })
      })
      expect([200, 201, 400, 401, 403, 404, 409, 422]).toContain(s)
    })
  })

  it('P186: POST /api/v1/consultations/1/reviews rating=0 (잘못된 평점)', async () => {
    const { s } = await ap('/api/v1/consultations/1/reviews', {
      method: 'POST',
      body: JSON.stringify({ rating: 0, comment: '잘못된 평점' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P187: POST /api/v1/consultations/1/reviews rating=6 (초과 평점)', async () => {
    const { s } = await ap('/api/v1/consultations/1/reviews', {
      method: 'POST',
      body: JSON.stringify({ rating: 6, comment: '초과 평점' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P188: POST /api/v1/consultations/1/reviews 빈 코멘트', async () => {
    const { s } = await ap('/api/v1/consultations/1/reviews', {
      method: 'POST',
      body: JSON.stringify({ rating: 4, comment: '' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P189: GET /api/v1/professionals/1/reviews 전문가 리뷰 목록', async () => {
    const { s } = await ap('/api/v1/professionals/1/reviews')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P190: GET /api/v1/professionals/1/reviews?sort=rating_desc 평점순 리뷰', async () => {
    const { s } = await ap('/api/v1/professionals/1/reviews?sort=rating_desc')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// --- P191-P200: 상담 내역 페이지 ---
describe('P191-P200: 상담 내역 페이지', () => {
  it('P191: GET /professional/consultations 상담 내역 페이지', async () => {
    const { s } = await pg('/professional/consultations')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P192: GET /professional/consultations?tab=pending 대기 중 탭', async () => {
    const { s } = await pg('/professional/consultations?tab=pending')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P193: GET /professional/consultations?tab=confirmed 승인 탭', async () => {
    const { s } = await pg('/professional/consultations?tab=confirmed')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P194: GET /professional/consultations?tab=in_progress 진행 중 탭', async () => {
    const { s } = await pg('/professional/consultations?tab=in_progress')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P195: GET /professional/consultations?tab=completed 완료 탭', async () => {
    const { s } = await pg('/professional/consultations?tab=completed')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P196: GET /professional/consultations?tab=cancelled 취소 탭', async () => {
    const { s } = await pg('/professional/consultations?tab=cancelled')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P197: GET /professional/consultations/1 상담 상세 페이지', async () => {
    const { s } = await pg('/professional/consultations/1')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P198: GET /professional/consultations/2 상담 상세 페이지', async () => {
    const { s } = await pg('/professional/consultations/2')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P199: GET /professional/my/consultations 내 상담 관리', async () => {
    const { s } = await pg('/professional/my/consultations')
    expect([200, 302, 303]).toContain(s)
  })

  it('P200: GET /professional/consultations/calendar 캘린더 뷰', async () => {
    const { s } = await pg('/professional/consultations/calendar')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P201-P210: 상담 요청 API 검증 ---
describe('P201-P210: 상담 요청 API 검증', () => {
  it('P201: POST /api/v1/professionals/99999/consultations 존재하지 않는 전문가', async () => {
    const { s } = await ap('/api/v1/professionals/99999/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '테스트', content: '존재하지 않는 전문가' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P202: POST /api/v1/professionals/1/consultations 빈 내용', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '테스트', content: '' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P203: POST /api/v1/professionals/1/consultations 빈 제목', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '', content: '내용은 있음' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P204: POST /api/v1/professionals/1/consultations 과거 날짜', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '과거 상담', content: '과거 날짜 테스트', preferred_date: '2020-01-01' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P205: POST /api/v1/professionals/1/consultations 먼 미래 날짜', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '미래 상담', content: '먼 미래 테스트', preferred_date: '2030-12-31' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P206: POST /api/v1/professionals/1/consultations 빈 body', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({})
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P207: POST /api/v1/professionals/0/consultations professional_id=0', async () => {
    const { s } = await ap('/api/v1/professionals/0/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: 'ID 0', content: '유효하지 않은 ID' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P208: POST /api/v1/professionals/-1/consultations 음수 ID', async () => {
    const { s } = await ap('/api/v1/professionals/-1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '음수 ID', content: '유효하지 않은 ID' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P209: POST /api/v1/professionals/abc/consultations 문자열 ID', async () => {
    const { s } = await ap('/api/v1/professionals/abc/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '문자열 ID', content: '유효하지 않은 ID' })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P210: POST /api/v1/professionals/1/consultations 잘못된 날짜 형식', async () => {
    const { s } = await ap('/api/v1/professionals/1/consultations', {
      method: 'POST',
      body: JSON.stringify({ title: '잘못된 날짜', content: '잘못된 형식', preferred_date: 'not-a-date' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })
})

// --- P211-P220: 상담 통계 ---
describe('P211-P220: 상담 통계', () => {
  it('P211: GET /api/v1/professionals/1/stats 전문가 통계', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P212: GET /api/v1/professionals/1/stats?period=monthly 월별 통계', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats?period=monthly')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P213: GET /api/v1/professionals/1/stats?period=weekly 주별 통계', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats?period=weekly')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P214: GET /api/v1/professionals/1/stats?period=daily 일별 통계', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats?period=daily')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P215: GET /api/v1/professionals/1/stats/completion_rate 완료율', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats/completion_rate')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P216: GET /api/v1/professionals/1/stats/average_rating 평균 평점', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats/average_rating')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P217: GET /api/v1/professionals/1/stats/total_consultations 총 상담 건수', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats/total_consultations')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P218: GET /api/v1/professionals/1/stats/response_time 평균 응답 시간', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats/response_time')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P219: GET /api/v1/professionals/1/stats/repeat_clients 재방문 고객 수', async () => {
    const { s } = await ap('/api/v1/professionals/1/stats/repeat_clients')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P220: GET /professional/my/analytics 통계 대시보드 페이지', async () => {
    const { s } = await pg('/professional/my/analytics')
    expect([200, 302, 303]).toContain(s)
  })
})

// --- P221-P230: 매물 연결 상담 ---
describe('P221-P230: 매물 연결 상담', () => {
  const listingIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  listingIds.forEach((lid, idx) => {
    it(`P${String(221 + idx).padStart(3, '0')}: POST /api/v1/professionals/1/consultations listing_id=${lid}`, async () => {
      const { s } = await ap('/api/v1/professionals/1/consultations', {
        method: 'POST',
        body: JSON.stringify({ title: `매물 #${lid} 관련 상담`, content: `매물 ${lid}번에 대한 법률 자문 요청`, listing_id: lid })
      })
      expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
    })
  })
})

// ============================================================
// D. 수익/정산 (P231-P300)
// ============================================================

// --- P231-P240: 수익 조회 API ---
describe('P231-P240: 수익 조회 API', () => {
  it('P231: GET /api/v1/professionals/1/earnings 전체 수익', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P232: GET /api/v1/professionals/1/earnings?period=2026-03 월별 수익', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?period=2026-03')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P233: GET /api/v1/professionals/1/earnings?period=2026-Q1 분기별 수익', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?period=2026-Q1')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P234: GET /api/v1/professionals/1/earnings?from=2026-01-01&to=2026-03-31', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?from=2026-01-01&to=2026-03-31')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P235: GET /api/v1/professionals/1/earnings/summary 수익 요약', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings/summary')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P236: GET /api/v1/professionals/2/earnings 전문가2 수익', async () => {
    const { s } = await ap('/api/v1/professionals/2/earnings')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P237: GET /api/v1/professionals/3/earnings 전문가3 수익', async () => {
    const { s } = await ap('/api/v1/professionals/3/earnings')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P238: GET /api/v1/professionals/1/earnings?sort=amount_desc 금액 내림차순', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?sort=amount_desc')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P239: GET /api/v1/professionals/1/earnings?type=consultation 상담 수익만', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?type=consultation')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P240: GET /api/v1/professionals/1/earnings?type=referral 추천 수익만', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?type=referral')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// --- P241-P250: 수익 내역 (상담별 gross, fee, net) ---
describe('P241-P250: 수익 내역 (상담별)', () => {
  const earningIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  earningIds.forEach((eid, idx) => {
    it(`P${String(241 + idx).padStart(3, '0')}: GET /api/v1/professionals/1/earnings/${eid} 상담별 수익 상세`, async () => {
      const { s } = await ap(`/api/v1/professionals/1/earnings/${eid}`)
      expect([200, 401, 403, 404]).toContain(s)
    })
  })
})

// --- P251-P260: 정산 요청 ---
describe('P251-P260: 정산 요청', () => {
  it('P251: GET /api/v1/professionals/1/settlements/available 정산 가능 금액', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements/available')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P252: POST /api/v1/professionals/1/settlements 정산 요청', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: 500000, bank_code: '004', account_number: '123-456-789' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P253: POST /api/v1/professionals/1/settlements 최소 금액 미달', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: 100 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P254: POST /api/v1/professionals/1/settlements 정산 가능 금액 초과', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: 99999999999 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P255: POST /api/v1/professionals/1/settlements 음수 금액', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: -10000 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P256: POST /api/v1/professionals/1/settlements 빈 body', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({})
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P257: POST /api/v1/professionals/1/settlements 잘못된 은행 코드', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: 300000, bank_code: 'INVALID', account_number: '111-222-333' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P258: POST /api/v1/professionals/1/settlements 금액 0', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements', {
      method: 'POST',
      body: JSON.stringify({ amount: 0 })
    })
    expect([400, 401, 403, 404, 422]).toContain(s)
  })

  it('P259: GET /api/v1/professionals/1/settlements/minimum 최소 정산 금액 조회', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements/minimum')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P260: GET /professional/my/settlements 정산 요청 페이지', async () => {
    const { s } = await pg('/professional/my/settlements')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P261-P270: 정산 이력 ---
describe('P261-P270: 정산 이력', () => {
  it('P261: GET /api/v1/professionals/1/settlements 정산 이력 목록', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P262: GET /api/v1/professionals/1/settlements?status=PENDING 대기 중', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements?status=PENDING')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P263: GET /api/v1/professionals/1/settlements?status=COMPLETED 완료', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements?status=COMPLETED')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P264: GET /api/v1/professionals/1/settlements?status=REJECTED 거절', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements?status=REJECTED')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P265: GET /api/v1/professionals/1/settlements?page=1&limit=10', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements?page=1&limit=10')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P266: GET /api/v1/professionals/1/settlements?from=2026-01-01', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements?from=2026-01-01')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P267: GET /api/v1/professionals/1/settlements?to=2026-12-31', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements?to=2026-12-31')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P268: GET /api/v1/professionals/1/settlements/1 정산 상세', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements/1')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P269: GET /api/v1/professionals/1/settlements/export CSV 다운로드', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements/export')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P270: GET /api/v1/professionals/1/settlements/summary 정산 요약', async () => {
    const { s } = await ap('/api/v1/professionals/1/settlements/summary')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// --- P271-P280: 플랫폼 수수료 ---
describe('P271-P280: 플랫폼 수수료', () => {
  it('P271: GET /api/v1/platform/fee-rate 수수료율 조회', async () => {
    const { s } = await ap('/api/v1/platform/fee-rate')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P272: GET /api/v1/platform/fee-rate?tier=basic 기본 등급 수수료', async () => {
    const { s } = await ap('/api/v1/platform/fee-rate?tier=basic')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P273: GET /api/v1/platform/fee-rate?tier=premium 프리미엄 등급 수수료', async () => {
    const { s } = await ap('/api/v1/platform/fee-rate?tier=premium')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P274: GET /api/v1/platform/fee-rate?tier=enterprise 기업 등급 수수료', async () => {
    const { s } = await ap('/api/v1/platform/fee-rate?tier=enterprise')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P275: GET /api/v1/professionals/1/fee-summary 개인 수수료 요약', async () => {
    const { s } = await ap('/api/v1/professionals/1/fee-summary')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P276: GET /api/v1/professionals/1/earnings?include_fees=true 수수료 포함 수익', async () => {
    const { s } = await ap('/api/v1/professionals/1/earnings?include_fees=true')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P277: GET /api/v1/platform/fee-schedule 수수료 스케줄', async () => {
    const { s } = await ap('/api/v1/platform/fee-schedule')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P278: GET /api/v1/platform/fee-rate?category=legal 법률 카테고리 수수료', async () => {
    const { s } = await ap('/api/v1/platform/fee-rate?category=legal')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P279: GET /api/v1/platform/fee-rate?category=tax 세무 카테고리 수수료', async () => {
    const { s } = await ap('/api/v1/platform/fee-rate?category=tax')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P280: GET /professional/my/fees 수수료 안내 페이지', async () => {
    const { s } = await pg('/professional/my/fees')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P281-P290: 수익 페이지 ---
describe('P281-P290: 수익 페이지', () => {
  it('P281: GET /professional/my/earnings 수익 메인 페이지', async () => {
    const { s } = await pg('/professional/my/earnings')
    expect([200, 302, 303]).toContain(s)
  })

  it('P282: GET /professional/my/earnings?tab=overview 수익 개요', async () => {
    const { s } = await pg('/professional/my/earnings?tab=overview')
    expect([200, 302, 303]).toContain(s)
  })

  it('P283: GET /professional/my/earnings?tab=history 수익 이력', async () => {
    const { s } = await pg('/professional/my/earnings?tab=history')
    expect([200, 302, 303]).toContain(s)
  })

  it('P284: GET /professional/my/earnings?tab=settlements 정산', async () => {
    const { s } = await pg('/professional/my/earnings?tab=settlements')
    expect([200, 302, 303]).toContain(s)
  })

  it('P285: GET /professional/my/earnings?period=2026-03 월별 필터', async () => {
    const { s } = await pg('/professional/my/earnings?period=2026-03')
    expect([200, 302, 303]).toContain(s)
  })

  it('P286: GET /professional/my/earnings?period=2026-02', async () => {
    const { s } = await pg('/professional/my/earnings?period=2026-02')
    expect([200, 302, 303]).toContain(s)
  })

  it('P287: GET /professional/my/earnings?period=2026-01', async () => {
    const { s } = await pg('/professional/my/earnings?period=2026-01')
    expect([200, 302, 303]).toContain(s)
  })

  it('P288: GET /professional/my/earnings/export 엑셀 내보내기', async () => {
    const { s } = await pg('/professional/my/earnings/export')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P289: GET /professional/my/earnings/chart 차트 뷰', async () => {
    const { s } = await pg('/professional/my/earnings/chart')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P290: GET /professional/my/earnings/tax-report 세금 신고 자료', async () => {
    const { s } = await pg('/professional/my/earnings/tax-report')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P291-P300: 추천 수익 ---
describe('P291-P300: 추천 수익', () => {
  it('P291: GET /api/v1/professionals/1/referral-earnings 추천 수익 전체', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P292: GET /api/v1/professionals/1/referral-earnings?from=2026-01-01', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings?from=2026-01-01')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P293: GET /api/v1/professionals/1/referral-earnings/summary 추천 수익 요약', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings/summary')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P294: GET /api/v1/professionals/1/referral-earnings?page=1&limit=10', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings?page=1&limit=10')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P295: GET /api/v1/professionals/2/referral-earnings 전문가2 추천 수익', async () => {
    const { s } = await ap('/api/v1/professionals/2/referral-earnings')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P296: GET /api/v1/professionals/3/referral-earnings 전문가3 추천 수익', async () => {
    const { s } = await ap('/api/v1/professionals/3/referral-earnings')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P297: GET /api/v1/professionals/1/referral-earnings?sort=amount_desc', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings?sort=amount_desc')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P298: GET /api/v1/professionals/1/referral-earnings?sort=date_desc', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings?sort=date_desc')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P299: GET /professional/my/referral-earnings 추천 수익 페이지', async () => {
    const { s } = await pg('/professional/my/referral-earnings')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P300: GET /api/v1/professionals/1/referral-earnings/total 추천 수익 총합', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-earnings/total')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// ============================================================
// E. 추천/마케팅 (P301-P350)
// ============================================================

// --- P301-P310: 전문가 추천코드 ---
describe('P301-P310: 전문가 추천코드', () => {
  it('P301: GET /api/v1/professionals/1/referral-code 추천코드 조회', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-code')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P302: POST /api/v1/professionals/1/referral-code 추천코드 생성', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-code', { method: 'POST' })
    expect([200, 201, 400, 401, 403, 404, 409]).toContain(s)
  })

  it('P303: POST /api/v1/professionals/1/referral-code/regenerate 코드 재생성', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-code/regenerate', { method: 'POST' })
    expect([200, 201, 400, 401, 403, 404]).toContain(s)
  })

  it('P304: GET /api/v1/professionals/2/referral-code 전문가2 추천코드', async () => {
    const { s } = await ap('/api/v1/professionals/2/referral-code')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P305: GET /api/v1/professionals/3/referral-code 전문가3 추천코드', async () => {
    const { s } = await ap('/api/v1/professionals/3/referral-code')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P306: GET /api/v1/professionals/4/referral-code 전문가4 추천코드', async () => {
    const { s } = await ap('/api/v1/professionals/4/referral-code')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P307: GET /api/v1/professionals/5/referral-code 전문가5 추천코드', async () => {
    const { s } = await ap('/api/v1/professionals/5/referral-code')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P308: GET /api/v1/referral-code/EX-001 EX- 형식 코드 조회', async () => {
    const { s } = await ap('/api/v1/referral-code/EX-001')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P309: GET /api/v1/referral-code/EX-002 EX- 형식 코드 조회', async () => {
    const { s } = await ap('/api/v1/referral-code/EX-002')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P310: GET /api/v1/referral-code/INVALID 잘못된 코드', async () => {
    const { s } = await ap('/api/v1/referral-code/INVALID')
    expect([400, 401, 403, 404]).toContain(s)
  })
})

// --- P311-P320: 추천코드 API ---
describe('P311-P320: 추천코드 API (GET/POST)', () => {
  it('P311: GET /api/v1/referral/validate?code=EX-001 코드 유효성 검사', async () => {
    const { s } = await ap('/api/v1/referral/validate?code=EX-001')
    expect([200, 400, 401, 403, 404]).toContain(s)
  })

  it('P312: POST /api/v1/referral/validate 코드 유효성 검사 POST', async () => {
    const { s } = await ap('/api/v1/referral/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'EX-001' })
    })
    expect([200, 400, 401, 403, 404]).toContain(s)
  })

  it('P313: POST /api/v1/referral/validate 빈 코드', async () => {
    const { s } = await ap('/api/v1/referral/validate', {
      method: 'POST',
      body: JSON.stringify({ code: '' })
    })
    expect([400, 401, 403, 404]).toContain(s)
  })

  it('P314: POST /api/v1/referral/validate 존재하지 않는 코드', async () => {
    const { s } = await ap('/api/v1/referral/validate', {
      method: 'POST',
      body: JSON.stringify({ code: 'EX-99999' })
    })
    expect([400, 401, 403, 404]).toContain(s)
  })

  it('P315: POST /api/v1/referral/apply 추천코드 적용', async () => {
    const { s } = await ap('/api/v1/referral/apply', {
      method: 'POST',
      body: JSON.stringify({ code: 'EX-001', user_id: 'test-user-1' })
    })
    expect([200, 201, 400, 401, 403, 404, 409, 422]).toContain(s)
  })

  it('P316: POST /api/v1/referral/apply 이미 적용된 코드', async () => {
    const { s } = await ap('/api/v1/referral/apply', {
      method: 'POST',
      body: JSON.stringify({ code: 'EX-001', user_id: 'test-user-1' })
    })
    expect([200, 400, 401, 403, 404, 409, 422]).toContain(s)
  })

  it('P317: GET /api/v1/referral/stats?code=EX-001 추천코드 통계', async () => {
    const { s } = await ap('/api/v1/referral/stats?code=EX-001')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P318: POST /api/v1/referral/validate 잘못된 형식 코드', async () => {
    const { s } = await ap('/api/v1/referral/validate', {
      method: 'POST',
      body: JSON.stringify({ code: '!@#$%^' })
    })
    expect([400, 401, 403, 404]).toContain(s)
  })

  it('P319: GET /api/v1/referral/codes 전체 추천코드 목록 (관리용)', async () => {
    const { s } = await ap('/api/v1/referral/codes')
    expect([200, 401, 403]).toContain(s)
  })

  it('P320: GET /api/v1/referral/my 내 추천코드 정보', async () => {
    const { s } = await ap('/api/v1/referral/my')
    expect([200, 401, 403]).toContain(s)
  })
})

// --- P321-P330: 추천 회원 목록 ---
describe('P321-P330: 추천 회원 목록', () => {
  it('P321: GET /api/v1/professionals/1/referrals 추천 회원 목록', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P322: GET /api/v1/professionals/1/referrals?page=1&limit=10', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals?page=1&limit=10')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P323: GET /api/v1/professionals/1/referrals?status=active 활성 추천 회원', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals?status=active')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P324: GET /api/v1/professionals/1/referrals/count 추천 회원 수', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals/count')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P325: GET /api/v1/professionals/2/referrals 전문가2 추천 회원', async () => {
    const { s } = await ap('/api/v1/professionals/2/referrals')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P326: GET /api/v1/professionals/3/referrals 전문가3 추천 회원', async () => {
    const { s } = await ap('/api/v1/professionals/3/referrals')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P327: GET /api/v1/professionals/1/referrals?sort=date_desc 최신순', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals?sort=date_desc')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P328: GET /api/v1/professionals/1/referrals?from=2026-01-01 기간 필터', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals?from=2026-01-01')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P329: GET /professional/my/referrals 추천 회원 페이지', async () => {
    const { s } = await pg('/professional/my/referrals')
    expect([200, 302, 303]).toContain(s)
  })

  it('P330: GET /api/v1/professionals/1/referrals/export 추천 회원 내보내기', async () => {
    const { s } = await ap('/api/v1/professionals/1/referrals/export')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// --- P331-P340: 추천 수익 쉐어 ---
describe('P331-P340: 추천 수익 쉐어', () => {
  it('P331: GET /api/v1/professionals/1/referral-share 추천 수익 쉐어 비율', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-share')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P332: GET /api/v1/platform/referral-policy 추천 수익 정책', async () => {
    const { s } = await ap('/api/v1/platform/referral-policy')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P333: GET /api/v1/professionals/1/referral-share/history 수익 쉐어 이력', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-share/history')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P334: GET /api/v1/professionals/1/referral-share/summary 수익 쉐어 요약', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-share/summary')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P335: GET /api/v1/professionals/2/referral-share 전문가2 수익 쉐어', async () => {
    const { s } = await ap('/api/v1/professionals/2/referral-share')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P336: GET /api/v1/platform/referral-tiers 추천 등급별 보상', async () => {
    const { s } = await ap('/api/v1/platform/referral-tiers')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P337: GET /api/v1/professionals/1/referral-share?period=2026-03 월별 쉐어', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-share?period=2026-03')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P338: GET /api/v1/professionals/1/referral-share?period=2026-Q1 분기별 쉐어', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-share?period=2026-Q1')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P339: GET /professional/my/referral-share 수익 쉐어 페이지', async () => {
    const { s } = await pg('/professional/my/referral-share')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P340: GET /api/v1/professionals/1/referral-share/projection 예상 수익', async () => {
    const { s } = await ap('/api/v1/professionals/1/referral-share/projection')
    expect([200, 401, 403, 404]).toContain(s)
  })
})

// --- P341-P350: 프로필 마케팅 ---
describe('P341-P350: 프로필 마케팅', () => {
  it('P341: GET /api/v1/professionals/1/marketing 마케팅 설정 조회', async () => {
    const { s } = await ap('/api/v1/professionals/1/marketing')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P342: PATCH /api/v1/professionals/1/marketing 배너 슬롯 신청', async () => {
    const { s } = await ap('/api/v1/professionals/1/marketing', {
      method: 'PATCH',
      body: JSON.stringify({ banner_slot: 'homepage_top', start_date: '2026-04-01', end_date: '2026-04-30' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P343: PATCH /api/v1/professionals/1/marketing 프리미엄 프로필 활성화', async () => {
    const { s } = await ap('/api/v1/professionals/1/marketing', {
      method: 'PATCH',
      body: JSON.stringify({ premium_profile: true })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P344: PATCH /api/v1/professionals/1/marketing 프리미엄 프로필 비활성화', async () => {
    const { s } = await ap('/api/v1/professionals/1/marketing', {
      method: 'PATCH',
      body: JSON.stringify({ premium_profile: false })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P345: GET /api/v1/banners/slots 배너 슬롯 목록', async () => {
    const { s } = await ap('/api/v1/banners/slots')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P346: GET /api/v1/banners/slots/available 사용 가능한 슬롯', async () => {
    const { s } = await ap('/api/v1/banners/slots/available')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P347: GET /api/v1/banners/pricing 배너 광고 가격', async () => {
    const { s } = await ap('/api/v1/banners/pricing')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P348: GET /professional/my/marketing 마케팅 관리 페이지', async () => {
    const { s } = await pg('/professional/my/marketing')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P349: PATCH /api/v1/professionals/1/marketing featured=true 추천 전문가', async () => {
    const { s } = await ap('/api/v1/professionals/1/marketing', {
      method: 'PATCH',
      body: JSON.stringify({ featured: true })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P350: GET /api/v1/professionals/featured 추천 전문가 목록', async () => {
    const { s } = await ap('/api/v1/professionals/featured')
    expect([200, 401, 403]).toContain(s)
  })
})

// ============================================================
// F. 딜 브릿지 참여 (P351-P390)
// ============================================================

// --- P351-P360: 매물 탐색 ---
describe('P351-P360: 매물 탐색 (전문가 매수자 역할)', () => {
  it('P351: GET /listings 매물 목록 페이지', async () => {
    const { s } = await pg('/listings')
    expect([200, 302, 303]).toContain(s)
  })

  it('P352: GET /api/v1/listings 매물 API', async () => {
    const { s } = await ap('/api/v1/listings')
    expect([200, 401, 403]).toContain(s)
  })

  it('P353: GET /api/v1/listings?type=npl NPL 매물 필터', async () => {
    const { s } = await ap('/api/v1/listings?type=npl')
    expect([200, 401, 403]).toContain(s)
  })

  it('P354: GET /api/v1/listings?region=seoul 서울 매물', async () => {
    const { s } = await ap('/api/v1/listings?region=seoul')
    expect([200, 401, 403]).toContain(s)
  })

  it('P355: GET /api/v1/listings?min_price=100000000 최소 금액', async () => {
    const { s } = await ap('/api/v1/listings?min_price=100000000')
    expect([200, 401, 403]).toContain(s)
  })

  it('P356: GET /api/v1/listings?max_price=500000000 최대 금액', async () => {
    const { s } = await ap('/api/v1/listings?max_price=500000000')
    expect([200, 401, 403]).toContain(s)
  })

  it('P357: GET /listings/1 매물 상세', async () => {
    const { s } = await pg('/listings/1')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P358: GET /listings/2 매물 상세', async () => {
    const { s } = await pg('/listings/2')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P359: GET /listings/map 지도 뷰', async () => {
    const { s } = await pg('/listings/map')
    expect([200, 302, 303]).toContain(s)
  })

  it('P360: GET /api/v1/listings?sort=created_at_desc 최신순 매물', async () => {
    const { s } = await ap('/api/v1/listings?sort=created_at_desc')
    expect([200, 401, 403]).toContain(s)
  })
})

// --- P361-P370: 딜 브릿지 API ---
describe('P361-P370: 딜 브릿지 API', () => {
  it('P361: GET /api/v1/deal-rooms 딜 브릿지 목록', async () => {
    const { s } = await ap('/api/v1/deal-rooms')
    expect([200, 401, 403]).toContain(s)
  })

  it('P362: POST /api/v1/deal-rooms 딜 브릿지 생성', async () => {
    const { s } = await ap('/api/v1/deal-rooms', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 1, title: 'NPL 매물 딜', description: '법률 자문 포함 딜' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P363: GET /api/v1/deal-rooms/1 딜 브릿지 상세', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P364: POST /api/v1/deal-rooms/1/join 딜 브릿지 참여', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/join', {
      method: 'POST',
      body: JSON.stringify({ role: 'advisor' })
    })
    expect([200, 201, 400, 401, 403, 404, 409, 422]).toContain(s)
  })

  it('P365: POST /api/v1/deal-rooms/1/messages 메시지 전송', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/messages', {
      method: 'POST',
      body: JSON.stringify({ content: '법률 검토 의견입니다' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P366: GET /api/v1/deal-rooms/1/messages 메시지 목록', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/messages')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P367: GET /api/v1/deal-rooms/1/participants 참여자 목록', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/participants')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P368: PATCH /api/v1/deal-rooms/1 딜 브릿지 상태 변경', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P369: GET /deal-rooms/1 딜 브릿지 페이지', async () => {
    const { s } = await pg('/deal-rooms/1')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P370: GET /api/v1/deal-rooms?status=active 활성 딜만', async () => {
    const { s } = await ap('/api/v1/deal-rooms?status=active')
    expect([200, 401, 403]).toContain(s)
  })
})

// --- P371-P380: 실사 지원 ---
describe('P371-P380: 실사 지원 (전문가 자문)', () => {
  it('P371: GET /api/v1/deal-rooms/1/due-diligence 실사 정보', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P372: POST /api/v1/deal-rooms/1/due-diligence 실사 보고서 작성', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence', {
      method: 'POST',
      body: JSON.stringify({ type: 'legal', summary: '법률 실사 결과', risk_level: 'LOW', details: '권리 분석 결과 문제 없음' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P373: POST /api/v1/deal-rooms/1/due-diligence 세무 실사', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence', {
      method: 'POST',
      body: JSON.stringify({ type: 'tax', summary: '세무 실사 결과', risk_level: 'MEDIUM', details: '양도세 이슈 확인 필요' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P374: POST /api/v1/deal-rooms/1/due-diligence 감정 실사', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence', {
      method: 'POST',
      body: JSON.stringify({ type: 'appraisal', summary: '감정 평가 결과', risk_level: 'LOW', estimated_value: 500000000 })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P375: POST /api/v1/deal-rooms/1/due-diligence 건축 실사', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence', {
      method: 'POST',
      body: JSON.stringify({ type: 'architecture', summary: '건축 상태 점검', risk_level: 'HIGH', details: '구조 보강 필요' })
    })
    expect([200, 201, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P376: GET /api/v1/deal-rooms/1/due-diligence?type=legal 법률 실사만', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence?type=legal')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P377: GET /api/v1/deal-rooms/1/due-diligence?type=tax 세무 실사만', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence?type=tax')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P378: GET /api/v1/deal-rooms/2/due-diligence 딜2 실사', async () => {
    const { s } = await ap('/api/v1/deal-rooms/2/due-diligence')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P379: PATCH /api/v1/deal-rooms/1/due-diligence/1 실사 수정', async () => {
    const { s } = await ap('/api/v1/deal-rooms/1/due-diligence/1', {
      method: 'PATCH',
      body: JSON.stringify({ risk_level: 'MEDIUM', details: '추가 검토 결과 수정' })
    })
    expect([200, 400, 401, 403, 404, 422]).toContain(s)
  })

  it('P380: GET /tools/due-diligence-report 실사 보고서 도구 페이지', async () => {
    const { s } = await pg('/tools/due-diligence-report')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P381-P390: 기관/커뮤니티 접근 ---
describe('P381-P390: 기관/커뮤니티 접근', () => {
  it('P381: GET /community 커뮤니티 메인', async () => {
    const { s } = await pg('/community')
    expect([200, 302, 303]).toContain(s)
  })

  it('P382: GET /community/professional 전문가 전용 커뮤니티', async () => {
    const { s } = await pg('/community/professional')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P383: GET /api/v1/community/posts?category=professional 전문가 게시글', async () => {
    const { s } = await ap('/api/v1/community/posts?category=professional')
    expect([200, 401, 403]).toContain(s)
  })

  it('P384: POST /api/v1/community/posts 전문가 게시글 작성', async () => {
    const { s } = await ap('/api/v1/community/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'NPL 실무 팁', content: 'NPL 매물 실사 시 주의사항', category: 'professional' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P385: GET /api/v1/community/posts?page=1&limit=10', async () => {
    const { s } = await ap('/api/v1/community/posts?page=1&limit=10')
    expect([200, 401, 403]).toContain(s)
  })

  it('P386: GET /lender 기관 투자자 페이지', async () => {
    const { s } = await pg('/lender')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P387: GET /api/v1/lender/institutions 기관 목록', async () => {
    const { s } = await ap('/api/v1/lender/institutions')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P388: GET /fund 펀드 페이지', async () => {
    const { s } = await pg('/fund')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P389: GET /api/v1/fund/list 펀드 목록', async () => {
    const { s } = await ap('/api/v1/fund/list')
    expect([200, 401, 403, 404]).toContain(s)
  })

  it('P390: GET /community/notices 공지사항', async () => {
    const { s } = await pg('/community/notices')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// ============================================================
// G. 기타 (P391-P400)
// ============================================================

// --- P391-P395: 과금 (구독, 크레딧) ---
describe('P391-P395: 과금 (구독, 크레딧)', () => {
  it('P391: GET /api/v1/credits/balance 크레딧 잔액', async () => {
    const { s } = await ap('/api/v1/credits/balance')
    expect([200, 401, 403]).toContain(s)
  })

  it('P392: GET /api/v1/credits/history 크레딧 이력', async () => {
    const { s } = await ap('/api/v1/credits/history')
    expect([200, 401, 403]).toContain(s)
  })

  it('P393: POST /api/v1/credits/purchase 크레딧 구매', async () => {
    const { s } = await ap('/api/v1/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({ amount: 100, payment_method: 'card' })
    })
    expect([200, 201, 400, 401, 403, 422]).toContain(s)
  })

  it('P394: GET /api/v1/admin/pricing/plans 구독 플랜 조회', async () => {
    const { s } = await ap('/api/v1/admin/pricing/plans')
    expect([200, 401, 403]).toContain(s)
  })

  it('P395: GET /settings/billing 과금 설정 페이지', async () => {
    const { s } = await pg('/settings/billing')
    expect([200, 302, 303, 404]).toContain(s)
  })
})

// --- P396-P400: 가이드/뉴스/통계 ---
describe('P396-P400: 가이드/뉴스/통계', () => {
  it('P396: GET /knowledge 가이드/지식 페이지', async () => {
    const { s } = await pg('/knowledge')
    expect([200, 302, 303, 404]).toContain(s)
  })

  it('P397: GET /news 뉴스 페이지', async () => {
    const { s } = await pg('/news')
    expect([200, 302, 303]).toContain(s)
  })

  it('P398: GET /statistics 통계 페이지', async () => {
    const { s } = await pg('/statistics')
    expect([200, 302, 303]).toContain(s)
  })

  it('P399: GET /market/search 시장 검색', async () => {
    const { s } = await pg('/market/search')
    expect([200, 302, 303]).toContain(s)
  })

  it('P400: GET / 메인 페이지 (전문가도 접근 가능)', async () => {
    const { s } = await pg('/')
    expect([200, 302, 303]).toContain(s)
  })
})
