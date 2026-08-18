import { redirect } from 'next/navigation'

/** 고객센터 폐기 — 1:1 문의는 공지사항 허브로 통합 (2026-08-17) */
export default function SupportRedirect() {
  redirect('/notices')
}
