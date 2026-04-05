# SPEC 02: 강화된 대본 분석 엔진

## 개요

**파일:** `lib/transcript-analyzer.ts`
**작업:** 기존 파일에 4개 함수 + 5개 타입 추가 (기존 코드 변경 없음)

기존 키워드 매칭 분석 위에 3가지 새로운 분석 모듈을 추가:
1. **강의 유형 분류** (정보성/사례/후킹/노하우)
2. **강의 구조 분석** (후킹→정보→사례→CTA→요약)
3. **사례 참조 탐지** (경매번호, 공매번호, 법원, 주소)

---

## 신규 타입 정의

```typescript
// ============================================
// 강의 분석 확장 타입
// ============================================

export type LectureType = 'informational' | 'case_study' | 'hooking' | 'knowhow' | 'mixed'

export interface LectureTypeScores {
  informational: number  // 0-1, 합계 = 1.0
  case_study: number
  hooking: number
  knowhow: number
}

export type SegmentType = 'hooking_intro' | 'information_body' | 'case_example'
  | 'call_to_action' | 'summary' | 'transition'

export interface StructureSegment {
  segment_type: SegmentType
  start_pct: number      // 0-100
  end_pct: number        // 0-100
  char_start: number     // 문자 위치 시작
  char_end: number       // 문자 위치 끝
  text_preview: string   // 첫 50자
  confidence: number     // 0-1
}

export type CaseReferenceType = 'auction' | 'public_sale' | 'court' | 'address'

export interface CaseReference {
  type: CaseReferenceType
  number: string         // 사건번호 또는 주소
  court?: string         // 법원명 (있으면)
  context: string        // 전후 100자
  char_position: number  // 텍스트 내 위치
}

export interface EnhancedAnalysisResult extends AnalysisResult {
  lecture_type: LectureType
  lecture_type_scores: LectureTypeScores
  structure: StructureSegment[]
  case_references: CaseReference[]
  hooking_ratio: number
  information_ratio: number
  case_ratio: number
  cta_ratio: number
}
```

---

## 함수 1: `classifyLectureType`

### 시그니처

```typescript
export function classifyLectureType(transcript: string): {
  type: LectureType
  scores: LectureTypeScores
}
```

### 키워드 사전

