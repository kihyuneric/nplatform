'use client'

// legacy admin route — out of scope per ops spec v3 (2026-08-19). Redirects to /admin.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyAdminRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin') }, [router])
  return null
}
