import { redirect } from 'next/navigation'

/** 공개 분석 대시보드 폐기 — 분석은 운영자 전용(/admin/npl-analysis) (2026-08-17) */
export default function AnalysisRedirect() {
  redirect('/')
}
