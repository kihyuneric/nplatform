"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"

interface Institution {
  id: string
  name: string
  slug: string
  type: string
  logo_url: string | null
  listing_count?: number
}

interface InstitutionFilterProps {
  selected: string[]
  onChange: (ids: string[]) => void
}

export function InstitutionFilter({ selected, onChange }: InstitutionFilterProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([])

  useEffect(() => {
    fetch("/api/v1/institutions")
      .then((r) => r.json())
      .then(({ data }) => setInstitutions(data || []))
      .catch(() => {})
  }, [])

  if (institutions.length === 0) return null

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        매각기관
      </p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {institutions.map((inst) => (
          <div key={inst.id} className="flex items-center gap-2">
            <Checkbox
              id={`inst-${inst.id}`}
              checked={selected.includes(inst.id)}
              onCheckedChange={() => toggle(inst.id)}
            />
            <Label htmlFor={`inst-${inst.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
              {inst.logo_url ? (
                <img
                  src={inst.logo_url}
                  alt={inst.name}
                  className="h-3.5 w-3.5 rounded"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div className="h-3.5 w-3.5 rounded bg-[#1B3A5C] flex items-center justify-center text-[7px] text-white font-bold">
                  {inst.name[0]}
                </div>
              )}
              <span>{inst.name}</span>
              {inst.listing_count != null && (
                <span className="text-xs text-muted-foreground">({inst.listing_count})</span>
              )}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