```typescript
const LECTURE_TYPE_KEYWORDS: Record<string, {
  strong: string[]   // 2.0 가중치
  medium: string[]   // 1.5 가중치
  weak: string[]     // 1.0 가중치
  patterns: { regex: RegExp; weight: number }[]
}> = {

  informational: {
    strong: [
      '정의', '의미', '개념', '원리', '원칙', '제도', '법률', '규정',
      '조항', '기준', '요건', '절차', '과정', '구조', '체계'
    ],
    medium: [
      '종류', '분류', '유형', '구분', '차이', '비교', '특징', '장단점',
      '조건', '자격', '한도', '세율', '공시지가', '감정가'
    ],
    weak: [
      '이란', '이라는', '말합니다', '됩니다', '입니다', '있습니다',
      '라고', '합니다', '봅니다', '알아보겠습니다'
    ],
    patterns: [
      { regex: /제?\d+조(\s*제?\d+항)?/g, weight: 1.0 },  // 법조항
      { regex: /\d+(\.\d+)?%/g, weight: 1.0 },            // 퍼센트
      { regex: /\d+억(\s*\d+천만)?원/g, weight: 0.8 },    // 금액
      { regex: /\d{4}년/g, weight: 0.5 }                   // 연도
    ]
  },

  case_study: {
    strong: [
      '사례', '실제로', '경험', '사건', '낙찰', '매각', '실거래',
      '입찰', '배당', '명도', '인도', '감정평가'
    ],
    medium: [
      '예를 들어', '예를 들면', '이 경우', '해당 물건', '이 물건',
      '이 아파트', '이 토지', '이 건물', '현장에서', '실무에서'
    ],
    weak: [
      '했는데', '했더니', '봤더니', '알고 보니', '확인해보니',
      '가보니', '해봤더니', '결과적으로'
    ],
    patterns: [
      { regex: /\d{4}\s*타경\s*\d{3,6}/g, weight: 3.0 },           // 경매 사건번호
      { regex: /\d{4}\s*[카타]경\s*\d{3,6}/g, weight: 3.0 },       // 경매 변형
      { regex: /공매\s*\d{4}[-]?\d{4,8}/g, weight: 3.0 },          // 공매 번호
      { regex: /[가-힣]+시\s+[가-힣]+[구군]\s+[가-힣]+[동읍면]/g, weight: 2.0 }, // 주소
      { regex: /\d+억\s*\d*천?만?\s*원에?\s*(낙찰|매각|매입)/g, weight: 2.5 }    // 금액+행위
    ]
  },

  hooking: {
    strong: [
      '비밀', '충격', '반드시', '절대', '꿀팁', '필수', '주의',
      '경고', '위험', '함정', '실수', '몰랐던'
    ],
    medium: [
      '아무도 모르는', '지금 당장', '놓치면', '모르면 손해', '꼭 알아야',
      '이것만은', '단 하나', '최고의', '최악의', '미친'
    ],
    weak: [
      '진짜', '대박', '미쳤', '어마어마', '엄청', '완전', '레전드',
      '역대급', '혜자', '실화'
    ],
    patterns: [
      { regex: /!{2,}/g, weight: 1.5 },      // 느낌표 연속
      { regex: /\?{2,}/g, weight: 1.5 },      // 물음표 연속
      { regex: /[!?]{2,}/g, weight: 1.5 },     // 혼합
      { regex: /여러분[,!?]?\s/g, weight: 1.0 } // 청중 호칭
    ]
  },

  knowhow: {
    strong: [
      '방법', '노하우', '전략', '비법', '스킬', '테크닉', '비결',
      '공략', '공식', '루틴', '프레임워크', '체크리스트'
    ],
    medium: [
      '하는 법', '하려면', '해야', '하세요', '하십시오', '추천',
      '이렇게', '이런 식으로', '순서대로', '단계별로'
    ],
    weak: [
      '팁', '포인트', '핵심', '요령', '비결', '꿀', '꿀팁',
      '활용', '응용', '적용'
    ],
    patterns: [
      { regex: /첫째|둘째|셋째|넷째|다섯째/g, weight: 1.5 },
      { regex: /[1-9]단계/g, weight: 1.5 },
      { regex: /step\s*\d/gi, weight: 1.5 },
      { regex: /\d+\.\s+[가-힣]/g, weight: 1.0 }  // 번호 매긴 목록
    ]
  }
}
```

### 알고리즘 상세

```
입력: transcript (string)
출력: { type: LectureType, scores: LectureTypeScores }

1. 텍스트 정규화
   - 공백 정리 (연속 공백 → 단일 공백)
   - 소문자 변환 없음 (한국어)

2. 4개 유형별 점수 계산
   FOR EACH lectureType IN [informational, case_study, hooking, knowhow]:
     score = 0

     // strong 키워드
     FOR EACH keyword IN LECTURE_TYPE_KEYWORDS[lectureType].strong:
       count = countOccurrences(transcript, keyword)  // 대소문자 무시
       score += count * 2.0

     // medium 키워드
     FOR EACH keyword IN LECTURE_TYPE_KEYWORDS[lectureType].medium:
       count = countOccurrences(transcript, keyword)
       score += count * 1.5

     // weak 키워드
     FOR EACH keyword IN LECTURE_TYPE_KEYWORDS[lectureType].weak:
       count = countOccurrences(transcript, keyword)
       score += count * 1.0

     // 패턴 매칭
     FOR EACH pattern IN LECTURE_TYPE_KEYWORDS[lectureType].patterns:
       matches = transcript.match(pattern.regex) || []
       score += matches.length * pattern.weight

     // 텍스트 길이 정규화 (1000자 단위)
     rawScores[lectureType] = score / Math.max(transcript.length / 1000, 1)

3. 점수 정규화 (합계 = 1.0)
   totalScore = SUM(rawScores)
   IF totalScore === 0: 모든 값을 0.25로
   ELSE: scores[type] = rawScores[type] / totalScore

4. 지배적 유형 판정
   maxScore = MAX(scores)
   maxType = argmax(scores)
   IF maxScore >= 0.40:
     type = maxType
   ELSE:
     type = 'mixed'

5. RETURN { type, scores }
```

### 유틸리티 함수

