"use client"

import { useEffect, useState, useRef } from "react"
import { useRoles } from "@/lib/roles"
import { BannerCard } from "./banner-card"

interface Banner {
  id: string
  title: string
  image_url: string
  target_url: string
  position: string
}

type BannerPosition =
  | "hero" | "service-top" | "sidebar" | "between-content"
  | "professional" | "deal-bridge" | "footer"
  | "exchange-top" | "exchange-sidebar"
  | "deals-top" | "deals-sidebar"
  | "analysis-top" | "analysis-sidebar"
  | "services-top" | "services-sidebar"
  | "my-top" | "my-sidebar"
  | "community-sidebar" | "guide-bottom"

interface BannerSlotProps {
  position: BannerPosition
  maxCount?: number
  className?: string
}

const SIZE_MAP: Record<string, { width: string; height: string }> = {
  hero: { width: "100%", height: "auto" },
  "service-top": { width: "100%", height: "90px" },
  sidebar: { width: "300px", height: "250px" },
  "between-content": { width: "100%", height: "90px" },
  professional: { width: "100%", height: "120px" },
  "deal-bridge": { width: "100%", height: "90px" },
  footer: { width: "100%", height: "90px" },
  "exchange-top": { width: "100%", height: "80px" },
  "exchange-sidebar": { width: "300px", height: "250px" },
  "deals-top": { width: "100%", height: "80px" },
  "deals-sidebar": { width: "300px", height: "250px" },
  "analysis-top": { width: "100%", height: "80px" },
  "analysis-sidebar": { width: "300px", height: "250px" },
  "services-top": { width: "100%", height: "80px" },
  "services-sidebar": { width: "300px", height: "250px" },
  "my-top": { width: "100%", height: "80px" },
  "my-sidebar": { width: "300px", height: "250px" },
  "community-sidebar": { width: "300px", height: "250px" },
  "guide-bottom": { width: "100%", height: "100px" },
}

export function BannerSlot({ position, maxCount = 3, className }: BannerSlotProps) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [current, setCurrent] = useState(0)
  const { activeRole } = useRoles()
  const slotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ position })
        if (activeRole) params.set("targetRole", activeRole)

        const res = await fetch(`/api/v1/banners?${params}`)
        if (!res.ok) return
        const { data } = await res.json()
        setBanners((data || []).slice(0, maxCount))
      } catch {
        // 배너 로드 실패 시 무시
      }
    }
    load()
  }, [position, activeRole, maxCount])

  // 자동 롤링 (5초)
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  // 노출 트래킹 (Intersection Observer)
  useEffect(() => {
    if (!slotRef.current || banners.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && banners[current]) {
            fetch(`/api/v1/banners?id=${banners[current].id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "impression" }),
            }).catch(() => {})
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(slotRef.current)
    return () => observer.disconnect()
  }, [banners, current])

  if (banners.length === 0) return null

  const size = SIZE_MAP[position] || SIZE_MAP["service-top"]

  return (
    <div
      ref={slotRef}
      className={`overflow-hidden rounded-lg ${className || ""}`}
      style={{ maxWidth: size.width }}
    >
      {banners[current] && (
        <BannerCard
          banner={banners[current]}
          height={size.height}
        />
      )}
    </div>
  )
}
