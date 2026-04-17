"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Gavel, Building2 } from "lucide-react"

const MarketMapPage = dynamic(
  () => import("./map-client").then((mod) => ({ default: mod.MarketMapPage })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    ),
  }
)

const AuctionMapPage = dynamic(
  () => import("./auction-client").then((mod) => ({ default: mod.AuctionMapPage })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    ),
  }
)

type MapMode = "AUCTION" | "NPL"

export default function Page() {
  const [mode, setMode] = useState<MapMode>("AUCTION")

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Mode Toggle (top-left floating) ─────────────── */}
      <div className="absolute top-3 left-3 z-[60] flex items-center gap-1 rounded-xl p-1 shadow-lg backdrop-blur"
        style={{
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid var(--color-border-default)',
        }}>
        <ModeButton
          active={mode === "AUCTION"}
          onClick={() => setMode("AUCTION")}
          icon={<Gavel size={14} />}
          label="경매 NPL"
          accent="#DC2626"
        />
        <ModeButton
          active={mode === "NPL"}
          onClick={() => setMode("NPL")}
          icon={<Building2 size={14} />}
          label="NPL"
          accent="#059669"
        />
      </div>

      {/* ── Map Content ─────────────────────────────────── */}
      {mode === "AUCTION" ? <AuctionMapPage /> : <MarketMapPage />}
    </div>
  )
}

function ModeButton({
  active, onClick, icon, label, accent,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  accent: string
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
      style={{
        background: active ? accent : 'transparent',
        color: active ? 'white' : 'var(--color-text-secondary)',
        boxShadow: active ? `0 2px 8px ${accent}40` : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
