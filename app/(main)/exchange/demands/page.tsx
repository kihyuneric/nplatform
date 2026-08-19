'use client'

/**
 * /exchange/demands — 레거시 '매입 조건 게시판'(AI 매칭·제안 보내기)
 *
 * 정책(2026-08-19): 서비스 화면 지도에 없는 화면. 회원은 마이페이지 매입 조건에서 관리한다.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DemandsBoardRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/my/demands') }, [router])
  return null
}
