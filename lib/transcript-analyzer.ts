// 대본 분석 엔진 — 키워드 매칭 기반 (Phase A)
// AI API 키 확보 시 Phase B (Gemini/GPT) 연동 가능

export interface ConceptInfo {
  concept_id: number
  name: string
  keywords: string[]
  description?: string
  level?: string
  domain_id?: number
}

export interface ConceptMapping {
  concept_id: number
  relevance: number
  reason: string
  matched_keywords: string[]
  timestamp_start?: number
  timestamp_end?: number
}

export interface AnalysisResult {
  mappings: ConceptMapping[]
  total_chunks: number
  analyzed_at: string
}

// ============================================================
// 대본 텍스트 청크 분할
// ============================================================

export function splitTranscript(
  transcript: string,
  chunkSize: number = 2000,
  overlap: number = 200
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < transcript.length) {
    const end = Math.min(start + chunkSize, transcript.length)
    chunks.push(transcript.slice(start, end))
    start = end - overlap
    if (start >= transcript.length - overlap) break
  }

  // 빈 청크 필터링
  return chunks.filter((c) => c.trim().length > 0)
}

// ============================================================
// 키워드 매칭 분석 (Phase A — API 키 불필요)
// ============================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w가-힣\s]/g, '')
    .trim()
}

function countOccurrences(text: string, keyword: string): number {
  const normalized = normalizeText(text)
  const normalizedKeyword = normalizeText(keyword)
  if (!normalizedKeyword) return 0

  let count = 0
  let pos = 0
  while (true) {
    pos = normalized.indexOf(normalizedKeyword, pos)
    if (pos === -1) break
    count++
    pos += normalizedKeyword.length
  }
  return count
}

function analyzeChunk(
  chunk: string,
  concepts: ConceptInfo[]
): Map<number, { score: number; keywords: string[] }> {
  const results = new Map<number, { score: number; keywords: string[] }>()
  const normalizedChunk = normalizeText(chunk)
  const chunkLength = normalizedChunk.length

  for (const concept of concepts) {
    let totalScore = 0
    const matchedKeywords: string[] = []

    // 1. 개념명 직접 매칭 (가장 높은 가중치)
    const nameCount = countOccurrences(chunk, concept.name)
    if (nameCount > 0) {
      totalScore += nameCount * 3.0
      matchedKeywords.push(concept.name)
    }

    // 2. 키워드 매칭
    for (const keyword of concept.keywords || []) {
      const kwCount = countOccurrences(chunk, keyword)
      if (kwCount > 0) {
        // TF-like: 빈도 × 키워드 길이 가중치
        const lengthWeight = Math.min(keyword.length / 3, 2.0)
        totalScore += kwCount * lengthWeight
        matchedKeywords.push(keyword)
      }
    }

    // 3. 점수 정규화 (0~1 범위로)
    // 청크 길이에 따른 정규화
    const normalizedScore = chunkLength > 0
      ? Math.min(totalScore / (chunkLength / 500), 1.0)
      : 0

    if (normalizedScore > 0 && matchedKeywords.length > 0) {
      results.set(concept.concept_id, {
        score: normalizedScore,
        keywords: [...new Set(matchedKeywords)],
      })
    }
  }

  return results
}

