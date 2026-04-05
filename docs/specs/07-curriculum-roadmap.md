# SPEC 07: 5단계 커리큘럼 로드맵 UI

## 개요

**파일:** `app/curriculum/page.tsx` (현재 316줄 → 전체 개편 ~350줄)
**변경:** 평면적 개념 목록 → 5단계 로드맵 시각화로 개편
**의존:** framer-motion(애니메이션), lucide-react(아이콘)

---

## 페이지 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│  🎓 부동산 투자 마스터 로드맵                                │
│  "전문가 강의 기반 체계적 학습 경로"                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ●══════●══════●══════●══════●                           │
│  왕초보   초보    중급    고급   전문가                       │
│  28개     35개    32개    22개   14개                      │
│  56시간   90시간  120시간  80시간  60시간                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  선택: 중급 (32개 개념, 120시간)                             │
│                                                          │
│  도메인 필터:                                               │
│  [● 내집마련(6)] [● 투자(8)] [● 경매(9)] [● 공매(5)] [● NPL(4)] │
│                                                          │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ 실거래가 분석    │ │ 수익률 계산     │ │ 배당 분석      │  │
│  │ ⭐⭐⭐ 3명 강조 │ │ ⭐⭐ 2명 강조  │ │ ⭐ 1명 강조   │  │
│  │ 부동산투자 | 40분│ │ 경매 | 35분    │ │ 경매 | 45분   │  │
│  │ [캡슐 보기]     │ │ [캡슐 보기]    │ │ [캡슐 보기]   │  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  📚 학습 경로                                              │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 왕초보 종합 코스 | 20시간 | 10단계 | 필수             ││
│  │ 경매 마스터 코스 | 80시간 | 25단계 | 선수: 왕초보       ││
│  │ 통합 전문가 코스 | 200시간 | 전체 | 선수: 전체          ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │  🔗 지식그래프   📊 대시보드   📝 대본분석              ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## 컴포넌트 구조

```typescript
CurriculumPage
├── PageHeader          // 타이틀 + 서브타이틀
├── LevelTimeline       // 5단계 수평 타임라인 (framer-motion)
│   └── LevelNode × 5  // 원 + 라벨 + 개념수/시간
├── LevelDetailSection  // 선택된 레벨 상세
│   ├── LevelSummary    // 레벨명 + 개념수 + 시간 + 설명
│   ├── DomainFilterBar // 도메인 필터 버튼 5개
│   └── ConceptGrid     // 3열 개념 카드 그리드
│       └── ConceptCard × N
├── LearningPathSection // 학습 경로 카드
│   └── PathCard × 6
└── CTASection          // 그래프/대시보드/업로드 링크
```

---

## State

```typescript
const [selectedLevel, setSelectedLevel] = useState<string>('왕초보')
const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([1,2,3,4,5])
const [domains, setDomains] = useState<Domain[]>([])
const [concepts, setConcepts] = useState<Concept[]>([])
const [paths, setPaths] = useState<LearningPath[]>([])
const [importanceMap, setImportanceMap] = useState<Map<number, { expert_count: number; avg_relevance: number }>>()
const [levelStats, setLevelStats] = useState<Array<{ level: string; count: number; hours: number }>>([])
const [loading, setLoading] = useState(true)
```

---

## LevelTimeline 컴포넌트

