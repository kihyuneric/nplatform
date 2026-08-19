'use client'

/**
 * /exchange/demands/[id] — 레거시 매입조건 상세(제안·AI 매칭)
 * 정책(2026-08-19): 마이페이지 매입 조건으로 통합.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DemandDetailRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/my/demands') }, [router])
  return null
}
