import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"
import { checkAndDeductCredits } from "@/lib/credit-guard"

const OCR_COST = 5 // credits

// Mock OCR results with realistic Korean property document data
const MOCK_OCR_RESULTS: Record<string, {
  docType: string
  docTypeLabel: string
  fields: { label: string; value: string; confidence: number; category: string }[]
  rawText: string
  confidence: number
  processingTime: number
}> = {
  registry: {
    docType: "registry",
    docTypeLabel: "등기부등본",
    fields: [
      { label: "소재지", value: "서울특별시 강남구 테헤란로 152, 강남파이낸스센터", confidence: 98, category: "기본정보" },
      { label: "지목", value: "대", confidence: 96, category: "기본정보" },
      { label: "면적", value: "382.5 ㎡ (115.7평)", confidence: 97, category: "기본정보" },
      { label: "건물구조", value: "철근콘크리트조 / 지하6층 지상39층", confidence: 95, category: "기본정보" },
      { label: "소유자", value: "주식회사 ABC자산운용 (110111-2345678)", confidence: 99, category: "갑구(소유권)" },
      { label: "소유권 취득일", value: "2019년 05월 23일 (매매)", confidence: 95, category: "갑구(소유권)" },
      { label: "가압류", value: "서울중앙지방법원 2023카단12345 (채권자: 김OO, 청구금액: 5억원)", confidence: 94, category: "갑구(소유권)" },
      { label: "근저당권자", value: "국민은행 역삼지점", confidence: 98, category: "을구(근저당)" },
      { label: "채권최고액", value: "12억원", confidence: 97, category: "을구(근저당)" },
      { label: "채무자", value: "주식회사 ABC자산운용", confidence: 96, category: "을구(근저당)" },
      { label: "설정일자", value: "2019년 06월 01일", confidence: 96, category: "을구(근저당)" },
      { label: "전세권자", value: "홍길동", confidence: 93, category: "을구(전세권)" },
      { label: "전세금", value: "3억원", confidence: 94, category: "을구(전세권)" },
      { label: "전세권 존속기간", value: "2023.01.15 ~ 2025.01.14", confidence: 92, category: "을구(전세권)" },
    ],
    rawText: "[등기부등본 - AI OCR 추출 결과]\n고유번호: 1234-2019-012345\n접수일: 2019.05.23\n\n[표제부]\n소재지: 서울특별시 강남구 테헤란로 152\n건물명: 강남파이낸스센터\n구조: 철근콘크리트조\n면적: 382.5㎡\n\n[갑구]\n소유자: (주)ABC자산운용\n취득일: 2019.05.23 매매\n가압류: 2023카단12345\n\n[을구]\n근저당: 국민은행 채권최고액 12억원\n전세권: 홍길동 3억원",
    confidence: 96.4,
    processingTime: 2340,
  },
  appraisal: {
    docType: "appraisal",
    docTypeLabel: "감정평가서",
    fields: [
      { label: "감정평가 대상", value: "서울특별시 마포구 상암동 1600", confidence: 98, category: "기본정보" },
      { label: "감정평가액", value: "8억 5,000만원", confidence: 97, category: "평가결과" },
      { label: "기준시가", value: "7억 2,000만원", confidence: 96, category: "평가결과" },
      { label: "평가기준일", value: "2024년 11월 15일", confidence: 99, category: "기본정보" },
      { label: "감정평가법인", value: "한국감정평가(주)", confidence: 98, category: "평가기관" },
      { label: "감정평가사", value: "김평가 (자격번호: 제12345호)", confidence: 95, category: "평가기관" },
      { label: "건물 구조", value: "철근콘크리트조 (지하1층/지상12층)", confidence: 97, category: "물건상세" },
      { label: "전용면적", value: "84.92 ㎡", confidence: 98, category: "물건상세" },
      { label: "사용승인일", value: "2015년 08월 20일", confidence: 96, category: "물건상세" },
      { label: "감가율", value: "18.5%", confidence: 94, category: "평가결과" },
    ],
    rawText: "[감정평가서 - AI OCR 추출 결과]\n\n감정평가 대상물건: 서울특별시 마포구 상암동 1600\n감정평가액: 금 850,000,000원\n기준시가: 금 720,000,000원\n평가기준일: 2024.11.15\n\n감정평가법인: 한국감정평가(주)\n감정평가사: 김평가 (제12345호)",
    confidence: 95.1,
    processingTime: 1980,
  },
  building_ledger: {
    docType: "building_ledger",
    docTypeLabel: "건축물대장",
    fields: [
      { label: "대장 구분", value: "일반건축물대장(갑)", confidence: 99, category: "기본정보" },
      { label: "대지위치", value: "서울특별시 서초구 반포대로 201", confidence: 98, category: "기본정보" },
      { label: "도로명주소", value: "서울특별시 서초구 반포대로 201, 101동", confidence: 97, category: "기본정보" },
      { label: "건물명칭", value: "반포자이아파트", confidence: 99, category: "기본정보" },
      { label: "주구조", value: "철근콘크리트구조", confidence: 98, category: "건축물 현황" },
      { label: "주용도", value: "공동주택(아파트)", confidence: 97, category: "건축물 현황" },
      { label: "층수", value: "지하 2층 / 지상 35층", confidence: 96, category: "건축물 현황" },
      { label: "대지면적", value: "82,450.3 ㎡", confidence: 98, category: "면적정보" },
      { label: "건축면적", value: "12,380.5 ㎡", confidence: 97, category: "면적정보" },
      { label: "연면적", value: "185,230.8 ㎡", confidence: 96, category: "면적정보" },
      { label: "건폐율", value: "15.02%", confidence: 95, category: "면적정보" },
      { label: "용적률", value: "249.87%", confidence: 95, category: "면적정보" },
      { label: "사용승인일", value: "2009년 12월 30일", confidence: 98, category: "허가정보" },
      { label: "허가일", value: "2006년 03월 15일", confidence: 97, category: "허가정보" },
    ],
    rawText: "[건축물대장 - AI OCR 추출 결과]\n\n대장구분: 일반건축물대장(갑)\n대지위치: 서울특별시 서초구 반포대로 201\n건물명칭: 반포자이아파트\n주구조: 철근콘크리트구조\n주용도: 공동주택(아파트)\n층수: 지하2/지상35\n대지면적: 82,450.3㎡\n건축면적: 12,380.5㎡",
    confidence: 97.2,
    processingTime: 2150,
  },
  land_ledger: {
    docType: "land_ledger",
    docTypeLabel: "토지대장",
    fields: [
      { label: "소재지", value: "경기도 성남시 분당구 정자동 178-1", confidence: 98, category: "기본정보" },
      { label: "지번", value: "178-1", confidence: 99, category: "기본정보" },
      { label: "지목", value: "대", confidence: 98, category: "토지정보" },
      { label: "면적", value: "1,250.8 ㎡", confidence: 97, category: "토지정보" },
      { label: "개별공시지가", value: "15,200,000원/㎡ (2024년 1월 기준)", confidence: 96, category: "가격정보" },
      { label: "토지이용계획", value: "제3종일반주거지역, 지구단위계획구역", confidence: 94, category: "이용계획" },
      { label: "소유자", value: "분당개발(주)", confidence: 97, category: "소유정보" },
      { label: "소유권 변동일", value: "2018년 09월 20일", confidence: 95, category: "소유정보" },
      { label: "소유권 변동원인", value: "매매", confidence: 96, category: "소유정보" },
      { label: "축척", value: "1/1200", confidence: 93, category: "기본정보" },
    ],
    rawText: "[토지대장 - AI OCR 추출 결과]\n\n소재지: 경기도 성남시 분당구 정자동 178-1\n지목: 대\n면적: 1,250.8㎡\n개별공시지가: 15,200,000원/㎡\n소유자: 분당개발(주)\n변동일: 2018.09.20 (매매)",
    confidence: 94.8,
    processingTime: 1870,
  },
  lease_contract: {
    docType: "lease_contract",
    docTypeLabel: "임대차계약서",
    fields: [
      { label: "임대인(성명)", value: "박임대", confidence: 98, category: "당사자" },
      { label: "임대인(주민번호)", value: "680512-1******", confidence: 95, category: "당사자" },
      { label: "임차인(성명)", value: "이임차", confidence: 98, category: "당사자" },
      { label: "임차인(주민번호)", value: "850923-2******", confidence: 95, category: "당사자" },
      { label: "소재지", value: "서울특별시 송파구 올림픽로 300, 1205호", confidence: 97, category: "물건정보" },
      { label: "임대할 부분", value: "아파트 제12층 제05호 (전용 84.92㎡)", confidence: 96, category: "물건정보" },
      { label: "보증금", value: "5억원 (금오억원정)", confidence: 99, category: "계약조건" },
      { label: "월차임", value: "없음 (전세)", confidence: 98, category: "계약조건" },
      { label: "계약기간", value: "2024년 03월 01일 ~ 2026년 02월 28일 (24개월)", confidence: 97, category: "계약조건" },
      { label: "계약일", value: "2024년 02월 15일", confidence: 99, category: "계약조건" },
      { label: "특약사항", value: "임차인의 전입신고 및 확정일자 부여에 동의함", confidence: 90, category: "특약" },
    ],
    rawText: "[임대차계약서 - AI OCR 추출 결과]\n\n임대인: 박임대\n임차인: 이임차\n소재지: 서울특별시 송파구 올림픽로 300, 1205호\n보증금: 금 500,000,000원\n월차임: 없음 (전세)\n계약기간: 2024.03.01 ~ 2026.02.28",
    confidence: 93.5,
    processingTime: 2510,
  },
}

