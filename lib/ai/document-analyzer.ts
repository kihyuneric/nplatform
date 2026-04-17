// ─── NLP 문서 분석 엔진 v2 ──────────────────────────────────
// 등기부등본, 계약서, 감정평가서 등 NPL 관련 문서를 자동 분석.
//
// v2: Claude LLM 기반 구조화 추출 + 기존 정규식 fallback
//   - analyzeDocumentWithAI(): Claude API로 문서 분석 (권장)
//   - parseRegistryDocument(): 정규식 fallback (API 미설정 시)
//   - scanContractRisk(): 정규식 기반 리스크 스캔 + LLM 보강
//   - extractAppraisalData(): 감정평가서 추출

import { z } from "zod"
import { getAIService } from "./core/llm-service"

// ─── 등기부등본 분석 ────────────────────────────────────────

export interface RegistryParseResult {
  propertyInfo: {
    address: string
    lotNumber: string
    buildingName?: string
    landArea: number           // ㎡
    buildingArea: number       // ㎡
    structureType: string
    usage: string
    buildDate: string
    floors: { above: number; below: number }
  }
  ownershipSection: OwnershipEntry[]    // 갑구 (소유권)
  encumbranceSection: EncumbranceEntry[]  // 을구 (저당·전세)
  summary: {
    currentOwner: string
    ownershipType: string      // 단독/공동
    totalMortgage: number
    totalSeizure: number
    hasProvisionalDisposition: boolean
    hasLeasehold: boolean
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    flags: string[]
  }
}

export interface OwnershipEntry {
  rank: number
  registrationNumber: string
  registrationDate: string
  registrationCause: string   // 매매, 상속, 증여, 경매 등
  ownerName: string
  ownerAddress?: string
  shareRatio?: string
  relatedEntry?: string
}

export interface EncumbranceEntry {
  rank: number
  registrationNumber: string
  registrationDate: string
  type: "근저당" | "저당" | "전세권" | "지역권" | "지상권" | "가등기" | "임차권"
  creditor: string
  debtorName?: string
  claimAmount: number
  maxClaimAmount: number
  interest?: string
  maturityDate?: string
  status: "유효" | "말소" | "이전"
}

export function parseRegistryDocument(ocrText: string): RegistryParseResult {
  // 정규표현식 기반 등기부등본 파싱

  const lines = ocrText.split("\n").map(l => l.trim()).filter(Boolean)

  // 1. 부동산 기본 정보
  const addressMatch = ocrText.match(/소\s*재\s*지[:\s]*([^\n]+)/)
  const areaMatch = ocrText.match(/면\s*적[:\s]*([\d,.]+)\s*㎡/)
  const buildAreaMatch = ocrText.match(/건물\s*면적[:\s]*([\d,.]+)\s*㎡/)
  const usageMatch = ocrText.match(/용\s*도[:\s]*([^\n,]+)/)
  const structureMatch = ocrText.match(/구\s*조[:\s]*([^\n,]+)/)
  const buildDateMatch = ocrText.match(/건축\s*일[:\s]*([\d.\-/]+)/)

  const propertyInfo = {
    address: addressMatch?.[1]?.trim() ?? "",
    lotNumber: extractLotNumber(ocrText),
    landArea: parseFloat(areaMatch?.[1]?.replace(/,/g, "") ?? "0"),
    buildingArea: parseFloat(buildAreaMatch?.[1]?.replace(/,/g, "") ?? "0"),
    structureType: structureMatch?.[1]?.trim() ?? "",
    usage: usageMatch?.[1]?.trim() ?? "",
    buildDate: buildDateMatch?.[1]?.trim() ?? "",
    floors: extractFloors(ocrText),
  }

  // 2. 갑구 (소유권 관련) 파싱
  const ownershipSection = parseOwnershipSection(ocrText)

  // 3. 을구 (저당·전세 관련) 파싱
  const encumbranceSection = parseEncumbranceSection(ocrText)

  // 4. 요약 생성
  const currentOwner = ownershipSection.filter(e => !e.registrationCause.includes("말소")).at(-1)?.ownerName ?? "미확인"
  const totalMortgage = encumbranceSection.filter(e => e.status === "유효" && (e.type === "근저당" || e.type === "저당")).reduce((s, e) => s + e.maxClaimAmount, 0)
  const totalSeizure = ownershipSection.filter(e => e.registrationCause.includes("압류") || e.registrationCause.includes("가압류")).length
  const hasProvisionalDisposition = ownershipSection.some(e => e.registrationCause.includes("가처분") || e.registrationCause.includes("가등기"))
  const hasLeasehold = encumbranceSection.some(e => e.type === "전세권" && e.status === "유효")

  const flags: string[] = []
  if (totalMortgage > propertyInfo.landArea * 5_000_000) flags.push("근저당 과다 설정")
  if (totalSeizure > 0) flags.push(`압류/가압류 ${totalSeizure}건`)
  if (hasProvisionalDisposition) flags.push("가처분/가등기 존재")
  if (hasLeasehold) flags.push("전세권 설정")

  const riskLevel = flags.length >= 3 ? "CRITICAL" : flags.length >= 2 ? "HIGH" : flags.length >= 1 ? "MEDIUM" : "LOW"

  return {
    propertyInfo,
    ownershipSection,
    encumbranceSection,
    summary: {
      currentOwner,
      ownershipType: ownershipSection.some(e => e.shareRatio) ? "공동소유" : "단독소유",
      totalMortgage,
      totalSeizure,
      hasProvisionalDisposition,
      hasLeasehold,
      riskLevel,
      flags,
    },
  }
}