```typescript
function countOccurrences(text: string, keyword: string): number {
  // 한국어 키워드 검색 — 단순 indexOf 기반 (정규식 불필요)
  let count = 0
  let pos = 0
  const lowerText = text // 한국어는 대소문자 없음
  while ((pos = lowerText.indexOf(keyword, pos)) !== -1) {
    count++
    pos += keyword.length
  }
  return count
}
```

---

## 함수 2: `analyzeLectureStructure`

### 시그니처

```typescript
export function analyzeLectureStructure(transcript: string): StructureSegment[]
```

### 세그먼트 분류 키워드

```typescript
const SEGMENT_KEYWORDS: Record<SegmentType, {
  keywords: string[]
  patterns: RegExp[]
}> = {

  hooking_intro: {
    keywords: [
      '여러분', '안녕하세요', '오늘은', '이번에는', '비밀', '충격',
      '알려드리', '공개', '최초', '드디어', '이것만', '반드시'
    ],
    patterns: [
      /[?？]{1,}/g,  // 질문
      /[!！]{2,}/g   // 강한 느낌표
    ]
  },

  information_body: {
    keywords: [
      '정의', '의미', '개념', '종류', '분류', '조건', '요건',
      '절차', '법률', '규정', '기준', '체계', '구조', '원리'
    ],
    patterns: [
      /제?\d+조/g,   // 법조항
      /\d+%/g        // 퍼센트
    ]
  },

  case_example: {
    keywords: [
      '사례', '실제로', '예를 들', '이 경우', '해당 물건', '현장',
      '가보니', '확인해보니', '낙찰', '입찰', '감정가'
    ],
    patterns: [
      /\d{4}\s*타경\s*\d+/g,   // 경매 사건번호
      /공매\s*\d+/g,           // 공매 번호
      /\d+억.*원/g             // 금액
    ]
  },

  call_to_action: {
    keywords: [
      '구독', '좋아요', '알림', '링크', '설명란', '댓글',
      '상담', '문의', '신청', '연락', '카카오톡', '네이버'
    ],
    patterns: []
  },

  summary: {
    keywords: [
      '정리하면', '요약하면', '결론적으로', '마지막으로', '핵심은',
      '다시 한번', '기억하세요', '잊지 마세요', '중요한 것은'
    ],
    patterns: []
  },

  transition: {
    keywords: [
      '다음으로', '그러면', '자 이제', '그럼', '넘어가서'
    ],
    patterns: []
  }
}
```

### 알고리즘 상세

```
입력: transcript (string)
출력: StructureSegment[]

1. 텍스트를 10등분 (각 10%)
   chunkSize = Math.ceil(transcript.length / 10)
   chunks = []
   FOR i = 0 TO 9:
     start = i * chunkSize
     end = Math.min((i + 1) * chunkSize, transcript.length)
     chunks[i] = { text: transcript.slice(start, end), start, end, pct_start: i*10, pct_end: (i+1)*10 }

2. 각 청크에 세그먼트 유형 할당
   FOR EACH chunk IN chunks:
     scores = {}
     FOR EACH segType IN SEGMENT_KEYWORDS:
       score = 0
       FOR EACH kw IN segType.keywords:
         score += countOccurrences(chunk.text, kw) * 1.0
       FOR EACH pattern IN segType.patterns:
         matches = chunk.text.match(pattern) || []
         score += matches.length * 1.5
       scores[segType] = score / Math.max(chunk.text.length / 200, 1)

     // 위치 기반 보정
     IF chunk.pct_start === 0:  // 첫 10%
       scores.hooking_intro *= 2.0   // 도입부에서 후킹 확률 높임
     IF chunk.pct_start >= 80:  // 마지막 20%
       scores.call_to_action *= 1.5
       scores.summary *= 1.5
     IF chunk.pct_start >= 20 AND chunk.pct_end <= 70:  // 중간부
       scores.information_body *= 1.3
       scores.case_example *= 1.2

     // 최고 점수 유형 할당
     maxType = argmax(scores)
     maxScore = scores[maxType]
     IF maxScore < 0.1:
       maxType = 'information_body'  // 기본값
       confidence = 0.3
     ELSE:
       confidence = Math.min(maxScore / (SUM(scores) || 1), 1.0)

     chunk.segment_type = maxType
     chunk.confidence = confidence

3. 연속 동일 유형 병합
   merged = []
   current = chunks[0]
   FOR i = 1 TO chunks.length - 1:
     IF chunks[i].segment_type === current.segment_type:
       current.end = chunks[i].end
       current.pct_end = chunks[i].pct_end
       current.confidence = AVG(current.confidence, chunks[i].confidence)
     ELSE:
       merged.push(current)
       current = chunks[i]
   merged.push(current)

4. StructureSegment 변환
   RETURN merged.map(m => ({
     segment_type: m.segment_type,
     start_pct: m.pct_start,
     end_pct: m.pct_end,
     char_start: m.start,
     char_end: m.end,
     text_preview: transcript.slice(m.start, m.start + 50).trim(),
     confidence: ROUND(m.confidence, 2)
   }))
```

