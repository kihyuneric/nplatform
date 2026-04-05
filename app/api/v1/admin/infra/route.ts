import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env.local')

function readEnvFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8')
    const env: Record<string, string> = {}
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim()
        const val = trimmed.substring(eqIdx + 1).trim()
        env[key] = val
      }
    })
    return env
  } catch { return {} }
}

function writeEnvFile(env: Record<string, string>) {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`)
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8')
}

function maskValue(val: string): string {
  if (!val || val.length < 8) return '****'
  return val.substring(0, 4) + '****' + val.substring(val.length - 4)
}

export async function GET() {
  const env = readEnvFile()

  const infra = {
    supabase: {
      connected: !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      url: env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? maskValue(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : '',
      serviceKey: env.SUPABASE_SERVICE_ROLE_KEY ? maskValue(env.SUPABASE_SERVICE_ROLE_KEY) : '',
    },
    database: {
      mode: env.DB_MODE || 'supabase', // 'supabase' | 'direct'
      driver: env.DB_DRIVER || 'postgresql', // 'postgresql' | 'mysql' | 'mariadb'
      host: env.DB_HOST || '',
      port: env.DB_PORT || '',
      name: env.DB_NAME || '',
      user: env.DB_USER || '',
      password: env.DB_PASSWORD ? maskValue(env.DB_PASSWORD) : '',
      ssl: env.DB_SSL !== 'false', // default true
      connected: !!(env.DB_HOST && env.DB_NAME && env.DB_USER),
      connectionString: env.DATABASE_URL ? maskValue(env.DATABASE_URL) : '',
    },
    vercel: {
      connected: !!(env.VERCEL_TOKEN),
      token: env.VERCEL_TOKEN ? maskValue(env.VERCEL_TOKEN) : '',
      projectId: env.VERCEL_PROJECT_ID || '',
    },
    payment: {
      provider: env.PAYMENT_PROVIDER || 'none',
      connected: !!(env.PAYMENT_CLIENT_KEY && env.PAYMENT_SECRET_KEY),
      clientKey: env.PAYMENT_CLIENT_KEY ? maskValue(env.PAYMENT_CLIENT_KEY) : '',
      secretKey: env.PAYMENT_SECRET_KEY ? maskValue(env.PAYMENT_SECRET_KEY) : '',
    },
    storage: {
      provider: env.STORAGE_PROVIDER || 'supabase',
      connected: !!(env.NEXT_PUBLIC_SUPABASE_URL),
      bucket: env.STORAGE_BUCKET || 'uploads',
    },
    realtime: {
      enabled: env.REALTIME_ENABLED === 'true',
    },
    ai: {
      provider: env.AI_PROVIDER || 'none',
      connected: !!(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY),
      anthropicKey: env.ANTHROPIC_API_KEY ? maskValue(env.ANTHROPIC_API_KEY) : '',
      openaiKey: env.OPENAI_API_KEY ? maskValue(env.OPENAI_API_KEY) : '',
    },
    external: {
      realEstateApi: env.EXTERNAL_REALESTATE_API_URL || '',
      newsApi: env.EXTERNAL_NEWS_API_URL || '',
      auctionApi: env.EXTERNAL_AUCTION_API_URL || '',
    },
    domain: {
      url: env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
    google: {
      translateKey: env.GOOGLE_TRANSLATE_API_KEY ? maskValue(env.GOOGLE_TRANSLATE_API_KEY) : '',
    }
  }

  return NextResponse.json({ data: infra })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const env = readEnvFile()

    const mapping: Record<string, string> = {
      'supabase.url': 'NEXT_PUBLIC_SUPABASE_URL',
      'supabase.anonKey': 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'supabase.serviceKey': 'SUPABASE_SERVICE_ROLE_KEY',
      'database.mode': 'DB_MODE',
      'database.driver': 'DB_DRIVER',
      'database.host': 'DB_HOST',
      'database.port': 'DB_PORT',
      'database.name': 'DB_NAME',
      'database.user': 'DB_USER',
      'database.password': 'DB_PASSWORD',
      'database.ssl': 'DB_SSL',
      'database.connectionString': 'DATABASE_URL',
      'vercel.token': 'VERCEL_TOKEN',
      'vercel.projectId': 'VERCEL_PROJECT_ID',
      'payment.provider': 'PAYMENT_PROVIDER',
      'payment.clientKey': 'PAYMENT_CLIENT_KEY',
      'payment.secretKey': 'PAYMENT_SECRET_KEY',
      'storage.provider': 'STORAGE_PROVIDER',
      'storage.bucket': 'STORAGE_BUCKET',
      'realtime.enabled': 'REALTIME_ENABLED',
      'ai.provider': 'AI_PROVIDER',
      'ai.anthropicKey': 'ANTHROPIC_API_KEY',
      'ai.openaiKey': 'OPENAI_API_KEY',
      'external.realEstateApi': 'EXTERNAL_REALESTATE_API_URL',
      'external.newsApi': 'EXTERNAL_NEWS_API_URL',
      'external.auctionApi': 'EXTERNAL_AUCTION_API_URL',
      'domain.url': 'NEXT_PUBLIC_SITE_URL',
      'google.translateKey': 'GOOGLE_TRANSLATE_API_KEY',
    }

    let changed = 0
    for (const [formKey, envKey] of Object.entries(mapping)) {
      if (body[formKey] !== undefined && !body[formKey].includes('****')) {
        env[envKey] = body[formKey]
        changed++
      }
    }

    if (changed > 0) {
      writeEnvFile(env)
    }

    return NextResponse.json({ success: true, changed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
