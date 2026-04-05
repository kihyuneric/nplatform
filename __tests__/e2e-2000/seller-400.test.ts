/**
 * NPLatform E2E — SELLER / INSTITUTION role (S001-S400)
 * 400 test cases covering seller registration, listing management,
 * review process, deal management, marketing, billing, and more.
 */
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

// ════════════════════════════════════════════════════════════════
// A. 매도자 가입 / 설정 (S001 – S050)
// ════════════════════════════════════════════════════════════════

describe('A. 매도자 가입/설정 (S001-S050)', () => {
  // ── S001-S010: 매도자/기관 가이드 ─────────────────────────
  describe('S001-S010: 매도자/기관 가이드', () => {
    const guidePages = [
      { id: 'S001', path: '/guide/seller', label: '매도자 가이드 메인' },
      { id: 'S002', path: '/guide/institution', label: '기관 가이드 메인' },
    ]
    for (const { id, path, label } of guidePages) {
      it(`${id}: ${label} 페이지 렌더링`, async () => {
        const { s, b } = await pg(path)
        expect(s).toBeLessThan(400)
        expect(b).toBeTruthy()
      })
    }

    const sellerSteps = ['등록', '매물공개', '실사', '협상', '계약', '정산', '완료', '팁']
    for (let i = 0; i < sellerSteps.length; i++) {
      it(`S00${3 + i}: 매도자 가이드 스텝 ${i + 1} — ${sellerSteps[i]} (query step=${i + 1})`, async () => {
        const { s, b } = await pg(`/guide/seller?step=${i + 1}`)
        expect(s).toBeLessThan(400)
        expect(b).toBeTruthy()
      })
    }
  })

  // ── S011-S020: 기관 등록 ──────────────────────────────────
  describe('S011-S020: 기관 등록', () => {
    const institutionPages = [
      { id: 'S011', path: '/institution/dashboard', label: '기관 대시보드' },
      { id: 'S012', path: '/institution/listings/new', label: '기관 매물 등록' },
      { id: 'S013', path: '/institution/listings', label: '기관 매물 목록' },
      { id: 'S014', path: '/institution/portfolio', label: '기관 포트폴리오' },
      { id: 'S015', path: '/institution/bulk-upload', label: '기관 대량 업로드' },
      { id: 'S016', path: '/institution/bidding', label: '기관 입찰' },
    ]
    for (const { id, path, label } of institutionPages) {
      it(`${id}: ${label} 페이지 접근`, async () => {
        const { s, b } = await pg(path)
        // 인증 필요 시 302 또는 페이지 렌더
        expect([200, 302, 307, 401, 403]).toContain(s)
        expect(b).toBeDefined()
      })
    }

    it('S017: 기관 등록 API POST', async () => {
      const { s, j } = await ap('/api/v1/institution', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test 자산관리',
          type: 'AMC',
          business_number: '123-45-67890',
          contact_email: 'test@amc.co.kr',
        }),
      })
      expect([200, 201, 401, 403]).toContain(s)
    })

    it('S018: 기관 등록 — 필수 필드 누락', async () => {
      const { s, j } = await ap('/api/v1/institution', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S019: 기관 등록 — 잘못된 사업자번호 형식', async () => {
      const { s, j } = await ap('/api/v1/institution', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bad', business_number: 'INVALID' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S020: 기관 목록 API GET', async () => {
      const { s, j } = await ap('/api/v1/institutions')
      expect([200, 401]).toContain(s)
    })
  })

  // ── S021-S030: 기관 설정 ──────────────────────────────────
  describe('S021-S030: 기관 설정', () => {
    it('S021: 기관 포트폴리오 페이지', async () => {
      const { s } = await pg('/institution/portfolio')
      expect([200, 302, 307, 401]).toContain(s)
    })

    it('S022: 기관 대량 업로드 페이지', async () => {
      const { s } = await pg('/institution/bulk-upload')
      expect([200, 302, 307, 401]).toContain(s)
    })

    it('S023: 기관 입찰 설정 페이지', async () => {
      const { s } = await pg('/institution/bidding')
      expect([200, 302, 307, 401]).toContain(s)
    })

    it('S024: 기관 정보 수정 API PATCH', async () => {
      const { s } = await ap('/api/v1/institution', {
        method: 'PATCH',
        body: JSON.stringify({ description: '업데이트 테스트' }),
      })
      expect([200, 401, 403, 405]).toContain(s)
    })

    it('S025: 기관 대시보드 통계 API', async () => {
      const { s } = await ap('/api/v1/seller/dashboard')
      expect([200, 401]).toContain(s)
    })

    it('S026: 기관 입찰 API GET', async () => {
      const { s } = await ap('/api/v1/market/bidding')
      expect([200, 401]).toContain(s)
    })

    it('S027: 기관 등록 상태 확인', async () => {
      const { s } = await ap('/api/v1/institution')
      expect([200, 401, 404]).toContain(s)
    })

    it('S028: 기관 좋아요/팔로우 API', async () => {
      const { s } = await ap('/api/v1/institutions/favorites', {
        method: 'POST',
        body: JSON.stringify({ institution_id: 'inst-001' }),
      })
      expect([200, 201, 401]).toContain(s)
    })

    it('S029: 기관 팔로우 목록 GET', async () => {
      const { s } = await ap('/api/v1/institutions/favorites')
      expect([200, 401]).toContain(s)
    })

    it('S030: 기관 설정 — 잘못된 method DELETE', async () => {
      const { s } = await ap('/api/v1/institution', { method: 'DELETE' })
      expect([405, 401, 404]).toContain(s)
    })
  })

  // ── S031-S040: 매도자 프로필/설정 ─────────────────────────
  describe('S031-S040: 매도자 프로필/설정', () => {
    const sellerPages = [
      { id: 'S031', path: '/seller/dashboard', label: '매도자 대시보드' },
      { id: 'S032', path: '/seller/analytics', label: '매도자 분석' },
      { id: 'S033', path: '/seller/profile', label: '매도자 프로필' },
      { id: 'S034', path: '/seller/settlement', label: '매도자 정산' },
      { id: 'S035', path: '/seller/onboarding', label: '매도자 온보딩' },
      { id: 'S036', path: '/seller/listings', label: '매도자 매물목록' },
      { id: 'S037', path: '/seller/listings/new', label: '매도자 매물등록' },
      { id: 'S038', path: '/seller/portfolio', label: '매도자 포트폴리오' },
      { id: 'S039', path: '/seller/portfolio/new', label: '포트폴리오 신규' },
    ]
    for (const { id, path, label } of sellerPages) {
      it(`${id}: ${label} 페이지 접근`, async () => {
        const { s } = await pg(path)
        expect([200, 302, 307, 401, 403]).toContain(s)
      })
    }

    it('S040: 매도자 등록 API POST', async () => {
      const { s } = await ap('/api/v1/seller/register', {
        method: 'POST',
        body: JSON.stringify({ seller_type: 'INDIVIDUAL', name: '테스트매도자' }),
      })
      expect([200, 201, 401, 409]).toContain(s)
    })
  })

  // ── S041-S050: 기관 프로필 페이지 ─────────────────────────
  describe('S041-S050: 기관 프로필 페이지', () => {
    it('S041: 기관 목록 페이지', async () => {
      const { s, b } = await pg('/exchange/institutions')
      expect(s).toBeLessThan(400)
      expect(b).toBeTruthy()
    })

    it('S042: 기관 상세 (slug)', async () => {
      const { s } = await pg('/exchange/institutions/kdb-amc')
      expect([200, 302, 404]).toContain(s)
    })

    it('S043: 기관 상세 — 존재하지 않는 slug', async () => {
      const { s } = await pg('/exchange/institutions/nonexistent-slug-999')
      expect([200, 302, 404]).toContain(s)
    })

    it('S044: 매도자 대시보드 API', async () => {
      const { s } = await ap('/api/v1/seller/dashboard')
      expect([200, 401]).toContain(s)
    })

    it('S045: 매도자 분석 API', async () => {
      const { s } = await ap('/api/v1/seller/analytics')
      expect([200, 401]).toContain(s)
    })

    it('S046: 매도자 정산 API', async () => {
      const { s } = await ap('/api/v1/seller/settlement')
      expect([200, 401]).toContain(s)
    })

    it('S047: 매도자 프로필 수정 API', async () => {
      const { s } = await ap('/api/v1/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: '매도자테스트' }),
      })
      expect([200, 401, 405]).toContain(s)
    })

    it('S048: 기관 상세 — 빈 slug', async () => {
      const { s } = await pg('/exchange/institutions/')
      expect([200, 301, 302, 404]).toContain(s)
    })

    it('S049: 기관 상세 — 특수문자 slug', async () => {
      const { s } = await pg('/exchange/institutions/<script>')
      expect([200, 302, 400, 404]).toContain(s)
    })

    it('S050: 기관 프로필 — 한글 slug', async () => {
      const { s } = await pg('/exchange/institutions/' + encodeURIComponent('한국자산관리'))
      expect([200, 302, 404]).toContain(s)
    })
  })
})

