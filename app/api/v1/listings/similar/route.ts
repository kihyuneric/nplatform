/**
 * POST /api/v1/listings/similar
 *
 * Phase 3 #6 — pgvector 기반 유사 매물 검색 (FAISS 대체)
 *
 * 입력:
 *   A) { listing_id }  → 해당 매물의 임베딩으로 유사 매물 찾기
 *   B) { query }       → 자연어 질의 임베딩으로 매물 찾기
 *
 * 옵션: match_count, match_threshold, filter_region, filter_type
 *
 * B2B 인증:
 *   X-API-Key 헤더가 있으면 검증 후 사용량 기록.
 *   없으면 공개 RPC 호출(읽기 전용) — 누구나 검색 가능.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { generateQueryEmbedding } from '@/lib/embeddings/listing-embedding'
import { validateApiKey, recordApiUsage } from '@/lib/api-key-auth'

export const maxDuration = 30

const Body = z.union([
  z.object({
    listing_id: z.string().uuid(),
    match_count: z.number().int().min(1).max(50).optional(),
    match_threshold: z.number().min(0).max(1).optional(),
    filter_region: z.string().optional(),
    filter_type: z.string().optional(),
  }),
  z.object({
    query: z.string().min(2).max(500),
    match_count: z.number().int().min(1).max(50).optional(),
    match_threshold: z.number().min(0).max(1).optional(),
    filter_region: z.string().optional(),
    filter_type: z.string().optional(),
  }),
])

export async function POST(req: NextRequest) {
  const t0 = Date.now()

  // 선택적 API 키 인증 (B2B 사용량 기록용)
  const apiKey = req.headers.get('x-api-key')
  const apiAuth = apiKey ? await validateApiKey(apiKey) : null

  let parsed: z.infer<typeof Body>
  try {
    parsed = Body.parse(await req.json())
  } catch (err) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
        : [String(err)]
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: '입력값 검증 실패', issues } },
      { status: 400 },
    )
  }

  const supabase = getSupabaseAdmin()
  const matchCount = parsed.match_count ?? 10
  const matchThreshold = parsed.match_threshold ?? 0.5

  try {
    // 1) 임베딩 획득 — listing_id 모드 또는 query 모드
    let embedding: number[] | null = null

    if ('listing_id' in parsed) {
      const { data, error } = await supabase
        .from('listing_embeddings')
        .select('embedding')
        .eq('listing_id', parsed.listing_id)
        .maybeSingle()
      if (error || !data) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'EMBEDDING_NOT_FOUND',
              message: '해당 매물의 임베딩이 없습니다. 색인이 완료되어야 합니다.',
            },
          },
          { status: 404 },
        )
      }
      // pgvector가 문자열 형태로 반환 → 파싱
      const raw = data.embedding as unknown
      embedding =
        typeof raw === 'string'
          ? raw
              .replace(/^\[|\]$/g, '')
              .split(',')
              .map(Number)
          : (raw as number[])
    } else {
      embedding = await generateQueryEmbedding(parsed.query)
    }

    if (!embedding) throw new Error('임베딩을 얻지 못했습니다.')

    // 2) RPC 호출
    const { data, error } = await supabase.rpc('match_similar_listings', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_region: parsed.filter_region ?? null,
      filter_type: parsed.filter_type ?? null,
    })

    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: 'RPC_FAILED', message: error.message } },
        { status: 500 },
      )
    }

    const response = NextResponse.json({
      ok: true,
      data: data ?? [],
      count: data?.length ?? 0,
      mode: 'listing_id' in parsed ? 'by_listing' : 'by_query',
      threshold: matchThreshold,
    })

    // B2B 사용량 기록
    if (apiAuth) {
      void recordApiUsage({
        keyId: apiAuth.keyId,
        userId: apiAuth.userId,
        endpoint: '/api/v1/listings/similar',
        method: 'POST',
        status: 200,
        durationMs: Date.now() - t0,
        ip:
          req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      })
    }

    return response
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SIMILAR_SEARCH_FAILED',
          message: err instanceof Error ? err.message : '유사 매물 검색 중 오류',
        },
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/v1/listings/similar',
    description: 'pgvector(cosine) 기반 유사 매물 검색. listing_id 또는 query 필수.',
    limits: { max_count: 50, min_threshold: 0, max_threshold: 1 },
    auth: 'X-API-Key optional (B2B 사용량 기록)',
  })
}
