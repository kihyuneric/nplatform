/**
 * lib/lockin/exclusive-deal.ts
 *
 * Exclusive Deal (독점 매물) 모듈.
 *
 * NPLatform이 매도자(은행/자산운용사)와 독점계약을 맺은 매물은
 * Access Score L3 사용자에게만 노출되며, 24시간의 우선 매수 윈도우를 부여한다.
 *
 * 가치:
 *   - 매도자: 협상력 있는 검증된 매수자만 접근 → 빠른 거래
 *   - 매수자: 경쟁이 적은 매물 → 더 좋은 가격
 *   - 플랫폼: L3 매수자 lock-in 강화
 *
 * 호출 위치:
 *   - /exchange 매물 목록 — exclusive 필터링
 *   - /exchange/[id] — 접근 권한 사전 차단
 *   - /api/v1/listings — 응답에서 비공개 매물 mask
 *   - cron — 윈도우 만료 시 일반 공개로 자동 전환
 */

import type { AccessSnapshot } from "./access-score"
import { canAccess } from "./access-score"

// ─── Types ────────────────────────────────────────────────────

export type ExclusiveStatus =
  | "EXCLUSIVE"        // L3 전용
  | "PRIORITY_WINDOW"  // 24시간 우선 윈도우 (L3+)
  | "GENERAL"          // 모두 공개
  | "WITHDRAWN"        // 매도자 철회

export interface ExclusiveDeal {
  listingId: string
  status: ExclusiveStatus
  /** 독점 시작 (L3 노출 시작) */
  exclusiveSince: string
  /** 우선 윈도우 시작 — L3에 우선권 부여 */
  priorityWindowStart?: string
  /** 우선 윈도우 종료 — 이후 일반 공개 전환 */
  priorityWindowEnd?: string
  /** 일반 공개 시작 시각 */
  generalSince?: string
  /** 매도자 측 노트 (L3 사용자에게만 표시) */
  sellerNote?: string
  /** L3 사용자 중 본 매물에 LOI를 제출한 수 */
  loiCount: number
  /** 사전 알림을 받은 L3 사용자 수 */
  notifiedCount: number
}

export interface VisibilityResult {
  visible: boolean
  /** 비가시 시 사유 */
  reason?: "NOT_L3" | "NOT_YET_PUBLIC" | "WITHDRAWN"
  /** 가시 시 표시 모드 */
  mode?: "EXCLUSIVE_BADGE" | "PRIORITY_BADGE" | "GENERAL"
  /** 카운트다운 (PRIORITY_WINDOW 종료까지 ms) */
  countdownMs?: number
}

// ─── Constants ────────────────────────────────────────────────

const PRIORITY_WINDOW_HOURS = 24

// ─── 1) 라이프사이클 ─────────────────────────────────────────

export function createExclusiveDeal(
  listingId: string,
  sellerNote?: string,
): ExclusiveDeal {
  const now = new Date().toISOString()
  return {
    listingId,
    status: "EXCLUSIVE",
    exclusiveSince: now,
    sellerNote,
    loiCount: 0,
    notifiedCount: 0,
  }
}

export function startPriorityWindow(deal: ExclusiveDeal): ExclusiveDeal {
  if (deal.status !== "EXCLUSIVE") {
    throw new Error(`[exclusive-deal] startPriorityWindow expects EXCLUSIVE, got ${deal.status}`)
  }
  const start = new Date()
  const end = new Date(start.getTime() + PRIORITY_WINDOW_HOURS * 60 * 60 * 1000)
  return {
    ...deal,
    status: "PRIORITY_WINDOW",
    priorityWindowStart: start.toISOString(),
    priorityWindowEnd: end.toISOString(),
  }
}

export function transitionToGeneral(deal: ExclusiveDeal): ExclusiveDeal {
  return {
    ...deal,
    status: "GENERAL",
    generalSince: new Date().toISOString(),
  }
}

export function withdrawDeal(deal: ExclusiveDeal): ExclusiveDeal {
  return { ...deal, status: "WITHDRAWN" }
}

// ─── 2) 자동 전환 (cron) ──────────────────────────────────────

/**
 * 우선 윈도우가 만료되었으면 GENERAL로 자동 전환.
 * cron에서 매분 호출하거나 요청 시점마다 체크.
 */