export function analyzeTranscript(
  transcript: string,
  concepts: ConceptInfo[],
  options: {
    minRelevance?: number
    maxMappings?: number
    chunkSize?: number
  } = {}
): AnalysisResult {
  const {
    minRelevance = 0.05,
    maxMappings = 30,
    chunkSize = 2000,
  } = options

  const chunks = splitTranscript(transcript, chunkSize)

  // 모든 청크에서 개념별 점수 누적
  const conceptScores = new Map<
    number,
    { totalScore: number; keywords: Set<string>; chunkCount: number }
  >()

  for (const chunk of chunks) {
    const chunkResults = analyzeChunk(chunk, concepts)

    for (const [conceptId, result] of chunkResults) {
      const existing = conceptScores.get(conceptId)
      if (existing) {
        existing.totalScore += result.score
        result.keywords.forEach((kw) => existing.keywords.add(kw))
        existing.chunkCount++
      } else {
        conceptScores.set(conceptId, {
          totalScore: result.score,
          keywords: new Set(result.keywords),
          chunkCount: 1,
        })
      }
    }
  }

  // 최종 relevance 계산 및 정렬
  const mappings: ConceptMapping[] = []

  for (const [conceptId, scores] of conceptScores) {
    // 평균 점수 × 등장 청크 비율 가중
    const avgScore = scores.totalScore / chunks.length
    const chunkCoverage = scores.chunkCount / chunks.length
    const relevance = Math.min(avgScore * (1 + chunkCoverage * 0.5), 1.0)

    if (relevance >= minRelevance) {
      const concept = concepts.find((c) => c.concept_id === conceptId)
      const matchedKeywords = Array.from(scores.keywords)

      mappings.push({
        concept_id: conceptId,
        relevance: Math.round(relevance * 1000) / 1000,
        reason: `키워드 매칭: ${matchedKeywords.slice(0, 5).join(', ')}${
          matchedKeywords.length > 5
            ? ` 외 ${matchedKeywords.length - 5}개`
            : ''
        } (${scores.chunkCount}/${chunks.length} 청크에서 발견)`,
        matched_keywords: matchedKeywords,
      })
    }
  }

  // relevance 높은 순 정렬 후 상위 N개
  mappings.sort((a, b) => b.relevance - a.relevance)

  return {
    mappings: mappings.slice(0, maxMappings),
    total_chunks: chunks.length,
    analyzed_at: new Date().toISOString(),
  }
}

// ============================================================
// 타임스탬프 구간별 매핑 (대본에 시간 정보 있는 경우)
// ============================================================

export interface TimestampedSegment {
  start: number // seconds
  end: number
  text: string
}

export function parseTimestampedTranscript(
  transcript: string
): TimestampedSegment[] {
  // YouTube 자막 형식 지원: "00:00:00 - 텍스트" or "[00:00] 텍스트"
  const segments: TimestampedSegment[] = []
  const lines = transcript.split('\n')

  const timePattern = /(?:\[)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\])?[\s\-]*(.*)/

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(timePattern)
    if (match) {
      const hours = match[3] ? parseInt(match[1]) : 0
      const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1])
      const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2])
      const startTime = hours * 3600 + minutes * 60 + seconds
      const text = match[4] || ''

      segments.push({
        start: startTime,
        end: startTime + 30, // 기본 30초 구간 (다음 타임스탬프가 있으면 업데이트)
        text,
      })
    }
  }

  // 연속 세그먼트의 end 시간 업데이트
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].end = segments[i + 1].start
  }

  return segments
}

