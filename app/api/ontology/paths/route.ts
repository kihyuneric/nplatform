export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { getPaths } from "@/lib/ontology-db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get("domain_id")
    const paths = await getPaths(domainId ? parseInt(domainId) : undefined)
    return NextResponse.json({ paths })
  } catch (error) {
    console.warn("[ontology/paths] DB error:", (error as any)?.message || error)
    return NextResponse.json({ paths: [] })
  }
}