---

## 함수 3: `detectCaseReferences`

### 시그니처

```typescript
export function detectCaseReferences(transcript: string): CaseReference[]
```

### 패턴 목록

```typescript
const CASE_PATTERNS: Array<{
  type: CaseReferenceType
  regex: RegExp
  label: string
  courtExtractor?: (match: RegExpMatchArray) => string | undefined
}> = [
  // === 경매 사건번호 ===
  {
    type: 'auction',
    regex: /(\d{4})\s*타경\s*(\d{3,6})/g,
    label: '부동산 경매'
  },
  {
    type: 'auction',
    regex: /(\d{4})\s*카경\s*(\d{3,6})/g,
    label: '경매 항고'
  },
  {
    type: 'auction',
    regex: /(\d{4})\s*타채\s*(\d{3,6})/g,
    label: '채권압류'
  },
  {
    type: 'auction',
    regex: /(\d{4})\s*타기\s*(\d{3,6})/g,
    label: '기타 비송'
  },

  // === 공매 번호 ===
  {
    type: 'public_sale',
    regex: /공매\s*번호?\s*[:：]?\s*(\d{4}[-]?\d{4,8})/g,
    label: '공매'
  },
  {
    type: 'public_sale',
    regex: /캠코\s*(공매)?\s*(\d[\d-]+)/g,
    label: '캠코 공매'
  },
  {
    type: 'public_sale',
    regex: /온비드\s*(\d[\d-]+)/g,
    label: '온비드'
  },

  // === 법원 ===
  {
    type: 'court',
    regex: /([가-힣]{2,8}지방법원)\s*([가-힣]{2,6}지원)?/g,
    label: '법원'
  },

  // === 주소 ===
  {
    type: 'address',
    regex: /([가-힣]{1,4}[시도])\s+([가-힣]{1,5}[구군시])\s+([가-힣]{1,6}[동읍면리로길])\s*(\d[\d-]*)?/g,
    label: '주소'
  }
]
```

### 알고리즘

```
입력: transcript (string)
출력: CaseReference[]

results = []
FOR EACH pattern IN CASE_PATTERNS:
  // 정규식 lastIndex 초기화 (글로벌 플래그)
  pattern.regex.lastIndex = 0

  WHILE (match = pattern.regex.exec(transcript)):
    // 전후 100자 컨텍스트 추출
    contextStart = Math.max(0, match.index - 100)
    contextEnd = Math.min(transcript.length, match.index + match[0].length + 100)
    context = transcript.slice(contextStart, contextEnd).trim()

    // 법원명 추출 시도 (주변 텍스트에서)
    court = undefined
    IF pattern.type === 'auction':
      // 매칭 전후 200자에서 법원명 검색
      nearbyText = transcript.slice(
        Math.max(0, match.index - 200),
        Math.min(transcript.length, match.index + 200)
      )
      courtMatch = nearbyText.match(/([가-힣]{2,8}지방법원)\s*([가-힣]{2,6}지원)?/)
      IF courtMatch:
        court = courtMatch[0].trim()

    results.push({
      type: pattern.type,
      number: match[0].trim(),
      court,
      context,
      char_position: match.index
    })

// 중복 제거 (같은 번호가 여러 패턴에 매칭될 수 있음)
unique = deduplicateByNumber(results)

// 위치순 정렬
RETURN unique.sort((a, b) => a.char_position - b.char_position)
```

### 중복 제거 로직

