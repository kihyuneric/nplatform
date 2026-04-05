import { NextRequest, NextResponse } from "next/server"

const eventStore: Record<string, unknown>[] = []

export async function POST(req: NextRequest) {
  try {
    const { events } = await req.json()
    if (Array.isArray(events)) {
      eventStore.push(...events)
      // Keep last 10000 events
      if (eventStore.length > 10000) eventStore.splice(0, eventStore.length - 10000)
    }
    return NextResponse.json({ success: true, stored: events?.length || 0 })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}

export async function GET() {
  // Return analytics summary
  const summary = {
    totalEvents: eventStore.length,
    byType: {} as Record<string, number>,
    recentEvents: eventStore.slice(-20),
  }
  for (const e of eventStore) {
    const t = e.type as string
    summary.byType[t] = (summary.byType[t] || 0) + 1
  }
  return NextResponse.json({ data: summary })
}
