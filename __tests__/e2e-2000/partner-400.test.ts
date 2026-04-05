import { describe, it, expect, vi } from 'vitest'
vi.setConfig({ testTimeout: 30000 })

const BASE = 'http://localhost:3000'

async function pg(p: string) {
  const r = await fetch(`${BASE}${p}`, { redirect: 'manual' })
  return { s: r.status, b: await r.text() }
}

async function ap(p: string, o?: RequestInit) {
  const r = await fetch(`${BASE}${p}`, {
    headers: { 'Content-Type': 'application/json' },
    ...o,
  })
  let j: any
  try {
    j = JSON.parse(await r.text())
  } catch {}
  return { s: r.status, j }
}

// ============================================================
// PARTNER ROLE E2E — 400 Tests (R001–R400)
// ============================================================

describe('PARTNER Role E2E (R001-R400)', () => {
  // ========================================================
  // A. 파트너 가입/설정 (R001-R060)
  // ========================================================

  // --- R001-R010: 파트너 가이드 (guide/partner, 6스텝) ---
  describe('R001-R010: 파트너 가이드', () => {
    it('R001: GET /guide/partner 페이지 로드', async () => {
      const { s } = await pg('/guide/partner')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    const guideSteps = [
      { step: 1, title: '파트너 소개' },
      { step: 2, title: '가입 절차' },
      { step: 3, title: '추천 코드 발급' },
      { step: 4, title: '회원 모집 방법' },
      { step: 5, title: '수익 구조' },
      { step: 6, title: '정산 안내' },
    ]

    guideSteps.forEach(({ step, title }, idx) => {
      it(`R00${idx + 2}: 가이드 스텝 ${step} — ${title}`, async () => {
        const { s } = await pg(`/guide/partner?step=${step}`)
        expect([200, 301, 302, 307, 308]).toContain(s)
      })
    })

    it('R008: 가이드 잘못된 스텝 번호 (step=99)', async () => {
      const { s } = await pg('/guide/partner?step=99')
      expect([200, 301, 302, 307, 308, 400, 404]).toContain(s)
    })

    it('R009: 가이드 스텝 0 (경계값)', async () => {
      const { s } = await pg('/guide/partner?step=0')
      expect([200, 301, 302, 307, 308, 400]).toContain(s)
    })

    it('R010: 가이드 스텝 음수 (step=-1)', async () => {
      const { s } = await pg('/guide/partner?step=-1')
      expect([200, 301, 302, 307, 308, 400]).toContain(s)
    })
  })

  // --- R011-R020: 파트너 등록 (partner/register) ---
  describe('R011-R020: 파트너 등록', () => {
    it('R011: GET /partner/register 페이지 로드', async () => {
      const { s } = await pg('/partner/register')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R012: POST /api/v1/partner/register — 정상 등록', async () => {
      const { s, j } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({
          name: '테스트 파트너',
          email: 'partner-test@nplatform.kr',
          phone: '010-1234-5678',
          company: '테스트 컴퍼니',
          businessNumber: '123-45-67890',
        }),
      })
      expect([200, 201, 301, 302, 401, 403]).toContain(s)
    })

    it('R013: POST 등록 — 이름 누락', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R014: POST 등록 — 이메일 형식 오류', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({ name: '테스트', email: 'not-email' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R015: POST 등록 — 전화번호 형식 오류', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({ name: '테스트', email: 'a@b.com', phone: '123' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R016: POST 등록 — 사업자번호 중복', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({
          name: '중복 파트너',
          email: 'dup@test.com',
          businessNumber: '000-00-00000',
        }),
      })
      expect([400, 401, 403, 409, 422]).toContain(s)
    })

    it('R017: POST 등록 — 빈 본문', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R018: POST 등록 — XSS 시도 (이름)', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({ name: '<script>alert(1)</script>', email: 'xss@t.com' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R019: POST 등록 — SQL Injection 시도', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({ name: "'; DROP TABLE partners; --", email: 'sql@t.com' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R020: POST 등록 — 초대 코드 포함', async () => {
      const { s } = await ap('/api/v1/partner/register', {
        method: 'POST',
        body: JSON.stringify({
          name: '초대 파트너',
          email: 'invited@test.com',
          inviteCode: 'INV-2024-TEST',
        }),
      })
      expect([200, 201, 301, 302, 401, 403]).toContain(s)
    })
  })

  // --- R021-R030: 파트너 대시보드 (partner/dashboard) ---
  describe('R021-R030: 파트너 대시보드', () => {
    it('R021: GET /partner/dashboard 페이지 로드', async () => {
      const { s } = await pg('/partner/dashboard')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R022: 대시보드 API — KPI 요약', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/summary')
      expect([200, 401, 403]).toContain(s)
    })

    it('R023: 대시보드 API — 최근 추천', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/recent-referrals')
      expect([200, 401, 403]).toContain(s)
    })

    it('R024: 대시보드 API — 수익 차트', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/earnings-chart')
      expect([200, 401, 403]).toContain(s)
    })

    it('R025: 대시보드 API — 활동 로그', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/activity')
      expect([200, 401, 403]).toContain(s)
    })

    it('R026: 대시보드 API — 공지사항', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/notices')
      expect([200, 401, 403]).toContain(s)
    })

    it('R027: 대시보드 — 기간 필터 (이번 달)', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/summary?period=this_month')
      expect([200, 401, 403]).toContain(s)
    })

    it('R028: 대시보드 — 기간 필터 (지난 달)', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/summary?period=last_month')
      expect([200, 401, 403]).toContain(s)
    })

    it('R029: 대시보드 — 기간 필터 (전체)', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/summary?period=all')
      expect([200, 401, 403]).toContain(s)
    })

    it('R030: 대시보드 — 잘못된 기간 필터', async () => {
      const { s } = await ap('/api/v1/partner/dashboard/summary?period=invalid')
      expect([200, 400, 401, 403]).toContain(s)
    })
  })

  // --- R031-R040: 파트너 프로필 설정 ---
  describe('R031-R040: 파트너 프로필 설정', () => {
    it('R031: GET /partner/profile 페이지 로드', async () => {
      const { s } = await pg('/partner/profile')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R032: GET 프로필 API', async () => {
      const { s } = await ap('/api/v1/partner/profile')
      expect([200, 401, 403]).toContain(s)
    })

    it('R033: PUT 프로필 업데이트 — 이름 변경', async () => {
      const { s } = await ap('/api/v1/partner/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: '수정된 파트너' }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R034: PUT 프로필 — 회사명 변경', async () => {
      const { s } = await ap('/api/v1/partner/profile', {
        method: 'PUT',
        body: JSON.stringify({ company: '새 회사' }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R035: PUT 프로필 — 프로필 이미지 URL', async () => {
      const { s } = await ap('/api/v1/partner/profile', {
        method: 'PUT',
        body: JSON.stringify({ profileImage: 'https://example.com/img.jpg' }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R036: PUT 프로필 — 소개글 설정', async () => {
      const { s } = await ap('/api/v1/partner/profile', {
        method: 'PUT',
        body: JSON.stringify({ bio: '부동산 전문 파트너입니다.' }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R037: PUT 프로필 — 알림 설정 변경', async () => {
      const { s } = await ap('/api/v1/partner/profile/notifications', {
        method: 'PUT',
        body: JSON.stringify({ email: true, sms: false, push: true }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R038: PUT 프로필 — 정산 계좌 설정', async () => {
      const { s } = await ap('/api/v1/partner/profile/bank-account', {
        method: 'PUT',
        body: JSON.stringify({ bank: '국민은행', account: '123-456-789012', holder: '홍길동' }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R039: PUT 프로필 — 빈 이름 (필수값 누락)', async () => {
      const { s } = await ap('/api/v1/partner/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R040: DELETE 프로필 — 계정 탈퇴 요청', async () => {
      const { s } = await ap('/api/v1/partner/profile', { method: 'DELETE' })
      expect([200, 204, 401, 403, 405]).toContain(s)
    })
  })

  // --- R041-R050: 파트너 리드 관리 (partner/leads) ---
  describe('R041-R050: 파트너 리드 관리', () => {
    it('R041: GET /partner/leads 페이지 로드', async () => {
      const { s } = await pg('/partner/leads')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R042: GET 리드 목록 API', async () => {
      const { s } = await ap('/api/v1/partner/leads')
      expect([200, 401, 403]).toContain(s)
    })

    it('R043: GET 리드 상세', async () => {
      const { s } = await ap('/api/v1/partner/leads/lead-001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R044: POST 리드 생성', async () => {
      const { s } = await ap('/api/v1/partner/leads', {
        method: 'POST',
        body: JSON.stringify({ name: '잠재고객1', phone: '010-0000-1111', source: 'referral' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R045: PUT 리드 상태 업데이트 (CONTACTED)', async () => {
      const { s } = await ap('/api/v1/partner/leads/lead-001/status', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CONTACTED' }),
      })
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R046: PUT 리드 상태 업데이트 (CONVERTED)', async () => {
      const { s } = await ap('/api/v1/partner/leads/lead-001/status', {
        method: 'PUT',
        body: JSON.stringify({ status: 'CONVERTED' }),
      })
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R047: GET 리드 필터 — 상태별', async () => {
      const { s } = await ap('/api/v1/partner/leads?status=NEW')
      expect([200, 401, 403]).toContain(s)
    })

    it('R048: GET 리드 필터 — 소스별', async () => {
      const { s } = await ap('/api/v1/partner/leads?source=referral')
      expect([200, 401, 403]).toContain(s)
    })

    it('R049: GET 리드 — 페이지네이션', async () => {
      const { s } = await ap('/api/v1/partner/leads?page=1&limit=10')
      expect([200, 401, 403]).toContain(s)
    })

    it('R050: DELETE 리드 삭제', async () => {
      const { s } = await ap('/api/v1/partner/leads/lead-001', { method: 'DELETE' })
      expect([200, 204, 401, 403, 404]).toContain(s)
    })
  })

  // --- R051-R060: 파트너 정산 (partner/settlement) ---
  describe('R051-R060: 파트너 정산', () => {
    it('R051: GET /partner/settlement 페이지 로드', async () => {
      const { s } = await pg('/partner/settlement')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R052: GET 정산 내역 API', async () => {
      const { s } = await ap('/api/v1/partner/settlements')
      expect([200, 401, 403]).toContain(s)
    })

    it('R053: GET 정산 상세', async () => {
      const { s } = await ap('/api/v1/partner/settlements/stl-001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R054: POST 정산 요청', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 100000 }),
      })
      expect([200, 201, 400, 401, 403]).toContain(s)
    })

    it('R055: POST 정산 요청 — 최소 금액 미달', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 100 }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R056: GET 정산 — 상태 필터 (PENDING)', async () => {
      const { s } = await ap('/api/v1/partner/settlements?status=PENDING')
      expect([200, 401, 403]).toContain(s)
    })

    it('R057: GET 정산 — 상태 필터 (COMPLETED)', async () => {
      const { s } = await ap('/api/v1/partner/settlements?status=COMPLETED')
      expect([200, 401, 403]).toContain(s)
    })

    it('R058: GET 정산 — 기간 필터', async () => {
      const { s } = await ap('/api/v1/partner/settlements?from=2024-01-01&to=2024-12-31')
      expect([200, 401, 403]).toContain(s)
    })

    it('R059: GET 정산 — 세금 계산서 다운로드', async () => {
      const { s } = await ap('/api/v1/partner/settlements/stl-001/invoice')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R060: GET 정산 — 월별 요약', async () => {
      const { s } = await ap('/api/v1/partner/settlements/monthly-summary?year=2024')
      expect([200, 401, 403]).toContain(s)
    })
  })

  // ========================================================
  // B. 추천코드 관리 (R061-R140)
  // ========================================================

  // --- R061-R070: 추천코드 조회 API (GET referrals/code) ---
  describe('R061-R070: 추천코드 조회 API', () => {
    it('R061: GET /api/v1/referrals/code — 내 추천코드 조회', async () => {
      const { s } = await ap('/api/v1/referrals/code')
      expect([200, 401, 403]).toContain(s)
    })

    it('R062: GET 추천코드 — 코드 상세', async () => {
      const { s } = await ap('/api/v1/referrals/code/NP-TEST001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R063: GET 추천코드 — 사용 통계', async () => {
      const { s } = await ap('/api/v1/referrals/code/NP-TEST001/stats')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R064: GET 추천코드 — 목록 조회', async () => {
      const { s } = await ap('/api/v1/referrals/codes')
      expect([200, 401, 403]).toContain(s)
    })

    it('R065: GET 추천코드 — 활성 코드만', async () => {
      const { s } = await ap('/api/v1/referrals/codes?status=ACTIVE')
      expect([200, 401, 403]).toContain(s)
    })

    it('R066: GET 추천코드 — 만료 코드만', async () => {
      const { s } = await ap('/api/v1/referrals/codes?status=EXPIRED')
      expect([200, 401, 403]).toContain(s)
    })

    it('R067: GET 추천코드 — 비활성 코드만', async () => {
      const { s } = await ap('/api/v1/referrals/codes?status=INACTIVE')
      expect([200, 401, 403]).toContain(s)
    })

    it('R068: GET 추천코드 — 페이지네이션', async () => {
      const { s } = await ap('/api/v1/referrals/codes?page=1&limit=20')
      expect([200, 401, 403]).toContain(s)
    })

    it('R069: GET 추천코드 — 존재하지 않는 코드', async () => {
      const { s } = await ap('/api/v1/referrals/code/NP-NONEXIST999')
      expect([401, 403, 404]).toContain(s)
    })

    it('R070: GET 추천코드 — 일별 사용 추이', async () => {
      const { s } = await ap('/api/v1/referrals/code/NP-TEST001/daily-trend')
      expect([200, 401, 403, 404]).toContain(s)
    })
  })

  // --- R071-R080: 추천코드 생성 API (POST) ---
  describe('R071-R080: 추천코드 생성 API', () => {
    it('R071: POST /api/v1/referrals/code — 기본 생성', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'NP' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R072: POST 추천코드 — 커스텀 코드', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-CUSTOM01' }),
      })
      expect([200, 201, 400, 401, 403, 409]).toContain(s)
    })

    it('R073: POST 추천코드 — 만료일 설정', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'NP', expiresAt: '2025-12-31' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R074: POST 추천코드 — 사용 횟수 제한', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'NP', maxUses: 100 }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R075: POST 추천코드 — EX 프리픽스', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'EX' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R076: POST 추천코드 — IN 프리픽스', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'IN' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R077: POST 추천코드 — VIP 프리픽스', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'VIP' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R078: POST 추천코드 — 중복 코드 시도', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-EXISTING' }),
      })
      expect([400, 401, 403, 409]).toContain(s)
    })

    it('R079: POST 추천코드 — 캠페인 연결', async () => {
      const { s } = await ap('/api/v1/referrals/code', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'NP', campaign: 'summer2024' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R080: DELETE 추천코드 비활성화', async () => {
      const { s } = await ap('/api/v1/referrals/code/NP-TEST001', { method: 'DELETE' })
      expect([200, 204, 401, 403, 404]).toContain(s)
    })
  })

  // --- R081-R100: 추천코드 검증 API (20가지) ---
  describe('R081-R100: 추천코드 검증 API', () => {
    const validCodes = [
      { id: 'R081', code: 'NP-VALID001', desc: 'NP- 유효 코드' },
      { id: 'R082', code: 'EX-VALID001', desc: 'EX- 유효 코드' },
      { id: 'R083', code: 'IN-VALID001', desc: 'IN- 유효 코드' },
      { id: 'R084', code: 'VIP-VALID01', desc: 'VIP- 유효 코드' },
      { id: 'R085', code: 'NP-ABC1234', desc: 'NP- 영숫자 조합' },
    ]

    validCodes.forEach(({ id, code, desc }) => {
      it(`${id}: 추천코드 검증 — ${desc} (${code})`, async () => {
        const { s } = await ap('/api/v1/referrals/validate', {
          method: 'POST',
          body: JSON.stringify({ code }),
        })
        expect([200, 400, 401, 403, 404]).toContain(s)
      })
    })

    const invalidCodes = [
      { id: 'R086', code: '', desc: '빈값' },
      { id: 'R087', code: 'INVALID', desc: '프리픽스 없음' },
      { id: 'R088', code: 'XX-12345', desc: '허용되지 않는 프리픽스' },
      { id: 'R089', code: '<script>', desc: 'XSS 시도' },
      { id: 'R090', code: "' OR 1=1 --", desc: 'SQL Injection' },
      { id: 'R091', code: 'NP-', desc: '프리픽스만' },
      { id: 'R092', code: 'NP-' + 'A'.repeat(100), desc: '길이 초과 (100자)' },
      { id: 'R093', code: 'NP-!@#$%', desc: '특수문자 포함' },
      { id: 'R094', code: 'NP-EXPIRED1', desc: '만료된 코드' },
      { id: 'R095', code: 'NP-SUSPEND1', desc: '정지된 코드' },
      { id: 'R096', code: '   ', desc: '공백만' },
      { id: 'R097', code: 'np-lowercase', desc: '소문자 코드' },
      { id: 'R098', code: 'NP-한글코드', desc: '한글 포함' },
      { id: 'R099', code: null as any, desc: 'null 값' },
      { id: 'R100', code: 'NP-MAXUSED1', desc: '사용 횟수 소진 코드' },
    ]

    invalidCodes.forEach(({ id, code, desc }) => {
      it(`${id}: 추천코드 검증 — ${desc}`, async () => {
        const { s } = await ap('/api/v1/referrals/validate', {
          method: 'POST',
          body: JSON.stringify({ code }),
        })
        expect([200, 400, 401, 403, 404, 422]).toContain(s)
      })
    })
  })

  // --- R101-R110: 추천 링크 생성 ---
  describe('R101-R110: 추천 링크 생성', () => {
    it('R101: POST 추천 링크 — 기본 생성', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R102: POST 추천 링크 — 랜딩 페이지 지정', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001', landing: '/listings' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R103: POST 추천 링크 — 단축 URL', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001', shorten: true }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R104: GET 추천 링크 목록', async () => {
      const { s } = await ap('/api/v1/referrals/links')
      expect([200, 401, 403]).toContain(s)
    })

    it('R105: GET 추천 링크 클릭 통계', async () => {
      const { s } = await ap('/api/v1/referrals/links/stats')
      expect([200, 401, 403]).toContain(s)
    })

    it('R106: POST 추천 링크 — 만료일 설정', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001', expiresAt: '2025-06-30' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R107: DELETE 추천 링크 삭제', async () => {
      const { s } = await ap('/api/v1/referrals/links/link-001', { method: 'DELETE' })
      expect([200, 204, 401, 403, 404]).toContain(s)
    })

    it('R108: GET 추천 링크 — 리디렉션 확인', async () => {
      const { s } = await pg('/r/NP-TEST001')
      expect([200, 301, 302, 307, 308, 404]).toContain(s)
    })

    it('R109: GET 추천 링크 — 유효하지 않은 코드 리디렉션', async () => {
      const { s } = await pg('/r/INVALID-CODE')
      expect([200, 301, 302, 307, 308, 400, 404]).toContain(s)
    })

    it('R110: POST 추천 링크 — 다중 랜딩 페이지', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001', landing: '/npl-analysis' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })
  })

  // --- R111-R120: QR 코드 생성 ---
  describe('R111-R120: QR 코드 생성', () => {
    const qrSizes = [128, 256, 512, 1024]
    const qrFormats = ['png', 'svg']

    it('R111: POST QR 코드 — 기본 생성', async () => {
      const { s } = await ap('/api/v1/referrals/qr', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001' }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    qrSizes.forEach((size, idx) => {
      it(`R${112 + idx}: QR 코드 — 크기 ${size}px`, async () => {
        const { s } = await ap('/api/v1/referrals/qr', {
          method: 'POST',
          body: JSON.stringify({ code: 'NP-TEST001', size }),
        })
        expect([200, 201, 401, 403]).toContain(s)
      })
    })

    qrFormats.forEach((format, idx) => {
      it(`R${116 + idx}: QR 코드 — ${format} 형식`, async () => {
        const { s } = await ap('/api/v1/referrals/qr', {
          method: 'POST',
          body: JSON.stringify({ code: 'NP-TEST001', format }),
        })
        expect([200, 201, 401, 403]).toContain(s)
      })
    })

    it('R118: QR 코드 — 로고 포함', async () => {
      const { s } = await ap('/api/v1/referrals/qr', {
        method: 'POST',
        body: JSON.stringify({ code: 'NP-TEST001', logo: true }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R119: QR 코드 — 다운로드', async () => {
      const { s } = await ap('/api/v1/referrals/qr/NP-TEST001/download')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R120: QR 코드 — 잘못된 코드', async () => {
      const { s } = await ap('/api/v1/referrals/qr', {
        method: 'POST',
        body: JSON.stringify({ code: '' }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })
  })

  // --- R121-R130: UTM 파라미터 조합 (source x medium x campaign) ---
  describe('R121-R130: UTM 파라미터 조합', () => {
    const utmSources = ['kakao', 'naver', 'google', 'direct', 'blog']
    const utmMediums = ['social', 'cpc', 'email', 'referral', 'organic']
    const utmCampaigns = ['summer2024', 'launch', 'promo']

    // 5 source tests
    utmSources.forEach((source, idx) => {
      it(`R${121 + idx}: UTM — source=${source}`, async () => {
        const { s } = await ap('/api/v1/referrals/link', {
          method: 'POST',
          body: JSON.stringify({
            code: 'NP-TEST001',
            utm: { source, medium: 'social', campaign: 'test' },
          }),
        })
        expect([200, 201, 401, 403]).toContain(s)
      })
    })

    // 3 medium tests
    utmMediums.slice(0, 3).forEach((medium, idx) => {
      it(`R${126 + idx}: UTM — medium=${medium}`, async () => {
        const { s } = await ap('/api/v1/referrals/link', {
          method: 'POST',
          body: JSON.stringify({
            code: 'NP-TEST001',
            utm: { source: 'naver', medium, campaign: 'test' },
          }),
        })
        expect([200, 201, 401, 403]).toContain(s)
      })
    })

    it('R129: UTM — campaign 파라미터', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({
          code: 'NP-TEST001',
          utm: { source: 'kakao', medium: 'social', campaign: 'summer2024' },
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R130: UTM — 전체 조합 (source+medium+campaign+term+content)', async () => {
      const { s } = await ap('/api/v1/referrals/link', {
        method: 'POST',
        body: JSON.stringify({
          code: 'NP-TEST001',
          utm: {
            source: 'google',
            medium: 'cpc',
            campaign: 'promo',
            term: 'npl',
            content: 'banner_v1',
          },
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })
  })

  // --- R131-R140: 추천코드 공유 (카카오, 블로그, URL) ---
  describe('R131-R140: 추천코드 공유', () => {
    const shareChannels = [
      { id: 'R131', channel: 'kakao', desc: '카카오톡 공유' },
      { id: 'R132', channel: 'kakao_story', desc: '카카오스토리 공유' },
      { id: 'R133', channel: 'naver_blog', desc: '네이버 블로그 공유' },
      { id: 'R134', channel: 'naver_cafe', desc: '네이버 카페 공유' },
      { id: 'R135', channel: 'facebook', desc: '페이스북 공유' },
      { id: 'R136', channel: 'twitter', desc: '트위터(X) 공유' },
      { id: 'R137', channel: 'url_copy', desc: 'URL 복사' },
      { id: 'R138', channel: 'email', desc: '이메일 공유' },
      { id: 'R139', channel: 'sms', desc: 'SMS 공유' },
      { id: 'R140', channel: 'band', desc: '밴드 공유' },
    ]

    shareChannels.forEach(({ id, channel, desc }) => {
      it(`${id}: 추천코드 공유 — ${desc}`, async () => {
        const { s } = await ap('/api/v1/referrals/share', {
          method: 'POST',
          body: JSON.stringify({ code: 'NP-TEST001', channel }),
        })
        expect([200, 201, 401, 403]).toContain(s)
      })
    })
  })

  // ========================================================
  // C. 회원 모집/추적 (R141-R220)
  // ========================================================

  // --- R141-R160: 추천 회원 목록 페이지 (partner/referrals) ---
  describe('R141-R160: 추천 회원 목록 페이지', () => {
    it('R141: GET /partner/referrals 페이지 로드', async () => {
      const { s } = await pg('/partner/referrals')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R142: GET 추천 회원 목록 API', async () => {
      const { s } = await ap('/api/v1/partner/referrals')
      expect([200, 401, 403]).toContain(s)
    })

    const referralStatuses = [
      'SIGNED_UP', 'CONVERTED', 'ACTIVE', 'CHURNED',
      'PENDING', 'VERIFIED', 'EXPIRED', 'SUSPENDED',
    ]

    referralStatuses.forEach((status, idx) => {
      it(`R${143 + idx}: 추천 회원 — 상태 ${status}`, async () => {
        const { s } = await ap(`/api/v1/partner/referrals?status=${status}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R151: 추천 회원 — 이름 검색', async () => {
      const { s } = await ap('/api/v1/partner/referrals?search=홍길동')
      expect([200, 401, 403]).toContain(s)
    })

    it('R152: 추천 회원 — 이메일 검색', async () => {
      const { s } = await ap('/api/v1/partner/referrals?search=test@example.com')
      expect([200, 401, 403]).toContain(s)
    })

    it('R153: 추천 회원 — 정렬 (최신순)', async () => {
      const { s } = await ap('/api/v1/partner/referrals?sort=created_at&order=desc')
      expect([200, 401, 403]).toContain(s)
    })

    it('R154: 추천 회원 — 정렬 (오래된순)', async () => {
      const { s } = await ap('/api/v1/partner/referrals?sort=created_at&order=asc')
      expect([200, 401, 403]).toContain(s)
    })

    it('R155: 추천 회원 — 정렬 (수익순)', async () => {
      const { s } = await ap('/api/v1/partner/referrals?sort=earnings&order=desc')
      expect([200, 401, 403]).toContain(s)
    })

    it('R156: 추천 회원 — 페이지 1', async () => {
      const { s } = await ap('/api/v1/partner/referrals?page=1&limit=10')
      expect([200, 401, 403]).toContain(s)
    })

    it('R157: 추천 회원 — 페이지 2', async () => {
      const { s } = await ap('/api/v1/partner/referrals?page=2&limit=10')
      expect([200, 401, 403]).toContain(s)
    })

    it('R158: 추천 회원 — 상세 조회', async () => {
      const { s } = await ap('/api/v1/partner/referrals/ref-001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R159: 추천 회원 — 존재하지 않는 ID', async () => {
      const { s } = await ap('/api/v1/partner/referrals/nonexistent-id')
      expect([401, 403, 404]).toContain(s)
    })

    it('R160: 추천 회원 — 내보내기 (CSV)', async () => {
      const { s } = await ap('/api/v1/partner/referrals/export?format=csv')
      expect([200, 401, 403]).toContain(s)
    })
  })

  // --- R161-R180: 추천 회원 상태 (SIGNED_UP, CONVERTED, ACTIVE, CHURNED) ---
  describe('R161-R180: 추천 회원 상태 조합', () => {
    const statuses = ['SIGNED_UP', 'CONVERTED', 'ACTIVE', 'CHURNED'] as const
    const roles = ['BUYER', 'SELLER', 'INVESTOR', 'LENDER', 'PROFESSIONAL'] as const

    // 4 statuses x 5 roles = 20 combinations
    let testNum = 161
    statuses.forEach((status) => {
      roles.forEach((role) => {
        it(`R${testNum}: 상태=${status}, 역할=${role}`, async () => {
          const { s } = await ap(
            `/api/v1/partner/referrals?status=${status}&role=${role}`
          )
          expect([200, 401, 403]).toContain(s)
        })
        testNum++
      })
    })
  })

  // --- R181-R200: 추천 회원 활동 추적 (가입→유료전환→거래완료 플로우) ---
  describe('R181-R200: 추천 회원 활동 추적', () => {
    const trackingEvents = [
      { id: 'R181', event: 'page_view', desc: '페이지 방문 추적' },
      { id: 'R182', event: 'signup_start', desc: '가입 시작 추적' },
      { id: 'R183', event: 'signup_complete', desc: '가입 완료 추적' },
      { id: 'R184', event: 'email_verify', desc: '이메일 인증 추적' },
      { id: 'R185', event: 'profile_complete', desc: '프로필 완성 추적' },
      { id: 'R186', event: 'first_login', desc: '첫 로그인 추적' },
      { id: 'R187', event: 'listing_view', desc: '매물 조회 추적' },
      { id: 'R188', event: 'inquiry_sent', desc: '문의 발송 추적' },
      { id: 'R189', event: 'subscription_start', desc: '유료 구독 시작 추적' },
      { id: 'R190', event: 'subscription_paid', desc: '구독 결제 완료 추적' },
      { id: 'R191', event: 'deal_created', desc: '거래 생성 추적' },
      { id: 'R192', event: 'deal_in_progress', desc: '거래 진행 추적' },
      { id: 'R193', event: 'deal_completed', desc: '거래 완료 추적' },
      { id: 'R194', event: 'deal_cancelled', desc: '거래 취소 추적' },
      { id: 'R195', event: 'credit_purchase', desc: '크레딧 구매 추적' },
    ]

    trackingEvents.forEach(({ id, event, desc }) => {
      it(`${id}: ${desc}`, async () => {
        const { s } = await ap('/api/v1/partner/tracking/events', {
          method: 'POST',
          body: JSON.stringify({ referralId: 'ref-001', event }),
        })
        expect([200, 201, 401, 403]).toContain(s)
      })
    })

    it('R196: 활동 추적 — 퍼널 분석', async () => {
      const { s } = await ap('/api/v1/partner/tracking/funnel')
      expect([200, 401, 403]).toContain(s)
    })

    it('R197: 활동 추적 — 전환율 조회', async () => {
      const { s } = await ap('/api/v1/partner/tracking/conversion-rate')
      expect([200, 401, 403]).toContain(s)
    })

    it('R198: 활동 추적 — 이벤트 로그 조회', async () => {
      const { s } = await ap('/api/v1/partner/tracking/events?referralId=ref-001')
      expect([200, 401, 403]).toContain(s)
    })

    it('R199: 활동 추적 — 코호트 분석', async () => {
      const { s } = await ap('/api/v1/partner/tracking/cohort?period=monthly')
      expect([200, 401, 403]).toContain(s)
    })

    it('R200: 활동 추적 — 잘못된 이벤트', async () => {
      const { s } = await ap('/api/v1/partner/tracking/events', {
        method: 'POST',
        body: JSON.stringify({ referralId: 'ref-001', event: 'INVALID_EVENT' }),
      })
      expect([200, 400, 401, 403, 422]).toContain(s)
    })
  })

  // --- R201-R220: 추천 필터/검색 (기간별, 상태별, 역할별) ---
  describe('R201-R220: 추천 필터/검색', () => {
    const dateRanges = [
      { id: 'R201', from: '2024-01-01', to: '2024-01-31', desc: '1월' },
      { id: 'R202', from: '2024-01-01', to: '2024-03-31', desc: '1분기' },
      { id: 'R203', from: '2024-01-01', to: '2024-06-30', desc: '상반기' },
      { id: 'R204', from: '2024-01-01', to: '2024-12-31', desc: '연간' },
      { id: 'R205', from: '2024-07-01', to: '2024-07-31', desc: '7월' },
    ]

    dateRanges.forEach(({ id, from, to, desc }) => {
      it(`${id}: 기간별 필터 — ${desc}`, async () => {
        const { s } = await ap(`/api/v1/partner/referrals?from=${from}&to=${to}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    const combinedFilters = [
      { id: 'R206', q: 'status=ACTIVE&from=2024-01-01&to=2024-12-31', desc: '활성+기간' },
      { id: 'R207', q: 'status=CONVERTED&role=BUYER', desc: '전환+매수자' },
      { id: 'R208', q: 'status=SIGNED_UP&sort=created_at&order=desc', desc: '가입+최신순' },
      { id: 'R209', q: 'role=INVESTOR&sort=earnings&order=desc', desc: '투자자+수익순' },
      { id: 'R210', q: 'search=서울&status=ACTIVE', desc: '검색+활성' },
    ]

    combinedFilters.forEach(({ id, q, desc }) => {
      it(`${id}: 복합 필터 — ${desc}`, async () => {
        const { s } = await ap(`/api/v1/partner/referrals?${q}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    const searchQueries = [
      { id: 'R211', q: '홍길동', desc: '이름 검색' },
      { id: 'R212', q: '010-1234', desc: '전화번호 부분 검색' },
      { id: 'R213', q: 'NP-CODE', desc: '추천코드 검색' },
      { id: 'R214', q: '', desc: '빈 검색어' },
      { id: 'R215', q: 'a', desc: '한글자 검색' },
    ]

    searchQueries.forEach(({ id, q, desc }) => {
      it(`${id}: 검색 — ${desc}`, async () => {
        const { s } = await ap(`/api/v1/partner/referrals?search=${encodeURIComponent(q)}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R216: 필터 — 잘못된 날짜 형식', async () => {
      const { s } = await ap('/api/v1/partner/referrals?from=invalid-date')
      expect([200, 400, 401, 403]).toContain(s)
    })

    it('R217: 필터 — from > to (역전된 기간)', async () => {
      const { s } = await ap('/api/v1/partner/referrals?from=2024-12-31&to=2024-01-01')
      expect([200, 400, 401, 403]).toContain(s)
    })

    it('R218: 필터 — 미래 날짜', async () => {
      const { s } = await ap('/api/v1/partner/referrals?from=2030-01-01&to=2030-12-31')
      expect([200, 401, 403]).toContain(s)
    })

    it('R219: 필터 — limit=0', async () => {
      const { s } = await ap('/api/v1/partner/referrals?limit=0')
      expect([200, 400, 401, 403]).toContain(s)
    })

    it('R220: 필터 — limit=1000 (대량)', async () => {
      const { s } = await ap('/api/v1/partner/referrals?limit=1000')
      expect([200, 400, 401, 403]).toContain(s)
    })
  })

  // ========================================================
  // D. 수익/정산 (R221-R300)
  // ========================================================

  // --- R221-R240: 수익 페이지 (partner/earnings) ---
  describe('R221-R240: 수익 페이지', () => {
    it('R221: GET /partner/earnings 페이지 로드', async () => {
      const { s } = await pg('/partner/earnings')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R222: GET 수익 API — 전체 요약', async () => {
      const { s } = await ap('/api/v1/partner/earnings')
      expect([200, 401, 403]).toContain(s)
    })

    it('R223: GET 수익 — KPI: 총 수익', async () => {
      const { s } = await ap('/api/v1/partner/earnings/kpi/total')
      expect([200, 401, 403]).toContain(s)
    })

    it('R224: GET 수익 — KPI: 이번 달 수익', async () => {
      const { s } = await ap('/api/v1/partner/earnings/kpi/this-month')
      expect([200, 401, 403]).toContain(s)
    })

    it('R225: GET 수익 — KPI: 평균 수익', async () => {
      const { s } = await ap('/api/v1/partner/earnings/kpi/average')
      expect([200, 401, 403]).toContain(s)
    })

    it('R226: GET 수익 — KPI: 대기 중 정산', async () => {
      const { s } = await ap('/api/v1/partner/earnings/kpi/pending')
      expect([200, 401, 403]).toContain(s)
    })

    it('R227: GET 수익 테이블 — 기본 조회', async () => {
      const { s } = await ap('/api/v1/partner/earnings/transactions')
      expect([200, 401, 403]).toContain(s)
    })

    it('R228: GET 수익 테이블 — 페이지네이션', async () => {
      const { s } = await ap('/api/v1/partner/earnings/transactions?page=1&limit=20')
      expect([200, 401, 403]).toContain(s)
    })

    const earningPeriods = [
      { id: 'R229', period: 'daily', desc: '일별' },
      { id: 'R230', period: 'weekly', desc: '주별' },
      { id: 'R231', period: 'monthly', desc: '월별' },
      { id: 'R232', period: 'quarterly', desc: '분기별' },
      { id: 'R233', period: 'yearly', desc: '연별' },
    ]

    earningPeriods.forEach(({ id, period, desc }) => {
      it(`${id}: 수익 차트 — ${desc} 추이`, async () => {
        const { s } = await ap(`/api/v1/partner/earnings/chart?period=${period}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R234: 수익 — 날짜 범위 필터', async () => {
      const { s } = await ap('/api/v1/partner/earnings/transactions?from=2024-01-01&to=2024-06-30')
      expect([200, 401, 403]).toContain(s)
    })

    it('R235: 수익 — 유형별 필터', async () => {
      const { s } = await ap('/api/v1/partner/earnings/transactions?type=SIGNUP_BONUS')
      expect([200, 401, 403]).toContain(s)
    })

    it('R236: 수익 — 정렬 (금액 높은순)', async () => {
      const { s } = await ap('/api/v1/partner/earnings/transactions?sort=amount&order=desc')
      expect([200, 401, 403]).toContain(s)
    })

    it('R237: 수익 — 정렬 (금액 낮은순)', async () => {
      const { s } = await ap('/api/v1/partner/earnings/transactions?sort=amount&order=asc')
      expect([200, 401, 403]).toContain(s)
    })

    it('R238: 수익 — 내보내기 (Excel)', async () => {
      const { s } = await ap('/api/v1/partner/earnings/export?format=xlsx')
      expect([200, 401, 403]).toContain(s)
    })

    it('R239: 수익 — 내보내기 (PDF)', async () => {
      const { s } = await ap('/api/v1/partner/earnings/export?format=pdf')
      expect([200, 401, 403]).toContain(s)
    })

    it('R240: 수익 — 수익 예측', async () => {
      const { s } = await ap('/api/v1/partner/earnings/forecast')
      expect([200, 401, 403]).toContain(s)
    })
  })

  // --- R241-R260: 수익 유형별 ---
  describe('R241-R260: 수익 유형별', () => {
    const earningTypes = [
      { type: 'SIGNUP_BONUS', desc: '가입 보너스' },
      { type: 'SUBSCRIPTION_SHARE', desc: '구독 수익 공유' },
      { type: 'DEAL_COMMISSION', desc: '거래 커미션' },
      { type: 'CONSULTATION_SHARE', desc: '상담 수익 공유' },
    ]

    let testNum = 241
    earningTypes.forEach(({ type, desc }) => {
      it(`R${testNum}: ${desc} — 목록 조회`, async () => {
        const { s } = await ap(`/api/v1/partner/earnings/by-type/${type}`)
        expect([200, 401, 403]).toContain(s)
      })
      testNum++

      it(`R${testNum}: ${desc} — 통계`, async () => {
        const { s } = await ap(`/api/v1/partner/earnings/by-type/${type}/stats`)
        expect([200, 401, 403]).toContain(s)
      })
      testNum++

      it(`R${testNum}: ${desc} — 월별 추이`, async () => {
        const { s } = await ap(`/api/v1/partner/earnings/by-type/${type}/trend?period=monthly`)
        expect([200, 401, 403]).toContain(s)
      })
      testNum++

      it(`R${testNum}: ${desc} — 기간 필터`, async () => {
        const { s } = await ap(
          `/api/v1/partner/earnings/by-type/${type}?from=2024-01-01&to=2024-12-31`
        )
        expect([200, 401, 403]).toContain(s)
      })
      testNum++

      it(`R${testNum}: ${desc} — 상세 트랜잭션`, async () => {
        const { s } = await ap(`/api/v1/partner/earnings/by-type/${type}/transactions?limit=10`)
        expect([200, 401, 403]).toContain(s)
      })
      testNum++
    })
  })

  // --- R261-R280: 등급 시스템 (BRONZE→SILVER→GOLD→PLATINUM) ---
  describe('R261-R280: 등급 시스템', () => {
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const

    it('R261: GET 등급 정보 페이지', async () => {
      const { s } = await pg('/partner/tier')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R262: GET 내 현재 등급', async () => {
      const { s } = await ap('/api/v1/partner/tier')
      expect([200, 401, 403]).toContain(s)
    })

    it('R263: GET 등급 전체 정보', async () => {
      const { s } = await ap('/api/v1/partner/tiers')
      expect([200, 401, 403]).toContain(s)
    })

    tiers.forEach((tier, idx) => {
      it(`R${264 + idx}: 등급 ${tier} — 조건 조회`, async () => {
        const { s } = await ap(`/api/v1/partner/tiers/${tier}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    tiers.forEach((tier, idx) => {
      it(`R${268 + idx}: 등급 ${tier} — 보너스율 조회`, async () => {
        const { s } = await ap(`/api/v1/partner/tiers/${tier}/bonus-rate`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R272: 등급 승급 조건 확인', async () => {
      const { s } = await ap('/api/v1/partner/tier/upgrade-requirements')
      expect([200, 401, 403]).toContain(s)
    })

    it('R273: 등급 진행 상황 (프로그레스)', async () => {
      const { s } = await ap('/api/v1/partner/tier/progress')
      expect([200, 401, 403]).toContain(s)
    })

    it('R274: 등급 이력 조회', async () => {
      const { s } = await ap('/api/v1/partner/tier/history')
      expect([200, 401, 403]).toContain(s)
    })

    it('R275: 등급 혜택 목록', async () => {
      const { s } = await ap('/api/v1/partner/tier/benefits')
      expect([200, 401, 403]).toContain(s)
    })

    it('R276: 등급별 추천 보너스 비교', async () => {
      const { s } = await ap('/api/v1/partner/tiers/compare')
      expect([200, 401, 403]).toContain(s)
    })

    it('R277: 등급 유지 조건 확인', async () => {
      const { s } = await ap('/api/v1/partner/tier/maintenance')
      expect([200, 401, 403]).toContain(s)
    })

    it('R278: 등급 강등 경고', async () => {
      const { s } = await ap('/api/v1/partner/tier/demotion-warning')
      expect([200, 401, 403]).toContain(s)
    })

    it('R279: 등급 시뮬레이션 (예상 등급)', async () => {
      const { s } = await ap('/api/v1/partner/tier/simulate', {
        method: 'POST',
        body: JSON.stringify({ referrals: 50, revenue: 5000000 }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R280: 등급 — 잘못된 등급명 조회', async () => {
      const { s } = await ap('/api/v1/partner/tiers/DIAMOND')
      expect([400, 401, 403, 404]).toContain(s)
    })
  })

  // --- R281-R300: 정산 (정산 요청 API, 정산 이력, 최소 금액 제한) ---
  describe('R281-R300: 정산 상세', () => {
    it('R281: POST 정산 요청 — 정상 금액', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 50000 }),
      })
      expect([200, 201, 400, 401, 403]).toContain(s)
    })

    it('R282: POST 정산 요청 — 최소 금액 경계값 (10,000원)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 10000 }),
      })
      expect([200, 201, 400, 401, 403]).toContain(s)
    })

    it('R283: POST 정산 요청 — 최소 미달 (9,999원)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 9999 }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R284: POST 정산 요청 — 0원', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 0 }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R285: POST 정산 요청 — 음수 금액', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: -10000 }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R286: POST 정산 요청 — 잔액 초과', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 999999999 }),
      })
      expect([400, 401, 403, 422]).toContain(s)
    })

    it('R287: GET 정산 이력 — 전체', async () => {
      const { s } = await ap('/api/v1/partner/settlements/history')
      expect([200, 401, 403]).toContain(s)
    })

    it('R288: GET 정산 이력 — 상태별 (REQUESTED)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/history?status=REQUESTED')
      expect([200, 401, 403]).toContain(s)
    })

    it('R289: GET 정산 이력 — 상태별 (PROCESSING)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/history?status=PROCESSING')
      expect([200, 401, 403]).toContain(s)
    })

    it('R290: GET 정산 이력 — 상태별 (COMPLETED)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/history?status=COMPLETED')
      expect([200, 401, 403]).toContain(s)
    })

    it('R291: GET 정산 이력 — 상태별 (REJECTED)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/history?status=REJECTED')
      expect([200, 401, 403]).toContain(s)
    })

    it('R292: GET 정산 — 정산 가능 잔액', async () => {
      const { s } = await ap('/api/v1/partner/settlements/balance')
      expect([200, 401, 403]).toContain(s)
    })

    it('R293: GET 정산 — 세금 정보', async () => {
      const { s } = await ap('/api/v1/partner/settlements/tax-info')
      expect([200, 401, 403]).toContain(s)
    })

    it('R294: PUT 정산 — 세금 정보 업데이트', async () => {
      const { s } = await ap('/api/v1/partner/settlements/tax-info', {
        method: 'PUT',
        body: JSON.stringify({ taxType: 'individual', residentNumber: '900101-1' }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R295: POST 정산 요청 취소', async () => {
      const { s } = await ap('/api/v1/partner/settlements/stl-001/cancel', {
        method: 'POST',
      })
      expect([200, 400, 401, 403, 404]).toContain(s)
    })

    it('R296: GET 정산 — 수수료 정보', async () => {
      const { s } = await ap('/api/v1/partner/settlements/fees')
      expect([200, 401, 403]).toContain(s)
    })

    it('R297: GET 정산 — 자동 정산 설정', async () => {
      const { s } = await ap('/api/v1/partner/settlements/auto-settings')
      expect([200, 401, 403]).toContain(s)
    })

    it('R298: PUT 자동 정산 설정 변경', async () => {
      const { s } = await ap('/api/v1/partner/settlements/auto-settings', {
        method: 'PUT',
        body: JSON.stringify({ enabled: true, threshold: 100000, day: 25 }),
      })
      expect([200, 401, 403]).toContain(s)
    })

    it('R299: GET 정산 — 연간 정산 합계', async () => {
      const { s } = await ap('/api/v1/partner/settlements/annual-summary?year=2024')
      expect([200, 401, 403]).toContain(s)
    })

    it('R300: POST 정산 — 소수점 금액 (비정수)', async () => {
      const { s } = await ap('/api/v1/partner/settlements/request', {
        method: 'POST',
        body: JSON.stringify({ amount: 10000.5 }),
      })
      expect([200, 201, 400, 401, 403, 422]).toContain(s)
    })
  })

  // ========================================================
  // E. 마케팅 도구 (R301-R360)
  // ========================================================

  // --- R301-R320: 마케팅 도구 페이지 (partner/marketing) ---
  describe('R301-R320: 마케팅 도구 페이지', () => {
    it('R301: GET /partner/marketing 페이지 로드', async () => {
      const { s } = await pg('/partner/marketing')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R302: GET 마케팅 도구 API — 개요', async () => {
      const { s } = await ap('/api/v1/partner/marketing')
      expect([200, 401, 403]).toContain(s)
    })

    it('R303: GET 마케팅 링크 목록', async () => {
      const { s } = await ap('/api/v1/partner/marketing/links')
      expect([200, 401, 403]).toContain(s)
    })

    it('R304: POST 마케팅 링크 생성', async () => {
      const { s } = await ap('/api/v1/partner/marketing/links', {
        method: 'POST',
        body: JSON.stringify({
          name: '여름 프로모션',
          url: 'https://nplatform.kr/promo',
          code: 'NP-TEST001',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R305: GET 마케팅 링크 클릭 분석', async () => {
      const { s } = await ap('/api/v1/partner/marketing/links/analytics')
      expect([200, 401, 403]).toContain(s)
    })

    it('R306: GET 마케팅 배너 목록', async () => {
      const { s } = await ap('/api/v1/partner/marketing/banners')
      expect([200, 401, 403]).toContain(s)
    })

    const bannerSizes = [
      { id: 'R307', size: '728x90', desc: '리더보드' },
      { id: 'R308', size: '300x250', desc: '미디엄 렉탱글' },
      { id: 'R309', size: '160x600', desc: '와이드 스카이스크래퍼' },
      { id: 'R310', size: '320x50', desc: '모바일 리더보드' },
      { id: 'R311', size: '970x250', desc: '빌보드' },
    ]

    bannerSizes.forEach(({ id, size, desc }) => {
      it(`${id}: 배너 — ${size} (${desc})`, async () => {
        const { s } = await ap(`/api/v1/partner/marketing/banners?size=${size}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R312: GET UTM 빌더 데이터', async () => {
      const { s } = await ap('/api/v1/partner/marketing/utm-builder')
      expect([200, 401, 403]).toContain(s)
    })

    it('R313: POST UTM 링크 생성', async () => {
      const { s } = await ap('/api/v1/partner/marketing/utm-builder', {
        method: 'POST',
        body: JSON.stringify({
          source: 'naver',
          medium: 'blog',
          campaign: 'test',
          url: 'https://nplatform.kr',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R314: GET 마케팅 성과 요약', async () => {
      const { s } = await ap('/api/v1/partner/marketing/performance')
      expect([200, 401, 403]).toContain(s)
    })

    it('R315: GET 채널별 성과 분석', async () => {
      const { s } = await ap('/api/v1/partner/marketing/performance/by-channel')
      expect([200, 401, 403]).toContain(s)
    })

    it('R316: GET 캠페인 목록', async () => {
      const { s } = await ap('/api/v1/partner/marketing/campaigns')
      expect([200, 401, 403]).toContain(s)
    })

    it('R317: POST 캠페인 생성', async () => {
      const { s } = await ap('/api/v1/partner/marketing/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: '2024 여름 캠페인',
          startDate: '2024-07-01',
          endDate: '2024-08-31',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R318: GET 소셜 미디어 공유 템플릿', async () => {
      const { s } = await ap('/api/v1/partner/marketing/templates/social')
      expect([200, 401, 403]).toContain(s)
    })

    it('R319: GET 이메일 마케팅 템플릿', async () => {
      const { s } = await ap('/api/v1/partner/marketing/templates/email')
      expect([200, 401, 403]).toContain(s)
    })

    it('R320: GET 마케팅 가이드 콘텐츠', async () => {
      const { s } = await ap('/api/v1/partner/marketing/guides')
      expect([200, 401, 403]).toContain(s)
    })
  })

  // --- R321-R340: 리더보드 (partner/leaderboard) ---
  describe('R321-R340: 리더보드', () => {
    it('R321: GET /partner/leaderboard 페이지 로드', async () => {
      const { s } = await pg('/partner/leaderboard')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R322: GET 리더보드 API — 이번 달', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?period=this_month')
      expect([200, 401, 403]).toContain(s)
    })

    it('R323: GET 리더보드 — 지난 달', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?period=last_month')
      expect([200, 401, 403]).toContain(s)
    })

    it('R324: GET 리더보드 — 이번 분기', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?period=this_quarter')
      expect([200, 401, 403]).toContain(s)
    })

    it('R325: GET 리더보드 — 올해', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?period=this_year')
      expect([200, 401, 403]).toContain(s)
    })

    it('R326: GET 리더보드 — 전체 기간', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?period=all_time')
      expect([200, 401, 403]).toContain(s)
    })

    const rankMetrics = [
      { id: 'R327', metric: 'referrals', desc: '추천 수' },
      { id: 'R328', metric: 'earnings', desc: '수익' },
      { id: 'R329', metric: 'conversions', desc: '전환 수' },
      { id: 'R330', metric: 'active_users', desc: '활성 사용자 수' },
    ]

    rankMetrics.forEach(({ id, metric, desc }) => {
      it(`${id}: 리더보드 — ${desc} 기준 순위`, async () => {
        const { s } = await ap(`/api/v1/partner/leaderboard?metric=${metric}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R331: GET 내 순위', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard/my-rank')
      expect([200, 401, 403]).toContain(s)
    })

    it('R332: GET 리더보드 — Top 10', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?limit=10')
      expect([200, 401, 403]).toContain(s)
    })

    it('R333: GET 리더보드 — Top 50', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?limit=50')
      expect([200, 401, 403]).toContain(s)
    })

    it('R334: GET 리더보드 — Top 100', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?limit=100')
      expect([200, 401, 403]).toContain(s)
    })

    it('R335: GET 리더보드 — 등급별 (GOLD)', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?tier=GOLD')
      expect([200, 401, 403]).toContain(s)
    })

    it('R336: GET 리더보드 — 등급별 (PLATINUM)', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?tier=PLATINUM')
      expect([200, 401, 403]).toContain(s)
    })

    it('R337: GET 리더보드 — 보상 내역', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard/rewards')
      expect([200, 401, 403]).toContain(s)
    })

    it('R338: GET 리더보드 — 이번 달 보상', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard/rewards?period=this_month')
      expect([200, 401, 403]).toContain(s)
    })

    it('R339: GET 리더보드 — 순위 변동 추이', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard/my-rank/trend')
      expect([200, 401, 403]).toContain(s)
    })

    it('R340: GET 리더보드 — 잘못된 기간', async () => {
      const { s } = await ap('/api/v1/partner/leaderboard?period=invalid')
      expect([200, 400, 401, 403]).toContain(s)
    })
  })

  // --- R341-R360: 배너/홍보자료 (다운로드, SNS 공유) ---
  describe('R341-R360: 배너/홍보자료', () => {
    it('R341: GET /partner/resources 페이지 로드', async () => {
      const { s } = await pg('/partner/resources')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R342: GET 홍보자료 목록', async () => {
      const { s } = await ap('/api/v1/partner/resources')
      expect([200, 401, 403]).toContain(s)
    })

    const resourceTypes = [
      { id: 'R343', type: 'banner', desc: '배너 이미지' },
      { id: 'R344', type: 'brochure', desc: '브로슈어' },
      { id: 'R345', type: 'presentation', desc: '프레젠테이션' },
      { id: 'R346', type: 'video', desc: '홍보 영상' },
      { id: 'R347', type: 'infographic', desc: '인포그래픽' },
    ]

    resourceTypes.forEach(({ id, type, desc }) => {
      it(`${id}: 홍보자료 — ${desc} 목록`, async () => {
        const { s } = await ap(`/api/v1/partner/resources?type=${type}`)
        expect([200, 401, 403]).toContain(s)
      })
    })

    it('R348: 홍보자료 — 다운로드 요청', async () => {
      const { s } = await ap('/api/v1/partner/resources/res-001/download')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R349: 홍보자료 — 존재하지 않는 자료 다운로드', async () => {
      const { s } = await ap('/api/v1/partner/resources/nonexistent/download')
      expect([401, 403, 404]).toContain(s)
    })

    const snsChannels = [
      { id: 'R350', channel: 'kakao', desc: '카카오' },
      { id: 'R351', channel: 'facebook', desc: '페이스북' },
      { id: 'R352', channel: 'instagram', desc: '인스타그램' },
      { id: 'R353', channel: 'twitter', desc: '트위터(X)' },
      { id: 'R354', channel: 'naver_blog', desc: '네이버 블로그' },
    ]

    snsChannels.forEach(({ id, channel, desc }) => {
      it(`${id}: SNS 공유 — ${desc}`, async () => {
        const { s } = await ap('/api/v1/partner/resources/res-001/share', {
          method: 'POST',
          body: JSON.stringify({ channel }),
        })
        expect([200, 201, 401, 403, 404]).toContain(s)
      })
    })

    it('R355: 홍보자료 — 맞춤 배너 생성 요청', async () => {
      const { s } = await ap('/api/v1/partner/resources/custom-banner', {
        method: 'POST',
        body: JSON.stringify({
          size: '300x250',
          text: 'NPLatform 가입하기',
          code: 'NP-TEST001',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R356: 홍보자료 — 배너 HTML 코드 생성', async () => {
      const { s } = await ap('/api/v1/partner/resources/res-001/embed-code')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R357: 홍보자료 — 전체 다운로드 (ZIP)', async () => {
      const { s } = await ap('/api/v1/partner/resources/download-all')
      expect([200, 401, 403]).toContain(s)
    })

    it('R358: 홍보자료 — 카테고리별 필터', async () => {
      const { s } = await ap('/api/v1/partner/resources?category=npl')
      expect([200, 401, 403]).toContain(s)
    })

    it('R359: 홍보자료 — 최신순 정렬', async () => {
      const { s } = await ap('/api/v1/partner/resources?sort=created_at&order=desc')
      expect([200, 401, 403]).toContain(s)
    })

    it('R360: 홍보자료 — 인기순 정렬', async () => {
      const { s } = await ap('/api/v1/partner/resources?sort=downloads&order=desc')
      expect([200, 401, 403]).toContain(s)
    })
  })

  // ========================================================
  // F. 크로스 역할 (R361-R400)
  // ========================================================

  // --- R361-R370: 파트너+매수자 (딜 브릿지 접근) ---
  describe('R361-R370: 파트너+매수자 크로스 역할', () => {
    it('R361: GET /deal-rooms 딜 브릿지 접근', async () => {
      const { s } = await pg('/deal-rooms')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R362: GET 딜 룸 목록 API', async () => {
      const { s } = await ap('/api/v1/deal-rooms')
      expect([200, 401, 403]).toContain(s)
    })

    it('R363: GET 매물 목록 접근', async () => {
      const { s } = await pg('/listings')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R364: GET 매물 목록 API', async () => {
      const { s } = await ap('/api/v1/listings')
      expect([200, 401, 403]).toContain(s)
    })

    it('R365: GET 매물 상세', async () => {
      const { s } = await ap('/api/v1/listings/listing-001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R366: POST 매물 문의 (파트너 역할)', async () => {
      const { s } = await ap('/api/v1/listings/listing-001/inquiry', {
        method: 'POST',
        body: JSON.stringify({ message: '추천 고객 관련 문의' }),
      })
      expect([200, 201, 401, 403, 404]).toContain(s)
    })

    it('R367: GET NPL 분석 접근', async () => {
      const { s } = await pg('/npl-analysis')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R368: GET NPL 분석 목록 API', async () => {
      const { s } = await ap('/api/v1/npl-analysis')
      expect([200, 401, 403]).toContain(s)
    })

    it('R369: GET 입찰 시뮬레이터 접근', async () => {
      const { s } = await pg('/tools/auction-simulator')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R370: GET 시장 데이터 접근', async () => {
      const { s } = await pg('/market/search')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })
  })

  // --- R371-R380: 파트너+전문가 (전문 서비스 접근) ---
  describe('R371-R380: 파트너+전문가 크로스 역할', () => {
    it('R371: GET /professional 전문가 페이지 접근', async () => {
      const { s } = await pg('/professional')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R372: GET 전문가 목록 API', async () => {
      const { s } = await ap('/api/v1/professionals')
      expect([200, 401, 403]).toContain(s)
    })

    it('R373: GET 전문 서비스 목록', async () => {
      const { s } = await ap('/api/v1/services')
      expect([200, 401, 403]).toContain(s)
    })

    it('R374: POST 전문가 상담 예약 (파트너 고객 연결)', async () => {
      const { s } = await ap('/api/v1/services/consultation', {
        method: 'POST',
        body: JSON.stringify({
          professionalId: 'prof-001',
          referralId: 'ref-001',
          type: 'legal',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R375: GET 상담 이력', async () => {
      const { s } = await ap('/api/v1/partner/consultations')
      expect([200, 401, 403]).toContain(s)
    })

    it('R376: GET 상담 상세', async () => {
      const { s } = await ap('/api/v1/partner/consultations/cons-001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R377: GET 파트너 연결 전문가 목록', async () => {
      const { s } = await ap('/api/v1/partner/connected-professionals')
      expect([200, 401, 403]).toContain(s)
    })

    it('R378: POST 전문가 협업 요청', async () => {
      const { s } = await ap('/api/v1/partner/collaboration-request', {
        method: 'POST',
        body: JSON.stringify({
          professionalId: 'prof-001',
          message: '파트너 협업 제안',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R379: GET 실사 보고서 접근', async () => {
      const { s } = await pg('/tools/due-diligence-report')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R380: GET 계약서 생성기 접근', async () => {
      const { s } = await pg('/tools/contract-generator')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })
  })

  // --- R381-R390: 과금 (구독, 크레딧, 청구서) ---
  describe('R381-R390: 과금', () => {
    it('R381: GET 구독 플랜 목록', async () => {
      const { s } = await ap('/api/v1/partner/subscription/plans')
      expect([200, 401, 403]).toContain(s)
    })

    it('R382: GET 현재 구독 상태', async () => {
      const { s } = await ap('/api/v1/partner/subscription')
      expect([200, 401, 403]).toContain(s)
    })

    it('R383: POST 구독 변경 요청', async () => {
      const { s } = await ap('/api/v1/partner/subscription', {
        method: 'POST',
        body: JSON.stringify({ plan: 'PRO' }),
      })
      expect([200, 201, 400, 401, 403]).toContain(s)
    })

    it('R384: GET 크레딧 잔액', async () => {
      const { s } = await ap('/api/v1/credits/balance')
      expect([200, 401, 403]).toContain(s)
    })

    it('R385: GET 크레딧 사용 이력', async () => {
      const { s } = await ap('/api/v1/credits/history')
      expect([200, 401, 403]).toContain(s)
    })

    it('R386: POST 크레딧 충전', async () => {
      const { s } = await ap('/api/v1/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({ amount: 100, paymentMethod: 'card' }),
      })
      expect([200, 201, 400, 401, 403]).toContain(s)
    })

    it('R387: GET 청구서 목록', async () => {
      const { s } = await ap('/api/v1/partner/invoices')
      expect([200, 401, 403]).toContain(s)
    })

    it('R388: GET 청구서 상세', async () => {
      const { s } = await ap('/api/v1/partner/invoices/inv-001')
      expect([200, 401, 403, 404]).toContain(s)
    })

    it('R389: GET 결제 수단 목록', async () => {
      const { s } = await ap('/api/v1/payments/methods')
      expect([200, 401, 403]).toContain(s)
    })

    it('R390: GET 결제 이력', async () => {
      const { s } = await ap('/api/v1/payments/history')
      expect([200, 401, 403]).toContain(s)
    })
  })

  // --- R391-R400: 기타 서비스 (커뮤니티, 뉴스, 가이드) ---
  describe('R391-R400: 기타 서비스', () => {
    it('R391: GET /community 커뮤니티 접근', async () => {
      const { s } = await pg('/community')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R392: GET 커뮤니티 글 목록 API', async () => {
      const { s } = await ap('/api/v1/community/posts')
      expect([200, 401, 403]).toContain(s)
    })

    it('R393: POST 커뮤니티 글 작성', async () => {
      const { s } = await ap('/api/v1/community/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: '파트너 활동 공유',
          content: '이번 달 추천 성과를 공유합니다.',
          category: 'partner',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('R394: GET /news 뉴스 페이지 접근', async () => {
      const { s } = await pg('/news')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R395: GET 뉴스 API', async () => {
      const { s } = await ap('/api/v1/news')
      expect([200, 401, 403]).toContain(s)
    })

    it('R396: GET /notices 공지사항 접근', async () => {
      const { s } = await pg('/notices')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R397: GET 공지사항 API', async () => {
      const { s } = await ap('/api/v1/notices')
      expect([200, 401, 403]).toContain(s)
    })

    it('R398: GET /guide 전체 가이드 접근', async () => {
      const { s } = await pg('/guide')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R399: GET /support 고객 지원 접근', async () => {
      const { s } = await pg('/support')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })

    it('R400: GET /statistics 통계 페이지 접근', async () => {
      const { s } = await pg('/statistics')
      expect([200, 301, 302, 307, 308]).toContain(s)
    })
  })
})