// ─── 계약서 리스크 스캔 ──────────────────────────────────────

export interface ContractRiskResult {
  documentType: "매매계약" | "임대차계약" | "채권양도계약" | "기타"
  parties: { role: string; name: string }[]
  keyTerms: {
    term: string
    value: string
    risk: "SAFE" | "CAUTION" | "DANGER"
    note: string
  }[]
  missingClauses: {
    clause: string
    importance: "REQUIRED" | "RECOMMENDED" | "OPTIONAL"
    reason: string
  }[]
  riskScore: number        // 0~100 (낮을수록 안전)
  recommendations: string[]
}

const REQUIRED_CLAUSES = [
  { clause: "목적물 표시", importance: "REQUIRED" as const, reason: "매매 대상 특정이 불분명할 경우 계약 무효 가능" },
  { clause: "매매대금 및 지급방법", importance: "REQUIRED" as const, reason: "대금 지급 조건 미기재 시 분쟁 소지" },
  { clause: "소유권 이전 시기", importance: "REQUIRED" as const, reason: "이전 시기 불명확 시 법적 분쟁 가능" },
  { clause: "채권양도통지 조항", importance: "REQUIRED" as const, reason: "NPL 거래 시 채무자 통지 의무 (민법 제450조)" },
  { clause: "하자담보책임", importance: "RECOMMENDED" as const, reason: "물건 하자 시 매수자 보호" },
  { clause: "계약해제 조건", importance: "RECOMMENDED" as const, reason: "해제 조건 불명확 시 일방 해제 분쟁" },
  { clause: "위약금 조항", importance: "RECOMMENDED" as const, reason: "채무불이행 시 손해배상 예정" },
  { clause: "진술보증 (Representation & Warranty)", importance: "RECOMMENDED" as const, reason: "매도자의 사실 확인 (소송 부존재, 세금 체납 없음 등)" },
  { clause: "비밀유지 조항 (NDA)", importance: "OPTIONAL" as const, reason: "거래 정보 유출 방지" },
  { clause: "분쟁 해결 (관할법원/중재)", importance: "RECOMMENDED" as const, reason: "분쟁 발생 시 해결 절차 명시" },
  { clause: "근저당 말소 조건", importance: "REQUIRED" as const, reason: "잔존 근저당 미말소 시 매수자 손해" },
  { clause: "쿨링오프 기간", importance: "OPTIONAL" as const, reason: "7일 이내 무조건 철회 가능 조항" },
]