```typescript
const LEVELS = [
  { key: '왕초보', label: '왕초보', description: '부동산의 기본 개념부터', icon: Sprout, color: '#10B981' },
  { key: '초보', label: '초보', description: '본격적인 투자 준비', icon: Leaf, color: '#3B82F6' },
  { key: '중급', label: '중급', description: '실전 투자 기법 습득', icon: TreePine, color: '#8B5CF6' },
  { key: '고급', label: '고급', description: '고급 전략과 리스크 관리', icon: Mountain, color: '#F59E0B' },
  { key: '전문가', label: '전문가', description: '전문가 수준의 포트폴리오', icon: Crown, color: '#EF4444' },
]

function LevelTimeline({ selectedLevel, onSelect, levelStats }) {
  return (
    <div className="relative flex items-center justify-between px-8 py-6">
      {/* 연결선 */}
      <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-200 -translate-y-1/2" />
      <div className="absolute top-1/2 left-12 h-1 bg-purple-500 -translate-y-1/2 transition-all"
        style={{ width: `${(LEVELS.findIndex(l => l.key === selectedLevel)) * 25}%` }} />

      {LEVELS.map((level, i) => {
        const stat = levelStats.find(s => s.level === level.key)
        const isSelected = selectedLevel === level.key
        const isPast = LEVELS.findIndex(l => l.key === selectedLevel) >= i

        return (
          <motion.button
            key={level.key}
            onClick={() => onSelect(level.key)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            {/* 원형 노드 */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-3 transition-all
              ${isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200'
                : isPast ? 'bg-purple-100 border-purple-400 text-purple-600'
                : 'bg-white border-gray-300 text-gray-400'}`}
            >
              <level.icon className="w-6 h-6" />
            </div>

            {/* 라벨 */}
            <span className={`text-sm font-bold ${isSelected ? 'text-purple-700' : 'text-gray-500'}`}>
              {level.label}
            </span>

            {/* 통계 */}
            <span className="text-xs text-gray-400">
              {stat?.count || 0}개 | {stat?.hours || 0}시간
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
```

---

## ConceptCard 컴포넌트

```typescript
function ConceptCard({ concept, importance, domainColor, onCapsuleClick }) {
  const expertCount = importance?.expert_count || 0
  const avgRelevance = importance?.avg_relevance || 0

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 도메인 색상 점 + 개념명 */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: domainColor }} />
              <h3 className="font-semibold text-sm">{concept.name}</h3>
            </div>

            {/* 메타 정보 */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {concept.estimated_minutes || 30}분
              </span>
              <span>난이도 {'★'.repeat(concept.difficulty || 1)}</span>
            </div>

            {/* 설명 (1줄) */}
            <p className="text-xs text-gray-600 line-clamp-1">
              {concept.description}
            </p>
          </div>

          {/* 전문가 강조도 뱃지 */}
          {expertCount > 0 && (
            <div className="flex flex-col items-center ml-2">
              <div className="bg-red-50 text-red-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {expertCount}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5">전문가</span>
            </div>
          )}
        </div>

        {/* 강조도 바 */}
        {avgRelevance > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className="bg-purple-500 rounded-full h-1.5"
                style={{ width: `${avgRelevance * 100}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{Math.round(avgRelevance * 100)}%</span>
          </div>
        )}

        {/* 캡슐 보기 링크 */}
        <button
          onClick={(e) => { e.stopPropagation(); onCapsuleClick(concept.concept_id) }}
          className="mt-2 text-xs text-purple-600 hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          강의 캡슐 보기 →
        </button>
      </CardContent>
    </Card>
  )
}
```

---

## 데이터 로딩 흐름

```typescript
useEffect(() => {
  Promise.all([
    fetch('/api/ontology/domains').then(r => r.json()),
    fetch(`/api/ontology/concepts?level=${selectedLevel}`).then(r => r.json()),
    fetch('/api/ontology/paths').then(r => r.json()),
    fetch(`/api/ontology/importance?level=${selectedLevel}`).then(r => r.json()),
  ]).then(([domainRes, conceptRes, pathRes, impRes]) => {
    setDomains(domainRes.domains || [])
    setConcepts(conceptRes.concepts || [])
    setPaths(pathRes.paths || [])

    const impMap = new Map()
    for (const imp of (impRes.importance || [])) {
      impMap.set(imp.concept_id, imp)
    }
    setImportanceMap(impMap)

    setLoading(false)
  })
}, [selectedLevel])

// 레벨 통계 (별도 계산)
useEffect(() => {
  fetch('/api/ontology/concepts').then(r => r.json()).then(res => {
    const allConcepts = res.concepts || []
    const stats = LEVELS.map(l => {
      const levelConcepts = allConcepts.filter(c => c.level === l.key)
      return {
        level: l.key,
        count: levelConcepts.length,
        hours: Math.round(levelConcepts.reduce((s, c) => s + (c.estimated_minutes || 30), 0) / 60)
      }
    })
    setLevelStats(stats)
  })
}, [])
```

---

## 검증 체크리스트

- [ ] 5단계 타임라인 렌더링 (왕초보~전문가)
- [ ] 레벨 클릭 → 해당 레벨 개념 로드 + 강조
- [ ] 각 레벨별 개념수/학습시간 정확히 표시
- [ ] 도메인 필터 → 선택 도메인의 개념만 표시
- [ ] 개념 카드에 전문가 강조도 뱃지 표시
- [ ] 강조도 프로그레스 바 표시
- [ ] "강의 캡슐 보기" → /curriculum/capsule/[id] 이동
- [ ] 학습 경로 카드 표시 (6개)
- [ ] CTA 링크 (그래프/대시보드/업로드) 정상 동작
- [ ] framer-motion 애니메이션 부드럽게 동작
