"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Eye, EyeOff } from "lucide-react"

interface BannerSlot {
  id: string
  label: string
  position: string
  description: string
  size: string
  x: number
  y: number
  w: number
  h: number
}

const LAYOUT_SLOTS: BannerSlot[] = [
  { id: "hero", label: "히어로 배너", position: "hero", description: "메인 페이지 상단 풀 와이드", size: "1200×300", x: 0, y: 60, w: 400, h: 60 },
  { id: "service-top", label: "서비스 상단", position: "service-top", description: "서비스 페이지 진입 시 상단", size: "1200×120", x: 0, y: 130, w: 400, h: 30 },
  { id: "sidebar", label: "사이드바", position: "sidebar", description: "매물 상세 / 검색 우측 사이드", size: "300×250", x: 310, y: 170, w: 90, h: 80 },
  { id: "between-content", label: "콘텐츠 사이", position: "between-content", description: "매물 리스트 중간 삽입", size: "1200×120", x: 0, y: 260, w: 300, h: 30 },
  { id: "professional", label: "전문가 영역", position: "professional", description: "전문가 마켓 상단/하단", size: "1200×150", x: 0, y: 300, w: 400, h: 35 },
  { id: "deal-bridge", label: "딜 브릿지", position: "deal-bridge", description: "딜 브릿지 매물 상세 페이지", size: "800×120", x: 0, y: 170, w: 300, h: 30 },
  { id: "footer", label: "푸터 배너", position: "footer", description: "페이지 하단 푸터 위", size: "1200×100", x: 0, y: 345, w: 400, h: 25 },
]

interface Props {
  activeBanners: { position: string; title: string; image_url?: string; status: string }[]
  onSlotClick?: (position: string) => void
}

export function BannerLayoutPreview({ activeBanners, onSlotClick }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [showBanners, setShowBanners] = useState(true)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)

  const getBannerForSlot = (position: string) =>
    activeBanners.find((b) => b.position === position && b.status === "ACTIVE")

  const viewW = device === "desktop" ? 400 : 200
  const scale = device === "mobile" ? 0.5 : 1

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={device === "desktop" ? "default" : "outline"}
          onClick={() => setDevice("desktop")}
          className={device === "desktop" ? "bg-[var(--color-brand-dark)]" : ""}
        >
          <Monitor className="mr-1 h-4 w-4" /> 데스크톱
        </Button>
        <Button
          size="sm"
          variant={device === "mobile" ? "default" : "outline"}
          onClick={() => setDevice("mobile")}
          className={device === "mobile" ? "bg-[var(--color-brand-dark)]" : ""}
        >
          <Smartphone className="mr-1 h-4 w-4" /> 모바일
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowBanners(!showBanners)}
        >
          {showBanners ? <Eye className="mr-1 h-4 w-4" /> : <EyeOff className="mr-1 h-4 w-4" />}
          {showBanners ? "배너 표시 중" : "배너 숨김"}
        </Button>
      </div>

      {/* Layout Preview */}
      <div className="relative mx-auto overflow-hidden rounded-lg border-2 border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
        style={{ width: viewW + 40, height: 400 }}
      >
        {/* Browser Chrome */}
        <div className="flex h-7 items-center gap-1.5 border-b bg-[var(--color-surface-overlay)] px-3 border-[var(--color-border-subtle)]">
          <div className="h-2.5 w-2.5 rounded-full bg-stone-100" />
          <div className="h-2.5 w-2.5 rounded-full bg-stone-100" />
          <div className="h-2.5 w-2.5 rounded-full bg-stone-100" />
          <div className="ml-3 flex-1 rounded bg-[var(--color-surface-overlay)] px-2 py-0.5 text-[8px] text-[var(--color-text-muted)]">
            nplatform.co.kr
          </div>
        </div>

        {/* Page Layout */}
        <div className="relative p-4" style={{ height: 370 }}>
          {/* Navigation bar */}
          <div className="absolute left-4 right-4 top-4 flex h-8 items-center justify-between rounded bg-[var(--color-brand-dark)] px-3">
            <span className="text-[8px] font-bold text-white">NPLatform</span>
            <div className="flex gap-2">
              {["매물", "거래", "분석", "서비스"].map((m) => (
                <span key={m} className="text-[6px] text-white/70">{m}</span>
              ))}
            </div>
          </div>

          {/* Content area placeholder */}
          <div className="absolute left-4 top-16 text-[7px] text-[var(--color-text-muted)]" style={{ width: viewW * scale }}>
            {device === "desktop" && (
              <>
                <div className="mb-1 h-4 w-32 rounded bg-[var(--color-surface-overlay)]" />
                <div className="mb-1 h-2 w-48 rounded bg-[var(--color-surface-elevated)]" />
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-10 rounded bg-[var(--color-surface-elevated)]" />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Banner Slots */}
          {LAYOUT_SLOTS.map((slot) => {
            const banner = getBannerForSlot(slot.position)
            const isHovered = hoveredSlot === slot.id
            const hasBanner = !!banner && showBanners

            return (
              <div
                key={slot.id}
                className={`absolute cursor-pointer transition-all duration-200 ${
                  hasBanner
                    ? "border-2 border-stone-300 bg-stone-100/20"
                    : "border-2 border-dashed border-stone-300/40 bg-stone-100/5"
                } ${isHovered ? "ring-2 ring-blue-400 ring-offset-1 z-10" : ""}`}
                style={{
                  left: slot.x * scale + 16,
                  top: slot.y * scale + 28,
                  width: slot.w * scale,
                  height: slot.h * scale,
                }}
                onMouseEnter={() => setHoveredSlot(slot.id)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => onSlotClick?.(slot.position)}
              >
                {/* Slot Label */}
                <div className="flex h-full items-center justify-center">
                  {hasBanner ? (
                    <div className="text-center">
                      <div className="text-[7px] font-bold text-stone-900">
                        {banner.title}
                      </div>
                      <div className="text-[5px] text-stone-900">ACTIVE</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-[7px] font-medium text-stone-900">{slot.label}</div>
                      <div className="text-[5px] text-stone-900">비어있음</div>
                    </div>
                  )}
                </div>

                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-20 left-1/2 z-20 w-48 -translate-x-1/2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-2 shadow-lg">
                    <p className="text-xs font-bold text-[var(--color-brand-dark)]">{slot.label}</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">{slot.description}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">권장 크기: {slot.size}px</p>
                    {hasBanner ? (
                      <Badge className="mt-1 bg-stone-100/10 text-stone-900 text-[9px]">
                        ✅ {banner.title}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-[9px]">
                        ⬜ 비어있음 — 클릭하여 추가
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Slot Legend */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {LAYOUT_SLOTS.map((slot) => {
          const banner = getBannerForSlot(slot.position)
          return (
            <div
              key={slot.id}
              className={`cursor-pointer rounded-lg border p-2 transition-all hover:shadow-md ${
                banner
                  ? "border-stone-300/20 bg-stone-100/10"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
              }`}
              onClick={() => onSlotClick?.(slot.position)}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${banner ? "bg-stone-100" : "bg-[var(--color-border-default)]"}`} />
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{slot.label}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">{slot.size}</p>
              {banner && (
                <p className="mt-0.5 truncate text-[10px] text-stone-900">
                  ✅ {banner.title}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
