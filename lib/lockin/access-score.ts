/**
 * lib/lockin/access-score.ts
 *
 * 매수자 Lock-in Access Score 엔진 (0 ~ 1000).
 *
 * 목적:
 *   매수자가 NPLatform에서 활동할수록 점수가 단조 증가하며,
 *   점수가 임계치를 넘으면 더 높은 권한(L0→L1→L2→L3)과
 *   Exclusive Deal(독점 매물) 접근권이 자동 부여된다.
 *
 *   → 매수자가 다른 플랫폼으로 이탈하면 본인이 쌓은 점수를 잃기 때문에
 *     자연스럽게 lock-in 효과가 발생.
 *
 * 핵심 원칙 (불변):
 *   1) 단조 증가 (monotonic non-decreasing) — 한 번 적립된 점수는 절대 줄지 않음
 *   2) 결정적 (deterministic) — 같은 이벤트는 항상 같은 가산값
 *   3) 감사 가능 — 모든 가산은 source 이벤트와 함께 기록
 *   4) 부정행위 차단 — 동일 매물에 대한 중복 가산 금지
 *
 * 호출 위치:
 *   - 사용자가 매물 조회 / NDA / LOI / 미팅 / 계약 / 결제 등의 액션 시
 *   - cron으로 매일 점수 → 티어 재계산
 *   - /my 페이지의 "내 등급" 카드
 */

// ─── Types ────────────────────────────────────────────────────

export type ScoreEventType =
  | "VIEW_LISTING"           // L0 매물 조회
  | "DOWNLOAD_TEASER"        // L0 티저 다운로드
  | "SIGN_NDA"               // L1 NDA 체결
  | "VIEW_DOC_L2"            // L2 문서 열람
  | "JOIN_DEALROOM"          // 딜룸 입장
  | "ATTEND_MEETING"         // 미팅 참석
  | "SUBMIT_LOI"             // LOI 제출
  | "SIGN_CONTRACT"          // 계약 체결
  | "FUND_ESCROW"            // 에스크로 입금
  | "DEAL_SETTLED"           // 거래 완료
  | "REVIEW_WRITTEN"         // 거래 후 리뷰
  | "REFER_USER"             // 친구 추천
  | "KYB_VERIFIED"           // KYB 통과
  | "PASS_VERIFIED"          // PASS 본인인증
  | "MFA_ENABLED"            // MFA 활성화

export type AccessTier = "L0" | "L1" | "L2" | "L3"

export interface ScoreEvent {
  id: string
  userId: string
  eventType: ScoreEventType
  /** 가산 점수 */
  delta: number
  /** 멱등성 키 — 동일 이벤트 중복 적립 차단 */
  idempotencyKey: string
  occurredAt: string
  /** 관련 entity (매물·딜룸·LOI 등) */
  context?: {
    listingId?: string
    dealRoomId?: string
    contractId?: string
  }
  /** 사람 읽기 라벨 (UI용) */
  reason: string
}

export interface AccessSnapshot {
  userId: string
  totalScore: number
  tier: AccessTier
  /** 다음 티어까지 필요한 점수 */
  nextTierAt: number | null
  /** 잠긴 권한 (UI tooltip) */
  unlockedFeatures: string[]
  /** 최근 적립 5건 */
  recentEvents: ScoreEvent[]
  /** 마지막 갱신 */
  updatedAt: string
}

// ─── Constants ────────────────────────────────────────────────

/** 이벤트별 기본 점수 — 변경 시 audit 필수 */
export const SCORE_DELTAS: Record<ScoreEventType, number> = {
  VIEW_LISTING:    5,
  DOWNLOAD_TEASER: 8,
  SIGN_NDA:       40,
  VIEW_DOC_L2:    15,
  JOIN_DEALROOM:  60,
  ATTEND_MEETING: 80,
  SUBMIT_LOI:    120,    // ⭐ 핵심 lock-in 트리거
  SIGN_CONTRACT: 200,
  FUND_ESCROW:   180,
  DEAL_SETTLED:  300,    // 1회 거래만 해도 L3 임계 진입
  REVIEW_WRITTEN: 25,
  REFER_USER:    50,
  KYB_VERIFIED:  60,
  PASS_VERIFIED: 30,
  MFA_ENABLED:   20,
}

/** 티어 임계값 (점수 ≥ 임계 → 해당 티어) */
export const TIER_THRESHOLDS: Record<AccessTier, number> = {
  L0:    0,
  L1:  100,
  L2:  300,
  L3:  700,
}

const TIER_FEATURES: Record<AccessTier, string[]> = {
  L0: [
    "공개 매물 목록 조회",
    "기본 시세분석 정보",
  ],
  L1: [
    "티저북 다운로드",
    "Q&A 게시판 작성",
    "권리분석 요약 보기",
  ],
  L2: [
    "감정평가서 / 등기부 / 임차현황 열람",
    "딜룸 입장",
    "LOI 제출",
    "미팅 예약",
  ],
  L3: [
    "Exclusive Deal (독점 매물) 접근",
    "VIP 계약 컨시어지",
    "사전 매물 알림 (24시간 우선)",
    "에스크로 수수료 할인 30%",
  ],
}

const MAX_SCORE = 1000

// ─── 1) 점수 적립 ─────────────────────────────────────────────

