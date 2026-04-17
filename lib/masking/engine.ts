/**
 * lib/masking/engine.ts
 *
 * 개인정보 자동 마스킹 엔진 (규칙 기반 MVP).
 * 매각자가 업로드한 문서·텍스트에서 PII를 탐지하여 치환한다.
 *
 * Phase 3 마스킹 검수 큐의 기반 라이브러리.
 * ML 고도화는 Phase 4 이후로 미룸.
 *
 * 탐지 대상:
 *   - 주민등록번호 (######-#######)
 *   - 외국인등록번호
 *   - 사업자등록번호 (###-##-#####)
 *   - 법인등록번호 (######-#######)
 *   - 전화번호 (010/02/031 등)
 *   - 이메일
 *   - 계좌번호
 *   - 카드번호
 *   - 한국 이름 (간이 사전)
 *   - 상세 지번 (○○동 123-45 → ○○동)
 */

// ─── PII 패턴 ─────────────────────────────────────────────
export interface PiiPattern {
  name: string
  label: string
  regex: RegExp
  replacement: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export const PII_PATTERNS: PiiPattern[] = [
  {
    name: 'rrn',
    label: '주민등록번호',
    regex: /(\d{6})[-\s]?(\d{7})/g,
    replacement: '######-#######',
    severity: 'HIGH',
  },
  {
    name: 'foreign_rrn',
    label: '외국인등록번호',
    regex: /(\d{6})[-\s]?([5-8]\d{6})/g,
    replacement: '######-#######',
    severity: 'HIGH',
  },
  {
    name: 'business_no',
    label: '사업자등록번호',
    regex: /\b(\d{3})-(\d{2})-(\d{5})\b/g,
    replacement: '###-##-#####',
    severity: 'MEDIUM',
  },
  {
    name: 'corp_no',
    label: '법인등록번호',
    regex: /\b(\d{6})-(\d{7})\b/g,
    replacement: '######-#######',
    severity: 'MEDIUM',
  },
  {
    name: 'phone_mobile',
    label: '휴대전화',
    regex: /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g,
    replacement: '010-****-****',
    severity: 'HIGH',
  },
  {
    name: 'phone_landline',
    label: '유선전화',
    regex: /\b0(2|3[1-3]|4[1-4]|5[1-5]|6[1-4])[-\s]?\d{3,4}[-\s]?\d{4}\b/g,
    replacement: '0##-****-****',
    severity: 'MEDIUM',
  },
  {
    name: 'email',
    label: '이메일',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[이메일]',
    severity: 'HIGH',
  },
  {
    name: 'account',
    label: '계좌번호',
    regex: /\b\d{3,4}[-\s]?\d{2,6}[-\s]?\d{2,8}\b/g,
    replacement: '[계좌번호]',
    severity: 'HIGH',
  },
  {
    name: 'card',
    label: '카드번호',
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '****-****-****-****',
    severity: 'HIGH',
  },
  {
    name: 'detailed_address',
    label: '상세 지번',
    // "○○동 123-45" → "○○동" 수준으로 일반화
    regex: /([가-힣]+[동리가])\s*\d+(-\d+)?(번지)?/g,
    replacement: '$1',
    severity: 'MEDIUM',
  },
  {
    name: 'apartment_unit',
    label: '동호수',
    regex: /\d+동\s*\d+호/g,
    replacement: '○○동 ○○호',
    severity: 'MEDIUM',
  },
]

// ─── 한국 이름 간이 사전 (MVP) ────────────────────────────
/**
 * MVP 단계: 흔한 성씨 + 2~3자 조합 탐지.
 * 정확도 한계가 있어 매각자/운영자 이중 검수가 필수.
 * ML NER로 Phase 4 이후 교체.
 */
const COMMON_SURNAMES = [
  '김','이','박','최','정','강','조','윤','장','임',
  '한','오','서','신','권','황','안','송','류','전',
  '홍','고','문','양','손','배','백','허','남','심',
  '노','하','곽','성','차','주','우','구','민','유',
]

const NAME_REGEX = new RegExp(
  `(?<![가-힣])(${COMMON_SURNAMES.join('|')})[가-힣]{1,2}(?![가-힣])`,
  'g'
)

// ─── 탐지 결과 ────────────────────────────────────────────
export interface DetectedPii {
  pattern: string
  label: string
  value: string
  start: number
  end: number
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

/** 텍스트에서 PII 탐지 (치환하지 않고 위치만 반환) */
export function detectPii(text: string): DetectedPii[] {
  const found: DetectedPii[] = []

  for (const pattern of PII_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      found.push({
        pattern: pattern.name,
        label: pattern.label,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        severity: pattern.severity,
      })
    }
  }

  // 이름 탐지
  let nameMatch: RegExpExecArray | null
  const nameRe = new RegExp(NAME_REGEX.source, 'g')
  while ((nameMatch = nameRe.exec(text)) !== null) {
    found.push({
      pattern: 'korean_name',
      label: '한글 이름',
      value: nameMatch[0],
      start: nameMatch.index,
      end: nameMatch.index + nameMatch[0].length,
      severity: 'HIGH',
    })
  }

  // 위치 순 정렬 + 중복 제거 (같은 범위가 여러 패턴에 매칭될 때)
  found.sort((a, b) => a.start - b.start)
  return dedupe(found)
}

function dedupe(items: DetectedPii[]): DetectedPii[] {
  const result: DetectedPii[] = []
  for (const item of items) {
    const overlap = result.find(r => !(item.end <= r.start || item.start >= r.end))
    if (!overlap) result.push(item)
    // 이미 겹치는 항목이 있으면 더 HIGH severity를 우선
    else if (severityRank(item.severity) > severityRank(overlap.severity)) {
      const idx = result.indexOf(overlap)
      result[idx] = item
    }
  }
  return result
}

function severityRank(s: 'HIGH' | 'MEDIUM' | 'LOW'): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1
}

// ─── 마스킹 처리 ──────────────────────────────────────────
export interface MaskingResult {
  original: string
  masked: string
  detected: DetectedPii[]
  appliedRules: string[]
}

/** 텍스트 전체 마스킹 */
export function maskText(text: string): MaskingResult {
  let masked = text
  const applied = new Set<string>()

  // 패턴 기반 치환
  for (const pattern of PII_PATTERNS) {
    const before = masked
    masked = masked.replace(pattern.regex, pattern.replacement)
    if (before !== masked) applied.add(pattern.name)
  }

  // 이름 치환
  const beforeName = masked
  masked = masked.replace(NAME_REGEX, (m) => `[${m.charAt(0)}○○]`)
  if (beforeName !== masked) applied.add('korean_name')

  const detected = detectPii(text)
  return {
    original: text,
    masked,
    detected,
    appliedRules: Array.from(applied),
  }
}

// ─── 검수 요약 ────────────────────────────────────────────
export interface MaskingSummary {
  totalDetected: number
  bySeverity: Record<'HIGH' | 'MEDIUM' | 'LOW', number>
  byPattern: Record<string, number>
  hasHighRisk: boolean
}

export function summarize(result: MaskingResult): MaskingSummary {
  const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  const byPattern: Record<string, number> = {}

  for (const item of result.detected) {
    bySeverity[item.severity]++
    byPattern[item.pattern] = (byPattern[item.pattern] ?? 0) + 1
  }

  return {
    totalDetected: result.detected.length,
    bySeverity,
    byPattern,
    hasHighRisk: bySeverity.HIGH > 0,
  }
}
