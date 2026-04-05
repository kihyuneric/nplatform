# 글로벌 부동산 투자 온톨로지 분석 플랫폼 — 프로젝트 개요

## 1. 프로젝트 비전

유튜브 인플루언서 강의 대본을 온톨로지 엔진으로 분석하여, **전문가 지식을 구조화**하고
**세계적 수준의 부동산 투자 교육 로드맵**을 자동 생성하는 분석 플랫폼.

### 핵심 가치
- **전문가 합의도 측정**: 여러 전문가가 공통으로 강조하는 개념 = 핵심 지식
- **자동 강의 설계**: 개념 → 강의 캡슐(교안/지침/실라버스) 자동 생성
- **지식 관계 시각화**: 131+ 개념의 선수/관련/구성 관계를 인터랙티브 그래프로 표현
- **체계적 로드맵**: 왕초보→전문가 5단계 학습 경로

## 2. 현재 상태 (완성됨)

| 항목 | 현황 |
|------|------|
| Supabase DB | 7개 테이블, RLS 설정 완료 |
| 시드 데이터 | 5도메인, 131개념, 111관계, 6경로, 90단계 |
| 분석 엔진 | TF-IDF 키워드 매칭 (Phase A) |
| API 라우트 | 12개 엔드포인트 (CRUD + 분석) |
| UI 페이지 | 커리큘럼 메인 + 대본 업로드 |
| 테스트 데이터 | 2개 영상, 31개 개념 매핑 (24% 커버리지) |

## 3. 확장 아키텍처

```
[인플루언서 대본 업로드]
        │
        ▼
┌─────────────────────────────────┐
│ 강화된 분석 엔진                   │
│ ┌──────────┐ ┌──────────────┐  │
│ │ 키워드매칭 │ │ 강의유형 분류  │  │
│ │ (기존)    │ │ (신규)       │  │
│ └──────────┘ └──────────────┘  │
│ ┌──────────┐ ┌──────────────┐  │
│ │ 구조분석  │ │ 사례번호 탐지  │  │
│ │ (신규)   │ │ (신규)       │  │
│ └──────────┘ └──────────────┘  │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Supabase DB (확장)               │
│ ont_concept_importance  (신규)   │
│ ont_lecture_analysis    (신규)   │
│ ont_lecture_capsule     (신규)   │
│ ont_youtube (컬럼 추가)          │
└──────────┬──────────────────────┘
           │
     ┌─────┼─────┬──────────┐
     ▼     ▼     ▼          ▼
  로드맵  그래프  대시보드   캡슐상세
  (개편)  (신규)  (신규)    (신규)
```

## 4. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 (App Router), React 19 |
| 스타일 | Tailwind CSS 3.4, shadcn/ui (@radix-ui) |
| 애니메이션 | framer-motion |
| 차트 | recharts 2.15 |
| 그래프 시각화 | Canvas 2D + 자체 force-directed 시뮬레이션 |
| DB | Supabase (PostgreSQL), @supabase/supabase-js 2.99 |
| 인증 | anon key + RLS (service role key 미사용) |
| 아이콘 | lucide-react |

## 5. 제약 조건

- **AI API 키 없음** → 모든 분석은 키워드/패턴 기반 (Phase A)
- **Supabase anon key만 사용** → RLS 정책으로 CRUD 허용
- **기존 뉴스 크롤링 서비스와 독립** → /curriculum 경로에서 독립 운영
- **한국어 전용 UI**

## 6. 개발 스펙 문서 목록

| # | 문서 | 내용 |
|---|------|------|
| 01 | `01-database-schema.md` | DB 스키마 확장 (3테이블 + 컬럼추가 + RLS) |
| 02 | `02-transcript-analyzer.md` | 강화된 대본 분석 엔진 (유형/구조/사례) |
| 03 | `03-ontology-db-functions.md` | DB 함수 확장 (10+ 신규 함수) |
| 04 | `04-api-routes.md` | API 라우트 (5개 신규 + 2개 강화) |
| 05 | `05-knowledge-graph.md` | 인터랙티브 지식그래프 (Canvas 2D) |
| 06 | `06-dashboard.md` | 분석 대시보드 (recharts 6차트) |
| 07 | `07-curriculum-roadmap.md` | 5단계 로드맵 UI |
| 08 | `08-lecture-capsule.md` | 강의 캡슐 생성/표시 |
| 09 | `09-upload-enhancement.md` | 대본 분석 UI 강화 |
| 10 | `10-implementation-order.md` | 구현 순서 + 검증 계획 |

## 7. 파일 변경 총 목록

### 수정 파일 (7개)
1. `lib/transcript-analyzer.ts` — 4개 함수 + 5개 타입 추가
2. `lib/ontology-db.ts` — 10개 함수 + 4개 타입 추가
3. `app/api/ontology/youtube/upload/route.ts` — 강화된 분석 파이프라인
4. `app/api/ontology/graph/route.ts` — importance 데이터 추가
5. `app/curriculum/page.tsx` — 5단계 로드맵 개편
6. `app/curriculum/upload/page.tsx` — 강화된 분석 결과 UI
7. `app/curriculum/layout.tsx` — 네비게이션 확장

### 신규 파일 (11개)
1. `app/api/ontology/importance/route.ts`
2. `app/api/ontology/importance/recalculate/route.ts`
3. `app/api/ontology/capsules/route.ts`
4. `app/api/ontology/capsules/generate/route.ts`
5. `app/api/ontology/dashboard/route.ts`
6. `components/curriculum/KnowledgeGraph.tsx` (~400줄)
7. `components/curriculum/ConceptDetailPanel.tsx` (~200줄)
8. `app/curriculum/graph/page.tsx` (~250줄)
9. `app/curriculum/dashboard/page.tsx` (~350줄)
10. `app/curriculum/capsule/[conceptId]/page.tsx` (~250줄)
11. DB 마이그레이션 (Supabase MCP 실행)
