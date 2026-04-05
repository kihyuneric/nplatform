import { NextRequest, NextResponse } from "next/server"
import { getConceptsByDomain } from "@/lib/ontology-db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get("domain_id")
    const level = searchParams.get("level")
    const concepts = await getConceptsByDomain(
      domainId ? parseInt(domainId) : undefined,
      level || undefined
    )
    return NextResponse.json({ concepts })
  } catch (error) {
    console.warn("[ontology/concepts] DB error:", (error as any)?.message || error)
    return NextResponse.json({ concepts: [] })
  }
}
