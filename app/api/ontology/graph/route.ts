export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { getGraphDataWithImportance } from "@/lib/ontology-db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get("domain_id")
    const level = searchParams.get("level")
    const graph = await getGraphDataWithImportance(
      domainId ? parseInt(domainId) : undefined,
      level || undefined
    )
    return NextResponse.json(graph)
  } catch (error) {
    console.warn("[ontology/graph] DB error:", (error as any)?.message || error)
    return NextResponse.json({ nodes: [], edges: [] })
  }
}
