/**
 * lib/embeddings/listing-embedding.ts
 *
 * Phase 3 #6 — 매물 임베딩 생성기 (FAISS 대체: pgvector)
 *
 * Voyage Multilingual-2 API 직접 호출 → 1024d → 1536d 패딩.
 * listing_embeddings 테이블에 저장.
 */

export interface ListingEmbedInput {
  listing_id: string
  title: string
  property_type: string
  region: string
  district?: string
  price_amount: number
  ltv_pct?: number
  description?: string
  tags?: string[]
}

/**
 * 매물 요약 문장 구성 (임베딩 소스).
 * 짧고 밀도 높은 요약이 임베딩 품질에 유리.
 */
export function buildListingSummary(input: ListingEmbedInput): string {
  const parts: string[] = []
  parts.push(input.title)
  parts.push(`${input.region}${input.district ? ' ' + input.district : ''}`)
  parts.push(`${input.property_type} 매물`)
  parts.push(`가격 ${Math.round(input.price_amount / 10_000_000)}천만원`)
  if (input.ltv_pct != null) parts.push(`LTV ${input.ltv_pct}%`)
  if (input.description) parts.push(input.description.slice(0, 200))
  if (input.tags?.length) parts.push(`태그: ${input.tags.join(', ')}`)
  return parts.join(' · ')
}

/**
 * Voyage Multilingual-2 임베딩 생성 (1024d → 1536d 패딩).
 */
export async function generateListingEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY 환경변수가 필요합니다.')

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'voyage-multilingual-2',
      input: [text],
      input_type: 'document',
    }),
  })

  if (!res.ok) {
    throw new Error(`Voyage API 오류: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>
  }
  const emb = json.data[0]?.embedding
  if (!emb) throw new Error('임베딩 응답이 비었습니다.')

  // 1024d → 1536d padding (pgvector 스키마 맞춤)
  if (emb.length === 1024) return [...emb, ...new Array(512).fill(0)]
  return emb
}

/**
 * 질의용 임베딩 (query 모드).
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY 환경변수가 필요합니다.')

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'voyage-multilingual-2',
      input: [text],
      input_type: 'query',
    }),
  })

  if (!res.ok) {
    throw new Error(`Voyage API 오류: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>
  }
  const emb = json.data[0]?.embedding
  if (!emb) throw new Error('쿼리 임베딩 응답이 비었습니다.')
  if (emb.length === 1024) return [...emb, ...new Array(512).fill(0)]
  return emb
}
