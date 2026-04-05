import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { service } = await req.json()

  const results: Record<string, { ok: boolean; message: string; provider?: string; status?: number }> = {}

  if (service === 'database' || service === 'all') {
    const dbMode = process.env.DB_MODE || 'supabase'
    if (dbMode === 'direct') {
      const host = process.env.DB_HOST
      const name = process.env.DB_NAME
      const user = process.env.DB_USER
      const password = process.env.DB_PASSWORD
      const port = process.env.DB_PORT || '5432'
      if (!host || !name || !user) {
        results.database = { ok: false, message: 'DB 호스트/이름/사용자 미설정' }
      } else {
        // Validate by attempting a TCP socket connection to host:port
        try {
          const { createConnection } = await import('net')
          await new Promise<void>((resolve, reject) => {
            const socket = createConnection({ host, port: parseInt(port), timeout: 5000 })
            socket.once('connect', () => { socket.destroy(); resolve() })
            socket.once('error', reject)
            socket.once('timeout', () => { socket.destroy(); reject(new Error('연결 시간 초과')) })
          })
          results.database = {
            ok: true,
            message: `${process.env.DB_DRIVER || 'postgresql'} 서버 응답 확인 (${host}:${port})`,
          }
        } catch (e: unknown) {
          results.database = {
            ok: false,
            message: e instanceof Error ? `서버 연결 실패: ${e.message}` : '서버 연결 실패',
          }
        }
      }
    } else {
      // Supabase mode — tested by supabase check below
      results.database = { ok: true, message: 'Supabase 모드 — Supabase 연결 테스트를 이용하세요' }
    }
  }

  if (service === 'supabase' || service === 'all') {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('환경변수 미설정')
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      })
      results.supabase = {
        ok: res.status < 400,
        status: res.status,
        message: res.status < 400 ? '연결 성공' : `HTTP ${res.status}`
      }
    } catch (e: unknown) {
      results.supabase = { ok: false, message: e instanceof Error ? e.message : '연결 실패' }
    }
  }

  if (service === 'payment' || service === 'all') {
    const provider = process.env.PAYMENT_PROVIDER || 'toss'
    const clientKey = process.env.PAYMENT_CLIENT_KEY
    if (!clientKey) {
      results.payment = { ok: false, message: '클라이언트 키 미설정' }
    } else {
      results.payment = { ok: true, message: `${provider} 키 설정됨 (실연동은 결제 시 확인)` }
    }
  }

  if (service === 'ai' || service === 'all') {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (anthropicKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }]
          })
        })
        results.ai = {
          ok: res.status < 400,
          provider: 'Anthropic',
          message: res.status < 400 ? '연결 성공' : `HTTP ${res.status}`
        }
      } catch (e: unknown) {
        results.ai = { ok: false, provider: 'Anthropic', message: e instanceof Error ? e.message : '연결 실패' }
      }
    } else if (openaiKey) {
      results.ai = { ok: true, provider: 'OpenAI', message: '키 설정됨' }
    } else {
      results.ai = { ok: false, message: 'AI API 키 미설정 (샘플 모드)' }
    }
  }

  if (service === 'storage' || service === 'all') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url) {
      results.storage = { ok: true, message: 'Supabase Storage 사용 가능' }
    } else {
      results.storage = { ok: false, message: 'Supabase 미연결 (로컬 저장)' }
    }
  }

  if (service === 'translate' || service === 'all') {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY
    results.translate = key
      ? { ok: true, message: 'Google Translate 키 설정됨' }
      : { ok: false, message: '미설정 (수동 번역 모드)' }
  }

  return NextResponse.json({ data: results })
}
