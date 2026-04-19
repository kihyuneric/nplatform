/**
 * POST /api/v1/rag/ingest
 *
 * 법률 문서를 청크로 분할 → 임베딩 생성 → Supabase legal_embeddings에 저장
 *
 * Body:
 *   documents: Array<{
 *     title: string
 *     content: string      ← 전체 문서 텍스트
 *     source: string       ← 'civil_execution_act' | 'court_precedent' | 'fss_guideline' | 'custom'
 *     source_url?: string
 *     category: string     ← 'auction' | 'npl_transfer' | 'bankruptcy' | 'tenant_rights' | 'mortgage' | 'tax_lien'
 *     tags?: string[]
 *   }>
 *   chunk_size?: number    ← 기본 500자
 *   chunk_overlap?: number ← 기본 100자 (문맥 유지)
 *   admin_secret?: string  ← 프로덕션 보안용
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// ─── 타입 ─────────────────────────────────────────────────────

interface IngestDocument {
  title: string
  content: string
  source: string
  source_url?: string
  category: string
  tags?: string[]
}

interface ChunkRecord {
  title: string
  content: string
  source: string
  source_url?: string | null
  doc_id: string
  chunk_index: number
  category: string
  tags: string[]
  language: string
}

// ─── 청크 분할 ────────────────────────────────────────────────

function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 100,
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunkEnd = end

    // 문장 경계에서 자르기 (마침표, 줄바꿈 우선)
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end)
      if (boundary > start + chunkSize * 0.6) {
        chunkEnd = boundary + 1
      } else {
        const sentBoundary = text.lastIndexOf('. ', end)
        if (sentBoundary > start + chunkSize * 0.6) {
          chunkEnd = sentBoundary + 2
        }
      }
    }

    const chunk = text.slice(start, chunkEnd).trim()
    if (chunk.length > 20) {
      chunks.push(chunk)
    }

    start = chunkEnd - overlap
    if (start >= text.length) break
  }

  return chunks
}

// ─── 임베딩 생성 (Voyage Multilingual) ───────────────────────

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Anthropic Voyage는 별도 엔드포인트 없이 HTTP 직접 호출
  // Voyage-multilingual-2: 한국어 최적화, 1024d → 1536d 패딩
  const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || process.env.ANTHROPIC_API_KEY

  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY 환경변수가 필요합니다.')
  }

  // Voyage API 직접 호출
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-multilingual-2',
      input: texts,
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Voyage API 오류: ${response.status} ${err}`)
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[]; index: number }>
  }

  // 인덱스 순서 보장
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => {
      // Voyage-multilingual-2는 1024d → 1536d로 패딩 (pgvector 스키마 맞춤)
      const emb = d.embedding
      if (emb.length === 1024) {
        return [...emb, ...new Array(512).fill(0)]
      }
      return emb
    })
}

// ─── 배치 처리 (API rate limit 대응) ─────────────────────────

async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  fn: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await fn(batch)
    results.push(...batchResults)
    // Rate limit 대응 (100ms 딜레이)
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, 100))
    }
  }
  return results
}

// ─── 핸들러 ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 간단한 admin 시크릿 보호 (프로덕션에서는 JWT 어드민 체크 권장)
  const adminSecret = req.headers.get('x-admin-secret')
  const expectedSecret = process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (expectedSecret && adminSecret !== expectedSecret) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  let body: {
    documents: IngestDocument[]
    chunk_size?: number
    chunk_overlap?: number
    replace_existing?: boolean  // 재시드 시 동일 doc_id 기존 행 삭제 (멱등성 보장)
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { documents, chunk_size = 500, chunk_overlap = 100, replace_existing = false } = body

  if (!Array.isArray(documents) || documents.length === 0) {
    return NextResponse.json({ error: 'documents 배열이 필요합니다.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const stats = {
    documents_processed: 0,
    chunks_created: 0,
    embeddings_generated: 0,
    inserted: 0,
    errors: [] as string[],
  }

  for (const doc of documents) {
    try {
      // 1. 청크 분할
      const chunks = chunkText(doc.content, chunk_size, chunk_overlap)
      // 안정적인 docId: source + slug(title). Date.now() 제거로 멱등성 확보.
      const slug = doc.title.replace(/\s+/g, '-').replace(/[()]/g, '').toLowerCase()
      const docId = `${doc.source}-${slug}`

      // 재시드 옵션: 기존 동일 doc_id 행 삭제 후 재삽입
      if (replace_existing) {
        await supabase.from('legal_embeddings').delete().eq('doc_id', docId)
      }

      const chunkRecords: ChunkRecord[] = chunks.map((chunk, idx) => ({
        title: doc.title,
        content: chunk,
        source: doc.source,
        source_url: doc.source_url ?? null,
        doc_id: docId,
        chunk_index: idx,
        category: doc.category,
        tags: doc.tags ?? [],
        language: 'ko',
      }))

      stats.chunks_created += chunkRecords.length

      // 2. 임베딩 생성 (배치 10개씩)
      const chunkTexts = chunkRecords.map(c => c.content)
      const embeddings = await processBatch(
        chunkTexts,
        10,
        (batch) => generateEmbeddings(batch),
      )

      stats.embeddings_generated += embeddings.length

      // 3. Supabase에 삽입
      const rows = chunkRecords.map((rec, idx) => ({
        ...rec,
        embedding: `[${embeddings[idx].join(',')}]`, // pgvector 문자열 형식
      }))

      const { error: insertError, count } = await supabase
        .from('legal_embeddings')
        .insert(rows)
        .select('id')

      if (insertError) {
        stats.errors.push(`[${doc.title}] 삽입 오류: ${insertError.message}`)
      } else {
        stats.inserted += count ?? rows.length
      }

      stats.documents_processed++
    } catch (err) {
      stats.errors.push(`[${doc.title}] 처리 오류: ${String(err)}`)
    }
  }

  return NextResponse.json({
    success: stats.errors.length === 0,
    stats,
    message: `${stats.documents_processed}개 문서, ${stats.inserted}개 청크 처리 완료`,
  })
}

// 임베딩 통계 조회
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('legal_embeddings_stats')
      .select('*')
      .order('source')

    if (error) throw error

    const { count } = await supabase
      .from('legal_embeddings')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      total_chunks: count ?? 0,
      by_source: data ?? [],
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
