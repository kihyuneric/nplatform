import { NextResponse } from 'next/server'
import { getYoutubeStats } from '@/lib/ontology-db'

export async function GET() {
  try {
    const stats = await getYoutubeStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[youtube/stats] Error:', error)
    return NextResponse.json(
      { total_videos: 0, total_mappings: 0, covered_concepts: 0, total_concepts: 0, coverage_rate: 0 },
      { status: 500 }
    )
  }
}