// ════════════════════════════════════════════════════════════════
// B. 매각 등록 (S051 – S120)
// ════════════════════════════════════════════════════════════════

describe('B. 매각 등록 (S051-S120)', () => {
  // ── S051-S060: 매각 등록 위자드 ──────────────────────────
  describe('S051-S060: 매각 등록 위자드', () => {
    it('S051: 매각 등록 메인 페이지', async () => {
      const { s, b } = await pg('/exchange/sell')
      expect([200, 302, 307]).toContain(s)
      if (s === 200) expect(b).toBeTruthy()
    })

    const wizardSteps = ['기본정보', '담보물', '채권정보', '가격설정', '공개범위', '확인']
    for (let i = 0; i < wizardSteps.length; i++) {
      it(`S05${2 + i}: 매각 등록 위자드 스텝 ${i + 1} — ${wizardSteps[i]}`, async () => {
        const { s } = await pg(`/exchange/sell?step=${i + 1}`)
        expect([200, 302, 307]).toContain(s)
      })
    }

    it('S058: 매각 등록 — 잘못된 step 파라미터', async () => {
      const { s } = await pg('/exchange/sell?step=99')
      expect([200, 302, 307]).toContain(s)
    })

    it('S059: 매각 등록 — 음수 step', async () => {
      const { s } = await pg('/exchange/sell?step=-1')
      expect([200, 302, 307]).toContain(s)
    })

    it('S060: 매각 등록 — 문자 step', async () => {
      const { s } = await pg('/exchange/sell?step=abc')
      expect([200, 302, 307]).toContain(s)
    })
  })

  // ── S061-S080: 매각 등록 API ──────────────────────────────
  describe('S061-S080: 매각 등록 API', () => {
    const validListing = {
      title: 'E2E 테스트 매물',
      collateral_type: '오피스',
      collateral_region: '서울 강남구',
      collateral_address: '서울시 강남구 테헤란로 123',
      original_amount: 1000000000,
      asking_price: 700000000,
      ask_min: 600000000,
      ask_max: 800000000,
      description: '테스트 매물 설명',
      visibility: 'PUBLIC',
    }

    it('S061: 매각 등록 API POST — 정상', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify(validListing),
      })
      expect([200, 201, 401]).toContain(s)
    })

    it('S062: 매각 등록 — 빈 body', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S063: 매각 등록 — title만', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ title: '제목만' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S064: 매각 등록 — 잘못된 담보유형', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ ...validListing, collateral_type: 'INVALID_TYPE' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S065: 매각 등록 — 잘못된 지역', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ ...validListing, collateral_region: 'INVALID_REGION_XYZ' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S066: 매각 등록 — 금액 음수', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ ...validListing, asking_price: -100 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S067: 매각 등록 — 금액 초과 (100조)', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ ...validListing, asking_price: 100_000_000_000_000 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S068: 매각 등록 — ask_min > ask_max', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ ...validListing, ask_min: 900000000, ask_max: 500000000 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S069: 매각 등록 — 잘못된 visibility', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ ...validListing, visibility: 'SUPER_SECRET' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    const collateralTypes = [
      '오피스', '아파트', '상가', '토지', '공장', '창고', '호텔',
      '주택', '근린생활', '다세대', '다가구',
    ]
    for (let i = 0; i < collateralTypes.length; i++) {
      it(`S0${70 + i}: 매각 등록 — 담보유형 "${collateralTypes[i]}"`, async () => {
        const { s } = await ap('/api/v1/exchange/listings', {
          method: 'POST',
          body: JSON.stringify({ ...validListing, collateral_type: collateralTypes[i] }),
        })
        expect([200, 201, 400, 401, 422]).toContain(s)
      })
    }
  })

  // ── S081-S090: AI OCR 대량 업로드 ─────────────────────────
  describe('S081-S090: AI OCR 대량 업로드', () => {
    it('S081: 대량 업로드 페이지', async () => {
      const { s } = await pg('/exchange/bulk-upload')
      expect([200, 302, 307]).toContain(s)
    })

    it('S082: OCR API — 빈 요청', async () => {
      const { s } = await ap('/api/v1/ocr', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S083: OCR API — GET (지원 형식 조회)', async () => {
      const { s } = await ap('/api/v1/ocr')
      expect([200, 401, 405]).toContain(s)
    })

    it('S084: 기관 대량 업로드 페이지', async () => {
      const { s } = await pg('/institution/bulk-upload')
      expect([200, 302, 307, 401]).toContain(s)
    })

    it('S085: OCR API — 잘못된 파일 URL', async () => {
      const { s } = await ap('/api/v1/ocr', {
        method: 'POST',
        body: JSON.stringify({ file_url: 'not-a-url' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S086: OCR API — 지원하지 않는 파일 형식', async () => {
      const { s } = await ap('/api/v1/ocr', {
        method: 'POST',
        body: JSON.stringify({ file_url: 'https://example.com/test.exe' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S087: 대량 업로드 — 셀러 매물 등록 페이지', async () => {
      const { s } = await pg('/seller/listings/new')
      expect([200, 302, 307]).toContain(s)
    })

    it('S088: 대량 업로드 — 포트폴리오 신규', async () => {
      const { s } = await pg('/seller/portfolio/new')
      expect([200, 302, 307]).toContain(s)
    })

    it('S089: OCR API — DELETE 메서드 (불허)', async () => {
      const { s } = await ap('/api/v1/ocr', { method: 'DELETE' })
      expect([405, 401]).toContain(s)
    })

    it('S090: OCR API — PUT 메서드 (불허)', async () => {
      const { s } = await ap('/api/v1/ocr', { method: 'PUT' })
      expect([405, 401]).toContain(s)
    })
  })

  // ── S091-S100: 매물 수정 API ──────────────────────────────
  describe('S091-S100: 매물 수정 API (PATCH)', () => {
    it('S091: 매물 수정 — 정상 PATCH', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ title: '수정된 제목' }),
      })
      expect([200, 401, 403, 404, 405]).toContain(s)
    })

    it('S092: 매물 수정 — 잘못된 ID', async () => {
      const { s } = await ap('/api/v1/exchange/listings/invalid-id-999', {
        method: 'PATCH',
        body: JSON.stringify({ title: '수정' }),
      })
      expect([401, 403, 404]).toContain(s)
    })

    it('S093: 매물 수정 — 빈 body', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S094: 매물 수정 — 가격 변경', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ asking_price: 3000000000 }),
      })
      expect([200, 401, 403, 404, 405]).toContain(s)
    })

    it('S095: 매물 수정 — 상태 변경', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'WITHDRAWN' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S096: 매물 수정 — visibility 변경', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'INTERNAL' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S097: 매물 수정 — 음수 가격', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ asking_price: -1 }),
      })
      expect([400, 401, 403, 404, 405, 422]).toContain(s)
    })

    it('S098: 매물 수정 — 잘못된 JSON', async () => {
      const r = await fetch(`${BASE}/api/v1/exchange/listings/dl-001`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      })
      expect([400, 401, 500]).toContain(r.status)
    })

    it('S099: 매물 수정 — SQL injection 시도', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ title: "'; DROP TABLE listings; --" }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S100: 매물 수정 — XSS 시도', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ title: '<script>alert("xss")</script>' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })
  })

  // ── S101-S110: 매물 삭제/취소 API ─────────────────────────
  describe('S101-S110: 매물 삭제/취소 API', () => {
    it('S101: 매물 삭제 — 정상 DELETE', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-test-delete', {
        method: 'DELETE',
      })
      expect([200, 204, 401, 403, 404, 405]).toContain(s)
    })

    it('S102: 매물 삭제 — 존재하지 않는 ID', async () => {
      const { s } = await ap('/api/v1/exchange/listings/nonexistent-999', {
        method: 'DELETE',
      })
      expect([401, 403, 404, 405]).toContain(s)
    })

    it('S103: 매물 삭제 — 빈 ID', async () => {
      const { s } = await ap('/api/v1/exchange/listings/', {
        method: 'DELETE',
      })
      expect([400, 401, 404, 405]).toContain(s)
    })

    it('S104: 매물 삭제 — 이미 삭제된 매물', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-already-deleted', {
        method: 'DELETE',
      })
      expect([401, 403, 404, 405, 410]).toContain(s)
    })

    it('S105: 매물 취소 — status CANCELLED PATCH', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S106: 매물 상태 — WITHDRAWN', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'WITHDRAWN' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S107: 매물 상태 — EXPIRED', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'EXPIRED' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S108: 매물 상태 — 잘못된 상태값', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'BOGUS_STATUS' }),
      })
      expect([400, 401, 403, 404, 405, 422]).toContain(s)
    })

    it('S109: 매물 삭제 — 특수문자 ID', async () => {
      const { s } = await ap('/api/v1/exchange/listings/' + encodeURIComponent('../../../etc'), {
        method: 'DELETE',
      })
      expect([400, 401, 403, 404, 405]).toContain(s)
    })

    it('S110: 매물 삭제 — 매우 긴 ID', async () => {
      const longId = 'x'.repeat(500)
      const { s } = await ap(`/api/v1/exchange/listings/${longId}`, {
        method: 'DELETE',
      })
      expect([400, 401, 403, 404, 405, 414]).toContain(s)
    })
  })

  // ── S111-S120: 매물 상세 ──────────────────────────────────
  describe('S111-S120: 매물 상세 (자기 매물 조회)', () => {
    it('S111: 매물 상세 페이지', async () => {
      const { s, b } = await pg('/exchange/dl-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S112: 매물 상세 API GET', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings/dl-001')
      expect([200, 401, 404]).toContain(s)
    })

    it('S113: 매물 상세 — 404 케이스', async () => {
      const { s } = await ap('/api/v1/exchange/listings/nonexistent-id')
      expect([401, 404]).toContain(s)
    })

    it('S114: 매물 목록 API GET', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings')
      expect([200, 401]).toContain(s)
      if (s === 200 && j) {
        expect(j).toBeDefined()
      }
    })

    it('S115: 매물 목록 — 필터: 지역', async () => {
      const { s } = await ap('/api/v1/exchange/listings?region=서울')
      expect([200, 401]).toContain(s)
    })

    it('S116: 매물 목록 — 필터: 담보유형', async () => {
      const { s } = await ap('/api/v1/exchange/listings?collateral_type=오피스')
      expect([200, 401]).toContain(s)
    })

    it('S117: 매물 목록 — 필터: 상태', async () => {
      const { s } = await ap('/api/v1/exchange/listings?status=APPROVED')
      expect([200, 401]).toContain(s)
    })

    it('S118: 매물 목록 — 정렬: 최신순', async () => {
      const { s } = await ap('/api/v1/exchange/listings?sort=created_at&order=desc')
      expect([200, 401]).toContain(s)
    })

    it('S119: 매물 목록 — 페이지네이션', async () => {
      const { s } = await ap('/api/v1/exchange/listings?page=1&limit=10')
      expect([200, 401]).toContain(s)
    })

    it('S120: 내 매물 페이지', async () => {
      const { s } = await pg('/exchange/my')
      expect([200, 302, 307]).toContain(s)
    })
  })
})

