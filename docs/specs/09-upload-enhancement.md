# SPEC 09: 대본 분석 UI 강화

## 개요

**파일:** `app/curriculum/upload/page.tsx` (현재 329줄, +~100줄 추가)
**변경:** 기존 UI 유지 + 강화된 분석 결과 섹션 추가

---

## 추가 UI 섹션

기존 "분석 결과" 영역 위에 3개 신규 섹션 추가:

### 1. 강의 유형 뱃지

```
┌──────────────────────────────────────────┐
│ 강의 유형 분석                             │
│                                          │
│ 주요 유형: [🔵 정보성]                     │
│                                          │
│ [🔵 정보성 45%] [🟢 사례 30%]             │
│ [🟠 후킹 15%]  [🟣 노하우 10%]            │
└──────────────────────────────────────────┘
```

```typescript
const LECTURE_TYPE_CONFIG: Record<string, {
  label: string; bg: string; text: string; emoji: string
}> = {
  informational: { label: '정보성', bg: 'bg-blue-100', text: 'text-blue-700', emoji: '📘' },
  case_study:    { label: '사례',   bg: 'bg-green-100', text: 'text-green-700', emoji: '📋' },
  hooking:       { label: '후킹',   bg: 'bg-orange-100', text: 'text-orange-700', emoji: '🎯' },
  knowhow:       { label: '노하우', bg: 'bg-purple-100', text: 'text-purple-700', emoji: '💡' },
  mixed:         { label: '혼합',   bg: 'bg-gray-100', text: 'text-gray-700', emoji: '🔀' },
}

function LectureTypeBadges({ type, scores }: {
  type: string
  scores: Record<string, number>
}) {
  const config = LECTURE_TYPE_CONFIG[type] || LECTURE_TYPE_CONFIG.mixed

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">주요 유형:</span>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.bg} ${config.text}`}>
          {config.emoji} {config.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(scores)
          .sort(([,a], [,b]) => b - a)
          .map(([key, value]) => {
            const c = LECTURE_TYPE_CONFIG[key]
            if (!c) return null
            return (
              <span key={key} className={`px-2 py-1 rounded text-xs ${c.bg} ${c.text}`}>
                {c.label} {Math.round(value * 100)}%
              </span>
            )
          })}
      </div>
    </div>
  )
}
```

### 2. 구조 타임라인

```
┌──────────────────────────────────────────┐
│ 강의 구조 분석                             │
│                                          │
│ ████░░░░░░░░░░████████████░░░████░░██    │
│                                          │
│ 🟠 후킹 8%  🔵 정보 52%  🟢 사례 25%     │
│ 🔴 CTA 10%  🟣 요약 5%                   │
└──────────────────────────────────────────┘
```

```typescript
const SEGMENT_COLORS: Record<string, { color: string; label: string }> = {
  hooking_intro:    { color: '#F59E0B', label: '후킹' },
  information_body: { color: '#3B82F6', label: '정보' },
  case_example:     { color: '#10B981', label: '사례' },
  call_to_action:   { color: '#EF4444', label: 'CTA' },
  summary:          { color: '#8B5CF6', label: '요약' },
  transition:       { color: '#D1D5DB', label: '전환' },
}

