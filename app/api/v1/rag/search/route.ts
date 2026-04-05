/**
 * POST /api/v1/rag/search
 *
 * 사용자 질문 → 임베딩 → pgvector 유사도 검색 → 관련 법률 청크 반환
 * NPL 코파일럿에서 Claude 컨텍스트 주입 전에 호출
 *
 * Body:
 *   query: string          ← 사용자 질문
 *   category?: string      ← 카테고리 필터 (선택)
 *   match_count?: number   ← 반환할 최대 청크 수 (기본 5)
 *   threshold?: number     ← 최소 유사도 (기본 0.65)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── 타입 ─────────────────────────────────────────────────────

export interface RagSearchResult {
  id: string
  content: string
  title: string
  source: string
  category: string
  tags: string[]
  similarity: number
}

export interface RagSearchResponse {
  results: RagSearchResult[]
  context_text: string   // Claude 시스템 프롬프트에 직접 삽입 가능한 형태
  query: string
  elapsed_ms: number
}

// ─── 임베딩 생성 (쿼리용 — voyage query 타입) ─────────────────

async function embedQuery(query: string): Promise<number[]> {
  const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || process.env.ANTHROPIC_API_KEY

  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY 환경변수가 필요합니다.')
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-multilingual-2',
      input: [query],
      input_type: 'query',  // 쿼리는 'query' 타입으로 (검색 최적화)
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Voyage API 오류: ${response.status} ${err}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>
  }

  const emb = data.data[0].embedding
  // 1024d → 1536d 패딩
  if (emb.length === 1024) {
    return [...emb, ...new Array(512).fill(0)]
  }
  return emb
}

// ─── 포맷팅 ───────────────────────────────────────────────────

function formatContextText(results: RagSearchResult[]): string {
  if (results.length === 0) return ''

  const sections = results.map((r, i) => {
    const sourceLabel = {
      civil_execution_act: '민사집행법',
      npl_regulation: 'NPL 관련 규정',
      court_precedent: '법원 판례',
      fss_guideline: '금융감독원 지침',
      custom: '참고 자료',
    }[r.source] ?? r.source

    return `[참고 ${i + 1}] ${r.title} (${sourceLabel}, 유사도: ${(r.similarity * 100).toFixed(0)}%)
${r.content}`
  })

  return `\n\n--- 관련 법률/규정 참고자료 ---\n${sections.join('\n\n')}\n---\n위 자료를 바탕으로 정확하고 근거 있는 답변을 제공하세요.`
}

// ─── 핸들러 ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  let body: {
    query: string
    category?: string
    match_count?: number
    threshold?: number
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { query, category, match_count = 5, threshold = 0.65 } = body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'query 파라미터가 필요합니다.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // 1. 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 2. 쿼리 임베딩 생성
    const queryEmbedding = await embedQuery(query.trim())

    // 3. pgvector 유사도 검색
    const { data, error } = await supabase.rpc('search_legal_embeddings', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: threshold,
      match_count: match_count,
      filter_category: category ?? null,
    })

    if (error) {
      // pgvector 확장이 없거나 임베딩이 없는 경우 빈 결과 반환 (graceful degradation)
      console.error('[RAG search] pgvector 오류:', error.message)
      return NextResponse.json({
        results: [],
        context_text: '',
        query,
        elapsed_ms: Date.now() - startTime,
        warning: 'RAG 검색 불가 (임베딩 DB 초기화 필요)',
      } satisfies RagSearchResponse & { warning: string })
    }

    const results: RagSearchResult[] = (data ?? []).map((row: RagSearchResult) => ({
      id: row.id,
      content: row.content,
      title: row.title,
      source: row.source,
      category: row.category,
      tags: row.tags ?? [],
      similarity: row.similarity,
    }))

    const contextText = formatContextText(results)

    return NextResponse.json({
      results,
      context_text: contextText,
      query,
      elapsed_ms: Date.now() - startTime,
    } satisfies RagSearchResponse)

  } catch (err) {
    const message = String(err)

    // Voyage API 키 없을 때 graceful degradation
    if (message.includes('VOYAGE_API_KEY')) {
      return NextResponse.json({
        results: [],
        context_text: '',
        query,
        elapsed_ms: Date.now() - startTime,
        warning: 'RAG 검색 비활성화 (VOYAGE_API_KEY 미설정)',
      })
    }

    console.error('[RAG search] 오류:', message)
    return NextResponse.json({ error: `검색 오류: ${message}` }, { status: 500 })
  }
}
