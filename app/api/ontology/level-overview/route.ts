import { NextRequest, NextResponse } from 'next/server'
import { getLevelOntologyOverview } from '@/lib/ontology-db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level') || '왕초보'
    const overview = await getLevelOntologyOverview(level)

    // Build graph nodes from unique concept IDs in the concept_graph edges
    const conceptIdSet = new Set<number>()
    const conceptNameMap = new Map<number, string>()
    for (const g of overview.concept_graph) {
      const src = (g as any).source_concept_id
      const tgt = (g as any).target_concept_id
      if (src) {
        conceptIdSet.add(src)
        conceptNameMap.set(src, g.source_concept)
      }
      if (tgt) {
        conceptIdSet.add(tgt)
        conceptNameMap.set(tgt, g.target_concept)
      }
    }

    const graph_nodes = Array.from(conceptIdSet).map(id => ({
      id,
      name: conceptNameMap.get(id) || '',
      level: level,
    }))

    const graph_edges = overview.concept_graph.map((g: any) => ({
      source: g.source_concept_id,
      target: g.target_concept_id,
      type: g.relation_type,
    }))

    return NextResponse.json({
      ...overview,
      graph_nodes,
      graph_edges,
    })
  } catch (error: any) {
    console.error('[level-overview] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
