/**
 * 공유 채팅 데이터 + 타입 + PII 검증 로직
 *
 * 사용처:
 *   - /deals/dealroom        (sticky 사이드바 채팅)
 *   - /deals/dealroom/chat   (full-page 채팅 — 좌: 매수자 리스트 / 우: 채팅)
 *
 * 자동 기록 룰셋 (RULE_SET):
 *   R1. 투자자 인증 신청·승인 → system 메시지 자동 기록
 *   R2. NDA 전자서명 신청·체결 → system 메시지 자동 기록
 *   R3. LOI 제출·매도자 승인 → system 메시지 자동 기록
 *   R4. ESCROW 입금·전자계약·정산 → system 메시지 자동 기록
 * PII 차단 룰셋 (PII_BLOCK):
 *   P1. 전화번호 (010·02·031·1588 등) → 입력 차단 + 경고
 */

export type ChatMessage = {
  id: number
  type: "system" | "seller" | "buyer"
  author: string
  role?: "매도자" | "매수자"
  time: string
  text: string
  attachment?: string
}

export type BuyerThread = {
  id: string
  buyerCode: string
  buyerName: string
  institution: string
  unread: number
  status: "active" | "stalled" | "loi-pending"
  lastSnippet: string
  lastTime: string
  messages: ChatMessage[]
}

/* PII 검증 — 전화번호 패턴 (휴대 / 시내 / 1588 / 1599 / 080) */
export const PHONE_REGEX = /(\b01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b|\b0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}\b|\b1[58]\d{2}[-\s.]?\d{4}\b)/

export function detectPII(input: string): { hasPhone: boolean; matched?: string } {
  const m = input.match(PHONE_REGEX)
  return { hasPhone: !!m, matched: m?.[0] }
}

export const INITIAL_BUYER_THREADS: BuyerThread[] = [
  {
    id: "th-001",
    buyerCode: "B-01",
    buyerName: "○○대부업체 박 팀장",
    institution: "○○대부업체 (NPL 전문)",
    unread: 2,
    status: "loi-pending",
    lastSnippet: "이번 주 금요일까지 LOI 접수 가능. 에스크로 KB 기준 D+3 예정.",
    lastTime: "오늘 10:35",
    messages: [
      { id: 100, type: "system", author: "NPLatform · 시스템", time: "10/22 11:30", text: "[자동 기록 · R1] 투자자 인증 신청됨 → 승인 완료." },
      { id: 101, type: "system", author: "NPLatform · 시스템", time: "10/24 09:01", text: "[자동 기록 · R2] NDA 전자서명 신청됨." },
      { id: 1, type: "system", author: "NPLatform · 시스템", time: "10/24 09:02", text: "[자동 기록 · R2] NDA 전자서명 체결 완료. 매도자 권리증·등기부를 열람할 수 있습니다." },
      { id: 2, type: "seller", author: "○○은행 김 팀장", role: "매도자", time: "09:14", text: "안녕하세요, 권리분석서 첨부드립니다.", attachment: "권리분석서_0412.pdf" },
      { id: 3, type: "buyer", author: "○○대부업체 박 팀장", role: "매수자", time: "10:21", text: "감사합니다. 검토 후 회신드리겠습니다." },
      { id: 4, type: "buyer", author: "○○대부업체 박 팀장", role: "매수자", time: "14:08", text: "초기 검토 완료. 7.8억 (할인율 35%) 1차 오퍼 제출드립니다." },
      { id: 5, type: "seller", author: "○○은행 김 팀장", role: "매도자", time: "10/25 09:02", text: "할인율이 다소 큽니다. 8.7억 (27.5%) 으로 역제안드립니다." },
      { id: 6, type: "buyer", author: "○○대부업체 박 팀장", role: "매수자", time: "오늘 10:21", text: "매각희망가 8.5억 기준 LOI 제출 검토 중입니다. 에스크로 일정 조율 가능할까요?" },
      { id: 102, type: "system", author: "NPLatform · 시스템", time: "오늘 10:30", text: "[자동 기록 · R3] LOI 제출됨 → 매도자 승인 대기 중." },
      { id: 7, type: "seller", author: "○○은행 김 팀장", role: "매도자", time: "오늘 10:35", text: "이번 주 금요일까지 LOI 접수 가능. 에스크로 KB 기준 D+3 예정." },
    ],
  },
  {
    id: "th-002",
    buyerCode: "B-02",
    buyerName: "○○자산운용 이 매니저",
    institution: "○○자산운용 (펀드)",
    unread: 0,
    status: "active",
    lastSnippet: "감정평가서 검토 중. 주말 내 1차 오퍼 회신드리겠습니다.",
    lastTime: "오늘 09:42",
    messages: [
      { id: 200, type: "system", author: "NPLatform · 시스템", time: "10/25 16:00", text: "[자동 기록 · R1] 투자자 인증 신청됨 → 승인 완료." },
      { id: 201, type: "system", author: "NPLatform · 시스템", time: "10/26 13:55", text: "[자동 기록 · R2] NDA 전자서명 신청됨." },
      { id: 1, type: "system", author: "NPLatform · 시스템", time: "10/26 14:00", text: "[자동 기록 · R2] NDA 전자서명 체결 완료. 검증 데이터 열람 가능." },
      { id: 2, type: "seller", author: "○○은행 김 팀장", role: "매도자", time: "10/26 14:20", text: "관심 가져주셔서 감사합니다. 감정평가서·등기부 원본 공유드립니다.", attachment: "감정평가서_0426.pdf" },
      { id: 3, type: "buyer", author: "○○자산운용 이 매니저", role: "매수자", time: "오늘 09:42", text: "감정평가서 검토 중. 주말 내 1차 오퍼 회신드리겠습니다." },
    ],
  },
  {
    id: "th-003",
    buyerCode: "B-03",
    buyerName: "○○투자증권 정 차장",
    institution: "○○투자증권 (PI)",
    unread: 0,
    status: "stalled",
    lastSnippet: "내부 위원회 결과 대기 중. 회신 지연 양해바랍니다.",
    lastTime: "10/22 16:08",
    messages: [
      { id: 300, type: "system", author: "NPLatform · 시스템", time: "10/19 14:00", text: "[자동 기록 · R1] 투자자 인증 신청됨 → 승인 완료." },
      { id: 301, type: "system", author: "NPLatform · 시스템", time: "10/20 10:55", text: "[자동 기록 · R2] NDA 전자서명 신청됨." },
      { id: 1, type: "system", author: "NPLatform · 시스템", time: "10/20 11:00", text: "[자동 기록 · R2] NDA 전자서명 체결 완료." },
      { id: 2, type: "buyer", author: "○○투자증권 정 차장", role: "매수자", time: "10/20 11:15", text: "기본 자료 확인 완료. 내부 검토 진행하겠습니다." },
      { id: 3, type: "seller", author: "○○은행 김 팀장", role: "매도자", time: "10/21 09:00", text: "추가 자료 필요 시 언제든 요청 주세요." },
      { id: 302, type: "system", author: "NPLatform · 시스템", time: "10/22 14:20", text: "[자동 기록 · P1] 매수자 메시지 1건에서 전화번호 패턴 감지 → 자동 마스킹 처리됨." },
      { id: 4, type: "buyer", author: "○○투자증권 정 차장", role: "매수자", time: "10/22 16:08", text: "내부 위원회 결과 대기 중. 회신 지연 양해바랍니다." },
    ],
  },
]

/** 현재 시간을 HH:MM 포맷으로 반환 */
export function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