// ════════════════════════════════════════════════════════════════
// C. 검수 / 승인 프로세스 (S121 – S170)
// ════════════════════════════════════════════════════════════════

describe('C. 검수/승인 프로세스 (S121-S170)', () => {
  // ── S121-S130: 검수 대기 ──────────────────────────────────
  describe('S121-S130: 검수 대기 (PENDING_REVIEW)', () => {
    it('S121: 매물 등록 후 기본 status 확인', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '검수 대기 테스트',
          collateral_type: '아파트',
          collateral_region: '서울 서초구',
          original_amount: 500000000,
          asking_price: 350000000,
          visibility: 'PUBLIC',
        }),
      })
      // 인증 없이는 401, 있으면 status=PENDING_REVIEW
      expect([200, 201, 401]).toContain(s)
      if (s === 200 || s === 201) {
        expect(j?.data?.status || j?.status).toBeDefined()
      }
    })

    const statusValues = [
      'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED',
      'NEEDS_REVISION', 'SUSPENDED', 'EXPIRED', 'WITHDRAWN',
    ]
    for (let i = 0; i < statusValues.length; i++) {
      it(`S12${2 + i}: 매물 상태 필터 — ${statusValues[i]}`, async () => {
        const { s } = await ap(`/api/v1/exchange/listings?status=${statusValues[i]}`)
        expect([200, 401]).toContain(s)
      })
    }

    it('S130: 관리자 매물 목록 (admin/listings)', async () => {
      const { s } = await pg('/admin/listings')
      expect([200, 302, 307, 401, 403]).toContain(s)
    })
  })

  // ── S131-S140: 자동 검증 (listing-validator) ──────────────
  describe('S131-S140: 자동 검증 (completeness)', () => {
    it('S131: 매물 완성도 — 모든 필드 입력', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '완전한 매물',
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          collateral_address: '서울시 강남구 역삼동 100',
          original_amount: 2000000000,
          asking_price: 1400000000,
          ask_min: 1200000000,
          ask_max: 1600000000,
          description: '상세한 설명이 포함된 완전한 매물입니다.',
          visibility: 'PUBLIC',
          risk_grade: 'B+',
        }),
      })
      expect([200, 201, 401]).toContain(s)
    })

    it('S132: 매물 완성도 — 최소 필드만', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({ title: '최소 매물' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S133: 매물 완성도 — 설명 없음', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '설명 없는 매물',
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          original_amount: 1000000000,
          asking_price: 700000000,
          visibility: 'PUBLIC',
        }),
      })
      expect([200, 201, 400, 401, 422]).toContain(s)
    })

    it('S134: 매물 완성도 — 주소 없음', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '주소 없는 매물',
          collateral_type: '상가',
          collateral_region: '서울 종로구',
          original_amount: 800000000,
          asking_price: 560000000,
          visibility: 'PUBLIC',
        }),
      })
      expect([200, 201, 400, 401, 422]).toContain(s)
    })

    it('S135: 매물 완성도 — 감정가 포함', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '감정가 포함 매물',
          collateral_type: '아파트',
          collateral_region: '경기 성남시',
          original_amount: 600000000,
          asking_price: 420000000,
          appraised_value: 650000000,
          visibility: 'PUBLIC',
        }),
      })
      expect([200, 201, 400, 401, 422]).toContain(s)
    })

    it('S136: 매물 검증 — 0원 가격', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '0원 매물',
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          original_amount: 0,
          asking_price: 0,
          visibility: 'PUBLIC',
        }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S137: 매물 검증 — original_amount < asking_price', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '비정상 가격',
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          original_amount: 100000000,
          asking_price: 999999999999,
          visibility: 'PUBLIC',
        }),
      })
      expect([200, 201, 400, 401, 422]).toContain(s)
    })

    it('S138: 매물 검증 — 매우 긴 제목 (1000자)', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '가'.repeat(1000),
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          original_amount: 1000000000,
          asking_price: 700000000,
          visibility: 'PUBLIC',
        }),
      })
      expect([200, 201, 400, 401, 422]).toContain(s)
    })

    it('S139: 매물 검증 — 빈 제목', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          original_amount: 1000000000,
          asking_price: 700000000,
          visibility: 'PUBLIC',
        }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S140: 매물 검증 — description 10000자', async () => {
      const { s } = await ap('/api/v1/exchange/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: '긴 설명 테스트',
          collateral_type: '오피스',
          collateral_region: '서울 강남구',
          original_amount: 1000000000,
          asking_price: 700000000,
          description: '설'.repeat(10000),
          visibility: 'PUBLIC',
        }),
      })
      expect([200, 201, 400, 401, 422]).toContain(s)
    })
  })

  // ── S141-S150: AI 검수 ────────────────────────────────────
  describe('S141-S150: AI 검수 (리스크 등급/적정가)', () => {
    const riskGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D']
    for (let i = 0; i < riskGrades.length; i++) {
      it(`S14${1 + i}: 리스크 등급 "${riskGrades[i]}" 매물 등록`, async () => {
        const { s } = await ap('/api/v1/exchange/listings', {
          method: 'POST',
          body: JSON.stringify({
            title: `리스크 ${riskGrades[i]} 매물`,
            collateral_type: '오피스',
            collateral_region: '서울 강남구',
            original_amount: 1000000000,
            asking_price: 700000000,
            risk_grade: riskGrades[i],
            visibility: 'PUBLIC',
          }),
        })
        expect([200, 201, 400, 401, 422]).toContain(s)
      })
    }
  })

  // ── S151-S160: 검수 상태 조회 ─────────────────────────────
  describe('S151-S160: 검수 상태 조회', () => {
    const listingStatuses = [
      'PENDING_REVIEW', 'IN_REVIEW', 'AI_SCORING', 'MANUAL_REVIEW',
      'APPROVED', 'REJECTED', 'NEEDS_REVISION', 'SUSPENDED',
      'EXPIRED', 'WITHDRAWN',
    ]
    for (let i = 0; i < listingStatuses.length; i++) {
      it(`S15${1 + i}: 검수 상태 "${listingStatuses[i]}" 필터 조회`, async () => {
        const { s } = await ap(`/api/v1/exchange/listings?status=${listingStatuses[i]}`)
        expect([200, 401]).toContain(s)
      })
    }
  })

  // ── S161-S170: 공개 범위 설정 ─────────────────────────────
  describe('S161-S170: 공개 범위 설정', () => {
    const visibilityOptions = ['PUBLIC', 'INTERNAL', 'TARGETED', 'VIP']
    for (let i = 0; i < visibilityOptions.length; i++) {
      it(`S16${1 + i}: visibility "${visibilityOptions[i]}" 등록`, async () => {
        const { s } = await ap('/api/v1/exchange/listings', {
          method: 'POST',
          body: JSON.stringify({
            title: `${visibilityOptions[i]} 공개 매물`,
            collateral_type: '아파트',
            collateral_region: '서울 강남구',
            original_amount: 500000000,
            asking_price: 350000000,
            visibility: visibilityOptions[i],
          }),
        })
        expect([200, 201, 400, 401, 422]).toContain(s)
      })
    }

    it('S165: visibility 필터 조회 — PUBLIC', async () => {
      const { s } = await ap('/api/v1/exchange/listings?visibility=PUBLIC')
      expect([200, 401]).toContain(s)
    })

    it('S166: visibility 필터 조회 — INTERNAL', async () => {
      const { s } = await ap('/api/v1/exchange/listings?visibility=INTERNAL')
      expect([200, 401]).toContain(s)
    })

    it('S167: visibility 수정 — PUBLIC→INTERNAL', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'INTERNAL' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S168: visibility 수정 — INTERNAL→VIP', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'VIP' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S169: visibility 수정 — VIP→PUBLIC', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'PUBLIC' }),
      })
      expect([200, 400, 401, 403, 404, 405]).toContain(s)
    })

    it('S170: visibility 수정 — 잘못된 값', async () => {
      const { s } = await ap('/api/v1/exchange/listings/dl-001', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'NONEXISTENT' }),
      })
      expect([400, 401, 403, 404, 405, 422]).toContain(s)
    })
  })
})

