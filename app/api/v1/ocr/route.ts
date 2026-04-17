/**
 * POST /api/v1/ocr
 *
 * 파일 업로드 → 텍스트/구조 데이터 추출
 * 지원 형식: PDF, JPG/PNG/GIF/WebP, DOCX, HWP, CSV, XLS, XLSX
 *
 * Body: multipart/form-data
 *   file     — 파일 (최대 20MB)
 *   doc_type — appraisal | registry | lease | bond | generic (기본값)
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Claude 프롬프트 ─────────────────────────────────────────────────────────

const DOC_PROMPTS: Record<string, string> = {
  appraisal: `이 문서는 부동산 감정평가서입니다. 아래 JSON 구조로 정보를 추출해주세요.
숫자 단위는 모두 원(KRW) 또는 ㎡입니다. 확인하지 못한 필드는 null로 하세요.
반드시 JSON만 반환하고 설명 텍스트를 포함하지 마세요.
{
  "appraisal_value": 감정평가액(원),
  "address": "주소",
  "land_area": 토지면적(㎡),
  "building_area": 건물면적(㎡),
  "property_type": "부동산종류",
  "appraisal_date": "평가일(YYYY-MM-DD)"
}`,

  registry: `이 문서는 등기부등본입니다. 권리 목록을 아래 JSON으로 추출해주세요.
반드시 JSON만 반환하고 설명 텍스트를 포함하지 마세요.
{
  "rights": [
    {
      "seq": 순번(정수),
      "registration_date": "등기일(YYYY-MM-DD)",
      "right_type": "근저당|저당|가압류|압류|전세권",
      "right_holder": "권리자명",
      "claim_amount": 채권액(원),
      "max_claim_amount": 채권최고액(원),
      "principal": 원금(원),
      "interest_rate": 이자율(소수점)
    }
  ]
}`,

  lease: `이 문서는 임대차계약서 또는 임차인현황표입니다. 임차인 목록을 아래 JSON으로 추출해주세요.
반드시 JSON만 반환하고 설명 텍스트를 포함하지 마세요.
{
  "tenants": [
    {
      "tenant_name": "임차인명",
      "move_in_date": "입주일(YYYY-MM-DD)",
      "fixed_date": "확정일자(YYYY-MM-DD)",
      "deposit": 보증금(원),
      "monthly_rent": 월세(원),
      "has_opposition_right": 대항력여부(true/false)
    }
  ]
}`,

  bond: `이 문서는 채권 또는 부동산 소개자료입니다. 아래 JSON으로 정보를 추출해주세요.
반드시 JSON만 반환하고 설명 텍스트를 포함하지 마세요.
{
  "case_number": "사건번호",
  "court_name": "법원명",
  "appraisal_value": 감정가(원),
  "minimum_price": 최저경매가(원),
  "auction_count": 경매횟수(정수),
  "next_auction_date": "다음경매일(YYYY-MM-DD)",
  "address": "소재지",
  "property_type": "부동산종류",
  "land_area": 토지면적(㎡),
  "building_area": 건물면적(㎡)
}`,

  generic: `이 문서에서 부동산 NPL 관련 핵심 정보를 JSON으로 추출해주세요.
주소, 금액(원), 날짜, 당사자 정보 등을 포함합니다.
반드시 JSON만 반환하고 설명 텍스트를 포함하지 마세요.`,
}

// ── 유틸 ───────────────────────────────────────────────────────────────────

function parseJSON(text: string): Record<string, unknown> {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    return JSON.parse(text)
  } catch {
    return { raw_text: text.slice(0, 500) }
  }
}

// ── 이미지 → Claude Vision ─────────────────────────────────────────────────

async function fromImage(
  buffer: ArrayBuffer,
  mime: string,
  docType: string,
): Promise<Record<string, unknown>> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const base64 = Buffer.from(buffer).toString('base64')

  const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type ImgMime = (typeof validMimes)[number]
  const safeMime: ImgMime = validMimes.includes(mime as ImgMime) ? (mime as ImgMime) : 'image/jpeg'

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: safeMime, data: base64 } },
          { type: 'text', text: DOC_PROMPTS[docType] ?? DOC_PROMPTS.generic },
        ],
      },
    ],
  })

  const text = resp.content[0].type === 'text' ? resp.content[0].text : '{}'
  return parseJSON(text)
}

// ── PDF → pdf-parse → Claude ───────────────────────────────────────────────

async function fromPDF(buffer: ArrayBuffer, docType: string): Promise<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMod: any = await import('pdf-parse')
  const pdfParse = pdfMod.default ?? pdfMod
  const { text } = await pdfParse(Buffer.from(buffer))

  if (!text?.trim()) {
    return {
      error:
        'PDF에서 텍스트를 추출할 수 없습니다. 스캔 이미지 PDF인 경우 JPG로 변환 후 재업로드하세요.',
    }
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${DOC_PROMPTS[docType] ?? DOC_PROMPTS.generic}\n\n문서 내용:\n${text.slice(0, 4000)}`,
      },
    ],
  })

  const responseText = resp.content[0].type === 'text' ? resp.content[0].text : '{}'
  return parseJSON(responseText)
}

// ── DOCX → ZIP 파싱 → word/document.xml → Claude ──────────────────────────

async function fromDOCX(buffer: ArrayBuffer, docType: string): Promise<Record<string, unknown>> {
  const { inflateRaw } = await import('zlib')
  const { promisify } = await import('util')
  const inflate = promisify(inflateRaw)

  const buf = Buffer.from(buffer)
  let xmlText = ''

  try {
    // ZIP local file header signature: PK\x03\x04
    const PK = Buffer.from([0x50, 0x4b, 0x03, 0x04])
    let off = 0

    while (off < buf.length - 30) {
      const idx = buf.indexOf(PK, off)
      if (idx === -1) break
      off = idx

      const method = buf.readUInt16LE(off + 8)
      const compSize = buf.readUInt32LE(off + 18)
      const uncompSize = buf.readUInt32LE(off + 22)
      const fnLen = buf.readUInt16LE(off + 26)
      const extLen = buf.readUInt16LE(off + 28)
      const fname = buf.slice(off + 30, off + 30 + fnLen).toString('utf8')
      const dataOff = off + 30 + fnLen + extLen

      if (fname === 'word/document.xml') {
        const xmlBuf: Buffer =
          method === 0
            ? buf.slice(dataOff, dataOff + uncompSize)
            : ((await inflate(buf.slice(dataOff, dataOff + compSize))) as Buffer)

        const xml = xmlBuf.toString('utf8')
        const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []
        xmlText = matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ')
        break
      }

      off = dataOff + Math.max(compSize, 1)
    }
  } catch {
    return {
      error: 'DOCX 파싱 실패. PDF로 저장 후 재업로드를 권장합니다.',
    }
  }

  if (!xmlText.trim()) {
    return { error: 'DOCX 텍스트 추출 실패. PDF 또는 이미지로 변환 후 재시도하세요.' }
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${DOC_PROMPTS[docType] ?? DOC_PROMPTS.generic}\n\n문서 내용:\n${xmlText.slice(0, 4000)}`,
      },
    ],
  })

  const responseText = resp.content[0].type === 'text' ? resp.content[0].text : '{}'
  return parseJSON(responseText)
}

// ── HWP → EUC-KR 텍스트 추출 시도 → Claude ────────────────────────────────

async function fromHWP(buffer: ArrayBuffer, docType: string): Promise<Record<string, unknown>> {
  // HWP5 = OLE2 Compound Document — 완전 파싱은 별도 라이브러리 필요
  // EUC-KR 디코딩으로 한글 텍스트 일부 추출 시도
  let printable = ''

  try {
    const dec = new TextDecoder('euc-kr', { fatal: false })
    const raw = dec.decode(buffer)
    printable = raw.replace(/[^\u0020-\u007e\uac00-\ud7a3\u3130-\u318f]+/g, ' ').trim()
  } catch {
    const bytes = new Uint8Array(buffer)
    const chars: string[] = []
    for (const b of bytes) {
      if (b >= 0x20 && b < 0x7f) chars.push(String.fromCharCode(b))
    }
    printable = chars.join('')
  }

  if (printable.length < 30) {
    return {
      warning:
        'HWP 자동 텍스트 추출이 제한적입니다. PDF 또는 이미지로 변환 후 재업로드를 권장합니다.',
      supported: false,
    }
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `${DOC_PROMPTS[docType] ?? DOC_PROMPTS.generic}\n\n문서 내용(부분 추출됨):\n${printable.slice(0, 2000)}`,
      },
    ],
  })

  const responseText = resp.content[0].type === 'text' ? resp.content[0].text : '{}'
  return {
    ...parseJSON(responseText),
    warning: 'HWP 추출은 불완전할 수 있습니다.',
  }
}

// ── CSV / XLS / XLSX → xlsx ─────────────────────────────────────────────────

async function fromSpreadsheet(buffer: ArrayBuffer): Promise<Record<string, unknown>> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(Buffer.from(buffer), { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { error: '시트를 찾을 수 없습니다.' }

  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

  return {
    rows: rows.slice(0, 500),
    count: rows.length,
    total_sheets: wb.SheetNames.length,
    sheet: sheetName,
  }
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const docType = (formData.get('doc_type') as string) || 'generic'

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기 제한: 최대 20MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const mime = file.type
    const buffer = await file.arrayBuffer()

    let data: Record<string, unknown>

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || mime.startsWith('image/')) {
      data = await fromImage(buffer, mime || 'image/jpeg', docType)
    } else if (ext === 'pdf' || mime === 'application/pdf') {
      data = await fromPDF(buffer, docType)
    } else if (
      ext === 'docx' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      data = await fromDOCX(buffer, docType)
    } else if (ext === 'hwp' || mime === 'application/x-hwp' || mime === 'application/haansofthwp') {
      data = await fromHWP(buffer, docType)
    } else if (['csv', 'xls', 'xlsx'].includes(ext)) {
      data = await fromSpreadsheet(buffer)
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 형식입니다. 지원: PDF · JPG/PNG · DOCX · HWP · CSV/XLS/XLSX' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      doc_type: docType,
      file_name: file.name,
      file_type: ext,
      data,
    })
  } catch (err) {
    console.error('[OCR] error', err)
    return NextResponse.json(
      {
        error: 'OCR 처리 중 오류가 발생했습니다.',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
