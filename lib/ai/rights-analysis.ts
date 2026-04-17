/**
 * lib/ai/rights-analysis.ts
 *
 * 권리분석 RAG 엔진. 등기부등본·임대차현황·경매내역·선순위채권 텍스트를
 * 받아 → 권리관계 그래프 + 위험 시나리오 + 인용 근거를 생성한다.
 *
 * 호출 위치:
 *   - /api/v1/ai/rights-analysis (POST) — 매물 등록 Step 4
 *   - /analysis/[id] 권리분석 탭
 *   - /deals/[id] 실사 탭의 "권리분석 요약" 카드
 *
 * 설계:
 *   1) 입력 문서를 lineage(원본 출처) 단위로 청크 분할
 *   2) 각 청크를 ruleset 기반 분류기로 entity 추출 (가등기/근저당/전세권 등)
 *   3) 추출된 entities를 우선순위 정렬 → RightsLedger 생성
 *   4) 위험 룰 매트릭스로 RiskFinding[] 산출
 *   5) 각 finding은 source_chunk_id + offset로 RAG citation 가능
 *
 * v1: ruleset/heuristic 기반 (학습 모델 없음)
 * v2 (예정): citations.embedding으로 의미 검색 + LLM rerank
 */

import type { CollateralType } from "@/components/npl"

// ─── Types ────────────────────────────────────────────────────

export type RightsKind =
  | "OWNERSHIP"          // 소유권
  | "MORTGAGE"           // (근)저당
  | "JEONSE"             // 전세권
  | "LEASE"              // 임차권 (대항력)
  | "PROVISIONAL_REG"    // 가등기
  | "ATTACHMENT"         // 가압류·압류
  | "INJUNCTION"         // 가처분
  | "TRUST"              // 신탁
  | "EASEMENT"           // 지상권·지역권
  | "OTHER"

export interface RightsEntity {
  id: string
  kind: RightsKind
  /** 원금 또는 채권최고액 (KRW). 권리에 따라 0 가능. */
  amount: number
  /** 등기부 접수일 (YYYY-MM-DD) — 우선순위 산정 기준 */
  receivedAt: string
  holder: string
  /** 말소 여부 (말소된 권리는 분석 대상에서 제외) */
  cancelled: boolean
  /** 인용 근거 */
  sourceChunkId: string
  rawText: string
}

export interface RightsAnalysisInput {
  collateralType: CollateralType
  /** 등기부등본 전문 (텍스트) */
  registryText: string
  /** 임대차현황서 전문 */
  leaseText?: string
  /** 경매내역서/매각물건명세서 */
  auctionText?: string
  /** 감정가 (KRW) — 위험 비율 산정용 */
  appraisalValue: number
}

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface RiskFinding {
  code: string                  // 예: "SR-001" 선순위 임차보증금 초과
  severity: RiskSeverity
  title: string
  description: string
  /** 영향 추정 (KRW) — 회수 차감액 */
  impactAmount: number
  /** 인용 (chunk id 배열) */
  citations: string[]
}

export interface RightsAnalysisResult {
  entities: RightsEntity[]
  findings: RiskFinding[]
  /** 권리관계 요약 1줄 (UI 카드용) */
  headline: string
  /** 0~100, 100 = 무위험 */
  cleanScore: number
  /** 회수가능 추정액 (KRW) */
  recoverable: number
  /** 모델 버전 */
  modelVersion: string
}

// ─── Constants ────────────────────────────────────────────────

const MODEL_VERSION = "rights-analysis-v1.0.0-2026-04"

// 우선순위 점수 — 작을수록 선순위
const KIND_PRIORITY: Record<RightsKind, number> = {
  OWNERSHIP:        0,
  TRUST:            5,
  MORTGAGE:        10,
  JEONSE:          15,
  LEASE:           20,
  PROVISIONAL_REG: 25,
  ATTACHMENT:      30,
  INJUNCTION:      35,
  EASEMENT:        40,
  OTHER:           99,
}

// ─── Chunking ─────────────────────────────────────────────────

interface SourceChunk {
  id: string
  origin: "REGISTRY" | "LEASE" | "AUCTION"
  text: string
}

function chunk(text: string, origin: SourceChunk["origin"]): SourceChunk[] {
  if (!text?.trim()) return []
  // 문단/번호/접수번호 단위로 분할
  const blocks = text.split(/\n{2,}|(?=\d+\s*\.\s)|(?=제\s*\d+\s*조)/g)
  return blocks
    .map(b => b.trim())
    .filter(b => b.length > 0)
    .map((t, i) => ({
      id: `${origin}-${String(i + 1).padStart(3, "0")}`,
      origin,
      text: t,
    }))
}

// ─── Entity extraction (ruleset) ──────────────────────────────

