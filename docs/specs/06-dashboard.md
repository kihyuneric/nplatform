# SPEC 06: 분석 대시보드

## 개요

**신규 파일:** `app/curriculum/dashboard/page.tsx` (~350줄)
**데이터 소스:** `GET /api/ontology/dashboard` → `DashboardStats`
**시각화:** recharts (이미 설치: `recharts@2.15.0`)

---

## 페이지 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│ 📊 온톨로지 분석 대시보드                                   │
│ 전문가 강의 기반 부동산 투자 지식 체계 분석                    │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ 📚 131   │ 🎬 2     │ 📈 24%   │ 👤 2     │ 🔗 31       │
│ 전체 개념 │ 분석 영상 │ 커버리지 │ 전문가   │ 매핑         │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│                                                          │
│  ┌──────────────────────┐ ┌────────────────────────────┐ │
│  │  도메인별 깊이 분석     │ │  레벨별 분포                │ │
│  │  (RadarChart)         │ │  (BarChart, stacked)       │ │
│  │                       │ │                            │ │
│  │     내집마련            │ │  왕초보 ████████████ 28    │ │
│  │    /     \             │ │  초보   ██████████ 35     │ │
│  │ NPL ─── 투자           │ │  중급   ████████ 32       │ │
│  │    \     /             │ │  고급   ██████ 22         │ │
│  │     공매                │ │  전문가 ████ 14           │ │
│  │       경매              │ │                            │ │
│  └──────────────────────┘ └────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────┐ ┌────────────────────────────┐ │
│  │  강의 유형 분포         │ │  전문가 합의도 Top 10       │ │
│  │  (PieChart)           │ │  (custom 히트맵)            │ │
│  │                       │ │                            │ │
│  │    정보성 50%          │ │  개념명    전문가A  전문가B  │ │
│  │    사례 30%           │ │  권리분석   ███87%  ██65%  │ │
│  │    후킹 15%           │ │  등기부     ██82%   █45%  │ │
│  │    노하우 5%          │ │  입찰전략   █75%   ███90% │ │
│  └──────────────────────┘ └────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  커버리지 매트릭스 (도메인 × 레벨)                      │ │
│  │       왕초보   초보    중급    고급    전문가             │ │
│  │ 내집   80%    60%    30%    10%     0%               │ │
│  │ 투자   70%    50%    20%     5%     0%               │ │
│  │ 경매   90%    40%    25%    15%     0%               │ │
│  │ 공매   60%    30%    10%     0%     0%               │ │
│  │ NPL    50%    20%     5%     0%     0%               │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  강의 구성 템플릿                                      │ │
│  │  정보성 강의:                                          │ │
│  │  ████░░░░░░░░░░████████████░░░████░░██               │ │
│  │  후킹8% | 정보52% | 사례25% | CTA10% | 요약5%        │ │
│  │                                                      │ │
│  │  사례 강의:                                           │ │
│  │  ███░░░░████████████████████░░████░░██               │ │
│  │  후킹5% | 정보25% | 사례50% | CTA12% | 요약8%        │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 컴포넌트 구조

```typescript
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ontology/dashboard')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <Header />
      <StatsCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DomainRadar stats={stats} />
        <LevelDistribution stats={stats} />
        <LectureTypePie stats={stats} />
        <ExpertConsensus stats={stats} />
      </div>
      <CoverageMatrix stats={stats} />
      <StructureTemplates stats={stats} />
    </div>
  )
}
```

---

## 차트 상세

### 1. 글로벌 통계 카드 (StatsCards)

```typescript
function StatsCards({ stats }: { stats: DashboardStats | null }) {
  const cards = [
    { icon: BookOpen, label: '전체 개념', value: stats?.total_concepts || 0, color: 'text-purple-600' },
    { icon: Video, label: '분석 영상', value: stats?.total_videos || 0, color: 'text-blue-600' },
    { icon: TrendingUp, label: '커버리지', value: `${stats?.coverage_rate || 0}%`, color: 'text-green-600' },
    { icon: Users, label: '전문가', value: stats?.total_experts || 0, color: 'text-orange-600' },
    { icon: Link, label: '개념 매핑', value: stats?.total_mappings || 0, color: 'text-red-600' },
  ]
  // 5개 카드를 grid grid-cols-5 gap-4로 표시
}
```

