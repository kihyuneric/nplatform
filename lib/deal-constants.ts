// Pure constants and types — no icon imports so this is safe to import
// from both server and client contexts.

export type DealStage =
  | "INTEREST"
  | "NDA"
  | "DUE_DILIGENCE"
  | "NEGOTIATION"
  | "CONTRACT"
  | "SETTLEMENT"
  | "COMPLETED"

export const STAGES: DealStage[] = [
  "INTEREST",
  "NDA",
  "DUE_DILIGENCE",
  "NEGOTIATION",
  "CONTRACT",
  "SETTLEMENT",
  "COMPLETED",
]

/** Map Korean display labels → internal DealStage keys */
export const STAGE_LABEL_MAP: Record<string, DealStage> = {
  관심표명: "INTEREST",
  NDA체결: "NDA",
  실사진행: "DUE_DILIGENCE",
  가격협상: "NEGOTIATION",
  계약체결: "CONTRACT",
  "잔금/양도": "SETTLEMENT",
  완료: "COMPLETED",
}

/** Korean deal stage labels for filter dropdowns */
export const DEAL_STAGE_LABELS = [
  "전체",
  "공고중",
  "관심표명",
  "NDA체결",
  "실사진행",
  "가격협상",
  "계약체결",
]