export function analyzeWithTimestamps(
  segments: TimestampedSegment[],
  concepts: ConceptInfo[],
  minRelevance: number = 0.1
): ConceptMapping[] {
  const mappings: ConceptMapping[] = []

  // 3~5개 세그먼트 단위로 윈도우 분석
  const windowSize = 4
  for (let i = 0; i < segments.length; i += Math.max(1, windowSize - 1)) {
    const windowEnd = Math.min(i + windowSize, segments.length)
    const windowText = segments
      .slice(i, windowEnd)
      .map((s) => s.text)
      .join(' ')
    const windowStart = segments[i].start
    const windowEndTime = segments[windowEnd - 1].end

    const chunkResults = analyzeChunk(windowText, concepts)

    for (const [conceptId, result] of chunkResults) {
      if (result.score >= minRelevance) {
        mappings.push({
          concept_id: conceptId,
          relevance: Math.round(result.score * 1000) / 1000,
          reason: `타임스탬프 ${formatTime(windowStart)}~${formatTime(windowEndTime)}: ${result.keywords.join(', ')}`,
          matched_keywords: result.keywords,
          timestamp_start: windowStart,
          timestamp_end: windowEndTime,
        })
      }
    }
  }

  // 같은 concept_id의 중복 제거: 가장 높은 relevance 유지
  const bestMappings = new Map<number, ConceptMapping>()
  for (const m of mappings) {
    const existing = bestMappings.get(m.concept_id)
    if (!existing || m.relevance > existing.relevance) {
      bestMappings.set(m.concept_id, m)
    }
  }

  return Array.from(bestMappings.values())
    .sort((a, b) => b.relevance - a.relevance)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ============================================================
// 강화된 분석 — 강의 유형 / 구조 / 사례 탐지
// ============================================================

export interface LectureTypeScores {
  [key: string]: number
  informational: number
  case_study: number
  hooking: number
  knowhow: number
}

export interface StructureSegment {
  segment_type: 'hooking_intro' | 'information_body' | 'case_example' | 'call_to_action' | 'summary' | 'transition'
  start_pct: number
  end_pct: number
  char_start: number
  char_end: number
  text_preview: string
  confidence: number
}

export interface CaseReference {
  type: 'auction' | 'public_sale' | 'court' | 'address'
  number: string
  court?: string
  context: string
  char_position: number
}

export interface EnhancedAnalysisResult extends AnalysisResult {
  lecture_type: string
  lecture_type_scores: LectureTypeScores
  structure: StructureSegment[]
  case_references: CaseReference[]
  hooking_ratio: number
  information_ratio: number
  case_ratio: number
  cta_ratio: number
}

// --- 강의 유형 분류 키워드 사전 ---

const LECTURE_TYPE_KEYWORDS: Record<string, {
  strong: string[]
  medium: string[]
  weak: string[]
  patterns: { regex: RegExp; weight: number }[]
}> = {
  informational: {
    strong: ['정의', '의미', '개념', '원리', '원칙', '제도', '법률', '규정', '조항', '기준',
      '세금', '양도소득세', '취득세', '종합부동산세', '공시지가', '감정평가', '재산세', '종부세', '과세표준', '등기'],
    medium: ['종류', '분류', '유형', '구분', '차이', '비교', '특징', '장단점', '조건',
      '세율', '공제', '신고', '납부', '과세', '비과세', '면제', '감면', '산정', '평가액'],
    weak: ['이란', '이라는', '말합니다', '됩니다', '입니다', '있습니다'],
    patterns: [
      { regex: /\d+조/g, weight: 1.0 },
      { regex: /제\d+항/g, weight: 1.0 },
      { regex: /\d+%/g, weight: 1.0 },
      { regex: /\d+억/g, weight: 1.0 },
      { regex: /\d+만원/g, weight: 1.0 },
    ]
  },
  case_study: {
    strong: ['사례', '실제로', '경험', '사건', '낙찰', '매각', '실거래',
      '입찰', '유찰', '감정가', '낙찰가율', '배당', '명도', '인도명령', '최저매각가', '말소기준권리', '권리분석'],
    medium: ['예를 들어', '예를 들면', '이 경우', '해당 물건', '이 물건',
      '임차인', '대항력', '확정일자', '보증금', '선순위', '후순위', '근저당', '가압류', '전입신고'],
    weak: ['했는데', '했더니', '봤더니', '알고 보니'],
    patterns: [
      { regex: /\d{4}타경\d+/g, weight: 3.0 },
      { regex: /\d{4}카경\d+/g, weight: 3.0 },
      { regex: /공매\d+/g, weight: 3.0 },
      { regex: /[가-힣]+시\s*[가-힣]+구/g, weight: 1.5 },
      { regex: /[가-힣]+동\s*\d+/g, weight: 1.5 },
    ]
  },
  hooking: {
    strong: ['비밀', '충격', '반드시', '절대', '꿀팁', '필수', '주의',
      '수익률', '폭등', '폭락', '급등', '급매', '대폭', '역대', '최저', '최고'],
    medium: ['아무도 모르는', '지금 당장', '놓치면', '모르면 손해', '꼭 알아야',
      '부자되는', '월세받는', '건물주', '수입', '연봉'],
    weak: ['진짜', '대박', '미쳤', '어마어마'],
    patterns: [
      { regex: /!{2,}/g, weight: 1.5 },
      { regex: /\?{2,}/g, weight: 1.5 },
      { regex: /[!?]{2,}/g, weight: 1.5 },
    ]
  },
  knowhow: {
    strong: ['방법', '노하우', '전략', '비법', '스킬', '테크닉',
      '절세', '투자법', '분석법', '체크리스트', '절차', '매뉴얼', '가이드'],
    medium: ['하는 법', '하려면', '해야', '하세요', '하십시오', '추천',
      '확인하세요', '살펴보세요', '검토', '주의사항', '유의사항'],
    weak: ['팁', '포인트', '핵심', '요령'],
    patterns: [
      { regex: /첫째|둘째|셋째/g, weight: 1.5 },
      { regex: /1단계|2단계|3단계/g, weight: 1.5 },
      { regex: /step\s*\d/gi, weight: 1.5 },
      { regex: /\d+\.\s/g, weight: 1.5 },
    ]
  }
}

export function classifyLectureType(transcript: string): { type: string; scores: LectureTypeScores } {
  const rawScores: Record<string, number> = {
    informational: 0,
    case_study: 0,
    hooking: 0,
    knowhow: 0,
  }

  for (const [typeName, keywords] of Object.entries(LECTURE_TYPE_KEYWORDS)) {
    let score = 0

    // strong keywords (2.0)
    for (const kw of keywords.strong) {
      score += countOccurrences(transcript, kw) * 2.0
    }

    // medium keywords (1.5)
    for (const kw of keywords.medium) {
      score += countOccurrences(transcript, kw) * 1.5
    }

    // weak keywords (1.0)
    for (const kw of keywords.weak) {
      score += countOccurrences(transcript, kw) * 1.0
    }

    // patterns
    for (const pattern of keywords.patterns) {
      const matches = transcript.match(pattern.regex)
      if (matches) {
        score += matches.length * pattern.weight
      }
    }

    // normalize by text length
    rawScores[typeName] = transcript.length > 0 ? score / (transcript.length / 1000) : 0
  }

  // normalize to sum=1
  const totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0)
  const scores: LectureTypeScores = {
    informational: totalScore > 0 ? Math.round((rawScores.informational / totalScore) * 100) / 100 : 0.25,
    case_study: totalScore > 0 ? Math.round((rawScores.case_study / totalScore) * 100) / 100 : 0.25,
    hooking: totalScore > 0 ? Math.round((rawScores.hooking / totalScore) * 100) / 100 : 0.25,
    knowhow: totalScore > 0 ? Math.round((rawScores.knowhow / totalScore) * 100) / 100 : 0.25,
  }

  // determine dominant type
  const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  const type = maxType[1] >= 0.40 ? maxType[0] : 'mixed'

  return { type, scores }
}

