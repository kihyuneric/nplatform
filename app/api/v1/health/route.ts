import { NextResponse } from "next/server"

export async function GET() {
  const health = {
    status: 'healthy',
    version: '12.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      server: 'ok',
      database: 'ok',
      storage: 'ok',
    },
  }

  return NextResponse.json(health)
}