const RULES: { kind: RightsKind; pattern: RegExp }[] = [
  { kind: "MORTGAGE",        pattern: /근저당권|저당권/ },
  { kind: "JEONSE",          pattern: /전세권/ },
  { kind: "LEASE",           pattern: /임차권|주택임대차|상가건물임대차/ },
  { kind: "PROVISIONAL_REG", pattern: /가등기/ },
  { kind: "ATTACHMENT",      pattern: /가압류|압류/ },
  { kind: "INJUNCTION",      pattern: /가처분/ },
  { kind: "TRUST",           pattern: /신탁/ },
  { kind: "EASEMENT",        pattern: /지상권|지역권/ },
  { kind: "OWNERSHIP",       pattern: /소유권이전|소유자/ },
]

function detectKind(text: string): RightsKind | null {
  for (const r of RULES) {
    if (r.pattern.test(text)) return r.kind
  }
  return null
}

function parseAmount(text: string): number {
  // "채권최고액 금120,000,000원", "보증금 1억 5천만원" 등
  const won = text.match(/([\d,]+)\s*원/)?.[1]
  if (won) return Number(won.replace(/,/g, ""))

  // 한글 단위
  let total = 0
  const eok = text.match(/(\d+)\s*억/)?.[1]
  const cheon = text.match(/(\d+)\s*천만/)?.[1]
  const baek = text.match(/(\d+)\s*백만/)?.[1]
  if (eok) total += Number(eok) * 1e8
  if (cheon) total += Number(cheon) * 1e7
  if (baek) total += Number(baek) * 1e6
  return total
}

function parseDate(text: string): string {
  // "2024년 5월 12일" 또는 "2024-05-12"
  const iso = text.match(/(\d{4})[-./년]\s*(\d{1,2})[-./월]\s*(\d{1,2})/)
  if (!iso) return "1970-01-01"
  const [, y, m, d] = iso
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
}

function isCancelled(text: string): boolean {
  return /말소|해지|소멸/.test(text) && !/말소되지\s*않/.test(text)
}

function extractEntities(chunks: SourceChunk[]): RightsEntity[] {
  const out: RightsEntity[] = []
  let counter = 1
  for (const c of chunks) {
    const kind = detectKind(c.text)
    if (!kind) continue
    out.push({
      id: `R-${String(counter++).padStart(3, "0")}`,
      kind,
      amount: parseAmount(c.text),
      receivedAt: parseDate(c.text),
      holder: extractHolder(c.text),
      cancelled: isCancelled(c.text),
      sourceChunkId: c.id,
      rawText: c.text.slice(0, 240),
    })
  }
  return out
}

function extractHolder(text: string): string {
  // "주식회사 ○○은행", "○○○ (주민번호)" — 기관명 우선
  const corp = text.match(/((?:주식회사|㈜)\s*[^\s,()]+)/)?.[1]
  if (corp) return corp
  const person = text.match(/(?:권리자|채권자|임차인|소유자)\s*[:：]?\s*([^\s,()]+)/)?.[1]
  return person ?? "미상"
}

// ─── Sorting ──────────────────────────────────────────────────

function sortByPriority(entities: RightsEntity[]): RightsEntity[] {
  return [...entities]
    .filter(e => !e.cancelled)
    .sort((a, b) => {
      const ka = KIND_PRIORITY[a.kind]
      const kb = KIND_PRIORITY[b.kind]
      if (ka !== kb) return ka - kb
      return a.receivedAt.localeCompare(b.receivedAt)
    })
}

// ─── Risk rules ───────────────────────────────────────────────