// --- 강의 구조 분석 ---

const SEGMENT_KEYWORDS: Record<string, string[]> = {
  hooking_intro: ['여러분', '비밀', '충격', '알려드릴', '공개', '놀라운', '꼭 보셔야', '안녕하세요',
    '오늘', '이번에', '소개', '주제', '다룰', '처음 보시는'],
  case_example: ['실제로', '사례', '사건', '낙찰', '매각', '경험', '이 물건', '해당 물건', '실거래',
    '투자했던', '매수했던', '입찰했던', '물건번호', '아파트', '빌라', '오피스텔'],
  call_to_action: ['구독', '좋아요', '링크', '상담', '문의', '댓글', '알림', '채널', '영상 설명란',
    '무료', '카페', '블로그', '카카오톡', '오픈채팅', '전화'],
  summary: ['정리하면', '요약하면', '결론적으로', '마지막으로', '정리해보면', '핵심은', '기억하셔야',
    '꼭 기억', '잊지 마세요', '다시 한번', '가장 중요한', '오늘 배운'],
  transition: ['자 그러면', '다음으로', '이어서', '그 다음', '넘어가서', '다른 이야기'],
}

export function analyzeLectureStructure(transcript: string): StructureSegment[] {
  const totalLen = transcript.length
  if (totalLen === 0) return []

  const segmentCount = 10
  const segmentLen = Math.ceil(totalLen / segmentCount)
  const rawSegments: StructureSegment[] = []

  for (let i = 0; i < segmentCount; i++) {
    const charStart = i * segmentLen
    const charEnd = Math.min((i + 1) * segmentLen, totalLen)
    const text = transcript.slice(charStart, charEnd)
    const startPct = Math.round((charStart / totalLen) * 100)
    const endPct = Math.round((charEnd / totalLen) * 100)

    // determine segment type
    let segmentType: StructureSegment['segment_type'] = 'information_body'
    let confidence = 0.5

    // position-based defaults
    if (i === 0) {
      segmentType = 'hooking_intro'
      confidence = 0.6
    } else if (i >= 8) {
      segmentType = 'summary'
      confidence = 0.5
    }

    // keyword-based override
    let maxKeywordScore = 0
    for (const [type, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
      let score = 0
      for (const kw of keywords) {
        score += countOccurrences(text, kw) * 2
      }
      if (score > maxKeywordScore) {
        maxKeywordScore = score
        if (score >= 2) {
          segmentType = type as StructureSegment['segment_type']
          confidence = Math.min(0.5 + score * 0.1, 0.95)
        }
      }
    }

    // case pattern override (for middle segments)
    if (i >= 1 && i <= 7) {
      const casePatterns = [/\d{4}타경\d+/, /\d{4}카경\d+/, /실제로/, /사례/, /낙찰/]
      const caseScore = casePatterns.reduce((sum, p) => sum + (p.test(text) ? 1 : 0), 0)
      if (caseScore >= 2) {
        segmentType = 'case_example'
        confidence = Math.min(0.5 + caseScore * 0.15, 0.95)
      }
    }

    // CTA check for late segments
    if (i >= 7) {
      const ctaKeywords = ['구독', '좋아요', '링크', '상담', '문의', '댓글']
      const ctaScore = ctaKeywords.reduce((sum, kw) => sum + countOccurrences(text, kw), 0)
      if (ctaScore >= 2) {
        segmentType = 'call_to_action'
        confidence = Math.min(0.6 + ctaScore * 0.1, 0.95)
      }
    }

    rawSegments.push({
      segment_type: segmentType,
      start_pct: startPct,
      end_pct: endPct,
      char_start: charStart,
      char_end: charEnd,
      text_preview: text.slice(0, 50).replace(/\n/g, ' '),
      confidence,
    })
  }

  // merge consecutive same-type segments
  const merged: StructureSegment[] = []
  for (const seg of rawSegments) {
    const last = merged[merged.length - 1]
    if (last && last.segment_type === seg.segment_type) {
      last.end_pct = seg.end_pct
      last.char_end = seg.char_end
      last.confidence = Math.max(last.confidence, seg.confidence)
    } else {
      merged.push({ ...seg })
    }
  }

  return merged
}

function calculateRatios(structure: StructureSegment[]): {
  hooking_ratio: number
  information_ratio: number
  case_ratio: number
  cta_ratio: number
} {
  let hooking = 0, info = 0, caseR = 0, cta = 0

  for (const seg of structure) {
    const width = seg.end_pct - seg.start_pct
    switch (seg.segment_type) {
      case 'hooking_intro': hooking += width; break
      case 'information_body': info += width; break
      case 'case_example': caseR += width; break
      case 'call_to_action': cta += width; break
      case 'summary': cta += width; break
      case 'transition': info += width; break
    }
  }

  const total = hooking + info + caseR + cta || 100
  return {
    hooking_ratio: Math.round((hooking / total) * 100) / 100,
    information_ratio: Math.round((info / total) * 100) / 100,
    case_ratio: Math.round((caseR / total) * 100) / 100,
    cta_ratio: Math.round((cta / total) * 100) / 100,
  }
}

// --- 사례 탐지 ---

const CASE_PATTERNS: Array<{
  type: CaseReference['type']
  regex: RegExp
  label: string
}> = [
  { type: 'auction', regex: /(\d{4})\s*타경\s*(\d{3,6})/g, label: '경매' },
  { type: 'auction', regex: /(\d{4})\s*카경\s*(\d{3,6})/g, label: '경매(항고)' },
  { type: 'auction', regex: /(\d{4})\s*타채\s*(\d{3,6})/g, label: '채권압류' },
  { type: 'public_sale', regex: /공매\s*번호?\s*[:：]?\s*(\d{4}[-]?\d{4,8})/g, label: '공매' },
  { type: 'public_sale', regex: /캠코\s*공매\s*(\d+)/g, label: '캠코공매' },
  { type: 'public_sale', regex: /온비드\s*(\d+)/g, label: '온비드' },
  { type: 'auction', regex: /(\d{4})\s*타기\s*(\d{3,6})/g, label: '임의경매' },
  { type: 'auction', regex: /(\d{4})\s*타담\s*(\d{3,6})/g, label: '담보경매' },
  { type: 'public_sale', regex: /한국자산관리공사\s*(\d+)/g, label: '자산관리공사' },
  { type: 'court', regex: /([가-힣]{2,8}지방법원)\s*([가-힣]{2,6}지원)?/g, label: '법원' },
  { type: 'court', regex: /([가-힣]{2,8}법원)\s*\d{4}[가-힣]{1,2}\d+/g, label: '판례번호' },
  { type: 'address', regex: /([가-힣]{1,4}[시도])\s*([가-힣]{1,4}[구군시])\s*([가-힣]{1,6}[동읍면리])/g, label: '주소' },
  { type: 'address', regex: /([가-힣]{1,4}[시도])\s*([가-힣]{1,4}[구군시])\s*([가-힣]{1,10}[로길])\s*\d+/g, label: '도로명주소' },
]

export function detectCaseReferences(transcript: string): CaseReference[] {
  const results: CaseReference[] = []
  const seen = new Set<string>()

  for (const pattern of CASE_PATTERNS) {
    // create a fresh regex each time
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(transcript)) !== null) {
      const number = match[0].trim()
      const dedupeKey = `${pattern.type}:${number}`

      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const contextStart = Math.max(0, match.index - 100)
      const contextEnd = Math.min(transcript.length, match.index + match[0].length + 100)
      const context = transcript.slice(contextStart, contextEnd).replace(/\n/g, ' ')

      // extract court name if nearby
      let court: string | undefined
      if (pattern.type === 'auction') {
        const courtMatch = context.match(/([가-힣]{2,8}지방법원)(\s*[가-힣]{2,6}지원)?/)
        if (courtMatch) court = courtMatch[0].trim()
      }

      results.push({
        type: pattern.type,
        number,
        court,
        context,
        char_position: match.index,
      })
    }
  }

  return results
}

// --- 통합 강화 분석 ---

export function analyzeTranscriptEnhanced(
  transcript: string,
  concepts: ConceptInfo[],
  options?: { minRelevance?: number; maxMappings?: number }
): EnhancedAnalysisResult {
  // 1. 기존 키워드 분석
  const baseResult = analyzeTranscript(transcript, concepts, options)

  // 2. 강의 유형 분류
  const { type: lecture_type, scores: lecture_type_scores } = classifyLectureType(transcript)

  // 3. 구조 분석
  const structure = analyzeLectureStructure(transcript)

  // 4. 사례 탐지
  const case_references = detectCaseReferences(transcript)

  // 5. 비율 계산
  const ratios = calculateRatios(structure)

  return {
    ...baseResult,
    lecture_type,
    lecture_type_scores,
    structure,
    case_references,
    ...ratios,
  }
}