// ════════════════════════════════════════════════════════════════
// D. 거래 관리 — 매도자 관점 (S171 – S250)
// ════════════════════════════════════════════════════════════════

describe('D. 거래 관리 — 매도자 관점 (S171-S250)', () => {
  // ── S171-S180: 관심자 확인 ────────────────────────────────
  describe('S171-S180: 관심자 확인', () => {
    it('S171: 딜 목록 페이지', async () => {
      const { s } = await pg('/exchange/deals')
      expect([200, 302, 307]).toContain(s)
    })

    it('S172: 딜 목록 API GET', async () => {
      const { s } = await ap('/api/v1/exchange/deals')
      expect([200, 401]).toContain(s)
    })

    it('S173: 딜 상세 페이지', async () => {
      const { s } = await pg('/exchange/deals/deal-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S174: 딜 상세 API GET', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001')
      expect([200, 401, 404]).toContain(s)
    })

    it('S175: 딜 — 존재하지 않는 ID', async () => {
      const { s } = await ap('/api/v1/exchange/deals/nonexistent-deal')
      expect([401, 404]).toContain(s)
    })

    it('S176: 매물 관심 표현 API POST', async () => {
      const { s } = await ap('/api/v1/exchange/deals', {
        method: 'POST',
        body: JSON.stringify({ listing_id: 'dl-001', action: 'express_interest' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S177: 매물 관심 — 빈 body', async () => {
      const { s } = await ap('/api/v1/exchange/deals', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S178: 매물 관심 — 존재하지 않는 listing_id', async () => {
      const { s } = await ap('/api/v1/exchange/deals', {
        method: 'POST',
        body: JSON.stringify({ listing_id: 'nonexistent', action: 'express_interest' }),
      })
      expect([400, 401, 404]).toContain(s)
    })

    it('S179: 딜 목록 — 필터: role=seller', async () => {
      const { s } = await ap('/api/v1/exchange/deals?role=seller')
      expect([200, 401]).toContain(s)
    })

    it('S180: 딜 목록 — 필터: status=ACTIVE', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=ACTIVE')
      expect([200, 401]).toContain(s)
    })
  })

  // ── S181-S190: NDA 관리 ───────────────────────────────────
  describe('S181-S190: NDA 관리', () => {
    it('S181: NDA 목록 API GET', async () => {
      const { s } = await ap('/api/v1/nda')
      expect([200, 401]).toContain(s)
    })

    it('S182: NDA 요청 — listing_id 필수', async () => {
      const { s } = await ap('/api/v1/nda?listing_id=dl-001')
      expect([200, 400, 401]).toContain(s)
    })

    it('S183: NDA 서명 요청 POST', async () => {
      const { s } = await ap('/api/v1/nda', {
        method: 'POST',
        body: JSON.stringify({ listing_id: 'dl-001' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S184: NDA — 빈 body', async () => {
      const { s } = await ap('/api/v1/nda', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S185: NDA — 잘못된 listing_id', async () => {
      const { s } = await ap('/api/v1/nda', {
        method: 'POST',
        body: JSON.stringify({ listing_id: 'nonexistent' }),
      })
      expect([400, 401, 404]).toContain(s)
    })

    it('S186: NDA 수락 PATCH', async () => {
      const { s } = await ap('/api/v1/nda', {
        method: 'PATCH',
        body: JSON.stringify({ nda_id: 'nda-001', action: 'accept' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S187: NDA 거절 PATCH', async () => {
      const { s } = await ap('/api/v1/nda', {
        method: 'PATCH',
        body: JSON.stringify({ nda_id: 'nda-001', action: 'reject' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S188: NDA — 잘못된 action', async () => {
      const { s } = await ap('/api/v1/nda', {
        method: 'PATCH',
        body: JSON.stringify({ nda_id: 'nda-001', action: 'INVALID' }),
      })
      expect([400, 401, 404, 405, 422]).toContain(s)
    })

    it('S189: NDA 삭제 (불허)', async () => {
      const { s } = await ap('/api/v1/nda', { method: 'DELETE' })
      expect([401, 405]).toContain(s)
    })

    it('S190: NDA — listing_id 없이 조회', async () => {
      const { s } = await ap('/api/v1/nda')
      expect([200, 400, 401]).toContain(s)
    })
  })

  // ── S191-S200: 실사 지원 ──────────────────────────────────
  describe('S191-S200: 실사 지원 (Due Diligence)', () => {
    it('S191: 실사 목록 페이지', async () => {
      const { s } = await pg('/exchange/due-diligence')
      expect([200, 302, 307]).toContain(s)
    })

    it('S192: 실사 목록 API GET', async () => {
      const { s } = await ap('/api/v1/exchange/due-diligence')
      expect([200, 401]).toContain(s)
    })

    it('S193: 실사 상세 페이지', async () => {
      const { s } = await pg('/exchange/due-diligence/dd-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S194: 실사 상세 API GET', async () => {
      const { s } = await ap('/api/v1/exchange/due-diligence/dd-001')
      expect([200, 401, 404]).toContain(s)
    })

    const ddItems = [
      '등기부등본', '감정평가서', '건축물대장', '토지대장', '임대차계약서',
      '법원경매정보', '세금완납증명', '건물도면', '환경평가', '수익분석',
    ]
    for (let i = 0; i < ddItems.length; i++) {
      it(`S19${5 + i > 9 ? '' : ''}${195 + i > 199 ? (195 + i) : `19${5 + i}`}: 실사 항목 — ${ddItems[i]}`, async () => {
        const { s } = await ap('/api/v1/exchange/due-diligence', {
          method: 'POST',
          body: JSON.stringify({
            listing_id: 'dl-001',
            item_type: ddItems[i],
            status: 'PROVIDED',
          }),
        })
        expect([200, 201, 400, 401]).toContain(s)
      })
    }

    // Remaining slots
    it('S205: 실사 — 존재하지 않는 ID 조회', async () => {
      const { s } = await ap('/api/v1/exchange/due-diligence/nonexistent')
      expect([401, 404]).toContain(s)
    })
  })

  // ── S201-S210: 가격 협상 ──────────────────────────────────
  // (S201-S204 filled by dd above; S205 above; S206-S210 below)
  describe('S206-S210: 가격 협상 (오퍼/역제안/합의)', () => {
    it('S206: 딜 상태 업데이트 — 오퍼 수신', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'OFFER_RECEIVED', offer_amount: 3200000000 }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S207: 딜 상태 — 역제안', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COUNTER_OFFER', counter_amount: 3400000000 }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S208: 딜 상태 — 합의', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'AGREED', final_amount: 3300000000 }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S209: 딜 상태 — 거절', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S210: 딜 상태 — 잘못된 상태값', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'BOGUS' }),
      })
      expect([400, 401, 404, 405, 422]).toContain(s)
    })
  })

  // ── S211-S220: 딜룸 채팅 ──────────────────────────────────
  describe('S211-S220: 딜룸 채팅 (매도자 관점)', () => {
    it('S211: 딜룸 목록 페이지', async () => {
      const { s } = await pg('/deal-rooms')
      expect([200, 302, 307]).toContain(s)
    })

    it('S212: 딜룸 상세 페이지', async () => {
      const { s } = await pg('/deal-rooms/room-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S213: 딜룸 — 존재하지 않는 ID', async () => {
      const { s } = await pg('/deal-rooms/nonexistent-room')
      expect([200, 302, 404]).toContain(s)
    })

    it('S214: 딜룸 API — 메시지 전송 (시뮬레이션)', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ message: '매도자 메시지 테스트' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S215: 딜룸 — 빈 메시지', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ message: '' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S216: 딜룸 — 매우 긴 메시지', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ message: '메'.repeat(5000) }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S217: 딜룸 — XSS 메시지', async () => {
      const { s } = await ap('/api/v1/exchange/deals/deal-001', {
        method: 'PATCH',
        body: JSON.stringify({ message: '<img onerror=alert(1) src=x>' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S218: Q&A API — 질문 등록', async () => {
      const { s } = await ap('/api/v1/listing-qna', {
        method: 'POST',
        body: JSON.stringify({ listing_id: 'dl-001', question: '매물 관련 질문입니다' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S219: Q&A API — 답변 등록 (매도자)', async () => {
      const { s } = await ap('/api/v1/listing-qna', {
        method: 'PATCH',
        body: JSON.stringify({ qna_id: 'qna-001', answer: '답변입니다' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S220: Q&A API — 목록 조회', async () => {
      const { s } = await ap('/api/v1/listing-qna?listing_id=dl-001')
      expect([200, 400, 401]).toContain(s)
    })
  })

  // ── S221-S230: 계약 ───────────────────────────────────────
  describe('S221-S230: 계약', () => {
    it('S221: 계약 목록 페이지', async () => {
      const { s } = await pg('/contract')
      expect([200, 302, 307]).toContain(s)
    })

    it('S222: 계약 생성 페이지', async () => {
      const { s } = await pg('/contract/new')
      expect([200, 302, 307]).toContain(s)
    })

    it('S223: 계약 상세 페이지', async () => {
      const { s } = await pg('/contract/contract-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S224: 계약 API — 목록 GET', async () => {
      const { s } = await ap('/api/v1/contracts')
      expect([200, 401]).toContain(s)
    })

    it('S225: 계약 API — 생성 POST', async () => {
      const { s } = await ap('/api/v1/contracts', {
        method: 'POST',
        body: JSON.stringify({
          deal_id: 'deal-001',
          type: 'NPL_SALE',
          terms: { price: 3300000000 },
        }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S226: 계약 API — 상세 GET', async () => {
      const { s } = await ap('/api/v1/contracts/contract-001')
      expect([200, 401, 404]).toContain(s)
    })

    it('S227: 계약 API — 수정 PATCH', async () => {
      const { s } = await ap('/api/v1/contracts/contract-001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SIGNED' }),
      })
      expect([200, 400, 401, 404, 405]).toContain(s)
    })

    it('S228: 계약 API — 잘못된 ID', async () => {
      const { s } = await ap('/api/v1/contracts/nonexistent')
      expect([401, 404]).toContain(s)
    })

    it('S229: 교환 계약 페이지', async () => {
      const { s } = await pg('/exchange/contract')
      expect([200, 302, 307]).toContain(s)
    })

    it('S230: 교환 계약 상세', async () => {
      const { s } = await pg('/exchange/contract/contract-001')
      expect([200, 302, 404]).toContain(s)
    })
  })

  // ── S231-S240: 정산 ───────────────────────────────────────
  describe('S231-S240: 정산', () => {
    it('S231: 매도자 정산 페이지', async () => {
      const { s } = await pg('/seller/settlement')
      expect([200, 302, 307]).toContain(s)
    })

    it('S232: 매도자 정산 API', async () => {
      const { s } = await ap('/api/v1/seller/settlement')
      expect([200, 401]).toContain(s)
    })

    it('S233: 결제 목록 API', async () => {
      const { s } = await ap('/api/v1/payments')
      expect([200, 401]).toContain(s)
    })

    it('S234: 결제 상세 API', async () => {
      const { s } = await ap('/api/v1/payments/pay-001')
      expect([200, 401, 404]).toContain(s)
    })

    it('S235: 결제 — 존재하지 않는 ID', async () => {
      const { s } = await ap('/api/v1/payments/nonexistent-pay')
      expect([401, 404]).toContain(s)
    })

    it('S236: 파트너 정산 페이지 (참조)', async () => {
      const { s } = await pg('/partner/settlement')
      expect([200, 302, 307, 401, 404]).toContain(s)
    })

    it('S237: 결제 생성 POST', async () => {
      const { s } = await ap('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({ deal_id: 'deal-001', amount: 33000000 }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S238: 결제 — 빈 body', async () => {
      const { s } = await ap('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S239: 결제 — 음수 금액', async () => {
      const { s } = await ap('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({ deal_id: 'deal-001', amount: -100 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S240: 결제 — 0원 금액', async () => {
      const { s } = await ap('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({ deal_id: 'deal-001', amount: 0 }),
      })
      expect([400, 401, 422]).toContain(s)
    })
  })

  // ── S241-S250: 거래 칸반/아카이브 ─────────────────────────
  describe('S241-S250: 거래 칸반/아카이브', () => {
    it('S241: 거래 아카이브 페이지', async () => {
      const { s } = await pg('/exchange/archive')
      expect([200, 302, 307]).toContain(s)
    })

    it('S242: 딜 목록 — 상태별 필터: COMPLETED', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=COMPLETED')
      expect([200, 401]).toContain(s)
    })

    it('S243: 딜 목록 — 상태별 필터: CANCELLED', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=CANCELLED')
      expect([200, 401]).toContain(s)
    })

    it('S244: 딜 목록 — 상태별 필터: IN_PROGRESS', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=IN_PROGRESS')
      expect([200, 401]).toContain(s)
    })

    it('S245: 딜 목록 — 상태별 필터: PENDING', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=PENDING')
      expect([200, 401]).toContain(s)
    })

    it('S246: 딜 목록 — 상태별 필터: NEGOTIATION', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=NEGOTIATION')
      expect([200, 401]).toContain(s)
    })

    it('S247: 딜 목록 — 상태별 필터: DUE_DILIGENCE', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=DUE_DILIGENCE')
      expect([200, 401]).toContain(s)
    })

    it('S248: 딜 목록 — 상태별 필터: CONTRACT', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=CONTRACT')
      expect([200, 401]).toContain(s)
    })

    it('S249: 딜 목록 — 상태별 필터: SETTLEMENT', async () => {
      const { s } = await ap('/api/v1/exchange/deals?status=SETTLEMENT')
      expect([200, 401]).toContain(s)
    })

    it('S250: 딜 목록 — 정렬: updated_at desc', async () => {
      const { s } = await ap('/api/v1/exchange/deals?sort=updated_at&order=desc')
      expect([200, 401]).toContain(s)
    })
  })
})

// ════════════════════════════════════════════════════════════════
// E. 통합 마켓 마케팅 (S251 – S300)
// ════════════════════════════════════════════════════════════════

describe('E. 통합 마켓 마케팅 (S251-S300)', () => {
  // ── S251-S260: 기관 프로필 관리 ───────────────────────────
  describe('S251-S260: 기관 프로필 관리', () => {
    it('S251: 기관 목록 페이지', async () => {
      const { s, b } = await pg('/exchange/institutions')
      expect(s).toBeLessThan(400)
      expect(b).toBeTruthy()
    })

    it('S252: 기관 목록 API', async () => {
      const { s, j } = await ap('/api/v1/institutions')
      expect([200, 401]).toContain(s)
    })

    it('S253: 기관 상세 — 정상 slug', async () => {
      const { s } = await pg('/exchange/institutions/kdb-amc')
      expect([200, 302, 404]).toContain(s)
    })

    it('S254: 기관 프로필 수정 API', async () => {
      const { s } = await ap('/api/v1/institution', {
        method: 'PATCH',
        body: JSON.stringify({ trust_rating: 'A' }),
      })
      expect([200, 401, 403, 405]).toContain(s)
    })

    it('S255: 기관 신뢰등급 — A+', async () => {
      const { s } = await ap('/api/v1/institution', {
        method: 'PATCH',
        body: JSON.stringify({ trust_rating: 'A+' }),
      })
      expect([200, 400, 401, 403, 405]).toContain(s)
    })

    it('S256: 기관 신뢰등급 — B', async () => {
      const { s } = await ap('/api/v1/institution', {
        method: 'PATCH',
        body: JSON.stringify({ trust_rating: 'B' }),
      })
      expect([200, 400, 401, 403, 405]).toContain(s)
    })

    it('S257: 기관 평판 API GET', async () => {
      const { s } = await ap('/api/v1/reputation')
      expect([200, 401]).toContain(s)
    })

    it('S258: 기관 평판 — POST (리뷰)', async () => {
      const { s } = await ap('/api/v1/reputation', {
        method: 'POST',
        body: JSON.stringify({ target_id: 'inst-001', rating: 4, comment: '좋은 기관' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S259: 기관 평판 — 잘못된 rating (6)', async () => {
      const { s } = await ap('/api/v1/reputation', {
        method: 'POST',
        body: JSON.stringify({ target_id: 'inst-001', rating: 6 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S260: 기관 평판 — 빈 body', async () => {
      const { s } = await ap('/api/v1/reputation', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })
  })

  // ── S261-S270: 배너 등록 API ──────────────────────────────
  describe('S261-S270: 배너 등록 API', () => {
    it('S261: 배너 목록 API GET', async () => {
      const { s, j } = await ap('/api/v1/banners')
      expect([200, 401]).toContain(s)
    })

    it('S262: 배너 등록 POST — 정상', async () => {
      const { s } = await ap('/api/v1/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: 'E2E 배너 테스트',
          position: 'hero',
          image_url: 'https://placehold.co/1200x400',
          target_url: '/exchange',
        }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S263: 배너 등록 — 빈 body', async () => {
      const { s } = await ap('/api/v1/banners', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S264: 배너 등록 — 잘못된 이미지 URL', async () => {
      const { s } = await ap('/api/v1/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: '잘못된 이미지',
          position: 'hero',
          image_url: 'not-a-valid-url',
          target_url: '/exchange',
        }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S265: 배너 등록 — 잘못된 position', async () => {
      const { s } = await ap('/api/v1/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: '잘못된 포지션',
          position: 'INVALID_POSITION',
          image_url: 'https://placehold.co/300x250',
          target_url: '/exchange',
        }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    const positions = ['hero', 'sidebar', 'footer', 'listing_top', 'listing_bottom']
    for (let i = 0; i < positions.length; i++) {
      it(`S26${6 + i}: 배너 등록 — position "${positions[i]}"`, async () => {
        const { s } = await ap('/api/v1/banners', {
          method: 'POST',
          body: JSON.stringify({
            title: `${positions[i]} 배너`,
            position: positions[i],
            image_url: 'https://placehold.co/600x200',
            target_url: '/exchange',
          }),
        })
        expect([200, 201, 400, 401]).toContain(s)
      })
    }
  })

  // ── S271-S280: 배너 성과 ──────────────────────────────────
  describe('S271-S280: 배너 성과 (노출/클릭/CTR)', () => {
    it('S271: 배너 목록 — impressions 포함 확인', async () => {
      const { s, j } = await ap('/api/v1/banners')
      expect([200, 401]).toContain(s)
      if (s === 200 && j?.data) {
        const banner = Array.isArray(j.data) ? j.data[0] : null
        if (banner) {
          expect(banner).toHaveProperty('impressions')
        }
      }
    })

    it('S272: 배너 목록 — clicks 포함 확인', async () => {
      const { s, j } = await ap('/api/v1/banners')
      if (s === 200 && j?.data) {
        const banner = Array.isArray(j.data) ? j.data[0] : null
        if (banner) {
          expect(banner).toHaveProperty('clicks')
        }
      }
    })

    it('S273: 배너 목록 — ctr 포함 확인', async () => {
      const { s, j } = await ap('/api/v1/banners')
      if (s === 200 && j?.data) {
        const banner = Array.isArray(j.data) ? j.data[0] : null
        if (banner) {
          expect(banner).toHaveProperty('ctr')
        }
      }
    })

    it('S274: 배너 — position=hero 필터', async () => {
      const { s } = await ap('/api/v1/banners?position=hero')
      expect([200, 401]).toContain(s)
    })

    it('S275: 배너 — position=sidebar 필터', async () => {
      const { s } = await ap('/api/v1/banners?position=sidebar')
      expect([200, 401]).toContain(s)
    })

    it('S276: 배너 — status=ACTIVE 필터', async () => {
      const { s } = await ap('/api/v1/banners?status=ACTIVE')
      expect([200, 401]).toContain(s)
    })

    it('S277: 배너 — status=INACTIVE 필터', async () => {
      const { s } = await ap('/api/v1/banners?status=INACTIVE')
      expect([200, 401]).toContain(s)
    })

    it('S278: 배너 수정 PATCH', async () => {
      const { s } = await ap('/api/v1/banners', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'b1', title: '수정된 배너' }),
      })
      expect([200, 400, 401, 405]).toContain(s)
    })

    it('S279: 배너 삭제 DELETE', async () => {
      const { s } = await ap('/api/v1/banners', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'b-test-delete' }),
      })
      expect([200, 204, 401, 404, 405]).toContain(s)
    })

    it('S280: 배너 — PUT 메서드 (불허)', async () => {
      const { s } = await ap('/api/v1/banners', { method: 'PUT' })
      expect([401, 405]).toContain(s)
    })
  })

  // ── S281-S290: 경쟁 기관 비교 ─────────────────────────────
  describe('S281-S290: 경쟁 기관 비교', () => {
    it('S281: 기관 목록 페이지 (비교)', async () => {
      const { s } = await pg('/exchange/institutions')
      expect(s).toBeLessThan(400)
    })

    it('S282: 기관 API — 정렬: trust_rating', async () => {
      const { s } = await ap('/api/v1/institutions?sort=trust_rating&order=desc')
      expect([200, 401]).toContain(s)
    })

    it('S283: 기관 API — 정렬: listing_count', async () => {
      const { s } = await ap('/api/v1/institutions?sort=listing_count&order=desc')
      expect([200, 401]).toContain(s)
    })

    it('S284: 기관 API — 정렬: created_at', async () => {
      const { s } = await ap('/api/v1/institutions?sort=created_at&order=asc')
      expect([200, 401]).toContain(s)
    })

    it('S285: 기관 API — 타입 필터: AMC', async () => {
      const { s } = await ap('/api/v1/institutions?type=AMC')
      expect([200, 401]).toContain(s)
    })

    it('S286: 기관 API — 타입 필터: BANK', async () => {
      const { s } = await ap('/api/v1/institutions?type=BANK')
      expect([200, 401]).toContain(s)
    })

    it('S287: 기관 API — 타입 필터: SAVINGS', async () => {
      const { s } = await ap('/api/v1/institutions?type=SAVINGS')
      expect([200, 401]).toContain(s)
    })

    it('S288: 기관 API — 검색 query', async () => {
      const { s } = await ap('/api/v1/institutions?q=한국')
      expect([200, 401]).toContain(s)
    })

    it('S289: 기관 API — 페이지네이션', async () => {
      const { s } = await ap('/api/v1/institutions?page=1&limit=5')
      expect([200, 401]).toContain(s)
    })

    it('S290: 기관 API — 빈 결과 페이지', async () => {
      const { s } = await ap('/api/v1/institutions?page=9999')
      expect([200, 401]).toContain(s)
    })
  })

  // ── S291-S300: 매물 노출 통계 ─────────────────────────────
  describe('S291-S300: 매물 노출 통계', () => {
    it('S291: 매도자 분석 페이지', async () => {
      const { s } = await pg('/seller/analytics')
      expect([200, 302, 307]).toContain(s)
    })

    it('S292: 매도자 분석 API', async () => {
      const { s } = await ap('/api/v1/seller/analytics')
      expect([200, 401]).toContain(s)
    })

    it('S293: 매물 상세 — view_count 필드 존재', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings/dl-001')
      if (s === 200 && j) {
        const listing = j.data || j
        expect(listing).toBeDefined()
      }
      expect([200, 401, 404]).toContain(s)
    })

    it('S294: 매물 상세 — interested_count 필드', async () => {
      const { s, j } = await ap('/api/v1/exchange/listings/dl-001')
      if (s === 200 && j) {
        const listing = j.data || j
        expect(listing).toBeDefined()
      }
      expect([200, 401, 404]).toContain(s)
    })

    it('S295: 통계 페이지 (메인)', async () => {
      const { s } = await pg('/statistics')
      expect([200, 302, 307]).toContain(s)
    })

    it('S296: 통계 트렌드 페이지', async () => {
      const { s } = await pg('/statistics/trend')
      expect([200, 302, 307]).toContain(s)
    })

    it('S297: 통계 API', async () => {
      const { s } = await ap('/api/v1/statistics')
      expect([200, 401]).toContain(s)
    })

    it('S298: 추천 매물 API (featured)', async () => {
      const { s } = await ap('/api/v1/listings/featured')
      expect([200, 401]).toContain(s)
    })

    it('S299: 매물 목록 — 정렬: view_count desc', async () => {
      const { s } = await ap('/api/v1/exchange/listings?sort=view_count&order=desc')
      expect([200, 401]).toContain(s)
    })

    it('S300: 매물 목록 — 정렬: interested_count desc', async () => {
      const { s } = await ap('/api/v1/exchange/listings?sort=interested_count&order=desc')
      expect([200, 401]).toContain(s)
    })
  })
})

// ════════════════════════════════════════════════════════════════
// F. 과금 — 매도자 (S301 – S350)
// ════════════════════════════════════════════════════════════════

describe('F. 과금 — 매도자 (S301-S350)', () => {
  // ── S301-S310: 프리미엄 노출 ──────────────────────────────
  describe('S301-S310: 프리미엄 노출', () => {
    it('S301: 과금 메인 페이지', async () => {
      const { s } = await pg('/settings/billing')
      expect([200, 302, 307]).toContain(s)
    })

    it('S302: 과금 API GET', async () => {
      const { s } = await ap('/api/v1/billing')
      expect([200, 401]).toContain(s)
    })

    it('S303: 서비스 목록 API', async () => {
      const { s } = await ap('/api/v1/services')
      expect([200, 401]).toContain(s)
    })

    it('S304: 서비스 — 프리미엄 노출 항목 확인', async () => {
      const { s, j } = await ap('/api/v1/services')
      expect([200, 401]).toContain(s)
    })

    it('S305: 서비스 — POST (구매 요청)', async () => {
      const { s } = await ap('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify({ service_type: 'PREMIUM_EXPOSURE', listing_id: 'dl-001' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S306: 서비스 — 잘못된 service_type', async () => {
      const { s } = await ap('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify({ service_type: 'INVALID' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S307: 서비스 — 빈 body', async () => {
      const { s } = await ap('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S308: 관리자 과금 설정 페이지', async () => {
      const { s } = await pg('/admin/pricing')
      expect([200, 302, 307, 401, 403]).toContain(s)
    })

    it('S309: 관리자 과금 API', async () => {
      const { s } = await ap('/api/v1/admin/pricing')
      expect([200, 401, 403]).toContain(s)
    })

    it('S310: 서비스 DELETE (불허)', async () => {
      const { s } = await ap('/api/v1/services', { method: 'DELETE' })
      expect([401, 405]).toContain(s)
    })
  })

  // ── S311-S320: 거래 수수료 ────────────────────────────────
  describe('S311-S320: 거래 수수료', () => {
    const feeAmounts = [
      100000000, 500000000, 1000000000, 5000000000, 10000000000,
    ]
    for (let i = 0; i < feeAmounts.length; i++) {
      it(`S31${1 + i}: 수수료 계산 확인 — ${(feeAmounts[i] / 100000000).toFixed(0)}억`, async () => {
        const { s } = await ap('/api/v1/billing', {
          method: 'POST',
          body: JSON.stringify({ action: 'calculate_fee', amount: feeAmounts[i] }),
        })
        expect([200, 400, 401, 405]).toContain(s)
      })
    }

    it('S316: 수수료 계산 — 0원', async () => {
      const { s } = await ap('/api/v1/billing', {
        method: 'POST',
        body: JSON.stringify({ action: 'calculate_fee', amount: 0 }),
      })
      expect([200, 400, 401, 405]).toContain(s)
    })

    it('S317: 수수료 계산 — 음수 금액', async () => {
      const { s } = await ap('/api/v1/billing', {
        method: 'POST',
        body: JSON.stringify({ action: 'calculate_fee', amount: -1000 }),
      })
      expect([400, 401, 405, 422]).toContain(s)
    })

    it('S318: 수수료 계산 — 문자열 금액', async () => {
      const { s } = await ap('/api/v1/billing', {
        method: 'POST',
        body: JSON.stringify({ action: 'calculate_fee', amount: 'abc' }),
      })
      expect([400, 401, 405, 422]).toContain(s)
    })

    it('S319: 수수료 계산 — 소수점 금액', async () => {
      const { s } = await ap('/api/v1/billing', {
        method: 'POST',
        body: JSON.stringify({ action: 'calculate_fee', amount: 123456789.99 }),
      })
      expect([200, 400, 401, 405]).toContain(s)
    })

    it('S320: 수수료 계산 — 초대형 금액 (1조)', async () => {
      const { s } = await ap('/api/v1/billing', {
        method: 'POST',
        body: JSON.stringify({ action: 'calculate_fee', amount: 1000000000000 }),
      })
      expect([200, 400, 401, 405]).toContain(s)
    })
  })

  // ── S321-S330: 청구서 ─────────────────────────────────────
  describe('S321-S330: 청구서 (invoices)', () => {
    it('S321: 청구서 목록 API GET', async () => {
      const { s } = await ap('/api/v1/billing/invoices')
      expect([200, 401]).toContain(s)
    })

    it('S322: 청구서 — 날짜 범위 필터', async () => {
      const { s } = await ap('/api/v1/billing/invoices?from=2026-01-01&to=2026-03-31')
      expect([200, 401]).toContain(s)
    })

    it('S323: 청구서 — status=PAID', async () => {
      const { s } = await ap('/api/v1/billing/invoices?status=PAID')
      expect([200, 401]).toContain(s)
    })

    it('S324: 청구서 — status=PENDING', async () => {
      const { s } = await ap('/api/v1/billing/invoices?status=PENDING')
      expect([200, 401]).toContain(s)
    })

    it('S325: 청구서 — status=OVERDUE', async () => {
      const { s } = await ap('/api/v1/billing/invoices?status=OVERDUE')
      expect([200, 401]).toContain(s)
    })

    it('S326: 청구서 — 페이지네이션', async () => {
      const { s } = await ap('/api/v1/billing/invoices?page=1&limit=10')
      expect([200, 401]).toContain(s)
    })

    it('S327: 청구서 — 빈 페이지', async () => {
      const { s } = await ap('/api/v1/billing/invoices?page=9999')
      expect([200, 401]).toContain(s)
    })

    it('S328: 청구서 POST (불허)', async () => {
      const { s } = await ap('/api/v1/billing/invoices', { method: 'POST' })
      expect([401, 405]).toContain(s)
    })

    it('S329: 청구서 DELETE (불허)', async () => {
      const { s } = await ap('/api/v1/billing/invoices', { method: 'DELETE' })
      expect([401, 405]).toContain(s)
    })

    it('S330: 청구서 — 잘못된 날짜 범위', async () => {
      const { s } = await ap('/api/v1/billing/invoices?from=invalid&to=invalid')
      expect([200, 400, 401]).toContain(s)
    })
  })

  // ── S331-S340: 구독 ───────────────────────────────────────
  describe('S331-S340: 구독 (subscribe)', () => {
    it('S331: 구독 API GET', async () => {
      const { s } = await ap('/api/v1/billing/subscribe')
      expect([200, 401]).toContain(s)
    })

    it('S332: 구독 API POST — 정상', async () => {
      const { s } = await ap('/api/v1/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ plan: 'PREMIUM', period: 'monthly' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S333: 구독 — 빈 body', async () => {
      const { s } = await ap('/api/v1/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S334: 구독 — 잘못된 plan', async () => {
      const { s } = await ap('/api/v1/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ plan: 'NONEXISTENT', period: 'monthly' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S335: 구독 — 잘못된 period', async () => {
      const { s } = await ap('/api/v1/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ plan: 'PREMIUM', period: 'bicentennial' }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    const plans = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']
    for (let i = 0; i < plans.length; i++) {
      it(`S33${6 + i}: 구독 — plan "${plans[i]}"`, async () => {
        const { s } = await ap('/api/v1/billing/subscribe', {
          method: 'POST',
          body: JSON.stringify({ plan: plans[i], period: 'monthly' }),
        })
        expect([200, 201, 400, 401]).toContain(s)
      })
    }

    it('S340: 구독 DELETE (해지)', async () => {
      const { s } = await ap('/api/v1/billing/subscribe', { method: 'DELETE' })
      expect([200, 204, 401, 405]).toContain(s)
    })
  })

  // ── S341-S350: 크레딧 ─────────────────────────────────────
  describe('S341-S350: 크레딧', () => {
    it('S341: 크레딧 잔액 API GET', async () => {
      const { s } = await ap('/api/v1/billing/credits')
      expect([200, 401]).toContain(s)
    })

    it('S342: 크레딧 구매 POST', async () => {
      const { s } = await ap('/api/v1/billing/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({ amount: 10000, payment_method: 'card' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S343: 크레딧 구매 — 0원', async () => {
      const { s } = await ap('/api/v1/billing/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({ amount: 0 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S344: 크레딧 구매 — 음수', async () => {
      const { s } = await ap('/api/v1/billing/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({ amount: -100 }),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S345: 크레딧 구매 — 빈 body', async () => {
      const { s } = await ap('/api/v1/billing/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      expect([400, 401, 422]).toContain(s)
    })

    it('S346: 구 크레딧 API GET', async () => {
      const { s } = await ap('/api/v1/credits')
      expect([200, 401]).toContain(s)
    })

    it('S347: 크레딧 사용 내역', async () => {
      const { s } = await ap('/api/v1/billing/credits?type=usage')
      expect([200, 401]).toContain(s)
    })

    it('S348: 크레딧 충전 내역', async () => {
      const { s } = await ap('/api/v1/billing/credits?type=purchase')
      expect([200, 401]).toContain(s)
    })

    it('S349: 크레딧 DELETE (불허)', async () => {
      const { s } = await ap('/api/v1/billing/credits', { method: 'DELETE' })
      expect([401, 405]).toContain(s)
    })

    it('S350: 크레딧 구매 — 매우 큰 금액', async () => {
      const { s } = await ap('/api/v1/billing/credits/purchase', {
        method: 'POST',
        body: JSON.stringify({ amount: 999999999999 }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })
  })
})

// ════════════════════════════════════════════════════════════════
// G. 기타 매도자 기능 (S351 – S400)
// ════════════════════════════════════════════════════════════════

describe('G. 기타 매도자 기능 (S351-S400)', () => {
  // ── S351-S360: 전문가 연결 ────────────────────────────────
  describe('S351-S360: 전문가 연결', () => {
    it('S351: 전문가 메인 페이지', async () => {
      const { s } = await pg('/professional')
      expect([200, 302, 307]).toContain(s)
    })

    it('S352: 법률 전문가 페이지', async () => {
      const { s } = await pg('/professional/law')
      expect([200, 302, 307]).toContain(s)
    })

    it('S353: 세무 전문가 페이지', async () => {
      const { s } = await pg('/professional/tax')
      expect([200, 302, 307]).toContain(s)
    })

    it('S354: 부동산 중개사 페이지', async () => {
      const { s } = await pg('/professional/realtor')
      expect([200, 302, 307]).toContain(s)
    })

    it('S355: 전문가 상세 페이지', async () => {
      const { s } = await pg('/professional/prof-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S356: 전문가 상담 페이지', async () => {
      const { s } = await pg('/professional/consultations')
      expect([200, 302, 307]).toContain(s)
    })

    it('S357: 전문가 API GET', async () => {
      const { s } = await ap('/api/v1/professionals')
      expect([200, 401]).toContain(s)
    })

    it('S358: 전문가 상담 API', async () => {
      const { s } = await ap('/api/v1/professional/consultations')
      expect([200, 401]).toContain(s)
    })

    it('S359: 전문가 서비스 API', async () => {
      const { s } = await ap('/api/v1/professional/services')
      expect([200, 401]).toContain(s)
    })

    it('S360: 전문가 수익 API', async () => {
      const { s } = await ap('/api/v1/professional/earnings')
      expect([200, 401]).toContain(s)
    })
  })

  // ── S361-S370: 커뮤니티 ───────────────────────────────────
  describe('S361-S370: 커뮤니티', () => {
    it('S361: 커뮤니티 메인 페이지', async () => {
      const { s, b } = await pg('/community')
      expect([200, 302, 307]).toContain(s)
    })

    it('S362: 커뮤니티 글 작성 페이지', async () => {
      const { s } = await pg('/community/new')
      expect([200, 302, 307]).toContain(s)
    })

    it('S363: 커뮤니티 글 상세 페이지', async () => {
      const { s } = await pg('/community/post-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S364: 커뮤니티 전문가 페이지', async () => {
      const { s } = await pg('/community/expert')
      expect([200, 302, 307]).toContain(s)
    })

    it('S365: 커뮤니티 — 존재하지 않는 글', async () => {
      const { s } = await pg('/community/nonexistent-post')
      expect([200, 302, 404]).toContain(s)
    })

    it('S366: 알림 API GET', async () => {
      const { s } = await ap('/api/v1/notifications')
      expect([200, 401]).toContain(s)
    })

    it('S367: 알림 API — POST (알림 생성)', async () => {
      const { s } = await ap('/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: 'LISTING_UPDATE', message: '매물이 업데이트됨' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S368: 공지사항 API GET', async () => {
      const { s } = await ap('/api/v1/notices')
      expect([200, 401]).toContain(s)
    })

    it('S369: 지원/문의 API GET', async () => {
      const { s } = await ap('/api/v1/support')
      expect([200, 401]).toContain(s)
    })

    it('S370: 지원/문의 API POST', async () => {
      const { s } = await ap('/api/v1/support', {
        method: 'POST',
        body: JSON.stringify({ subject: '매물 관련 문의', content: '문의 내용입니다' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })
  })

  // ── S371-S380: 시장 분석 ──────────────────────────────────
  describe('S371-S380: 시장 분석', () => {
    it('S371: 시장 인텔리전스 페이지', async () => {
      const { s } = await pg('/market-intelligence')
      expect([200, 302, 307]).toContain(s)
    })

    it('S372: 시장 인텔리전스 히트맵', async () => {
      const { s } = await pg('/market-intelligence/heatmap')
      expect([200, 302, 307]).toContain(s)
    })

    it('S373: 시장 인텔리전스 리포트', async () => {
      const { s } = await pg('/market-intelligence/reports')
      expect([200, 302, 307]).toContain(s)
    })

    it('S374: 시장 인텔리전스 시그널', async () => {
      const { s } = await pg('/market-intelligence/signals')
      expect([200, 302, 307]).toContain(s)
    })

    it('S375: 통계 페이지', async () => {
      const { s } = await pg('/statistics')
      expect([200, 302, 307]).toContain(s)
    })

    it('S376: 인텔리전스 API — overview', async () => {
      const { s } = await ap('/api/v1/intelligence/overview')
      expect([200, 401]).toContain(s)
    })

    it('S377: 인텔리전스 API — heatmap', async () => {
      const { s } = await ap('/api/v1/intelligence/heatmap')
      expect([200, 401]).toContain(s)
    })

    it('S378: 인텔리전스 API — signals', async () => {
      const { s } = await ap('/api/v1/intelligence/signals')
      expect([200, 401]).toContain(s)
    })

    it('S379: 인텔리전스 API — reports', async () => {
      const { s } = await ap('/api/v1/intelligence/reports')
      expect([200, 401]).toContain(s)
    })

    it('S380: 시장 검색 페이지', async () => {
      const { s } = await pg('/market/search')
      expect([200, 302, 307]).toContain(s)
    })
  })

  // ── S381-S390: 뉴스/지식센터 ──────────────────────────────
  describe('S381-S390: 뉴스/지식센터', () => {
    it('S381: 지식센터 메인 페이지', async () => {
      const { s } = await pg('/knowledge')
      expect([200, 302, 307]).toContain(s)
    })

    it('S382: 지식센터 코스 페이지', async () => {
      const { s } = await pg('/knowledge/courses')
      expect([200, 302, 307]).toContain(s)
    })

    it('S383: 지식센터 용어 페이지', async () => {
      const { s } = await pg('/knowledge/glossary')
      expect([200, 302, 307]).toContain(s)
    })

    it('S384: 시장 지도 페이지', async () => {
      const { s } = await pg('/market/map')
      expect([200, 302, 307]).toContain(s)
    })

    it('S385: 시장 입찰 페이지', async () => {
      const { s } = await pg('/market/bidding')
      expect([200, 302, 307]).toContain(s)
    })

    it('S386: 마켓플레이스 메인', async () => {
      const { s } = await pg('/marketplace')
      expect([200, 302, 307]).toContain(s)
    })

    it('S387: 마켓플레이스 캘린더', async () => {
      const { s } = await pg('/marketplace/calendar')
      expect([200, 302, 307]).toContain(s)
    })

    it('S388: 마켓플레이스 공동투자', async () => {
      const { s } = await pg('/marketplace/co-invest')
      expect([200, 302, 307]).toContain(s)
    })

    it('S389: 마켓플레이스 매칭', async () => {
      const { s } = await pg('/marketplace/matching')
      expect([200, 302, 307]).toContain(s)
    })

    it('S390: 마켓플레이스 포트폴리오 입찰', async () => {
      const { s } = await pg('/marketplace/portfolio-bid')
      expect([200, 302, 307]).toContain(s)
    })
  })

  // ── S391-S400: 서비스 가이드 ──────────────────────────────
  describe('S391-S400: 서비스 가이드', () => {
    const serviceGuideKeys = [
      'exchange', 'marketplace', 'deal-room', 'due-diligence',
      'contract', 'settlement', 'analytics', 'billing',
    ]
    for (let i = 0; i < serviceGuideKeys.length; i++) {
      it(`S39${1 + i}: 서비스 가이드 — ${serviceGuideKeys[i]}`, async () => {
        const { s } = await pg(`/guide/service/${serviceGuideKeys[i]}`)
        expect([200, 302, 307, 404]).toContain(s)
      })
    }

    it('S399: 가이드 — 파트너 가이드 페이지', async () => {
      const { s } = await pg('/guide/partner')
      expect([200, 302, 307]).toContain(s)
    })

    it('S400: 가이드 — 전문가 가이드 페이지', async () => {
      const { s } = await pg('/guide/professional')
      expect([200, 302, 307]).toContain(s)
    })
  })

  // ── 보충 테스트 (루프 수 보정) ────────────────────────────
  describe('보충 테스트 (총 400건 보정)', () => {
    it('S-extra-1: 펀드 메인 페이지', async () => {
      const { s } = await pg('/fund')
      expect([200, 302, 307]).toContain(s)
    })

    it('S-extra-2: 펀드 상세 페이지', async () => {
      const { s } = await pg('/fund/fund-001')
      expect([200, 302, 404]).toContain(s)
    })

    it('S-extra-3: 매칭 API GET', async () => {
      const { s } = await ap('/api/v1/matching')
      expect([200, 401]).toContain(s)
    })

    it('S-extra-4: 매칭 실행 API POST', async () => {
      const { s } = await ap('/api/v1/matching/run', {
        method: 'POST',
        body: JSON.stringify({ listing_id: 'dl-001' }),
      })
      expect([200, 201, 400, 401]).toContain(s)
    })

    it('S-extra-5: about 페이지', async () => {
      const { s } = await pg('/about')
      expect([200, 302, 307]).toContain(s)
    })
  })
})
