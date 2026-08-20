'use client'

/** /admin/intakes/agency — 매물등록 대행관리 (2026-08-19) · 운영기획서 v4 §3-3 */

import { IntakeList } from '@/components/admin/intake-list'

export default function AgencyIntakePage() {
  return (
    <IntakeList
      mode="agency"
      title="매물등록 대행관리"
      subtitle="매각 회원이 파일만 올린 건입니다. 파일을 확인하고 자동입력으로 세부내역을 채운 뒤, 검수해서 등록을 확정합니다."
    />
  )
}
