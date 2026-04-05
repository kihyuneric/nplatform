# SPEC 08: 강의 캡슐 생성/표시

## 개요

**신규 파일:** `app/curriculum/capsule/[conceptId]/page.tsx` (~250줄)
**의존:** `POST /api/ontology/capsules/generate`, `GET /api/ontology/capsules`
**생성 로직:** `lib/ontology-db.ts`의 `generateCapsuleFromData()` 함수

---

## 강의 캡슐이란?

각 온톨로지 개념을 하나의 "강의 단위"로 패키징한 것.
전문가 강의 분석 데이터를 기반으로 자동 생성되며, 다음을 포함:

- **개요** — 개념의 정의와 중요성
- **교수법 가이드라인** — 레벨에 맞는 교수법 지침
- **실라버스** — 순서별 토픽, 시간 배분, 유형(이론/사례/실습/요약)
- **핵심 이론 포인트** — 반드시 다뤄야 할 핵심 내용
- **사례 참조** — 관련 경매/공매 사례번호
- **전문가 출처** — 어떤 전문가가 다뤘는지 + 관련도
- **선수 개념** — 이 강의 전에 배워야 할 것

---

## 페이지 레이아웃

```
┌──────────────────────────────────────────────────────┐
│ ← 로드맵으로 | 강의 캡슐                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📌 권리분석 강의                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐                          │
│  │🔴경매│ │ 중급  │ │ 45분 │                          │
│  └──────┘ └──────┘ └──────┘                          │
│                                                      │
│  ── 개요 ──────────────────────────────────────────  │
│  부동산 경매에서 권리분석은 낙찰 후 인수해야 할 권리를    │
│  사전에 파악하여 투자 리스크를 최소화하는 핵심 과정입니다.│
│                                                      │
│  ── 교수법 가이드라인 ─────────────────────────────── │
│  • 개념 간 연결관계 강조                               │
│  • 실전 사례 중심으로 진행                              │
│  • 예외 상황과 주의사항 상세 설명                       │
│  • 직접 분석 실습 과제 포함                             │
│                                                      │
│  ── 강의 실라버스 ────────────────────────────────── │
│  ┌────┬──────────────┬──────┬──────┬───────┐        │
│  │순서│ 주제          │ 유형  │ 시간 │ 진행바 │        │
│  ├────┼──────────────┼──────┼──────┼───────┤        │
│  │ 1  │ 권리분석 개요  │ 이론  │ 7분  │ ████  │        │
│  │ 2  │ 등기부등본     │ 이론  │ 9분  │ █████ │        │
│  │ 3  │ 말소기준권리   │ 이론  │ 9분  │ █████ │        │
│  │ 4  │ 대항력 임차인  │ 이론  │ 9분  │ █████ │        │
│  │ 5  │ 실전 사례 분석 │ 사례  │ 9분  │ █████ │        │
│  │ 6  │ 핵심 정리     │ 요약  │ 5분  │ ███   │        │
│  └────┴──────────────┴──────┴──────┴───────┘        │
│  총 시간: 45분                                        │
│                                                      │
│  ── 핵심 이론 포인트 ──────────────────────────────── │
│  ✓ 말소기준권리: 권리분석의 핵심 구성 요소                │
│  ✓ 등기부등본: 권리분석의 핵심 구성 요소                  │
│  ✓ 대항력: 권리분석의 핵심 구성 요소                     │
│  ✓ 유치권: 권리분석의 핵심 구성 요소                     │
│                                                      │
│  ── 참고 사례 ──────────────────────────────────────  │
│  📋 2024타경12345 (경매)                               │
│     "감정가 대비 70%에 낙찰, 유치권 신고..."              │
│  📋 2023타경98765 (경매)                               │
│     "이 물건은 가처분이 설정되어..."                      │
│                                                      │
│  ── 선수 개념 ──────────────────────────────────────  │
│  → 부동산 기초 용어 (왕초보)                             │
│  → 등기부등본 이해 (초보)                               │
│                                                      │
│  ── 전문가 출처 ────────────────────────────────────  │
│  👤 부동산남 (87%) ████████████████                    │
│  👤 경매왕 (65%)   ████████████                       │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ [지식그래프에서 보기]  [로드맵으로 돌아가기]           ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## 페이지 구현

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BookOpen, Clock, Users, FileText, Link2, Star } from 'lucide-react'
import type { LectureCapsuleRecord } from '@/lib/ontology-db'

// 실라버스 유형별 색상
const SYLLABUS_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  theory:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '이론' },
  case:     { bg: 'bg-green-100',  text: 'text-green-700',  label: '사례' },
  practice: { bg: 'bg-purple-100', text: 'text-purple-700', label: '실습' },
  summary:  { bg: 'bg-orange-100', text: 'text-orange-700', label: '요약' },
  quiz:     { bg: 'bg-red-100',    text: 'text-red-700',    label: '퀴즈' },
}

export default function CapsulePage() {
  const params = useParams()
  const router = useRouter()
  const conceptId = Number(params.conceptId)

  const [capsule, setCapsule] = useState<LectureCapsuleRecord | null>(null)
  const [concept, setConcept] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [conceptId])

  async function loadData() {
    setLoading(true)
    try {
      // 1. 개념 정보
      const conceptRes = await fetch(`/api/ontology/concept/${conceptId}`)
      const conceptData = await conceptRes.json()
      setConcept(conceptData)

      // 2. 기존 캡슐 확인
      const capsuleRes = await fetch(`/api/ontology/capsules?concept_id=${conceptId}`)
      const capsuleData = await capsuleRes.json()

      if (capsuleData.capsules?.length > 0) {
        setCapsule(capsuleData.capsules[0])
      } else {
        // 캡슐 없으면 자동 생성
        await generateCapsule()
      }
    } catch (err) {
      console.error('Failed to load capsule:', err)
    }
    setLoading(false)
  }

  async function generateCapsule() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ontology/capsules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId })
      })
      const data = await res.json()
      if (data.capsule) setCapsule(data.capsule)
    } catch (err) {
      console.error('Failed to generate capsule:', err)
    }
    setGenerating(false)
  }

  // ... render (레이아웃 참조)
}
```

