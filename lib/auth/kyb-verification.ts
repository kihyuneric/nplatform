/**
 * lib/auth/kyb-verification.ts
 *
 * KYB (Know Your Business) — 사업자/법인 진위확인 모듈.
 *
 * 호출 위치:
 *   - /api/v1/auth/kyb/submit
 *   - /signup (기관/기업 회원), /admin/users 승인 화면
 *   - 매물 등록 위저드 1단계 (매도자가 기관일 때)
 *
 * 검증 단계:
 *   1) 사업자등록번호 체크섬 (modulo 10)
 *   2) 국세청 진위확인 API (호출 추상화)
 *   3) 대표자 PASS 본인인증 매칭 (선택)
 *   4) 업종 코드(KSIC) 위험군 스크리닝
 *   5) 휴/폐업 상태 확인
 *   6) 결과 → audit_logs + tenants.kyb_status 갱신
 *
 * 외부 의존:
 *   - 국세청 사업자등록번호 진위확인 API (https://api.odcloud.kr/api/nts-businessman/v1/status)
 *   - DART 공시 API (법인의 경우)
 *
 * 본 모듈은 fetcher를 추상화 — 개발 환경에서는 mock 사용.
 */

import type { CarrierIdentity } from "./types"

// ─── Types ────────────────────────────────────────────────────

export type KybStatus =
  | "PENDING"            // 제출됨, 검증 대기
  | "VERIFIED"           // 통과
  | "FAILED"             // 진위 불일치
  | "SUSPENDED"          // 휴/폐업
  | "MANUAL_REVIEW"      // 위험군 — 관리자 수동 검토 필요
  | "REJECTED"           // 관리자 거부

export type BusinessKind =
  | "INDIVIDUAL"         // 개인사업자
  | "CORPORATION"        // 법인
  | "FINANCIAL"          // 금융기관 (은행/저축은행/캐피탈)
  | "PUBLIC"             // 공공기관

export interface KybSubmitInput {
  /** 사업자등록번호 (10자리, 하이픈 허용) */
  businessNumber: string
  /** 상호 */
  companyName: string
  /** 대표자명 */
  representativeName: string
  /** 개업일 (YYYY-MM-DD) */
  openDate: string
  /** 업종 코드 (KSIC) */
  industryCode?: string
  kind: BusinessKind
  /** 법인등록번호 (법인일 경우, 13자리) */
  corporationNumber?: string
  /** 대표자 PASS 인증 결과 (있을 경우) */
  representativeCi?: string
  /** 사업자등록증 사본 storage 키 */
  certificateStoragePath?: string
}

export interface KybVerifyResult {
  status: KybStatus
  /** 검증 시각 */
  verifiedAt: string
  /** 외부 API에서 받은 정규화된 사업자 정보 */
  business?: {
    businessNumber: string
    companyName: string
    representativeName: string
    openDate: string
    statusCode: BusinessTaxStatus
    statusLabel: string
    industryCode?: string
    industryLabel?: string
  }
  /** 자동 거절/대기 사유 코드 */
  reasons: KybReasonCode[]
  /** 위험도 점수 (0~100, 높을수록 위험) */
  riskScore: number
  /** 수동 검토자에게 보여줄 근거 텍스트 */
  notes: string[]
}

export type BusinessTaxStatus = "ACTIVE" | "CLOSED" | "SUSPENDED" | "UNKNOWN"

export type KybReasonCode =
  | "INVALID_CHECKSUM"
  | "TAX_API_FAIL"
  | "BUSINESS_CLOSED"
  | "BUSINESS_SUSPENDED"
  | "REP_NAME_MISMATCH"
  | "REP_CI_MISMATCH"
  | "HIGH_RISK_INDUSTRY"
  | "SANCTIONED_ENTITY"
  | "RECENTLY_OPENED"
  | "OK"

// ─── Constants ────────────────────────────────────────────────

/** 위험군 KSIC 5자리 prefix (도박·암호화폐·다단계 등) */
const HIGH_RISK_INDUSTRY_PREFIXES = [
  "92193",  // 사행시설 운영업
  "66199",  // 그 외 기타 금융 서비스업 (가상자산 포함)
  "73904",  // 기타 분류 안된 전문, 과학, 기술 서비스업
  "47860",  // 다단계 판매업
]

