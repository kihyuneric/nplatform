'use client'

/** /admin/intakes/direct — 매각의뢰 관리 (직접 등록 건) · 운영기획서 v4 §3-2 */

import { IntakeList } from '@/components/admin/intake-list'

export default function DirectIntakePage() {
  return (
    <IntakeList
      mode="direct"
      title="매각의뢰 관리"
      subtitle="매각 회원이 세부내역을 직접 채워 제출한 건입니다. 내용과 첨부를 확인하고 승인하면 관리번호가 발번됩니다."
    />
  )
}