### 2. 도메인 깊이 레이더 (DomainRadar)

```typescript
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts'

function DomainRadar({ stats }: { stats: DashboardStats | null }) {
  const data = (stats?.domain_stats || []).map(d => ({
    domain: d.domain_name,
    개념수: d.concept_count,
    커버된: d.covered_count,
    중요도: Math.round(d.avg_importance * 100),
  }))

  return (
    <Card>
      <CardHeader><CardTitle>도메인별 깊이 분석</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="domain" />
            <PolarRadiusAxis />
            <Radar name="전체 개념" dataKey="개념수" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
            <Radar name="커버된 개념" dataKey="커버된" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### 3. 레벨 분포 바 (LevelDistribution)

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function LevelDistribution({ stats }: { stats: DashboardStats | null }) {
  const data = (stats?.level_stats || []).map(l => ({
    level: l.level,
    전체: l.concept_count,
    커버된: l.covered_count,
  }))

  return (
    <Card>
      <CardHeader><CardTitle>레벨별 개념 분포</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="level" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="전체" fill="#E5E7EB" />
            <Bar dataKey="커버된" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### 4. 강의 유형 파이 (LectureTypePie)

```typescript
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TYPE_COLORS: Record<string, string> = {
  informational: '#3B82F6',
  case_study: '#10B981',
  hooking: '#F59E0B',
  knowhow: '#8B5CF6',
  mixed: '#6B7280'
}

const TYPE_LABELS: Record<string, string> = {
  informational: '정보성',
  case_study: '사례',
  hooking: '후킹',
  knowhow: '노하우',
  mixed: '혼합'
}