const RISK_KEYWORDS: { pattern: RegExp; risk: "CAUTION" | "DANGER"; note: string }[] = [
  { pattern: /무조건\s*매수|현\s*상태\s*인수/g, risk: "DANGER", note: "현상태 인수 조건 — 하자 발견 시 구제 불가" },
  { pattern: /일체의?\s*이의\s*제기\s*(않|하지)/g, risk: "DANGER", note: "이의권 포기 조항 — 매수자에게 극히 불리" },
  { pattern: /위약금\s*없/g, risk: "CAUTION", note: "위약금 미설정 — 채무불이행 시 보호 미흡" },
  { pattern: /소유권\s*이전\s*전\s*멸실/g, risk: "CAUTION", note: "소유권 이전 전 위험부담 조항 확인 필요" },
  { pattern: /제3자\s*(양도|이전|매매)\s*(가능|허용)/g, risk: "CAUTION", note: "제3자 양도 허용 — 거래 상대방 변경 리스크" },
  { pattern: /자동\s*갱신|자동\s*연장/g, risk: "CAUTION", note: "자동 갱신 조항 — 의도치 않은 계약 연장 가능" },
]

export function scanContractRisk(contractText: string): ContractRiskResult {
  const text = contractText.toLowerCase()

  // 문서 유형 판별
  const documentType =
    text.includes("채권양도") ? "채권양도계약" :
    text.includes("임대차") ? "임대차계약" :
    text.includes("매매") ? "매매계약" : "기타"

  // 당사자 추출
  const parties: ContractRiskResult["parties"] = []
  const sellerMatch = contractText.match(/(매도자|양도인|임대인)[:\s]*([^\n(]+)/)
  const buyerMatch = contractText.match(/(매수자|양수인|임차인)[:\s]*([^\n(]+)/)
  if (sellerMatch) parties.push({ role: sellerMatch[1], name: sellerMatch[2].trim() })
  if (buyerMatch) parties.push({ role: buyerMatch[1], name: buyerMatch[2].trim() })

  // 핵심 조건 추출 + 리스크 키워드 스캔
  const keyTerms: ContractRiskResult["keyTerms"] = []
  for (const { pattern, risk, note } of RISK_KEYWORDS) {
    const matches = contractText.match(pattern)
    if (matches) {
      keyTerms.push({ term: matches[0], value: "", risk, note })
    }
  }

  // 누락 조항 검사
  const missingClauses = REQUIRED_CLAUSES.filter(rc => {
    const keywords = rc.clause.split(/[/()]/).map(k => k.trim().toLowerCase())
    return !keywords.some(k => k.length > 1 && text.includes(k))
  })

  // 리스크 점수 산정
  let riskScore = 0
  riskScore += keyTerms.filter(t => t.risk === "DANGER").length * 20
  riskScore += keyTerms.filter(t => t.risk === "CAUTION").length * 10
  riskScore += missingClauses.filter(c => c.importance === "REQUIRED").length * 15
  riskScore += missingClauses.filter(c => c.importance === "RECOMMENDED").length * 5
  riskScore = Math.min(100, riskScore)

  // 권고사항 생성
  const recommendations: string[] = []
  if (riskScore >= 60) recommendations.push("전문 법무사/변호사 검토 강력 권고")
  if (missingClauses.some(c => c.importance === "REQUIRED")) recommendations.push("필수 조항 누락 — 계약서 보완 필요")
  if (keyTerms.some(t => t.risk === "DANGER")) recommendations.push("위험 조항 발견 — 수정 또는 삭제 요청")
  if (documentType === "채권양도계약") recommendations.push("채권양도통지서 내용증명 발송 필수 (민법 제450조)")

  return {
    documentType,
    parties,
    keyTerms,
    missingClauses,
    riskScore,
    recommendations,
  }
}

// ─── 감정평가서 핵심 수치 추출 ───────────────────────────────

export interface AppraisalExtraction {
  appraisalDate: string
  appraiser: string
  purpose: string
  targetProperty: string
  landValue: number
  buildingValue: number
  totalValue: number
  landPricePerPyeong: number
  buildingPricePerPyeong: number
  method: "비교방식" | "수익방식" | "원가방식" | "혼합"
  comparables: { address: string; price: number; date: string }[]
  adjustments: { factor: string; adjustment: number; reason: string }[]
  conclusion: string
}

export function extractAppraisalData(ocrText: string): AppraisalExtraction {
  const totalMatch = ocrText.match(/감정\s*가[액]?[:\s]*([\d,]+)\s*원/)
  const landMatch = ocrText.match(/토지\s*가[액]?[:\s]*([\d,]+)\s*원/)
  const buildMatch = ocrText.match(/건물\s*가[액]?[:\s]*([\d,]+)\s*원/)
  const dateMatch = ocrText.match(/감정\s*일[:\s]*([\d.\-/]+)/)
  const appraiserMatch = ocrText.match(/감정\s*인[:\s]*([^\n]+)/)

  const totalValue = parseInt(totalMatch?.[1]?.replace(/,/g, "") ?? "0")
  const landValue = parseInt(landMatch?.[1]?.replace(/,/g, "") ?? "0")
  const buildingValue = parseInt(buildMatch?.[1]?.replace(/,/g, "") ?? "0")

  return {
    appraisalDate: dateMatch?.[1]?.trim() ?? "",
    appraiser: appraiserMatch?.[1]?.trim() ?? "",
    purpose: ocrText.includes("경매") ? "담보권 실행을 위한 경매" : "일반 감정",
    targetProperty: extractPropertyFromAppraisal(ocrText),
    landValue,
    buildingValue,
    totalValue: totalValue || (landValue + buildingValue),
    landPricePerPyeong: 0, // 면적 정보 필요
    buildingPricePerPyeong: 0,
    method: ocrText.includes("비교") ? "비교방식" : ocrText.includes("수익") ? "수익방식" : "원가방식",
    comparables: extractAppraisalComparables(ocrText),
    adjustments: [],
    conclusion: extractConclusion(ocrText),
  }
}

// ─── 내부 파싱 헬퍼 ──────────────────────────────────────────

function extractLotNumber(text: string): string {
  const match = text.match(/지\s*번[:\s]*([^\n]+)/)
  return match?.[1]?.trim() ?? ""
}

function extractFloors(text: string): { above: number; below: number } {
  const aboveMatch = text.match(/지상\s*(\d+)\s*층/)
  const belowMatch = text.match(/지하\s*(\d+)\s*층/)
  return {
    above: parseInt(aboveMatch?.[1] ?? "0"),
    below: parseInt(belowMatch?.[1] ?? "0"),
  }
}

function parseOwnershipSection(text: string): OwnershipEntry[] {
  // 갑구 섹션 추출 및 파싱
  const entries: OwnershipEntry[] = []
  const sectionMatch = text.match(/갑\s*구[\s\S]*?(?=을\s*구|$)/i)
  if (!sectionMatch) return entries

  const lines = sectionMatch[0].split("\n")
  let rank = 1
  for (const line of lines) {
    const dateMatch = line.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/)
    const causeMatch = line.match(/(소유권이전|매매|상속|증여|경매|압류|가압류|가처분|신탁)/)
    const nameMatch = line.match(/(?:소유자|권리자)[:\s]*([^\n,]+)/)

    if (dateMatch && causeMatch) {
      entries.push({
        rank: rank++,
        registrationNumber: `갑${rank}`,
        registrationDate: dateMatch[1],
        registrationCause: causeMatch[1],
        ownerName: nameMatch?.[1]?.trim() ?? "",
      })
    }
  }
  return entries
}

function parseEncumbranceSection(text: string): EncumbranceEntry[] {
  const entries: EncumbranceEntry[] = []
  const sectionMatch = text.match(/을\s*구[\s\S]*/i)
  if (!sectionMatch) return entries

  const lines = sectionMatch[0].split("\n")
  let rank = 1
  for (const line of lines) {
    const dateMatch = line.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/)
    const typeMatch = line.match(/(근저당|저당|전세권|지역권|지상권|가등기|임차권)/)
    const amountMatch = line.match(/([\d,]+)\s*원/)
    const creditorMatch = line.match(/(?:권리자|채권자)[:\s]*([^\n,]+)/)

    if (dateMatch && typeMatch) {
      const amount = parseInt(amountMatch?.[1]?.replace(/,/g, "") ?? "0")
      entries.push({
        rank: rank++,
        registrationNumber: `을${rank}`,
        registrationDate: dateMatch[1],
        type: typeMatch[1] as EncumbranceEntry["type"],
        creditor: creditorMatch?.[1]?.trim() ?? "",
        claimAmount: amount,
        maxClaimAmount: Math.round(amount * 1.2), // 근저당 채권최고액 ≈ 120%
        status: line.includes("말소") ? "말소" : "유효",
      })
    }
  }
  return entries
}

