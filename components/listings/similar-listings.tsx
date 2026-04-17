"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Building2, Loader2 } from "lucide-react"
import { formatKRW } from "@/lib/constants"

interface SimilarListing {
  id: string
  title?: string
  collateral_type: string
  principal_amount: number
  institution?: string
  address?: string
  location?: string
  location_city?: string
  location_district?: string
  risk_grade?: string
}

interface SimilarListingsProps {
  collateralType: string
  excludeId: string
}

const RISK_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-400",
  B: "bg-blue-500/10 text-blue-400",
  C: "bg-yellow-500/10 text-yellow-400",
  D: "bg-orange-500/10 text-orange-400",
  E: "bg-red-500/10 text-red-400",
}

export function SimilarListings({ collateralType, excludeId }: SimilarListingsProps) {
  const [listings, setListings] = useState<SimilarListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSimilar = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          collateral_type: collateralType,
          limit: "5",
          exclude: excludeId,
        })
        const res = await fetch(`/api/v1/exchange/listings?${params}`)
        if (!res.ok) throw new Error("fetch failed")
        const json = await res.json()
        const data: SimilarListing[] = (json.data || []).slice(0, 4)
        setListings(data)
      } catch {
        setListings([])
      } finally {
        setLoading(false)
      }
    }
    fetchSimilar()
  }, [collateralType, excludeId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
        유사한 매물이 없습니다.
      </p>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible">
      {listings.map((item) => {
        const loc =
          item.address ||
          item.location ||
          [item.location_city, item.location_district].filter(Boolean).join(" ") ||
          "-"

        return (
          <Link
            key={item.id}
            href={`/exchange/${item.id}`}
            className="min-w-[240px] snap-start md:min-w-0"
          >
            <Card className="h-full bg-[var(--color-surface-elevated)] hover:shadow-md transition-shadow border-[var(--color-border-subtle)]">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="mr-1 h-3 w-3" />
                    {item.collateral_type}
                  </Badge>
                  {item.risk_grade && (
                    <Badge className={`text-xs ${RISK_COLORS[item.risk_grade] || ""}`}>
                      {item.risk_grade}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {item.title || `${item.collateral_type} 채권`}
                </p>
                <p className="text-sm font-medium text-[#1B3A5C]">
                  {formatKRW(item.principal_amount)}
                </p>
                {item.institution && (
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                    {item.institution}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {loc}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
