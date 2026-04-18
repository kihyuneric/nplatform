import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/v1/auction/stream?auctionId=AUC-001
// SSE endpoint — pushes live bid events to the client
// Falls back gracefully if Supabase Realtime is unavailable
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const auctionId = searchParams.get('auctionId')

  if (!auctionId) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'auctionId is required' } },
      { status: 400 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'Supabase not configured' } },
      { status: 503 }
    )
  }

  const encoder = new TextEncoder()

  function send(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createClient(url, key, { auth: { persistSession: false } })

      // Send initial heartbeat
      controller.enqueue(send('connected', { auctionId, ts: new Date().toISOString() }))

      // Subscribe to auction_bids inserts
      const channel = supabase
        .channel(`server:auction:${auctionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'auction_bids',
            filter: `auction_id=eq.${auctionId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string
              auction_id: string
              bid_amount: number
              bid_time: string
            }
            try {
              controller.enqueue(send('bid', {
                id: row.id,
                auctionId: row.auction_id,
                amount: row.bid_amount,
                timestamp: row.bid_time,
              }))
            } catch {
              // Client disconnected
            }
          }
        )
        .subscribe()

      // Heartbeat every 25s to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 25_000)

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        void supabase.removeChannel(channel)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