function extractPropertyFromAppraisal(text: string): string {
  const match = text.match(/소\s*재\s*지[:\s]*([^\n]+)/)
  return match?.[1]?.trim() ?? ""
}

function extractAppraisalComparables(text: string): { address: string; price: number; date: string }[] {
  // 간이: 비교 사례 추출
  const comparables: { address: string; price: number; date: string }[] = []
  const matches = text.matchAll(/사례\s*\d[:\s]*([^\n]+?)\s*([\d,]+)\s*원\s*([\d.\-/]+)/g)
  for (const m of matches) {
    comparables.push({
      address: m[1].trim(),
      price: parseInt(m[2].replace(/,/g, "")),
      date: m[3],
    })
  }
  return comparables
}

function extractConclusion(text: string): string {
  const match = text.match(/(?:결론|종합의견|감정의견)[:\s]*([^\n]+)/)
  return match?.[1]?.trim() ?? ""
}

// ═══════════════════════════════════════════════════════════════
// v2: Claude LLM 기반 문서 분석 (추가)
// ═══════════════════════════════════════════════════════════════

/** LLM 분석 결과 (정규식보다 훨씬 풍부한 구조화 데이터) */
export interface AIDocumentAnalysis {
  documentType: "등기부등본" | "매매계약서" | "채권양도계약서" | "임대차계약서" | "감정평가서" | "기타"
  confidence: number
  summary: string
  /** 구조화 추출 데이터 */
  extractedData: Record<string, unknown>
  /** AI가 발견한 리스크 */
  risks: Array<{
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    category: string
    description: string
    legalBasis?: string
    recommendation: string
  }>
  /** AI의 종합 의견 */
  opinion: string
  /** 추가 확인 필요 사항 */
  needsVerification: string[]
  /** 사용된 분석 방법 */
  method: "llm" | "regex-fallback"
}

