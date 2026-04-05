import * as XLSX from 'xlsx'

export interface ParsedTranscript {
  title: string
  channel_name?: string
  video_id?: string
  transcript: string
  published_at?: string
}

// ============================================================
// Python 파일 파싱
// ============================================================

export function parsePythonFile(text: string, filename: string): ParsedTranscript {
  const defaultTitle = filename.replace(/\.py$/i, '')

  // Strategy 1: Extract triple-quoted strings
  const tripleQuoteRegex = /(?:"{3}|'{3})([\s\S]*?)(?:"{3}|'{3})/g
  const tripleMatches: string[] = []
  let match
  while ((match = tripleQuoteRegex.exec(text)) !== null) {
    const content = match[1].trim()
    if (content.length > 50) {
      tripleMatches.push(content)
    }
  }

  if (tripleMatches.length > 0) {
    // Use the longest triple-quoted string as transcript
    const longest = tripleMatches.sort((a, b) => b.length - a.length)[0]
    return { title: defaultTitle, transcript: longest }
  }

  // Strategy 2: Look for variable assignments
  const varPatterns = [
    /(?:transcript|text|content|대본|스크립트)\s*=\s*["']([\s\S]*?)["']\s*$/gm,
    /(?:transcript|text|content|대본|스크립트)\s*=\s*\(\s*["']([\s\S]*?)["']\s*\)/gm,
  ]

  for (const pattern of varPatterns) {
    const varMatch = pattern.exec(text)
    if (varMatch && varMatch[1].trim().length > 50) {
      return { title: defaultTitle, transcript: varMatch[1].trim() }
    }
  }

  // Strategy 3: Fallback - strip code, keep text
  const lines = text.split('\n')
  const textLines = lines.filter(line => {
    const trimmed = line.trim()
    if (!trimmed) return false
    if (trimmed.startsWith('#')) return false
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) return false
    if (trimmed.startsWith('def ') || trimmed.startsWith('class ')) return false
    if (trimmed.startsWith('if ') || trimmed.startsWith('for ') || trimmed.startsWith('while ')) return false
    if (trimmed.startsWith('print(') || trimmed.startsWith('return ')) return false
    if (/^[a-zA-Z_]\w*\s*=/.test(trimmed) && trimmed.length < 80) return false
    return true
  })

  const transcript = textLines.join('\n').trim()
  return {
    title: defaultTitle,
    transcript: transcript || text,
  }
}

// ============================================================
// Excel / CSV 파싱
// ============================================================

const HEADER_MAP: Record<string, keyof ParsedTranscript> = {
  // Korean
  '제목': 'title',
  '영상제목': 'title',
  '채널명': 'channel_name',
  '채널': 'channel_name',
  '영상id': 'video_id',
  '대본': 'transcript',
  '스크립트': 'transcript',
  '내용': 'transcript',
  '게시일': 'published_at',
  '날짜': 'published_at',
  '업로드일': 'published_at',
  // English
  'title': 'title',
  'channel_name': 'channel_name',
  'channel': 'channel_name',
  'video_id': 'video_id',
  'transcript': 'transcript',
  'script': 'transcript',
  'content': 'transcript',
  'text': 'transcript',
  'published_at': 'published_at',
  'date': 'published_at',
}

const DEFAULT_COLUMN_ORDER: (keyof ParsedTranscript)[] = [
  'title', 'channel_name', 'video_id', 'transcript', 'published_at'
]

function detectHeaders(firstRow: any[]): Map<number, keyof ParsedTranscript> | null {
  const mapping = new Map<number, keyof ParsedTranscript>()
  let foundHeader = false

  for (let i = 0; i < firstRow.length; i++) {
    const val = String(firstRow[i] || '').trim().toLowerCase()
    if (HEADER_MAP[val]) {
      mapping.set(i, HEADER_MAP[val])
      foundHeader = true
    }
  }

  return foundHeader ? mapping : null
}

export function parseExcelFile(data: ArrayBuffer): ParsedTranscript[] {
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  if (rows.length === 0) return []

  // Detect headers
  const headerMap = detectHeaders(rows[0])
  const dataStart = headerMap ? 1 : 0
  const colMap = headerMap || new Map(
    DEFAULT_COLUMN_ORDER.map((key, i) => [i, key] as [number, keyof ParsedTranscript])
  )

  const results: ParsedTranscript[] = []

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length === 0) continue

    const item: Partial<ParsedTranscript> = {}
    for (const [colIdx, field] of colMap) {
      const val = row[colIdx]
      if (val !== undefined && val !== null && val !== '') {
        ;(item as any)[field] = String(val).trim()
      }
    }

    // Skip rows without title or transcript
    if (!item.title || !item.transcript) continue

    results.push({
      title: item.title,
      channel_name: item.channel_name,
      video_id: item.video_id,
      transcript: item.transcript,
      published_at: item.published_at,
    })
  }

  return results
}

export function parseCsvFile(data: ArrayBuffer): ParsedTranscript[] {
  // xlsx handles CSV natively
  return parseExcelFile(data)
}
