"use client"

import dynamic from "next/dynamic"

const MarketMapPage = dynamic(
  () => import("./map-client").then((mod) => ({ default: mod.MarketMapPage })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  )}
)

export default function Page() {
  return <MarketMapPage />
}
