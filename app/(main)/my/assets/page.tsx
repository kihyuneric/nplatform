'use client'

// legacy route — out of scope per ops spec (2026-08-18). Redirects to /my/seller.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/my/seller') }, [router])
  return null
}
