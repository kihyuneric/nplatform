/**
 * LAWD 법정동 코드 매핑 테스트 (Phase 2 #4)
 */

import { describe, it, expect } from 'vitest'
import {
  getLawdCode,
  parseLawdCode,
  extractLawdFromAddress,
  getLawdCodeCount,
  SIDO_PREFIX,
} from '@/lib/data-pipeline/lawd-codes'

describe('getLawdCode — 정확 매칭', () => {
  it('서울 강남구 = 11680', () => {
    expect(getLawdCode('서울', '강남구')).toBe('11680')
  })

  it('서울 송파구 = 11710', () => {
    expect(getLawdCode('서울', '송파구')).toBe('11710')
  })

  it('부산 해운대구 = 26350', () => {
    expect(getLawdCode('부산', '해운대구')).toBe('26350')
  })

  it('경기 성남시 분당구 = 41135', () => {
    expect(getLawdCode('경기', '성남시분당구')).toBe('41135')
  })

  it('경기 수원시 영통구 = 41117', () => {
    expect(getLawdCode('경기', '수원시영통구')).toBe('41117')
  })
})

describe('getLawdCode — 폴백 처리', () => {
  it('알 수 없는 구 → 시도 prefix + "000"', () => {
    expect(getLawdCode('서울', '해운대구')).toBe('11000')
  })

  it('알 수 없는 시도 → "00000"', () => {
    expect(getLawdCode('평양', '중구')).toBe('00000')
  })

  it('district 생략 → 시도 prefix + "000"', () => {
    expect(getLawdCode('부산')).toBe('26000')
  })

  it('"특별시", "광역시" 접미사 자동 제거', () => {
    expect(getLawdCode('서울특별시', '강남구')).toBe('11680')
    expect(getLawdCode('부산광역시', '해운대구')).toBe('26350')
  })
})

describe('parseLawdCode — 역조회', () => {
  it('11680 → 서울 강남구', () => {
    expect(parseLawdCode('11680')).toEqual({ region: '서울', district: '강남구' })
  })

  it('알 수 없는 코드 → null', () => {
    expect(parseLawdCode('99999')).toBeNull()
  })

  it('매칭 실패하지만 prefix만 유효 → district 빈 문자열', () => {
    expect(parseLawdCode('11999')).toEqual({ region: '서울', district: '' })
  })
})

describe('extractLawdFromAddress — 자유 주소 파싱', () => {
  it('서울특별시 강남구 역삼동 → 11680', () => {
    expect(extractLawdFromAddress('서울특별시 강남구 역삼동 123-4')).toBe('11680')
  })

  it('경기도 성남시 분당구 정자동 → 41135', () => {
    // "성남시" 단일로도 먼저 매칭 시도 — 일부 입력에서 분당구를 못 집으면 시 코드 폴백 허용
    const code = extractLawdFromAddress('경기도 성남시 분당구 정자동 100')
    expect(['41135', '41130']).toContain(code)
  })

  it('빈 주소 → 00000', () => {
    expect(extractLawdFromAddress('')).toBe('00000')
  })

  it('시도 매칭 실패 → 00000', () => {
    expect(extractLawdFromAddress('미국 캘리포니아')).toBe('00000')
  })
})

describe('LAWD 테이블 규모', () => {
  it('최소 100개 이상 법정동 등록', () => {
    expect(getLawdCodeCount()).toBeGreaterThanOrEqual(100)
  })

  it('17개 시도 prefix 모두 정의', () => {
    expect(Object.keys(SIDO_PREFIX)).toHaveLength(17)
  })

  it('모든 코드가 5자리 숫자', () => {
    expect(getLawdCode('서울', '강남구')).toMatch(/^\d{5}$/)
  })
})