function buildFindings(
  entities: RightsEntity[],
  appraisalValue: number,
): RiskFinding[] {
  const findings: RiskFinding[] = []
  const active = entities.filter(e => !e.cancelled)

  // SR-001: 선순위 채권 합계가 감정가의 70% 초과
  const seniorAmount = active
    .filter(e => e.kind === "MORTGAGE" || e.kind === "JEONSE" || e.kind === "LEASE")
    .reduce((sum, e) => sum + e.amount, 0)
  const seniorRatio = appraisalValue > 0 ? seniorAmount / appraisalValue : 0
  if (seniorRatio > 0.7) {
    findings.push({
      code: "SR-001",
      severity: seniorRatio > 1 ? "CRITICAL" : "HIGH",
      title: "선순위 채권 비율 과다",
      description: `선순위 합계 ${(seniorAmount / 1e8).toFixed(1)}억원이 감정가의 ${(seniorRatio * 100).toFixed(0)}%를 차지합니다.`,
      impactAmount: Math.max(0, seniorAmount - appraisalValue * 0.7),
      citations: active
        .filter(e => e.kind === "MORTGAGE" || e.kind === "JEONSE")
        .map(e => e.sourceChunkId),
    })
  }

  // SR-002: 가등기 존재
  const provReg = active.filter(e => e.kind === "PROVISIONAL_REG")
  if (provReg.length > 0) {
    findings.push({
      code: "SR-002",
      severity: "HIGH",
      title: "가등기 존재 (소유권 분쟁 위험)",
      description: `${provReg.length}건의 가등기가 말소되지 않았습니다. 본등기 가능 시 소유권 상실 위험이 있습니다.`,
      impactAmount: appraisalValue * 0.3,
      citations: provReg.map(e => e.sourceChunkId),
    })
  }

  // SR-003: 대항력 임차인 (확정일자 미확인)
  const lease = active.filter(e => e.kind === "LEASE")
  if (lease.length > 0) {
    const leaseSum = lease.reduce((s, e) => s + e.amount, 0)
    findings.push({
      code: "SR-003",
      severity: leaseSum > appraisalValue * 0.3 ? "HIGH" : "MEDIUM",
      title: "대항력 임차인 보증금 인수 가능",
      description: `임차보증금 합계 ${(leaseSum / 1e8).toFixed(1)}억원. 대항력·확정일자 확인 필요.`,
      impactAmount: leaseSum,
      citations: lease.map(e => e.sourceChunkId),
    })
  }

  // SR-004: 가처분
  const inj = active.filter(e => e.kind === "INJUNCTION")
  if (inj.length > 0) {
    findings.push({
      code: "SR-004",
      severity: "MEDIUM",
      title: "처분금지 가처분 등재",
      description: "처분 제한 권리가 등재되어 있어 매각 절차에 영향을 줄 수 있습니다.",
      impactAmount: 0,
      citations: inj.map(e => e.sourceChunkId),
    })
  }

  // SR-005: 신탁등기
  const trust = active.filter(e => e.kind === "TRUST")
  if (trust.length > 0) {
    findings.push({
      code: "SR-005",
      severity: "HIGH",
      title: "신탁등기 — 수탁자 동의 필요",
      description: "소유권이 신탁회사에 있어, 매각·임대 시 수탁자 동의 절차가 필요합니다.",
      impactAmount: appraisalValue * 0.05,
      citations: trust.map(e => e.sourceChunkId),
    })
  }

  return findings
}

// ─── Scoring ──────────────────────────────────────────────────

function computeCleanScore(findings: RiskFinding[]): number {
  let score = 100
  for (const f of findings) {
    score -= f.severity === "CRITICAL" ? 40
      : f.severity === "HIGH" ? 20
      : f.severity === "MEDIUM" ? 10 : 5
  }
  return Math.max(0, score)
}

function buildHeadline(
  entities: RightsEntity[],
  findings: RiskFinding[],
): string {
  if (findings.length === 0) {
    return `권리관계 깨끗 — 활성 등기 ${entities.filter(e => !e.cancelled).length}건, 위험요소 없음`
  }
  const critical = findings.find(f => f.severity === "CRITICAL")
  if (critical) return `${critical.title} (${critical.code})`
  const high = findings.find(f => f.severity === "HIGH")
  if (high) return `${high.title} 외 ${findings.length - 1}건 검토 필요`
  return `${findings.length}건의 권리분석 이슈 검토 필요`
}

// ─── Public API ───────────────────────────────────────────────

export function analyzeRights(input: RightsAnalysisInput): RightsAnalysisResult {
  const chunks: SourceChunk[] = [
    ...chunk(input.registryText, "REGISTRY"),
    ...chunk(input.leaseText ?? "", "LEASE"),
    ...chunk(input.auctionText ?? "", "AUCTION"),
  ]
  const rawEntities = extractEntities(chunks)
  const entities = sortByPriority(rawEntities)
  const findings = buildFindings(entities, input.appraisalValue)
  const cleanScore = computeCleanScore(findings)

  // 회수가능액 = 감정가 - 위험 영향 합계
  const totalImpact = findings.reduce((s, f) => s + f.impactAmount, 0)
  const recoverable = Math.max(0, input.appraisalValue - totalImpact)

  return {
    entities,
    findings,
    headline: buildHeadline(entities, findings),
    cleanScore,
    recoverable,
    modelVersion: MODEL_VERSION,
  }
}

// ─── 인용 검증 (RAG citation API) ─────────────────────────────

export interface CitationLookup {
  chunkId: string
  origin: SourceChunk["origin"]
  excerpt: string
}

/**
 * findings의 citation chunkId를 받아 원문 발췌를 돌려준다.
 * UI 툴팁/모달에서 "근거 보기" 버튼이 호출.
 */
export function lookupCitations(
  input: RightsAnalysisInput,
  chunkIds: string[],
): CitationLookup[] {
  const chunks: SourceChunk[] = [
    ...chunk(input.registryText, "REGISTRY"),
    ...chunk(input.leaseText ?? "", "LEASE"),
    ...chunk(input.auctionText ?? "", "AUCTION"),
  ]
  const map = new Map(chunks.map(c => [c.id, c]))
  return chunkIds
    .map(id => map.get(id))
    .filter((c): c is SourceChunk => Boolean(c))
    .map(c => ({
      chunkId: c.id,
      origin: c.origin,
      excerpt: c.text.slice(0, 200),
    }))
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  chunk,
  detectKind,
  parseAmount,
  parseDate,
  KIND_PRIORITY,
  MODEL_VERSION,
}