```typescript
function deduplicateByNumber(refs: CaseReference[]): CaseReference[] {
  const seen = new Map<string, CaseReference>()
  for (const ref of refs) {
    const key = `${ref.type}:${ref.number.replace(/\s/g, '')}`
    if (!seen.has(key)) {
      seen.set(key, ref)
    }
  }
  return Array.from(seen.values())
}
```

---

## 함수 4: `analyzeTranscriptEnhanced`

### 시그니처

```typescript
export function analyzeTranscriptEnhanced(
  transcript: string,
  concepts: ConceptInfo[],
  options?: { minRelevance?: number; maxMappings?: number }
): EnhancedAnalysisResult
```

### 구현

```typescript
export function analyzeTranscriptEnhanced(
  transcript: string,
  concepts: ConceptInfo[],
  options?: { minRelevance?: number; maxMappings?: number }
): EnhancedAnalysisResult {
  // 1. 기존 키워드 분석 (변경 없음)
  const baseResult = analyzeTranscript(transcript, concepts, options)

  // 2. 강의 유형 분류
  const { type: lecture_type, scores: lecture_type_scores } = classifyLectureType(transcript)

  // 3. 구조 분석
  const structure = analyzeLectureStructure(transcript)

  // 4. 사례 탐지
  const case_references = detectCaseReferences(transcript)

  // 5. 비율 계산
  const totalPctSpan = structure.reduce((sum, s) => sum + (s.end_pct - s.start_pct), 0) || 100
  const ratioByType = (type: SegmentType) =>
    structure
      .filter(s => s.segment_type === type)
      .reduce((sum, s) => sum + (s.end_pct - s.start_pct), 0) / totalPctSpan

  return {
    ...baseResult,
    lecture_type,
    lecture_type_scores,
    structure,
    case_references,
    hooking_ratio: Math.round(ratioByType('hooking_intro') * 100) / 100,
    information_ratio: Math.round(ratioByType('information_body') * 100) / 100,
    case_ratio: Math.round(ratioByType('case_example') * 100) / 100,
    cta_ratio: Math.round(
      (ratioByType('call_to_action') + ratioByType('summary')) * 100
    ) / 100
  }
}
```

---

## 테스트 시나리오

### 테스트 1: 정보성 강의
```
입력: "부동산 경매란 법원을 통해 채무자의 부동산을 강제로 매각하는 절차입니다.
      경매의 종류에는 임의경매와 강제경매가 있습니다. 임의경매란 저당권에 기해..."
기대:
  - lecture_type: 'informational'
  - scores.informational > 0.5
  - structure[0].segment_type: 'information_body'
```

### 테스트 2: 사례 강의
```
입력: "실제로 2024타경12345 사건을 보면, 서울중앙지방법원에서 진행된 이 경매는
      감정가 5억원인 강남구 역삼동 123-45 아파트였는데..."
기대:
  - lecture_type: 'case_study'
  - case_references.length >= 2
  - case_references[0].type: 'auction'
  - case_references[0].number: '2024타경12345'
  - case_references[0].court: '서울중앙지방법원'
```

### 테스트 3: 후킹 강의
```
입력: "여러분!! 이 비밀을 알면 경매에서 절대 실패하지 않습니다!!!
      아무도 모르는 이 방법을 지금 당장 알려드리겠습니다!!"
기대:
  - lecture_type: 'hooking'
  - scores.hooking > 0.4
  - structure[0].segment_type: 'hooking_intro'
```

### 테스트 4: 혼합 강의
```
입력: 긴 대본 (후킹 도입 → 정보 본문 → 사례 → CTA → 요약)
기대:
  - lecture_type: 'mixed' 또는 지배적 유형
  - structure.length >= 3
  - 다양한 segment_type 포함
```

---

## 성능 고려사항

- **시간 복잡도:** O(n × k) — n=텍스트길이, k=키워드수
  - 키워드 사전: ~60개 × 4유형 = ~240회 검색
  - 패턴 매칭: ~20개 정규식
  - 전체: 3000자 텍스트 기준 < 10ms
- **메모리:** 원본 텍스트 + 10개 청크 + 결과 객체 → 무시할 수준
- **병렬화 불필요:** 단일 텍스트 분석이므로 순차 실행 충분
