/**
 * OCR 결과 후처리 검증 + 신뢰도 점수.
 *
 * Claude Vision / pdf-parse 응답을 그대로 클라이언트에 노출하면,
 * 사용자가 잘못된 숫자를 그대로 매물 등록 폼에 적용해 데이터 무결성이 깨질 수 있다.
 * 이 모듈에서:
 *   1. 필드별 형식 검증 (날짜, 금액 양수, 주소 한국어, 면적 합리적 범위)
 *   2. 필드별 신뢰도 점수 (0-100) — 형식 통과 + 숫자가 합리적 범위면 90+
 *   3. 보정 (날짜 표준화, 콤마 제거, 음수 → 절대값 등)
 *   4. 의심 필드 → flagged 배열로 사용자에게 검토 요청
 *
 * 정책:
 *   - 95% 정확도 목표 — 보정 + 검증으로 false positive 최소화
 *   - 모든 출력은 mutate 하지 않고 새 객체 반환 (immutable)
 */

export interface FieldValidation {
  /** 필드 키 */
  key: string
  /** 검증 후 값 (보정 포함) */
  value: unknown
  /** 0-100 신뢰도 점수 */
  confidence: number
  /** 의심 사유 (있으면 사용자 검토 권장) */
  warning?: string
}

export interface ValidationReport {
  /** 보정된 결과 (필드별 검증된 값) */
  corrected: Record<string, unknown>
  /** 필드별 검증 상세 */
  fields: Record<string, FieldValidation>
  /** 사용자 검토가 필요한 필드 목록 */
  flagged: string[]
  /** 전체 신뢰도 (필드별 confidence 평균) */
  overallConfidence: number
}

// ─── 형식 검증 헬퍼 ───────────────────────────────────────

const DATE_PATTERNS = [
  /^(\d{4})-(\d{2})-(\d{2})$/,
  /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
  /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/,
  /^(\d{8})$/,  // YYYYMMDD
]

function normalizeDate(input: unknown): { value: string | null; confidence: number; warning?: string } {
  if (input == null) return { value: null, confidence: 0 }
  const s = String(input).trim()
  if (!s) return { value: null, confidence: 0 }
  for (const re of DATE_PATTERNS) {
    const m = s.match(re)
    if (m) {
      let y: number, mo: number, d: number
      if (re.source.startsWith('^(\\d{8})')) {
        y = parseInt(s.slice(0, 4), 10)
        mo = parseInt(s.slice(4, 6), 10)
        d = parseInt(s.slice(6, 8), 10)
      } else {
        y = parseInt(m[1], 10)
        mo = parseInt(m[2], 10)
        d = parseInt(m[3], 10)
      }
      // 합리성 검증
      const now = new Date().getFullYear()
      if (y < 1900 || y > now + 5) return { value: null, confidence: 0, warning: `연도 ${y} 범위 이상` }
      if (mo < 1 || mo > 12) return { value: null, confidence: 0, warning: `월 ${mo} 범위 이상` }
      if (d < 1 || d > 31) return { value: null, confidence: 0, warning: `일 ${d} 범위 이상` }
      const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { value: iso, confidence: 95 }
    }
  }
  return { value: null, confidence: 0, warning: `날짜 형식 인식 실패: '${s.slice(0, 30)}'` }
}

