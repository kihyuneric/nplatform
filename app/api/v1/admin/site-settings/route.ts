import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

const PROVIDER_ID = 'site_settings'

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: 'NPLatform',
  siteDescription: '대한민국 1%를 위한 프라이빗 NPL 플랫폼',
  contactPhone: '02-555-2822',
  contactEmail: 'ceo@transfarmer.co.kr',
  dpoName: '박성필',
  dpoEmail: 'sp.park@transfarmer.co.kr',
  operatingHours: '평일 09:00 - 18:00 (공휴일 휴무)',
  snsKakao: '',
  snsNaver: '',
  snsInstagram: '',
  businessNumber: '507-87-02631',
  ceoName: '김기현',
  companyAddress: '서울시 서초구 서초대로77길 55, 에이프로스퀘어 7층 KB이노베이션허브',
  companyAddress2: '',
  companyName: '트랜스파머(주) | TransFarmer Inc.',
  companyNameKo: '트랜스파머(주)',
  companyNameEn: 'TransFarmer Inc.',
  tosVersion: 'v1.0',
  privacyVersion: 'v1.0',
  noticeBanner: 'true',
  registration: 'true',
  maintenance: 'false',
  // 메인 수기 지표 — 운영 관리자가 /admin/main-stats 에서 입력
  mainViewableNpl: '10',    // 열람 가능한 NPL (건)
  mainNewThisWeek: '3',     // 이번 주 신규 (건)
  mainStatsPeriod: '',      // 기준 시기 라벨 (예: 2026년 8월 3주) — 비우면 '이번 주'
  // 메인 KPI · 라이브 티커 · NPL 자동매칭 KPI 자동연동 (2026-08-18)
  statNplCount: '789개',
  statAppraisalTotal: '5조 7,111억',
  statMortgageTotal: '1조 4,573억',
  statPrincipalTotal: '1조 2,144억',
  statInstitutions: '75곳',
  statSellers: '60개사',
  statBuyers: '180개사',
  statInvestors: '340명',
  statSuccess: '120건',
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
