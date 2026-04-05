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
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Map placeholder */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B3A5C]/10 dark:bg-[#1B3A5C]/30">
            <MapPin className="h-7 w-7 text-[#1B3A5C] dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-xs px-4">
            {displayAddress || "주소 정보 없음"}
          </p>
        </div>
        {/* Grid pattern overlay for map feel */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate mr-2">
          {displayAddress}
        </span>
        <Link
          href={`/market/map?address=${mapQuery}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#1B3A5C] dark:text-blue-400 hover:underline whitespace-nowrap"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          지도에서 보기
        </Link>
      </div>
    </div>
  )
}
