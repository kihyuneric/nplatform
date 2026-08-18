# NPLatform

> AI 기반 NPL(부실채권) 투자 분석 및 거래 플랫폼
> (주)트랜스파머 · TransFarmer Inc.

[![Production](https://img.shields.io/badge/production-READY-success)](https://nplatform-pi.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-green)](https://supabase.com)

---

## ⚡ Quick Start

### 1. 의존성 설치

```bash
# Node 20.x LTS + pnpm 10.x 필요
pnpm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 편집 → 필수 키 입력 (Supabase URL · Claude API · Voyage AI 등)
```

**필수 환경변수** (`.env.example` 의 첫 8개):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- `ADMIN_SECRET`
- `NEXT_PUBLIC_BASE_URL` (개발: `http://localhost:3000`)
- `NEXT_PUBLIC_KAKAO_MAPS_KEY`

### 3. 로컬 dev 서버 시작

```bash
pnpm dev
# → http://localhost:3000
```

### 4. 테스트 / 빌드

```bash
pnpm lint                      # ESLint
npx tsc --noEmit               # TypeScript 검증
pnpm vitest                    # 단위 테스트
pnpm exec playwright test      # E2E (chromium + mobile)
pnpm build                     # 프로덕션 빌드
```

---

## 📦 기술 스택

| 계층 | 기술 |
|---|---|
| 프레임워크 | Next.js 15.3 (App Router) |
| 언어 | TypeScript 5 (strict) |
| UI | shadcn/ui + Tailwind CSS + Framer Motion |
| 상태 | @tanstack/react-query |
| DB/Auth | Supabase (Postgres + RLS + Realtime + Storage) |
| AI 추론 | Claude API (claude-sonnet-4-5) |
| 임베딩 | Voyage AI (voyage-multilingual-2) + pgvector |
| 차트/지도 | Recharts + Kakao Maps SDK |
| 모니터링 | Sentry (Phase 2 활성화) |
| 테스트 | Vitest + Playwright |
| 호스팅 | Vercel |

---

## 🗂️ 프로젝트 구조

```
nplatform/
├── app/
│   ├── (main)/             # 메인 라우트 (3-tier nav)
│   │   ├── exchange/       # 거래소 (매물 등록·탐색·경매·포트폴리오)
│   │   ├── analysis/       # NPL 분석 (4 모드 토글)
│   │   ├── deals/          # 딜룸 (VDR · 계약 · 에스크로)
│   │   ├── my/             # 마이페이지
│   │   └── admin/          # 관리자
│   ├── (auth)/             # 로그인/회원가입
│   ├── (payment)/          # 결제 처리
│   └── api/v1/             # 백엔드 (275+ routes)
├── components/             # 공용 UI (216+)
├── lib/                    # 도메인 로직
│   ├── xrf/                # XRF Vehicle 계산 엔진
│   ├── npl/                # NPL 분석 / 통합 리포트
│   ├── ai/                 # Claude Copilot + Tool Use
│   ├── ml/                 # LightGBM · XGBoost 어댑터
│   ├── ocr/                # Google Document AI
│   ├── audit/              # SOC2 감사 로그
│   ├── contract/           # DocuSign
│   ├── escrow/             # KB 에스크로
│   ├── fraud/              # 입찰 이상탐지
│   ├── vdr/                # 실사 자료실
│   ├── fx/                 # 환율 동적 fetcher
│   ├── i18n/               # 다국어 (KO/EN/JA)
│   ├── realtime/           # WebSocket 입찰
│   └── ...
├── scripts/
│   └── rag/                # RAG seed
├── supabase/
│   └── migrations/         # 21개 SQL
├── docs/                   # 종합기획서·RAG·모바일 가이드
└── public/                 # 정적 자산 + manifest.json (PWA)
```

---

## 🔑 핵심 모듈

### NPL/XRF 4모드 분석 (`/analysis/report`)

`lib/xrf/valuation.ts` — Tier 자동 선정 + LP ROI/IRR 계산
- **NPL Valuation** — 자체 ROI (`investment.roi`)
- **XRF RWA** — LP 실투자 기준 displayRoi
- **XRF Admin** — 4-tier 비교 + Fund Metrics
- **XRF 터미널** — Bloomberg-style + 다국어 + DPU 시뮬레이터

### 3개 샘플 케이스 (즉시 체험)

- 송파 잠실동 — `http://localhost:3000/analysis/report`
- 종로 홍지동 — `http://localhost:3000/analysis/report?listingId=lst-jongno-hongji`
- 강남 신사동 — `http://localhost:3000/analysis/report?listingId=lst-gangnam-sinsa-retail`

### 통합 폼 (3 모드 공유)

`components/npl/unified-listing-form/` — 매물등록 · 자발적경매 · NPL분석 한 컴포넌트
- `mode="SELL"` / `"AUCTION"` / `"ANALYSIS"` prop 으로 분기
- OCR 자동 채움 · 다중 주소 · 특수조건 V2

---

## 🚀 배포

### Production (Vercel)

```bash
# main 브랜치 자동 배포 (Vercel Git Integration)
git push origin main

# 또는 수동
npx vercel deploy --prod
```

### 워크플로우

```
feat/branch → 개발 → 커밋 → 푸시
              ↓
       main 으로 ff-merge
              ↓
       git push origin main
              ↓
       Vercel 자동 빌드/배포
              ↓
       https://nplatform-pi.vercel.app
```

---

## 📚 문서

| 문서 | 위치 |
|---|---|
| **개발자 가이드 v2.0** | `NPLatform_Developer_Guide.docx` (별도 제공) |
| 종합 기술 계획서 | `docs/NPLatform_종합기술계획서_2026.md` |
| Phase 로드맵 v2 | `docs/NPLatform_Development_Phases_Plan.md` |
| RAG 가이드 | `docs/rag/README.md` |
| 모바일 셋업 | `docs/MOBILE_APP_SETUP.md` |
| 통합 폼 모듈 | `docs/NPLatform_UnifiedForm_Module_Plan_2026Q2.md` |
| Claude 지침 | `CLAUDE.md` |

---

## 🧪 테스트

```bash
# 단위 테스트
pnpm vitest                    # 전체
pnpm vitest lib/xrf            # 특정 영역
pnpm vitest --coverage         # 커버리지

# E2E
pnpm exec playwright test
pnpm exec playwright test --project=mobile
```

테스트 위치:
- `lib/xrf/__tests__/valuation.test.ts` (BASE/REJECT tier · 엣지)
- `lib/xrf/__tests__/metrics.test.ts` (XIRR 수렴)
- `e2e/*.spec.ts` (5 specs)

---

## 🌐 환율 운영

```bash
# 현재 환율 조회
curl https://nplatform-pi.vercel.app/api/v1/fx/rate

# 캐시 강제 갱신 (admin)
curl -X POST https://nplatform-pi.vercel.app/api/v1/fx/rate \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

우선순위: `input` > **EXIM** (한국수출입은행) > **ER-API** > `NEXT_PUBLIC_KRW_USD_RATE` > 1300

---

## 🎯 개발 Phase 로드맵

- **Phase 1** (완료) — Deal Flow 가시성
- **Phase 2** (Q2~Q3 2026) — OCR 95% · KAMCO/MOLIT · 본인인증
- **Phase 3** (Q3 2026) — RAG 5K · NDA · VDR · Copilot Tool Use
- **Phase 4** (Q3~Q4 2026) — DocuSign · KB 에스크로 · 세금계산서
- **Phase 5** (Q4 2026~Q1 2027) — LightGBM · XGBoost · WebSocket · Fraud · 80% 커버리지
- **Phase 6** (Q1~Q2 2027) — Enterprise · 모바일 · i18n 정식 · SOC2

자세한 절차는 `docs/NPLatform_Development_Phases_Plan.md` 참조.

---

## 📞 연락

- **Production**: https://nplatform-pi.vercel.app
- **Repo**: 비공개 (사내 GitHub)
- **소유자**: (주)트랜스파머 TransFarmer Inc.

---

## 📜 라이선스

© 2026 TransFarmer Inc. All rights reserved.
본 코드베이스는 사내 기밀이며 무단 복제·배포를 금합니다.
