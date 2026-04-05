import { NextRequest, NextResponse } from 'next/server'

// In-memory store (persists during server session)
let siteSettings = {
  siteName: 'NPLatform',
  siteDescription: '금융기관과 투자자를 직접 연결하는 NPL 거래 플랫폼',
  contactPhone: '02-1234-5678',
  contactEmail: 'contact@nplatform.kr',
  operatingHours: '평일 09:00 - 18:00 (공휴일 휴무)',
  snsKakao: '',
  snsNaver: '',
  snsInstagram: '',
  businessNumber: '000-00-00000',
  ceoName: '—',
  companyAddress: '서울특별시',
  companyName: '(주)트랜스파머 | TransFarmer Inc.',
  tosVersion: 'v1.0',
  privacyVersion: 'v1.0',
}

export async function GET() {
  return NextResponse.json({ data: siteSettings })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  siteSettings = { ...siteSettings, ...body }
  return NextResponse.json({ data: siteSettings, message: '설정이 저장되었습니다.' })
}
