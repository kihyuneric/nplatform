import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const body = await req.json()
    const {
      institutionType,
      businessNumber,
      companyName,
      representativeName,
      phone,
      address,
      website,
      specialties,
      licenseNumber,
    } = body

    if (!institutionType || !businessNumber || !companyName || !representativeName || !phone || !address) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '필수 항목이 누락되었습니다.' } },
        { status: 400 }
      )
    }

    const cleanBizNo = (businessNumber as string).replace(/\D/g, '')
    if (cleanBizNo.length !== 10) {
      return NextResponse.json(
        { error: { code: 'INVALID_BUSINESS_NUMBER', message: '사업자등록번호는 10자리여야 합니다.' } },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()

    // 중복 사업자번호 체크
    const { data: existing } = await admin
      .from('institution_profiles')
      .select('id')
      .eq('business_registration_number', cleanBizNo)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_BUSINESS_NUMBER', message: '이미 등록된 사업자등록번호입니다.' } },
        { status: 409 }
      )
    }

    // institution_profiles 저장
    const { data: profile, error: insertError } = await admin
      .from('institution_profiles')
      .insert({
        user_id: user.id,
        institution_type: institutionType,
        business_registration_number: cleanBizNo,
        company_name: companyName,
        representative_name: representativeName,
        contact_phone: phone,
        address,
        website: website ?? null,
        license_number: licenseNumber ?? null,
        specialties: specialties ?? [],
        verification_status: 'PENDING',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // users 테이블 업데이트: KYC SUBMITTED, 역할 SELLER
    await admin
      .from('users')
      .update({
        kyc_status: 'SUBMITTED',
        company_name: companyName,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({
      data: {
        id: profile.id,
        kycStatus: 'SUBMITTED',
        message: '셀러 등록이 완료되었습니다. 최대 72시간 내 심사가 완료됩니다.',
      },
    }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/v1/seller/register error:', { error: err })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } }, { status: 500 })
  }
}
