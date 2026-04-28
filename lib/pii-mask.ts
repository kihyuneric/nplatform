/**
 * PII auto-masking — server-side text sanitizer.
 * Used by /api/v1/deal-rooms/[id]/messages POST and any other endpoint that
 * accepts free-text from users (NDA notes, comments, etc.).
 */

const PII_PATTERNS: Array<{ kind: string; re: RegExp; replacer: (m: string) => string }> = [
  // 전화번호 (한국)
  { kind: 'phone', re: /\b(?:01[016789]|02|0[3-6]\d?)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, replacer: () => '[전화번호 마스킹]' },
  // 주민등록번호
  { kind: 'rrn', re: /\b\d{6}-?[1-4]\d{6}\b/g, replacer: () => '[주민번호 마스킹]' },
  // 이메일
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacer: () => '[이메일 마스킹]' },
  // 카카오톡 / 텔레그램 / 디스코드 ID 패턴
  { kind: 'external_handle', re: /\b(?:kakao|telegram|텔레그램|카카오톡)\s*(?:id|아이디)?\s*[:=]?\s*[A-Za-z0-9_.-]{3,}\b/gi, replacer: () => '[외부 채널 핸들 마스킹]' },
  // 외부 URL (단, nplatform.co.kr 제외)
  { kind: 'external_url', re: /\bhttps?:\/\/(?!(?:[a-z0-9-]+\.)?nplatform\.co\.kr)[^\s]+/gi, replacer: () => '[외부 링크 마스킹]' },
]

export function maskPII(text: string): { masked: string; categories: string[] } {
  let masked = text
  const categories = new Set<string>()
  for (const p of PII_PATTERNS) {
    if (p.re.test(masked)) {
      categories.add(p.kind)
      p.re.lastIndex = 0
      masked = masked.replace(p.re, p.replacer)
    }
  }
  return { masked, categories: Array.from(categories) }
}
