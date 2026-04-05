import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const source = req.headers.get('x-webhook-source') || body.source || 'unknown'

    logger.info(`[Webhook] Received from ${source}:`, { data: JSON.stringify(body).substring(0, 200) })

    // Route webhook by source
    switch (source) {
      case 'toss-payments':
        logger.info('[Webhook] Payment event:', { data: body.eventType })
        break
      case 'supabase':
        logger.info('[Webhook] DB event:', { data: body.type })
        break
      case 'external-data':
        logger.info('[Webhook] Data update:', { data: body.dataType })
        break
      default:
        logger.info('[Webhook] Unknown source:', { data: source })
    }

    return NextResponse.json({ received: true, source })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
