/**
 * 매물별 마케팅 진행 체크리스트 — 운영사 관리자 ↔ 매각사 대시보드 공유 (SSoT)
 * Supabase public.listing_marketing.checklist (jsonb { key: boolean }) 에 저장.
 */
export const MARKETING_CHECKLIST: readonly { key: string; label: string; group: '땅집고옥션' | '엔플랫폼' }[] = [
  { key: 'ddangok_list',  label: '땅집고옥션 리스트 등재',        group: '땅집고옥션' },
  { key: 'ddangok_main',  label: '땅집고옥션 메인 페이지 노출',    group: '땅집고옥션' },
  { key: 'ddangok_email', label: '땅집고옥션 전체 고객 이메일',    group: '땅집고옥션' },
  { key: 'ddangok_kakao', label: '땅집고옥션 카카오채널 마케팅',   group: '땅집고옥션' },
  { key: 'ddangok_sms',   label: '땅집고옥션 자산가 DB 문자',     group: '땅집고옥션' },
  { key: 'npl_list',      label: '엔플랫폼 리스트 등재',          group: '엔플랫폼' },
  { key: 'npl_main',      label: '엔플랫폼 메인 페이지 노출',      group: '엔플랫폼' },
  { key: 'npl_pool_sms',  label: '엔플랫폼 매입사 Pool 문자',     group: '엔플랫폼' },
] as const

/** 딜 진행 단계 — 관리자가 직접 등록·수정, 매각사 대시보드에 공유 */
export const DEAL_STAGES = ['관심등록', '실사진행', '가격협의', '최종계약'] as const
export type DealStage = typeof DEAL_STAGES[number]

/** NPL 상태 — 관리자·매각사 양쪽에서 수정, 리스트 앞단에 표시 */
export const NPL_STATUSES = ['진행중', '협의중', '매각완료'] as const
export type NplStatus = typeof NPL_STATUSES[number]

/**
 * NDA 요청 진행상황 — 매입사 서명 → 운영사 검토 → 승인/거절
 * 관리자(NDA·딜 진행) · 매입사(계약 관리) · 매각사(대시보드) 3곳에서 공유.
 * '승인' 상태의 매입사만 세부내역 열람 가능 (채권기관·담당자 정보 제외).
 */
export const NDA_REQUEST_STATUSES = ['운영사 검토', '승인', '거절'] as const
export type NdaRequestStatus = typeof NDA_REQUEST_STATUSES[number]

export interface NdaRequest {
  id: string
  signer: string         // 서명자 성명
  /** 요청 회원 Key — 열람권·이력 판정의 기준 (2026-08-19 도입) */
  user_id?: string
  email?: string         // 레거시 폴백 (user_id 없는 구 데이터용)
  requested_at: string   // ISO
  status: string         // 운영사 검토 / 승인 / 거절
  decided_at?: string
}

export interface ListingMarketing {
  /** 진행종료 요청 시각 (매각 회원 요청) — 운영자 승인 전까지 "종료 요청중" (2026-08-19) */
  end_requested_at?: string | null
  /** 진행종료 확정 시각 (운영자 승인) */
  ended_at?: string | null
  listing_id: string
  checklist: Record<string, boolean>
  consult_count: number
  interest_count: number
  nda_count: number
  deal_stage?: string
  matched_at?: string    // YYYY-MM-DD — 매칭날짜 (이후 업데이트 알림 기준)
  npl_status?: string    // 거래중 / 협의중 / 매각완료
  nda_requests?: NdaRequest[]
  detail?: Record<string, string>
  updated_at?: string
}

export const emptyMarketing = (id: string): ListingMarketing => ({
  listing_id: id,
  checklist: {},
  consult_count: 0,
  interest_count: 0,
  nda_count: 0,
})
