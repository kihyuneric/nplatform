# NPLatform(엔플랫폼) 프로젝트 가이드

## 정체성 (2026-08 피벗 — 이전 Phase 계획 전면 폐기)
대한민국 1%를 위한 프라이빗 NPL·급매 중개 플랫폼. (주)트랜스파머.
**철학: 공개하지 않는 것이 기능이다. 단순함이 곧 강력함이다.**
- 시장에 내놓기 전에, 조건이 맞는 매수자에게만 조용히 전달한다
- 리스트는 제한 12필드만 공개, 상세는 온라인 NDA 후
- 분석·AI는 운영자 내부 도구로만 (공개 화면 노출 금지)

## 기술 스택
- Next.js 15.3 (App Router) + React 19 + TS · Supabase (eqvpubntalikjxcjhpln, ap-northeast-2)
- 배포: Vercel `transfarmer/nplatform-private` — GitHub 미연동, `npx vercel deploy --prod --yes`
- 로컬 프로덕션 빌드는 `NODE_OPTIONS=--max-old-space-size=8192` 필요

## 서비스 구조 (이것이 전부 — 추가 금지 원칙)
```
메뉴: NPL 리스트 | NPL 매각의뢰 | 매입조건 등록 | 서비스 소개 | 공지사항
회원: 매각사/매입사/투자자/파트너 · 승인제 무료 가입 (PENDING → 관리자 승인)
루프: 매각의뢰(파일 컨시어지) → 운영자 등록·비식별화 → 리스트(10건 게이팅)
      → 매입조건 실매칭 → 관심/NDA 전자서명 → 딜 4단계(관심등록→실사→가격협의→최종계약)
관리자(/admin 8메뉴): 대시보드·접수함·회원 승인·매물·매수 수요·딜 진행·분석 마케팅·메인 지표
```
상세 운영: `docs/OPERATIONS.md` (SSoT) · 접근권한 정책: `docs/npl-intake-template-fields.md`

## SSoT 파일 (값 수정은 여기서만)
- `lib/platform-stats.ts` 공식 지표 · `lib/taxonomy.ts` 담보유형/지역/기관
- `lib/marketing-checklist.ts` 마케팅 8채널·딜 단계 · `lib/my-nav.ts` 마이 IA
- 핵심 API: `/api/v1/matching/summary`(실매칭) · `/api/v1/admin/overview`(운영 지표) · `/api/v1/listing-marketing`(체크리스트·집계·단계)

## 컨벤션·주의
- "use client" 인터랙티브 페이지 · API `/api/v1/...` · 에러 `{ error: { code, message } }`
- 리스트/폼 신규 UI는 왼쪽 정렬 · ㎡/평 전환 · McKinsey 에디토리얼 톤(잉크+일렉트릭 블루, 브랜드는 골드 nplatform)
- **PowerShell로 한글 파일 수정 금지 조건**: 반드시 `[IO.File]::ReadAllText/WriteAllText` + `UTF8Encoding(false)` (Get/Set-Content는 CP949 손상 사고 전력)
- dev 서버 HMR이 구버전을 오래 물고 있는 패턴 있음 — 검증은 typecheck + 프로덕션 빌드 기준
- typecheck 시 `.next/types` 에러는 무시 (레거시 캐시)

## 폐기 개념 (복원 금지)
딜룸·거래소·경매(자발/법원)·공개 AI 분석·Copilot·LOI·플래그·위반확정·긴급수준·정산·팀투자·커뮤니티·다국어·신고접수.
레거시 페이지 파일은 보존하되 메뉴 미노출 + 허브 URL은 redirect 처리.

## 보류 이슈
- `listing_marketing` 테이블: Supabase 관리 API 타임아웃으로 미생성 — `supabase/migrations/20260817_listing_marketing.sql` SQL Editor 수동 실행 필요
- Supabase provider(카카오/네이버) 대시보드 활성화, SUPABASE_SERVICE_ROLE_KEY 새 Vercel 프로젝트에 미등록