function normalizeAmount(
  input: unknown,
  opts?: { minReasonable?: number; maxReasonable?: number; fieldName?: string },
): { value: number | null; confidence: number; warning?: string } {
  if (input == null) return { value: null, confidence: 0 }
  // 숫자 그대로
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { value: null, confidence: 0, warning: '비유한 숫자' }
    const n = Math.abs(input)
    if (opts?.minReasonable && n < opts.minReasonable) {
      return { value: n, confidence: 60, warning: `${opts.fieldName ?? '금액'}이 ${opts.minReasonable.toLocaleString('ko-KR')}원 보다 작습니다 — 단위 확인` }
    }
    if (opts?.maxReasonable && n > opts.maxReasonable) {
      return { value: n, confidence: 60, warning: `${opts.fieldName ?? '금액'}이 ${opts.maxReasonable.toLocaleString('ko-KR')}원 보다 큽니다 — 단위 확인` }
    }
    return { value: n, confidence: 95 }
  }
  // 문자열 — 콤마/원/억/만 처리
  if (typeof input === 'string') {
    let s = input.trim()
    if (!s) return { value: null, confidence: 0 }
    // 통화 기호 제거
    s = s.replace(/[원\s,$₩]/g, '')
    // 억/만 단위 — '15억 3,500만' → 15 * 1e8 + 3500 * 1e4
    let total = 0
    const eokMatch = s.match(/([\d.]+)\s*억/)
    if (eokMatch) {
      total += parseFloat(eokMatch[1]) * 100_000_000
      s = s.replace(/([\d.]+)\s*억/, '')
    }
    const manMatch = s.match(/([\d.]+)\s*만/)
    if (manMatch) {
      total += parseFloat(manMatch[1]) * 10_000
      s = s.replace(/([\d.]+)\s*만/, '')
    }
    s = s.replace(/[^0-9.-]/g, '')
    if (s) total += parseFloat(s) || 0
    if (!Number.isFinite(total) || total === 0) return { value: null, confidence: 0, warning: '숫자 인식 실패' }
    const n = Math.abs(total)
    if (opts?.minReasonable && n < opts.minReasonable) {
      return { value: n, confidence: 60, warning: `${opts.fieldName ?? '금액'} ${n.toLocaleString('ko-KR')}원이 비정상적으로 작습니다` }
    }
    if (opts?.maxReasonable && n > opts.maxReasonable) {
      return { value: n, confidence: 60, warning: `${opts.fieldName ?? '금액'} ${n.toLocaleString('ko-KR')}원이 비정상적으로 큽니다` }
    }
    return { value: n, confidence: 90 }
  }
  return { value: null, confidence: 0, warning: '금액 형식 미지원' }
}

function normalizeArea(input: unknown): { value: number | null; confidence: number; warning?: string } {
  if (input == null) return { value: null, confidence: 0 }
  const a = normalizeAmount(input, { minReasonable: 1, maxReasonable: 1_000_000 })
  if (a.value && a.value > 0) {
    if (a.value > 100_000) {
      return { value: a.value, confidence: 50, warning: `면적 ${a.value}㎡ 가 과도하게 큽니다 — 평/㎡ 단위 확인` }
    }
    return { value: a.value, confidence: 90 }
  }
  return { value: null, confidence: 0 }
}

function validateAddress(input: unknown): { value: string | null; confidence: number; warning?: string } {
  if (typeof input !== 'string') return { value: null, confidence: 0 }
  const s = input.trim()
  if (s.length < 5) return { value: null, confidence: 0, warning: '주소 길이가 너무 짧음' }
  // 한국 주소 검증 — '시', '구', '동' 등 키워드
  const koreanAddressKeywords = [/시\s/, /구\s/, /동\s/, /로\s\d/, /길\s\d/, /번지/]
  const matchCount = koreanAddressKeywords.filter((re) => re.test(s)).length
  if (matchCount === 0) return { value: s, confidence: 50, warning: '한국 주소 형식이 아닐 수 있음' }
  return { value: s, confidence: matchCount >= 2 ? 95 : 80 }
}

// ─── 문서 타입별 스키마 ──────────────────────────────────

interface FieldSchema {
  key: string
  type: 'date' | 'amount' | 'area' | 'address' | 'text' | 'integer' | 'rate'
  required?: boolean
  min?: number
  max?: number
  fieldName?: string
}