function LectureTypePie({ stats }: { stats: DashboardStats | null }) {
  const dist = stats?.lecture_type_distribution || {}
  const data = Object.entries(dist).map(([type, count]) => ({
    name: TYPE_LABELS[type] || type,
    value: count,
    color: TYPE_COLORS[type] || '#6B7280'
  }))

  return (
    <Card>
      <CardHeader><CardTitle>강의 유형 분포</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### 5. 전문가 합의도 히트맵 (ExpertConsensus)

```typescript
function ExpertConsensus({ stats }: { stats: DashboardStats | null }) {
  const topConcepts = stats?.top_concepts?.slice(0, 10) || []
  const experts = stats?.expert_list || []

  // Custom 그리드 (recharts가 아닌 div 기반)
  return (
    <Card>
      <CardHeader><CardTitle>전문가 합의도 Top 10</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">개념</th>
                <th className="text-center p-2">전문가수</th>
                <th className="text-center p-2">평균 관련도</th>
                {experts.map(e => (
                  <th key={e.channel_name} className="text-center p-2 text-xs">
                    {e.channel_name?.slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topConcepts.map(concept => (
                <tr key={concept.concept_id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{concept.concept_name || `#${concept.concept_id}`}</td>
                  <td className="text-center p-2">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                      {concept.expert_count}
                    </span>
                  </td>
                  <td className="text-center p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(concept.avg_relevance || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">{Math.round((concept.avg_relevance || 0) * 100)}%</span>
                    </div>
                  </td>
                  {experts.map(expert => {
                    const expertData = concept.experts?.find(
                      (e: any) => e.channel_name === expert.channel_name
                    )
                    return (
                      <td key={expert.channel_name} className="text-center p-2">
                        {expertData ? (
                          <div
                            className="w-8 h-8 rounded mx-auto flex items-center justify-center text-xs text-white"
                            style={{
                              backgroundColor: `rgba(139, 92, 246, ${expertData.relevance})`,
                            }}
                          >
                            {Math.round(expertData.relevance * 100)}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded mx-auto bg-gray-100" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 6. 커버리지 매트릭스 (CoverageMatrix)

```typescript
function CoverageMatrix({ stats }: { stats: DashboardStats | null }) {
  const domains = stats?.domain_stats || []
  const levels = ['왕초보', '초보', '중급', '고급', '전문가']

  // 도메인×레벨 교차 데이터는 서버에서 직접 제공하지 않으므로
  // 클라이언트에서 추가 계산 필요 → 또는 별도 API 추가
  // 현재는 domain_stats의 coverage_rate를 레벨별로 추정

  return (
    <Card>
      <CardHeader><CardTitle>커버리지 매트릭스</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">도메인</th>
                {levels.map(l => <th key={l} className="text-center p-2">{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {domains.map(domain => (
                <tr key={domain.domain_id} className="border-b">
                  <td className="p-2 font-medium">
                    <span className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: domain.color }} />
                    {domain.domain_name}
                  </td>
                  {levels.map(level => {
                    // 간단 추정: domain coverage를 레벨 순으로 감소
                    const rate = Math.max(0, domain.coverage_rate - levels.indexOf(level) * 15)
                    return (
                      <td key={level} className="text-center p-2">
                        <div
                          className="w-12 h-8 rounded mx-auto flex items-center justify-center text-xs font-medium"
                          style={{
                            backgroundColor: rate > 50 ? '#10B981' : rate > 20 ? '#F59E0B' : rate > 0 ? '#EF4444' : '#F3F4F6',
                            color: rate > 0 ? 'white' : '#9CA3AF'
                          }}
                        >
                          {rate}%
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 7. 강의 구성 템플릿 (StructureTemplates)

```typescript
const SEGMENT_COLORS: Record<string, string> = {
  hooking: '#F59E0B',
  information: '#3B82F6',
  case: '#10B981',
  cta: '#EF4444',
}

function StructureTemplates({ stats }: { stats: DashboardStats | null }) {
  const templates = stats?.structure_templates || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>강의 구성 템플릿</CardTitle>
        <CardDescription>분석된 강의들의 평균 구조</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map(tmpl => (
          <div key={tmpl.lecture_type} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{TYPE_LABELS[tmpl.lecture_type] || tmpl.lecture_type} 강의</span>
              <span className="text-xs text-gray-500">({tmpl.sample_count}개 분석)</span>
            </div>
            {/* 가로 바 */}
            <div className="flex h-6 rounded overflow-hidden">
              <div style={{ width: `${tmpl.avg_hooking * 100}%`, backgroundColor: SEGMENT_COLORS.hooking }}
                className="flex items-center justify-center text-[10px] text-white">
                {tmpl.avg_hooking > 0.05 && `후킹 ${Math.round(tmpl.avg_hooking * 100)}%`}
              </div>
              <div style={{ width: `${tmpl.avg_information * 100}%`, backgroundColor: SEGMENT_COLORS.information }}
                className="flex items-center justify-center text-[10px] text-white">
                {tmpl.avg_information > 0.1 && `정보 ${Math.round(tmpl.avg_information * 100)}%`}
              </div>
              <div style={{ width: `${tmpl.avg_case * 100}%`, backgroundColor: SEGMENT_COLORS.case }}
                className="flex items-center justify-center text-[10px] text-white">
                {tmpl.avg_case > 0.1 && `사례 ${Math.round(tmpl.avg_case * 100)}%`}
              </div>
              <div style={{ width: `${tmpl.avg_cta * 100}%`, backgroundColor: SEGMENT_COLORS.cta }}
                className="flex items-center justify-center text-[10px] text-white">
                {tmpl.avg_cta > 0.05 && `CTA ${Math.round(tmpl.avg_cta * 100)}%`}
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-gray-500">분석된 영상이 없습니다. 대본을 업로드해주세요.</p>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## recharts 임포트 정리

```typescript
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
```

---

## 검증 체크리스트

- [ ] 5개 통계 카드 정상 표시
- [ ] 레이더 차트: 5개 도메인 축 + 2개 시리즈 (전체/커버된)
- [ ] 바 차트: 5개 레벨 × 2개 바 (전체/커버된)
- [ ] 파이 차트: 강의 유형별 분포 (데이터 있을 때)
- [ ] 합의도 테이블: Top 10 개념 × 전문가별 관련도 셀
- [ ] 커버리지 매트릭스: 5×5 그리드, 색상 코딩
- [ ] 구조 템플릿 바: 유형별 4색 세그먼트
- [ ] 반응형: lg 이상에서 2열, 그 이하에서 1열
