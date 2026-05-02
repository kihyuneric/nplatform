"use client"

/**
 * /services 레이아웃 — 전문가 SubNav 제거 (3-role 통일 정책 · 2026-05-02)
 * 전문가 라우트(/services/experts/*) 자체는 잠시 유지하지만 nav 진입점은 차단.
 */

import { BannerSlot } from '@/components/banners/banner-slot'

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BannerSlot position="services-top" className="mx-auto max-w-7xl px-4 pt-4" />
      {children}
    </>
  )
}