export function buildScoreEvent(
  userId: string,
  eventType: ScoreEventType,
  context?: ScoreEvent["context"],
  customReason?: string,
): ScoreEvent {
  const delta = SCORE_DELTAS[eventType]
  const idempotencyKey = buildIdempotencyKey(userId, eventType, context)
  return {
    id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    eventType,
    delta,
    idempotencyKey,
    occurredAt: new Date().toISOString(),
    context,
    reason: customReason ?? defaultReasonLabel(eventType),
  }
}

function buildIdempotencyKey(
  userId: string,
  eventType: ScoreEventType,
  context?: ScoreEvent["context"],
): string {
  const ctxKey = context?.listingId ?? context?.dealRoomId ?? context?.contractId ?? "global"
  return `${userId}:${eventType}:${ctxKey}`
}

function defaultReasonLabel(t: ScoreEventType): string {
  const map: Record<ScoreEventType, string> = {
    VIEW_LISTING:    "매물 조회",
    DOWNLOAD_TEASER: "티저북 다운로드",
    SIGN_NDA:        "NDA 체결",
    VIEW_DOC_L2:     "L2 문서 열람",
    JOIN_DEALROOM:   "딜룸 입장",
    ATTEND_MEETING:  "미팅 참석",
    SUBMIT_LOI:      "LOI 제출 (Lock-in 트리거)",
    SIGN_CONTRACT:   "계약 체결",
    FUND_ESCROW:     "에스크로 입금",
    DEAL_SETTLED:    "거래 완료",
    REVIEW_WRITTEN:  "거래 리뷰 작성",
    REFER_USER:      "친구 추천",
    KYB_VERIFIED:    "사업자 인증 완료",
    PASS_VERIFIED:   "본인인증 완료",
    MFA_ENABLED:     "MFA 활성화",
  }
  return map[t]
}

// ─── 2) 누적 점수 계산 ───────────────────────────────────────

/**
 * 이벤트 목록 → 총점 (멱등성 키 중복 제거 후 합산).
 * 단조 증가 보장을 위해 항상 처음부터 재계산해야 한다.
 */
export function computeTotalScore(events: ScoreEvent[]): number {
  const seen = new Set<string>()
  let total = 0
  for (const e of events) {
    if (seen.has(e.idempotencyKey)) continue
    seen.add(e.idempotencyKey)
    total += e.delta
  }
  return Math.min(total, MAX_SCORE)
}

// ─── 3) 티어 결정 ────────────────────────────────────────────

export function tierFromScore(score: number): AccessTier {
  if (score >= TIER_THRESHOLDS.L3) return "L3"
  if (score >= TIER_THRESHOLDS.L2) return "L2"
  if (score >= TIER_THRESHOLDS.L1) return "L1"
  return "L0"
}

export function nextTierThreshold(tier: AccessTier): number | null {
  switch (tier) {
    case "L0": return TIER_THRESHOLDS.L1
    case "L1": return TIER_THRESHOLDS.L2
    case "L2": return TIER_THRESHOLDS.L3
    case "L3": return null
  }
}

// ─── 4) 스냅샷 빌드 (UI용) ───────────────────────────────────

export function buildAccessSnapshot(userId: string, events: ScoreEvent[]): AccessSnapshot {
  const totalScore = computeTotalScore(events)
  const tier = tierFromScore(totalScore)
  const sortedEvents = [...events]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5)

  // 누적 unlocked features
  const unlockedFeatures: string[] = []
  for (const t of ["L0", "L1", "L2", "L3"] as AccessTier[]) {
    if (totalScore >= TIER_THRESHOLDS[t]) {
      unlockedFeatures.push(...TIER_FEATURES[t])
    }
  }

  return {
    userId,
    totalScore,
    tier,
    nextTierAt: nextTierThreshold(tier),
    unlockedFeatures,
    recentEvents: sortedEvents,
    updatedAt: new Date().toISOString(),
  }
}

// ─── 5) 단조 증가 invariant 검증 ─────────────────────────────

/**
 * 두 스냅샷을 비교하여 score가 절대 감소하지 않았는지 검증.
 * 감소 발견 시 컴플라이언스 알람 트리거 (호출 측 책임).
 */
export function verifyMonotonic(
  prev: AccessSnapshot,
  next: AccessSnapshot,
): { ok: boolean; reason?: string } {
  if (next.userId !== prev.userId) {
    return { ok: false, reason: "userId mismatch" }
  }
  if (next.totalScore < prev.totalScore) {
    return {
      ok: false,
      reason: `Score decreased: ${prev.totalScore} → ${next.totalScore}`,
    }
  }
  return { ok: true }
}

// ─── 6) Tier 권한 게이트 ──────────────────────────────────────

/**
 * "이 사용자가 X 기능에 접근 가능한가?" 를 한 줄로 판단.
 * 호출 측은 결과를 절대 캐시하지 말고 항상 호출 시점에 평가.
 */
export function canAccess(snapshot: AccessSnapshot, requiredTier: AccessTier): boolean {
  const order: AccessTier[] = ["L0", "L1", "L2", "L3"]
  return order.indexOf(snapshot.tier) >= order.indexOf(requiredTier)
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  SCORE_DELTAS,
  TIER_THRESHOLDS,
  TIER_FEATURES,
  MAX_SCORE,
  buildIdempotencyKey,
}