### 섹션별 렌더링 컴포넌트

```typescript
// 실라버스 테이블
function SyllabusTable({ syllabus }: { syllabus: LectureCapsuleRecord['syllabus'] }) {
  const totalMin = syllabus.reduce((s, item) => s + item.duration_min, 0)

  return (
    <div className="space-y-2">
      {syllabus.map(item => {
        const style = SYLLABUS_TYPE_STYLES[item.type] || SYLLABUS_TYPE_STYLES.theory
        const widthPct = (item.duration_min / totalMin) * 100

        return (
          <div key={item.order} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-6">{item.order}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            <span className="text-sm font-medium flex-1">{item.topic}</span>
            <span className="text-xs text-gray-500">{item.duration_min}분</span>
            <div className="w-20 bg-gray-100 rounded-full h-2">
              <div className="bg-purple-400 rounded-full h-2"
                style={{ width: `${widthPct}%` }} />
            </div>
          </div>
        )
      })}
      <div className="border-t pt-2 text-sm text-gray-600 text-right">
        총 학습 시간: <strong>{totalMin}분</strong>
      </div>
    </div>
  )
}

// 전문가 출처
function ExpertSources({ sources }: { sources: Array<{ channel_name: string; relevance: number }> }) {
  return (
    <div className="space-y-2">
      {sources.map(expert => (
        <div key={expert.channel_name} className="flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium">{expert.channel_name}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-purple-500 rounded-full h-2"
              style={{ width: `${expert.relevance * 100}%` }} />
          </div>
          <span className="text-xs text-gray-500">{Math.round(expert.relevance * 100)}%</span>
        </div>
      ))}
      {sources.length === 0 && (
        <p className="text-sm text-gray-400">아직 전문가 데이터가 없습니다</p>
      )}
    </div>
  )
}

// 선수 개념 목록
function PrerequisiteConcepts({ concepts }: { concepts: Array<{ concept_id: number; name: string }> }) {
  const router = useRouter()
  return (
    <div className="flex flex-wrap gap-2">
      {concepts.map(c => (
        <button
          key={c.concept_id}
          onClick={() => router.push(`/curriculum/capsule/${c.concept_id}`)}
          className="text-sm px-3 py-1 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition"
        >
          → {c.name}
        </button>
      ))}
      {concepts.length === 0 && (
        <span className="text-sm text-gray-400">선수 개념 없음 (시작 개념)</span>
      )}
    </div>
  )
}
```

---

## 캡슐 자동 생성 로직 요약

`generateCapsuleFromData(conceptId)` 함수의 핵심 로직 (SPEC 03에서 상세):

1. `ont_concept` → 개념 기본 정보 (name, keywords, description, level, estimated_minutes)
2. `ont_relation` → 선수 개념 목록 (prerequisite 관계)
3. `ont_concept_importance` → 전문가 강조도
4. `ont_lecture_analysis` → 관련 영상의 사례 참조

**실라버스 생성 규칙:**
- 1번 토픽: 항상 "개요" (전체의 ~15%)
- 2~N번 토픽: keywords 배열에서 자동 생성 (각 ~12%)
- N+1번 토픽: 사례 섹션 (사례가 있으면, ~20%)
- 마지막 토픽: 항상 "핵심 정리" (~10%)

**교수법 가이드라인 템플릿 (레벨별):**
- 왕초보: 쉬운 용어, 비유, 반복
- 초보: 서류 캡처, 간단 사례, 체크리스트
- 중급: 연결관계, 실전 사례, 실습 과제
- 고급: 복잡 사례, 법률 해석, 시나리오 대응
- 전문가: 최신 판례, 리스크 관리, 멘토링

---

## 검증 체크리스트

- [ ] `/curriculum/capsule/1` 접근 → 캡슐 자동 생성 + 표시
- [ ] 실라버스 테이블 정상 렌더링
- [ ] 교수법 가이드라인 레벨별 다르게 표시
- [ ] 핵심 이론 포인트 목록 표시
- [ ] 사례 참조 표시 (있으면)
- [ ] 전문가 출처 관련도 바 표시
- [ ] 선수 개념 클릭 → 해당 캡슐 페이지로 이동
- [ ] "지식그래프에서 보기" → /curriculum/graph 이동
- [ ] "로드맵으로 돌아가기" → /curriculum 이동
- [ ] 이미 생성된 캡슐은 DB에서 로드 (재생성 안함)
