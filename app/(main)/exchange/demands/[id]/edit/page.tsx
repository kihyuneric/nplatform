'use client'

/**
 * /exchange/demands/[id]/edit — 매입조건 수정
 *
 * 정책(2026-08-19): 등록·수정·가입 스텝은 **서비스 매입조건 등록 폼 하나**로 통일한다.
 * 이 경로는 통합 폼의 수정 모드(?edit=<id>)로 넘긴다.
 */
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function DemandEditRedirect() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  useEffect(() => {
    const id = decodeURIComponent(params?.id ?? '')
    router.replace(id ? `/exchange/demands/new?edit=${encodeURIComponent(id)}` : '/my/demands')
  }, [params, router])
  return null
}
