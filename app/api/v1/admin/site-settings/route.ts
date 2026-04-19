import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

const PROVIDER_ID = 'site_settings'

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: 'NPLatform',
  siteDescription: '금융기관과 투자자를 직접 연결하는 NPL 거래 플랫폼',
  contactPhone: '02-555-2822',
  contactEmail: 'ceo@transfarmer.co.kr',
  dpoName: '김기현',
  dpoEmail: 'kh.kim@transfarmer.co.kr',
  operatingHours: '평일 09:00 - 18:00 (공휴일 휴무)',
  snsKakao: '',
  snsNaver: '',
  snsInstagram: '',
  businessNumber: '507-87-02631',
  ceoName: '김기현',
  companyAddress: '서울 마포구 백범로31길 21, 서울창업허브 별관 108호',
  companyAddress2: '서울 종로구 서린동 154-1, 스타트업빌리지 5층',
  companyName: '트랜스파머(주) | TransFarmer Inc.',
  companyNameKo: '트랜스파머(주)',
  companyNameEn: 'TransFarmer Inc.',
  tosVersion: 'v1.0',
  privacyVersion: 'v1.0',
  noticeBanner: 'true',
  registration: 'true',
  maintenance: 'false',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('api_configs')
      .select('field_key, encrypted_value')
      .eq('provider_id', PROVIDER_ID)

    const settings = { ...DEFAULT_SETTINGS }
    if (data) {
      for (const row of data) {
        settings[row.field_key] = row.encrypted_value
      }
    }

    return NextResponse.json({ data: settings })
  } catch {
    return NextResponse.json({ data: DEFAULT_SETTINGS })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserWithRole()
  if (!user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!user.role || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)
  }

  try {
    const body = await request.json() as Record<string, string>
    const supabase = await createClient()

    // Upsert each setting key
    const upserts = Object.entries(body).map(([key, value]) => ({
      provider_id: PROVIDER_ID,
      field_key: key,
      encrypted_value: String(value),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }))

    for (const upsert of upserts) {
      const { data: existing } = await supabase
        .from('api_configs')
        .select('id')
        .eq('provider_id', PROVIDER_ID)
        .eq('field_key', upsert.field_key)
        .single()

      if (existing) {
        await supabase
          .from('api_configs')
          .update({ encrypted_value: upsert.encrypted_value, updated_by: upsert.updated_by, updated_at: upsert.updated_at })
          .eq('id', existing.id)
      } else {
        await supabase.from('api_configs').insert(upsert)
      }
    }

    // Return updated settings
    const { data: allSettings } = await supabase
      .from('api_configs')
      .select('field_key, encrypted_value')
      .eq('provider_id', PROVIDER_ID)

    const result = { ...DEFAULT_SETTINGS }
    if (allSettings) {
      for (const row of allSettings) {
        result[row.field_key] = row.encrypted_value
      }
    }

    return NextResponse.json({ data: result, message: '설정이 저장되었습니다.' })
  } catch (error) {
    console.error('Site settings PATCH error:', error)
    return apiError('INTERNAL_ERROR', '설정 저장 실패', 500)
  }
}