const DOCUMENT_ANALYSIS_PROMPT = `당신은 한국 부동산 법률 문서 전문 분석가입니다.

## 작업
주어진 문서 텍스트(OCR 결과)를 분석하여 구조화된 JSON으로 반환합니다.

## 분석 규칙
1. 문서 유형을 먼저 판별합니다 (등기부등본/매매계약서/채권양도계약서/임대차계약서/감정평가서)
2. 핵심 데이터를 구조화합니다
3. 법적 리스크를 식별합니다 (특히 NPL 투자 관점)
4. 누락되거나 불명확한 정보를 표시합니다
5. OCR 오류로 인한 불확실한 수치는 반드시 표시합니다

## 등기부등본 분석 시 주의점
- 갑구(소유권): 현재 소유자, 소유권 변동 이력, 압류/가압류/가처분 확인
- 을구(저당권 등): 근저당/전세권/지상권, 채권최고액, 채권자, 설정일
- 말소된 사항과 유효한 사항을 구분합니다
- 선순위/후순위 판단이 핵심입니다

## 계약서 분석 시 주의점
- 필수 조항 누락 여부: 목적물 표시, 대금 지급, 소유권 이전, 채권양도통지
- 위험 조항: 현상태 인수, 이의권 포기, 자동 갱신
- 매수자에게 불리한 조항 식별

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "documentType": "등기부등본" | "매매계약서" | ...,
  "confidence": 0.0~1.0,
  "summary": "1~2문장 요약",
  "extractedData": { ... 문서 유형별 구조화 데이터 ... },
  "risks": [
    { "severity": "HIGH", "category": "권리관계", "description": "...", "legalBasis": "민법 제XXX조", "recommendation": "..." }
  ],
  "opinion": "종합 의견",
  "needsVerification": ["확인 필요 사항 1", ...]
}`

/**
 * Claude LLM 기반 문서 분석 (v2 핵심)
 *
 * @param text - OCR 텍스트 또는 문서 원문
 * @param mode - 분석 모드 힌트 (optional, 자동 감지됨)
 * @returns 구조화된 분석 결과
 */
