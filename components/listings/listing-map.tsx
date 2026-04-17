"use client"

import { MapPin, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ListingMapProps {
  address: string
  city?: string
  district?: string
}

export function ListingMap({ address, city, district }: ListingMapProps) {
  const displayAddress = address || [city, district].filter(Boolean).join(" ")
  const mapQuery = encodeURIComponent(displayAddress)

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] overflow-hidden">
      {/* Map placeholder */}
      <div className="relative h-48 bg-[var(--color-surface-overlay)] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B3A5C]/20">
            <MapPin className="h-7 w-7 text-[#1B3A5C]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] max-w-xs px-4">
            {displayAddress || "주소 정보 없음"}
          </p>
        </div>
        {/* Grid pattern overlay for map feel */}
        <div
          className="absolute inset-0 opacity-[0.04]  pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between bg-[var(--color-surface-elevated)] px-4 py-3 border-t border-[var(--color-border-subtle)]">
        <span className="text-xs text-[var(--color-text-secondary)] truncate mr-2">
          {displayAddress}
        </span>
        <Link
          href={`/market/map?address=${mapQuery}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#1B3A5C] hover:underline whitespace-nowrap"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          지도에서 보기
        </Link>
      </div>
    </div>
  )
}
