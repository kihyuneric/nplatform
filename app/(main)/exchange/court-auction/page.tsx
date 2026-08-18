import { redirect } from 'next/navigation'

/** 법원경매 탐색 폐기 — 프라이빗 딜 전환 (2026-08-17) */
export default function CourtAuctionRedirect() {
  redirect('/exchange')
}