export async function analyzeDocumentWithAI(
  text: string,
  mode?: "registry" | "contract" | "appraisal" | "auto"
): Promise<AIDocumentAnalysis> {
  const ai = getAIService()

  // Claude API 미설정 시 fallback
  if (!ai.isConfigured()) {
    return analyzeDocumentFallback(text, mode)
  }

  try {
    const modeHint = mode && mode !== "auto"
      ? `\n\n[힌트: 이 문서는 ${mode === "registry" ? "등기부등본" : mode === "contract" ? "계약서" : "감정평가서"}입니다]`
      : ""

    const response = await ai.chat({
      messages: [{
        role: "user",
        content: `다음 문서를 분석해주세요:${modeHint}\n\n---\n${text.slice(0, 8000)}\n---`,
      }],
      system: DOCUMENT_ANALYSIS_PROMPT,
      maxTokens: 4096,
      temperature: 0,
    })

    // JSON 파싱
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("AI 응답에서 JSON을 찾을 수 없습니다")
    }

    const parsed = JSON.parse(jsonMatch[0]) as AIDocumentAnalysis
    parsed.method = "llm"
    return parsed
  } catch (err: any) {
    console.error("[DocumentAnalyzer] LLM 분석 실패, fallback:", err.message)
    return analyzeDocumentFallback(text, mode)
  }
}

/** 정규식 기반 fallback (기존 v1 로직 래핑) */
function analyzeDocumentFallback(
  text: string,
  mode?: "registry" | "contract" | "appraisal" | "auto"
): AIDocumentAnalysis {
  const detectedMode = mode === "auto" || !mode
    ? detectDocumentType(text)
    : mode

  if (detectedMode === "registry") {
    const result = parseRegistryDocument(text)
    return {
      documentType: "등기부등본",
      confidence: 0.6,
      summary: `${result.summary.currentOwner} 소유, 근저당 ${(result.summary.totalMortgage / 1e8).toFixed(1)}억원, 리스크 ${result.summary.riskLevel}`,
      extractedData: result as unknown as Record<string, unknown>,
      risks: result.summary.flags.map(f => ({
        severity: result.summary.riskLevel as any,
        category: "권리관계",
        description: f,
        recommendation: "전문가 확인 필요",
      })),
      opinion: `[Fallback 분석] 리스크 수준 ${result.summary.riskLevel}. Claude API 설정 시 더 정확한 분석 가능.`,
      needsVerification: ["OCR 정확도 미확인", "말소사항 재검토 필요"],
      method: "regex-fallback",
    }
  }

  if (detectedMode === "contract") {
    const result = scanContractRisk(text)
    return {
      documentType: result.documentType === "채권양도계약" ? "채권양도계약서" : result.documentType === "임대차계약" ? "임대차계약서" : "매매계약서",
      confidence: 0.5,
      summary: `${result.documentType}, 리스크 점수 ${result.riskScore}/100, 누락 조항 ${result.missingClauses.length}건`,
      extractedData: result as unknown as Record<string, unknown>,
      risks: [
        ...result.keyTerms.filter(t => t.risk !== "SAFE").map(t => ({
          severity: (t.risk === "DANGER" ? "HIGH" : "MEDIUM") as any,
          category: "계약조건",
          description: t.note,
          recommendation: "조항 수정 또는 삭제 요청",
        })),
        ...result.missingClauses.filter(c => c.importance === "REQUIRED").map(c => ({
          severity: "HIGH" as const,
          category: "누락조항",
          description: `${c.clause} 누락 — ${c.reason}`,
          recommendation: "해당 조항 추가 필요",
        })),
      ],
      opinion: `[Fallback 분석] 리스크 점수 ${result.riskScore}/100. ${result.recommendations.join(". ")}`,
      needsVerification: ["전체 조항 법무사 검토 필요"],
      method: "regex-fallback",
    }
  }

  // appraisal
  const result = extractAppraisalData(text)
  return {
    documentType: "감정평가서",
    confidence: 0.5,
    summary: `감정가 ${(result.totalValue / 1e8).toFixed(1)}억원 (토지 ${(result.landValue / 1e8).toFixed(1)}억 + 건물 ${(result.buildingValue / 1e8).toFixed(1)}억)`,
    extractedData: result as unknown as Record<string, unknown>,
    risks: [],
    opinion: `[Fallback 분석] ${result.method} 기반 감정가. Claude API 설정 시 비교 사례 심층 분석 가능.`,
    needsVerification: ["감정 시점 확인", "비교 사례 적정성 검토"],
    method: "regex-fallback",
  }
}

/** 문서 유형 자동 감지 */
function detectDocumentType(text: string): "registry" | "contract" | "appraisal" {
  const lower = text.toLowerCase()
  if (lower.includes("갑구") || lower.includes("을구") || lower.includes("등기부")) return "registry"
  if (lower.includes("계약") || lower.includes("매매") || lower.includes("양도")) return "contract"
  return "appraisal"
}
