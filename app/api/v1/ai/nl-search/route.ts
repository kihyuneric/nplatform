import { NextRequest, NextResponse } from "next/server"
import type { QueryFilters } from '@/lib/db-types'
import { Errors, fromUnknown } from '@/lib/api-error'

// Parse natural language query into structured filters
function parseNLQuery(query: string): QueryFilters {
  const filters: QueryFilters = {}

  // Region detection
  const regions = ['서울','강남','강북','부산','대구','인천','경기','판교','해운대','마포','성남']
  for (const r of regions) {
    if (query.includes(r)) { filters.region = r; break }
  }

  // Amount detection (억)
  const amountMatch = query.match(/(\d+)\s*억/)
  if (amountMatch) {
    const amount = parseInt(amountMatch[1]) * 100000000
    if (query.includes('이하') || query.includes('미만')) filters.price_max = amount
    else if (query.includes('이상')) filters.price_min = amount
    else { filters.price_min = amount * 0.8; filters.price_max = amount * 1.2 }
  }

  // Type detection
  const types: Record<string, string> = { '아파트': '아파트', '오피스': '오피스', '상가': '상가', '토지': '토지', '오피스텔': '오피스텔' }
  for (const [key, val] of Object.entries(types)) {
    if (query.includes(key)) { filters.type = val; break }
  }

  // Risk grade
  if (query.includes('안전') || query.includes('저위험')) filters.risk = 'A'
  if (query.includes('고수익') || query.includes('공격적')) filters.risk = 'D'

  return filters
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query) return Errors.badRequest('query required')

    let filters: QueryFilters = {}

    // Try AI-powered parsing when API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey && apiKey !== '' && apiKey !== 'your-key-here') {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: `사용자 검색어를 NPL 매물 필터로 변환해주세요: "${query}"
JSON으로 응답: { "region": string|null, "collateralType": string|null, "maxAmount": number|null, "minAmount": number|null, "riskGrade": string|null, "keyword": string|null }`
            }],
          }),
        })
        const aiResult = await response.json()
        const text = aiResult.content?.[0]?.text || ''
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (parsed.region) filters.region = parsed.region
        if (parsed.collateralType) filters.type = parsed.collateralType
        if (parsed.maxAmount) filters.price_max = parsed.maxAmount
        if (parsed.minAmount) filters.price_min = parsed.minAmount
        if (parsed.riskGrade) filters.risk = parsed.riskGrade
      } catch {
        // AI parsing failed, fall through to regex-based parser
        filters = parseNLQuery(query)
      }
    } else {
      filters = parseNLQuery(query)
    }

    // Build search URL
    const params = new URLSearchParams()
    if (filters.region) params.set('collateral_region', String(filters.region))
    if (filters.type) params.set('collateral_type', String(filters.type))
    if (filters.price_max) params.set('price_max', String(filters.price_max))
    if (filters.price_min) params.set('price_min', String(filters.price_min))
    if (filters.risk) params.set('risk_grade', String(filters.risk))

    // Fetch matching listings
    const res = await fetch(`${req.nextUrl.origin}/api/v1/exchange/listings?${params}`)
    const data = await res.json()

    return NextResponse.json({
      data: {
        query,
        parsed_filters: filters,
        results: data.data || [],
        total: data.total || 0,
        search_url: `/exchange?${params}`,
        _interpretation: `"${query}" → ${Object.entries(filters).map(([k,v]) => `${k}:${v}`).join(', ') || '전체'}`,
      }
    })
  } catch (e) {
    return fromUnknown(e)
  }
}