export function checkAndAutoTransition(deal: ExclusiveDeal): ExclusiveDeal {
  if (deal.status !== "PRIORITY_WINDOW") return deal
  if (!deal.priorityWindowEnd) return deal
  if (new Date(deal.priorityWindowEnd) <= new Date()) {
    return transitionToGeneral(deal)
  }
  return deal
}

// ─── 3) 가시성 평가 ──────────────────────────────────────────

/**
 * 사용자가 본 매물을 볼 수 있는가? + 어떤 모드로 보여줄 것인가?
 *
 * 규칙:
 *   - WITHDRAWN: 누구도 안 보임
 *   - EXCLUSIVE: L3만 보임 (EXCLUSIVE_BADGE)
 *   - PRIORITY_WINDOW: L3에게만 보이되 PRIORITY_BADGE + countdown
 *   - GENERAL: 모두 보임 (GENERAL)
 */
export function evaluateVisibility(
  deal: ExclusiveDeal,
  snapshot: AccessSnapshot,
): VisibilityResult {
  if (deal.status === "WITHDRAWN") {
    return { visible: false, reason: "WITHDRAWN" }
  }
  if (deal.status === "GENERAL") {
    return { visible: true, mode: "GENERAL" }
  }
  // EXCLUSIVE 또는 PRIORITY_WINDOW
  if (!canAccess(snapshot, "L3")) {
    return { visible: false, reason: "NOT_L3" }
  }
  if (deal.status === "EXCLUSIVE") {
    return { visible: true, mode: "EXCLUSIVE_BADGE" }
  }
  // PRIORITY_WINDOW
  const end = deal.priorityWindowEnd ? new Date(deal.priorityWindowEnd).getTime() : 0
  const countdownMs = Math.max(0, end - Date.now())
  return {
    visible: true,
    mode: "PRIORITY_BADGE",
    countdownMs,
  }
}

// ─── 4) 매물 목록 필터링 ─────────────────────────────────────

export interface ListingFilterItem {
  listingId: string
  exclusiveDeal?: ExclusiveDeal | null
}

/**
 * 매물 목록을 사용자 권한으로 필터링.
 * 비가시 매물은 제외하고, 가시 매물에는 mode 정보를 동봉.
 */
export function filterListingsByVisibility<T extends ListingFilterItem>(
  listings: T[],
  snapshot: AccessSnapshot,
): (T & { visibility: VisibilityResult })[] {
  const result: (T & { visibility: VisibilityResult })[] = []
  for (const listing of listings) {
    if (!listing.exclusiveDeal) {
      result.push({
        ...listing,
        visibility: { visible: true, mode: "GENERAL" },
      })
      continue
    }
    const auto = checkAndAutoTransition(listing.exclusiveDeal)
    const visibility = evaluateVisibility(auto, snapshot)
    if (visibility.visible) {
      result.push({ ...listing, visibility })
    }
  }
  return result
}

// ─── 5) 사전 알림 ────────────────────────────────────────────

/**
 * L3 사용자에게 새 Exclusive Deal 등록을 알리는 푸시/이메일 페이로드 빌더.
 * 실제 전송은 lib/notifications/* 모듈 담당.
 */
export interface ExclusiveAlertPayload {
  listingId: string
  title: string
  body: string
  channel: "PUSH" | "EMAIL" | "SMS"
  ctaUrl: string
}

export function buildExclusiveAlert(
  deal: ExclusiveDeal,
  listingTitle: string,
): ExclusiveAlertPayload {
  return {
    listingId: deal.listingId,
    title: "🎯 신규 Exclusive Deal",
    body: `${listingTitle} — L3 회원님께만 24시간 우선 공개됩니다.`,
    channel: "PUSH",
    ctaUrl: `/exchange/${deal.listingId}`,
  }
}

// ─── 6) LOI 카운트 증가 ──────────────────────────────────────

export function incrementLoiCount(deal: ExclusiveDeal): ExclusiveDeal {
  return { ...deal, loiCount: deal.loiCount + 1 }
}

export function incrementNotifiedCount(deal: ExclusiveDeal, by = 1): ExclusiveDeal {
  return { ...deal, notifiedCount: deal.notifiedCount + by }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  PRIORITY_WINDOW_HOURS,
}