const MOCK_SCAN_HISTORY = [
  { id: "scan-001", fileName: "등기부등본_강남구.pdf", docType: "registry", docTypeLabel: "등기부등본", date: "2024-12-18T09:30:00Z", confidence: 96.4, fieldCount: 14, status: "completed" },
  { id: "scan-002", fileName: "감정평가서_마포.pdf", docType: "appraisal", docTypeLabel: "감정평가서", date: "2024-12-17T14:15:00Z", confidence: 95.1, fieldCount: 10, status: "completed" },
  { id: "scan-003", fileName: "건축물대장_반포.pdf", docType: "building_ledger", docTypeLabel: "건축물대장", date: "2024-12-15T11:00:00Z", confidence: 97.2, fieldCount: 14, status: "completed" },
  { id: "scan-004", fileName: "토지대장_분당.pdf", docType: "land_ledger", docTypeLabel: "토지대장", date: "2024-12-14T16:45:00Z", confidence: 94.8, fieldCount: 10, status: "completed" },
  { id: "scan-005", fileName: "임대차계약서_송파.jpg", docType: "lease_contract", docTypeLabel: "임대차계약서", date: "2024-12-12T10:20:00Z", confidence: 93.5, fieldCount: 11, status: "completed" },
]

// POST: Accept file upload, return mock OCR results
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const docType = (formData.get("docType") as string) || "registry"

    if (!file) {
      return Errors.badRequest('파일이 제공되지 않았습니다.')
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/tiff"]
    if (!allowedTypes.includes(file.type) && !file.type.startsWith("image/")) {
      return Errors.badRequest('지원하지 않는 파일 형식입니다. PDF, JPG, PNG, TIFF 파일만 가능합니다.')
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return Errors.badRequest('파일 크기가 20MB를 초과합니다.')
    }

    // Credit guard
    let userId = 'current-user'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // default user
    }

    const creditResult = await checkAndDeductCredits(userId, '문서 OCR 스캔', OCR_COST)

    if (!creditResult.allowed) {
      return NextResponse.json(
        {
          error: '크레딧이 부족합니다',
          required: creditResult.cost,
          current: creditResult.balance,
          message: `OCR 스캔에는 ${OCR_COST} 크레딧이 필요합니다. 현재 잔액: ${creditResult.balance}`,
        },
        { status: 402 }
      )
    }

    // Simulate processing delay (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const result = MOCK_OCR_RESULTS[docType] || MOCK_OCR_RESULTS.registry

    return NextResponse.json({
      success: true,
      data: {
        id: `scan-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        ...result,
        scannedAt: new Date().toISOString(),
        creditsUsed: OCR_COST,
      },
      credits_used: OCR_COST,
      credits_remaining: creditResult.balance,
    })
  } catch (error) {
    logger.error("OCR processing error:", { error: error })
    return Errors.internal('OCR 처리 중 오류가 발생했습니다.')
  }
}

// GET: Return scan history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const docType = searchParams.get("docType")

  let history = [...MOCK_SCAN_HISTORY]

  if (docType) {
    history = history.filter((item) => item.docType === docType)
  }

  const total = history.length
  const startIndex = (page - 1) * limit
  const paginatedHistory = history.slice(startIndex, startIndex + limit)

  return NextResponse.json({
    success: true,
    data: {
      items: paginatedHistory,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  })
}
