import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, 'application/pdf'];

type DocumentType = '감정평가서' | '등기부등본' | '임차인현황표' | '채권소개자료' | '부동산소개자료';

const PROMPTS: Record<DocumentType, string> = {
  '감정평가서': `이 감정평가서 이미지에서 다음 정보를 JSON으로 추출하세요.
숫자는 원(₩) 단위 정수로, 면적은 m² 단위 소수점 2자리까지 추출합니다.
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 출력하지 마세요.

{
  "appraisal_value": 감정가(원 단위 정수),
  "address": "소재지 전체 주소",
  "land_area": 토지면적(m² 숫자),
  "building_area": 건물/전용면적(m² 숫자),
  "property_type": "아파트|오피스텔|상가|공장|토지|다세대|기타",
  "appraisal_date": "YYYY-MM-DD"
}
인식이 불확실한 필드는 null로 표시하세요.`,

  '등기부등본': `이 등기부등본(을구) 이미지에서 권리 정보를 JSON으로 추출하세요.
말소된 권리는 제외하고, 현재 유효한 권리만 추출합니다.
금액은 원 단위 정수입니다.
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 출력하지 마세요.

{
  "rights": [
    {
      "seq": 순번(정수),
      "registration_date": "YYYY-MM-DD",
      "right_type": "근저당|저당|가압류|압류|전세권|임차권",
      "right_holder": "권리자명",
      "claim_amount": 채권액(원 단위 정수),
      "max_claim_amount": 채권최고액(원 단위 정수),
      "principal": 원금(원 단위 정수, 없으면 claim_amount와 동일),
      "interest_rate": 이자율(소수, 예: 0.15)
    }
  ]
}`,

  '임차인현황표': `이 임차인현황표에서 각 임차인 정보를 JSON으로 추출하세요.
금액은 원 단위 정수입니다.
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 출력하지 마세요.

{
  "tenants": [
    {
      "tenant_name": "임차인명",
      "move_in_date": "YYYY-MM-DD (전입일)",
      "fixed_date": "YYYY-MM-DD (확정일자, 없으면 null)",
      "deposit": 보증금(원 단위 정수),
      "monthly_rent": 월세(원 단위 정수),
      "has_opposition_right": 대항력여부(boolean)
    }
  ]
}`,

  '채권소개자료': `이 부동산 경매/NPL 채권 소개자료에서 다음 정보를 JSON으로 추출하세요.
금액은 원 단위 정수입니다.
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 출력하지 마세요.

{
  "case_number": "사건번호 (예: 2024타경12345)",
  "court_name": "법원명",
  "appraisal_value": 감정가(원 단위 정수),
  "minimum_price": 최저매각가(원 단위 정수),
  "ai_estimated_value": 시세추정액(원 단위 정수, 없으면 null),
  "auction_count": 유찰횟수(정수),
  "next_auction_date": "YYYY-MM-DD (매각기일, 없으면 null)",
  "address": "소재지",
  "property_type": "물건종류",
  "land_area": 토지면적(m² 숫자, 없으면 null),
  "building_area": 건물면적(m² 숫자, 없으면 null),
  "property_composition": "단독|복수-동일담보|복수-개별담보"
}`,

  '부동산소개자료': `이 부동산 소개자료에서 다음 정보를 JSON으로 추출하세요.
금액은 원 단위 정수입니다.
반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 출력하지 마세요.

{
  "case_number": "사건번호 (예: 2024타경12345, 없으면 null)",
  "court_name": "법원명 (없으면 null)",
  "appraisal_value": 감정가(원 단위 정수, 없으면 null),
  "minimum_price": 최저매각가(원 단위 정수, 없으면 null),
  "ai_estimated_value": 시세추정액(원 단위 정수, 없으면 null),
  "auction_count": 유찰횟수(정수, 없으면 null),
  "next_auction_date": "YYYY-MM-DD (매각기일, 없으면 null)",
  "address": "소재지",
  "property_type": "물건종류",
  "land_area": 토지면적(m² 숫자, 없으면 null),
  "building_area": 건물면적(m² 숫자, 없으면 null),
  "property_composition": "단독|복수-동일담보|복수-개별담보"
}`,
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 추가하세요.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as DocumentType | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    if (!documentType || !PROMPTS[documentType]) {
      return NextResponse.json(
        { error: `지원하지 않는 문서 타입입니다. 지원: ${Object.keys(PROMPTS).join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 413 });
    }

    const fileType = file.type;
    if (!SUPPORTED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `지원하지 않는 파일 형식입니다. 지원: PDF, JPG, PNG, WEBP` },
        { status: 415 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Build Claude API content
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    if (fileType === 'application/pdf') {
      // For PDFs, use Claude's native PDF support via document type
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64Data,
        },
      } as unknown as Anthropic.Messages.ContentBlockParam);
    } else {
      // For images, use vision
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: fileType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
          data: base64Data,
        },
      });
    }

    content.push({
      type: 'text',
      text: PROMPTS[documentType],
    });

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    // Extract text response
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'OCR 응답을 받지 못했습니다.' }, { status: 422 });
    }

    // Parse JSON from response
    const jsonText = textBlock.text.trim();
    let extractedData;
    try {
      // Try to extract JSON from markdown code block if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      extractedData = JSON.parse(jsonMatch ? jsonMatch[1] : jsonText);
    } catch {
      return NextResponse.json(
        { error: '추출된 데이터를 파싱할 수 없습니다.', raw_text: jsonText },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      document_type: documentType,
      extracted_data: extractedData,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    console.error('OCR API error:', err);
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API 오류: ${err.message}` },
        { status: err.status || 500 }
      );
    }
    return NextResponse.json(
      { error: `OCR 처리 중 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}
