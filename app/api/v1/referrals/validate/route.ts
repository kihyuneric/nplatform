import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'

// ─── Referral code prefixes ─────────────────────────────────
const VALID_PREFIXES = ['NP-', 'EX-', 'IN-', 'VIP-']
const CODE_PATTERN = /^(NP|EX|IN|VIP)-[A-Z0-9]+-[A-Z0-9]{4}$/

// Mock owner data by prefix
const PREFIX_TYPES: Record<string, string> = {
  'NP-': '일반 사용자',
  'EX-': '외부 파트너',
  'IN-': '내부 직원',
  'VIP-': 'VIP 파트너',
}

// ─── POST: Validate a referral code ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.code || typeof body.code !== 'string') {
      return Errors.badRequest('code is required')
    }

    const code = body.code.toUpperCase().trim()

    // Check prefix
    const matchedPrefix = VALID_PREFIXES.find((p) => code.startsWith(p))
    if (!matchedPrefix) {
      return NextResponse.json({
        valid: false,
        code,
        error: `유효하지 않은 추천코드 형식입니다. 유효한 접두사: ${VALID_PREFIXES.join(', ')}`,
      })
    }

    // Check format
    if (!CODE_PATTERN.test(code)) {
      return NextResponse.json({
        valid: false,
        code,
        error: '추천코드 형식이 올바르지 않습니다.',
      })
    }

    // Mock: return valid with owner info
    return NextResponse.json({
      valid: true,
      code,
      owner: {
        type: PREFIX_TYPES[matchedPrefix] || '알 수 없음',
        display_name: code.startsWith('VIP-') ? 'VIP 파트너' : '홍길동',
        is_active: true,
      },
      benefits: {
        signup_credit: code.startsWith('VIP-') ? 30 : 10,
        discount_pct: code.startsWith('VIP-') ? 15 : 5,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })
  } catch {
    return Errors.internal('Internal server error')
  }
}