/** 6개월 미만 신생 사업자 — 자동 거절은 아니지만 가산 위험 */
const RECENT_OPEN_DAYS = 180

// ─── 1) 체크섬 검증 (modulo 10) ──────────────────────────────

/**
 * 한국 사업자등록번호 진위 알고리즘.
 * 가중치: [1,3,7,1,3,7,1,3,5]
 * 9번째 자리에 5 곱한 값 / 10 의 몫을 더함
 * 마지막 자리(체크 디지트)와 (10 - 합 % 10) % 10 비교
 */
export function isValidBusinessNumber(input: string): boolean {
  const digits = input.replace(/-/g, "").trim()
  if (!/^\d{10}$/.test(digits)) return false
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * weights[i]
  }
  sum += Math.floor((Number(digits[8]) * 5) / 10)
  const check = (10 - (sum % 10)) % 10
  return check === Number(digits[9])
}

export function normalizeBusinessNumber(input: string): string {
  const d = input.replace(/-/g, "")
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5, 10)}`
}

// ─── 2) 국세청 API (추상화) ───────────────────────────────────

export interface NtsLookupResult {
  ok: boolean
  statusCode: BusinessTaxStatus
  statusLabel: string
  taxType?: string
  closedDate?: string
}

/**
 * 실제 운영에서는 https://api.odcloud.kr/api/nts-businessman/v1/status 호출.
 * 개발 환경에서는 mock 응답 반환.
 */
export type NtsLookupFn = (businessNumber: string) => Promise<NtsLookupResult>

export const mockNtsLookup: NtsLookupFn = async (businessNumber: string) => {
  // 기본: 정상. 마지막 자리가 0이면 폐업, 9면 휴업
  const last = Number(businessNumber.replace(/-/g, "").slice(-1))
  if (last === 0) {
    return { ok: true, statusCode: "CLOSED", statusLabel: "폐업자", closedDate: "2024-12-31" }
  }
  if (last === 9) {
    return { ok: true, statusCode: "SUSPENDED", statusLabel: "휴업자" }
  }
  return { ok: true, statusCode: "ACTIVE", statusLabel: "계속사업자", taxType: "부가가치세 일반과세자" }
}

// ─── 3) 위험군 스크리닝 ───────────────────────────────────────

function isHighRiskIndustry(code?: string): boolean {
  if (!code) return false
  return HIGH_RISK_INDUSTRY_PREFIXES.some(p => code.startsWith(p))
}

/** 제재 명단(샘플) — 실제로는 OFAC/UN/금융위 자료를 주기 갱신 */
const SANCTIONED_BUSINESS_NUMBERS = new Set<string>([
  // "123-45-67890",
])

function isSanctioned(bizNumber: string): boolean {
  return SANCTIONED_BUSINESS_NUMBERS.has(normalizeBusinessNumber(bizNumber))
}

// ─── 4) 대표자 PASS 매칭 ─────────────────────────────────────

import type { /* keep import below */ } from "./types"
// (CarrierIdentity 등 type-only import는 ./types에서)

function nameMatches(a: string, b: string): boolean {
  // 공백·기호 제거 후 단순 비교 (실 운영에서는 한자/영문 변환 고려)
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase()
  return norm(a) === norm(b)
}

// ─── 5) 메인 검증 함수 ───────────────────────────────────────

export interface KybVerifyDeps {
  ntsLookup?: NtsLookupFn
  /** 대표자 PASS CI (선택) */
  representativeCarrier?: CarrierIdentity
}

export async function verifyKyb(
  input: KybSubmitInput,
  deps: KybVerifyDeps = {},
): Promise<KybVerifyResult> {
  const reasons: KybReasonCode[] = []
  const notes: string[] = []
  let risk = 0

  // 1) 체크섬
  if (!isValidBusinessNumber(input.businessNumber)) {
    return {
      status: "FAILED",
      verifiedAt: new Date().toISOString(),
      reasons: ["INVALID_CHECKSUM"],
      riskScore: 100,
      notes: ["사업자등록번호 체크섬 검증 실패 — 입력 오타 또는 위조 의심"],
    }
  }

  // 2) 국세청 조회
  const lookup = deps.ntsLookup ?? mockNtsLookup
  let lookupResult: NtsLookupResult
  try {
    lookupResult = await lookup(normalizeBusinessNumber(input.businessNumber))
  } catch (err) {
    return {
      status: "MANUAL_REVIEW",
      verifiedAt: new Date().toISOString(),
      reasons: ["TAX_API_FAIL"],
      riskScore: 50,
      notes: [`국세청 API 호출 실패: ${(err as Error)?.message ?? "unknown"} — 수동 검토 필요`],
    }
  }

  if (lookupResult.statusCode === "CLOSED") {
    return {
      status: "FAILED",
      verifiedAt: new Date().toISOString(),
      reasons: ["BUSINESS_CLOSED"],
      riskScore: 100,
      notes: [`폐업 사업자 (폐업일 ${lookupResult.closedDate ?? "미상"})`],
    }
  }
  if (lookupResult.statusCode === "SUSPENDED") {
    return {
      status: "SUSPENDED",
      verifiedAt: new Date().toISOString(),
      reasons: ["BUSINESS_SUSPENDED"],
      riskScore: 80,
      notes: ["휴업 사업자 — 거래 불가, 재개 후 재신청"],
    }
  }

  // 3) 신생 사업자 가산
  const openDate = new Date(input.openDate)
  const ageDays = (Date.now() - openDate.getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays < RECENT_OPEN_DAYS) {
    risk += 25
    reasons.push("RECENTLY_OPENED")
    notes.push(`개업 후 ${Math.floor(ageDays)}일 — 신생 사업자 (자동 통과 아님)`)
  }

  // 4) 고위험 업종
  if (isHighRiskIndustry(input.industryCode)) {
    risk += 40
    reasons.push("HIGH_RISK_INDUSTRY")
    notes.push(`KSIC ${input.industryCode} — 고위험 업종, 관리자 검토 필수`)
  }

  // 5) 제재 대상
  if (isSanctioned(input.businessNumber)) {
    return {
      status: "REJECTED",
      verifiedAt: new Date().toISOString(),
      reasons: ["SANCTIONED_ENTITY"],
      riskScore: 100,
      notes: ["국제 제재 또는 금융위 거래제한 명단 — 즉시 거부"],
    }
  }

  // 6) 대표자 CI 매칭
  if (input.representativeCi && deps.representativeCarrier) {
    if (deps.representativeCarrier.ci !== input.representativeCi) {
      risk += 30
      reasons.push("REP_CI_MISMATCH")
      notes.push("대표자 PASS 인증 CI와 제출된 CI가 일치하지 않음")
    } else if (!nameMatches(deps.representativeCarrier.name, input.representativeName)) {
      risk += 20
      reasons.push("REP_NAME_MISMATCH")
      notes.push("PASS 인증 성명과 입력 대표자명이 다름")
    }
  }

  // 결과 합성
  let status: KybStatus
  if (risk >= 60) status = "MANUAL_REVIEW"
  else if (reasons.length > 0) status = "MANUAL_REVIEW"
  else status = "VERIFIED"

  if (reasons.length === 0) reasons.push("OK")

  return {
    status,
    verifiedAt: new Date().toISOString(),
    business: {
      businessNumber: normalizeBusinessNumber(input.businessNumber),
      companyName: input.companyName,
      representativeName: input.representativeName,
      openDate: input.openDate,
      statusCode: lookupResult.statusCode,
      statusLabel: lookupResult.statusLabel,
      industryCode: input.industryCode,
      industryLabel: input.industryCode ? lookupKsicLabel(input.industryCode) : undefined,
    },
    reasons,
    riskScore: Math.min(100, risk),
    notes,
  }
}

// ─── KSIC label lookup (간이) ─────────────────────────────────

const KSIC_LABELS: Record<string, string> = {
  "64190": "기타 은행 및 저축기관",
  "64921": "할부금융업",
  "64922": "신기술사업금융업",
  "66199": "그 외 기타 금융 서비스업",
  "68112": "비주거용 건물 임대업",
  "68211": "주거용 부동산 관리업",
  "68220": "비주거용 부동산 관리업",
}

function lookupKsicLabel(code: string): string {
  return KSIC_LABELS[code] ?? "기타"
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  isValidBusinessNumber,
  normalizeBusinessNumber,
  isHighRiskIndustry,
  HIGH_RISK_INDUSTRY_PREFIXES,
  RECENT_OPEN_DAYS,
  KSIC_LABELS,
}
