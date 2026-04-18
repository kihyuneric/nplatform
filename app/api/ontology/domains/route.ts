export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { getDomains } from "@/lib/ontology-db"

export async function GET() {
  try {
    const domains = await getDomains()
    return NextResponse.json({ domains })
  } catch (error) {
    console.warn("[ontology/domains] DB error:", (error as any)?.message || error)
    return NextResponse.json({ domains: [] })
  }
}
