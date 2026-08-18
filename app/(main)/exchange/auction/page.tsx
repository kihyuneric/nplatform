import { redirect } from 'next/navigation'

/** 자발적 경매 폐기 — 프라이빗 딜 전환 (2026-08-17) */
export default function AuctionRedirect() {
  redirect('/exchange')
}