function StructureTimeline({ segments, ratios }: {
  segments: Array<{ segment_type: string; start_pct: number; end_pct: number; text_preview: string; confidence: number }>
  ratios: { hooking_ratio: number; information_ratio: number; case_ratio: number; cta_ratio: number }
}) {
  return (
    <div className="space-y-3">
      {/* 타임라인 바 */}
      <div className="flex h-8 rounded-lg overflow-hidden border">
        {segments.map((seg, i) => {
          const segConfig = SEGMENT_COLORS[seg.segment_type] || SEGMENT_COLORS.transition
          const width = seg.end_pct - seg.start_pct

          return (
            <div
              key={i}
              className="relative group cursor-pointer transition-opacity hover:opacity-80"
              style={{
                width: `${width}%`,
                backgroundColor: segConfig.color,
                minWidth: width > 3 ? undefined : '4px'
              }}
              title={`${segConfig.label} (${seg.start_pct}%-${seg.end_pct}%)\n${seg.text_preview}`}
            >
              {/* 라벨 (너비 10% 이상일 때만) */}
              {width >= 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-medium">
                  {segConfig.label} {width}%
                </span>
              )}

              {/* 호버 툴팁 */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                bg-gray-900 text-white text-xs rounded-lg p-2 w-48 z-10 shadow-lg">
                <div className="font-bold">{segConfig.label} ({seg.start_pct}%-{seg.end_pct}%)</div>
                <div className="mt-1 text-gray-300 line-clamp-2">{seg.text_preview}</div>
                <div className="mt-1 text-gray-400">신뢰도: {Math.round(seg.confidence * 100)}%</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 비율 범례 */}
      <div className="flex flex-wrap gap-3 text-xs">
        {ratios.hooking_ratio > 0 && (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.hooking_intro.color }} />
            후킹 {Math.round(ratios.hooking_ratio * 100)}%
          </span>
        )}
        {ratios.information_ratio > 0 && (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.information_body.color }} />
            정보 {Math.round(ratios.information_ratio * 100)}%
          </span>
        )}
        {ratios.case_ratio > 0 && (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.case_example.color }} />
            사례 {Math.round(ratios.case_ratio * 100)}%
          </span>
        )}
        {ratios.cta_ratio > 0 && (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.call_to_action.color }} />
            CTA+요약 {Math.round(ratios.cta_ratio * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}
```

### 3. 사례 참조 패널

```
┌──────────────────────────────────────────┐
│ 탐지된 사례 (3건)                          │
│                                          │
│ 📋 경매 | 2024타경12345                    │
│   서울중앙지방법원                          │
│   "감정가 대비 70%에 낙찰되었는데 유치권..."  │
│                                          │
│ 📋 경매 | 2023타경98765                    │
│   수원지방법원                              │
│   "이 물건은 가처분이 설정되어..."            │
│                                          │
│ 📍 주소 | 서울시 강남구 역삼동 123-45         │
│   "이 아파트의 경우 재건축 추진 중이라..."     │
└──────────────────────────────────────────┘
```

```typescript
function CaseReferencesPanel({ cases }: {
  cases: Array<{ type: string; number: string; court?: string; context: string }>
}) {
  if (cases.length === 0) return null

  const typeIcons: Record<string, string> = {
    auction: '📋', public_sale: '🏛️', court: '⚖️', address: '📍'
  }
  const typeLabels: Record<string, string> = {
    auction: '경매', public_sale: '공매', court: '법원', address: '주소'
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        탐지된 사례 ({cases.length}건)
      </h3>
      <div className="space-y-2">
        {cases.map((c, i) => (
          <div key={i} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <span>{typeIcons[c.type] || '📄'}</span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                {typeLabels[c.type] || c.type}
              </span>
              <span className="font-mono text-sm font-bold">{c.number}</span>
            </div>
            {c.court && (
              <div className="text-xs text-gray-500 ml-6 mb-1">{c.court}</div>
            )}
            <p className="text-xs text-gray-600 ml-6 line-clamp-2">
              "{c.context}"
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 기존 코드 수정 포인트

### State 확장

```typescript
// 기존 state에 추가:
const [analysisEnhanced, setAnalysisEnhanced] = useState<{
  lecture_type?: string
  lecture_type_scores?: Record<string, number>
  structure?: any[]
  case_references?: any[]
  hooking_ratio?: number
  information_ratio?: number
  case_ratio?: number
  cta_ratio?: number
} | null>(null)
```

### 업로드 응답 처리

```typescript
// handleUpload 함수 내, 기존 응답 처리 후 추가:
if (data.analysis) {
  setAnalysisEnhanced({
    lecture_type: data.analysis.lecture_type,
    lecture_type_scores: data.analysis.lecture_type_scores,
    structure: data.analysis.structure,
    case_references: data.analysis.case_references,
    hooking_ratio: data.analysis.hooking_ratio,
    information_ratio: data.analysis.information_ratio,
    case_ratio: data.analysis.case_ratio,
    cta_ratio: data.analysis.cta_ratio
  })
}
```

### 렌더링 위치

기존 "분석 결과" 섹션 위에 3개 신규 컴포넌트 삽입:

```typescript
{/* 분석 결과 영역 */}
{analysisResult && (
  <div className="space-y-4">
    {/* === 신규 섹션 === */}
    {analysisEnhanced?.lecture_type && (
      <Card>
        <CardHeader><CardTitle className="text-base">강의 유형</CardTitle></CardHeader>
        <CardContent>
          <LectureTypeBadges
            type={analysisEnhanced.lecture_type}
            scores={analysisEnhanced.lecture_type_scores || {}}
          />
        </CardContent>
      </Card>
    )}

    {analysisEnhanced?.structure && analysisEnhanced.structure.length > 0 && (
      <Card>
        <CardHeader><CardTitle className="text-base">강의 구조</CardTitle></CardHeader>
        <CardContent>
          <StructureTimeline
            segments={analysisEnhanced.structure}
            ratios={{
              hooking_ratio: analysisEnhanced.hooking_ratio || 0,
              information_ratio: analysisEnhanced.information_ratio || 0,
              case_ratio: analysisEnhanced.case_ratio || 0,
              cta_ratio: analysisEnhanced.cta_ratio || 0
            }}
          />
        </CardContent>
      </Card>
    )}

    {analysisEnhanced?.case_references && analysisEnhanced.case_references.length > 0 && (
      <Card>
        <CardContent className="pt-4">
          <CaseReferencesPanel cases={analysisEnhanced.case_references} />
        </CardContent>
      </Card>
    )}

    {/* === 기존 개념 매핑 결과 === */}
    <Card>
      <CardHeader><CardTitle className="text-base">매핑된 개념</CardTitle></CardHeader>
      {/* ... 기존 매핑 결과 UI ... */}
    </Card>
  </div>
)}
```

---

## 검증 체크리스트

- [ ] 대본 업로드 후 강의 유형 뱃지 표시
- [ ] 4개 유형별 퍼센트 뱃지 표시
- [ ] 구조 타임라인 바 렌더링 (색상 코딩)
- [ ] 타임라인 세그먼트 호버 시 툴팁
- [ ] 비율 범례 정확히 표시
- [ ] 사례 참조 패널 (경매/공매/주소 아이콘 구분)
- [ ] 사례 없으면 패널 숨김
- [ ] 기존 개념 매핑 결과 UI 영향 없음
