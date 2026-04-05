import { NextRequest, NextResponse } from "next/server"

// Store vitals in memory (replace with DB/analytics service in production)
const vitalsStore: Record<string, unknown>[] = []

export async function POST(req: NextRequest) {
  try {
    const metric = await req.json()
    vitalsStore.push({ ...metric, timestamp: Date.now() })

    // Keep only last 1000 entries
    if (vitalsStore.length > 1000) vitalsStore.splice(0, vitalsStore.length - 1000)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}

export async function GET() {
  // Return aggregated vitals for admin dashboard
  const metrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB']
  const summary: Record<string, { avg: number; p75: number; count: number }> = {}

  for (const name of metrics) {
    const values = vitalsStore
      .filter(v => v.name === name)
      .map(v => v.value as number)
    if (values.length > 0) {
      values.sort((a, b) => a - b)
      summary[name] = {
        avg: values.reduce((s, v) => s + v, 0) / values.length,
        p75: values[Math.floor(values.length * 0.75)] ?? 0,
        count: values.length,
      }
    }
  }

  return NextResponse.json({ data: summary, total: vitalsStore.length })
}