const SCHEMAS: Record<string, FieldSchema[]> = {
  appraisal: [
    { key: 'appraisal_value', type: 'amount', required: true, min: 1_000_000, max: 1_000_000_000_000, fieldName: '감정평가액' },
    { key: 'address',         type: 'address', required: true },
    { key: 'land_area',       type: 'area' },
    { key: 'building_area',   type: 'area' },
    { key: 'property_type',   type: 'text' },
    { key: 'appraisal_date',  type: 'date' },
  ],
  bond: [
    { key: 'case_number',     type: 'text' },
    { key: 'court_name',      type: 'text' },
    { key: 'appraisal_value', type: 'amount', min: 1_000_000, max: 1_000_000_000_000, fieldName: '감정가' },
    { key: 'minimum_price',   type: 'amount', min: 1_000_000, max: 1_000_000_000_000, fieldName: '최저경매가' },
    { key: 'auction_count',   type: 'integer' },
    { key: 'next_auction_date', type: 'date' },
    { key: 'address',         type: 'address' },
    { key: 'property_type',   type: 'text' },
    { key: 'land_area',       type: 'area' },
    { key: 'building_area',   type: 'area' },
  ],
}

// ─── 메인 검증 함수 ───────────────────────────────────────

export function validateOcrResult(
  data: Record<string, unknown>,
  docType: string,
): ValidationReport {
  const schema = SCHEMAS[docType]
  if (!schema) {
    return {
      corrected: data,
      fields: {},
      flagged: [],
      overallConfidence: 50,
    }
  }
  const fields: Record<string, FieldValidation> = {}
  const corrected: Record<string, unknown> = {}
  const flagged: string[] = []

  for (const fs of schema) {
    const raw = data[fs.key]
    let result: { value: unknown; confidence: number; warning?: string }
    switch (fs.type) {
      case 'date':
        result = normalizeDate(raw)
        break
      case 'amount':
        result = normalizeAmount(raw, { minReasonable: fs.min, maxReasonable: fs.max, fieldName: fs.fieldName })
        break
      case 'area':
        result = normalizeArea(raw)
        break
      case 'address':
        result = validateAddress(raw)
        break
      case 'integer':
        result = (() => {
          if (raw == null) return { value: null, confidence: 0 }
          const n = parseInt(String(raw), 10)
          if (!Number.isFinite(n)) return { value: null, confidence: 0, warning: '정수 변환 실패' }
          return { value: n, confidence: 90 }
        })()
        break
      case 'rate':
        result = (() => {
          const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
          if (!Number.isFinite(n)) return { value: null, confidence: 0 }
          // 0~1 범위면 그대로, 1~100 범위면 ÷100
          if (n >= 0 && n <= 1) return { value: n, confidence: 90 }
          if (n >= 0 && n <= 100) return { value: n / 100, confidence: 85, warning: '백분율로 추정 — ÷100 자동 변환' }
          return { value: n, confidence: 50, warning: '범위 이상' }
        })()
        break
      default:
        result = (() => {
          if (raw == null) return { value: null, confidence: 0 }
          const s = String(raw).trim()
          if (!s) return { value: null, confidence: 0 }
          return { value: s, confidence: 80 }
        })()
    }

    const v: FieldValidation = { key: fs.key, value: result.value, confidence: result.confidence }
    if (result.warning) v.warning = result.warning
    if (fs.required && (result.value == null || result.confidence < 50)) {
      v.warning = (v.warning ? v.warning + ' / ' : '') + '필수 필드 누락 또는 신뢰도 낮음'
      flagged.push(fs.key)
    }
    if (result.warning) flagged.push(fs.key)
    fields[fs.key] = v
    corrected[fs.key] = result.value
  }

  // 추가 raw 필드는 그대로 통과
  for (const [k, v] of Object.entries(data)) {
    if (!(k in fields)) corrected[k] = v
  }

  const confidences = Object.values(fields).map((f) => f.confidence)
  const overallConfidence = confidences.length > 0
    ? Math.round(confidences.reduce((s, c) => s + c, 0) / confidences.length)
    : 0

  return { corrected, fields, flagged: Array.from(new Set(flagged)), overallConfidence }
}
