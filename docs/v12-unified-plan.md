# NPLatform v12.0 — 완전 통합 재설계 계획

> 핵심: "모든 기능이 유기적으로 연결된 하나의 생태계"
> 현재 문제: 기능이 다 따로 놀고, 연결되지 않음

---

## 1부: 통합 메뉴 체계 (2단 구조)

### 상단 네비게이션 (5개 + 우측 아이콘)

```
[N] NPLatform  | NPL마켓 | 거래매칭 | 인사이트 | 서비스 | 도구 |  [🔔] [🌐] [👤]
```

### 상세 드롭다운

#### 1. NPL 마켓
| 메뉴 | 경로 | 설명 |
|------|------|------|
| NPL 검색 | /market/search | 상세 필터 검색 |
| NPL 지도 | /market/map | 지도 기반 탐색 |
| NPL 입찰 | /market/bidding | 입찰 진행중 |
| 전체 매물 | /listings | 유형별 매물 목록 |
| 딜 브릿지 | /exchange | **통합 거래 마켓** |

→ 메인 페이지의 **3대 NPL 마켓** (임의매각/경공매/비경매)이
→ 딜 브릿지와 **직접 연결** (`/exchange?type=DISTRESSED_SALE`, `?type=AUCTION`, `?type=NON_AUCTION`)

#### 2. 거래 매칭 & 딜룸
| 메뉴 | 경로 | 설명 |
|------|------|------|
| 딜룸 | /deal-rooms | 거래 채팅/협상 |
| AI 매칭 | /matching | AI 자동 매칭 |
| 매수자 대시보드 | /buyer/dashboard | 매수자 전용 |
| 매도자 대시보드 | /seller/dashboard | 매도자 전용 |
| 내 거래 | /exchange/deals | 거래 칸반 보드 |

#### 3. 인사이트
| 메뉴 | 경로 | 설명 |
|------|------|------|
| 시장 개요 | /market-intelligence | 시장 대시보드 |
| 통계 분석 | /statistics | NPL 시장 통계 |
| 트렌드 분석 | /statistics/trend | 추세 분석 |
| 뉴스 | /news | **내부 통합 뉴스** |
| 지식센터 | /knowledge | 교육/용어사전 |

#### 4. 서비스
| 메뉴 | 경로 | 설명 |
|------|------|------|
| 커뮤니티 | /community | 투자자 커뮤니티 |
| 법률 전문가 | /professional/law | 법률 상담 |
| 세무 전문가 | /professional/tax | 세무 상담 |
| 공인중개사 | /professional/realtor | 감정평가/경매대행 |
| 전문가 등록 | /professional/register | 전문가 신청 |
| 사용 가이드 | /guide | 역할별 가이드 |

#### 5. 도구
| 메뉴 | 경로 | 설명 |
|------|------|------|
| NPL 분석 | /npl-analysis | AI NPL 분석 |
| 경매 시뮬레이터 | /tools/auction-simulator | 수익률 시뮬레이션 |
| OCR 문서인식 | /tools/ocr | 문서 스캔 |
| 실사 리포트 | /tools/due-diligence-report | AI 실사 |
| 계약서 생성 | /tools/contract-generator | 자동 계약서 |

#### 우측 아이콘
- 🔔 알림 (실시간 카운트)
- 🌐 언어 (KO/EN/JP)
- 👤 내 메뉴
  - 매수자 포털: 수요설문, 관심매물, 매물비교, AI분석이력
  - 매도자 포털: 매물등록, 포트폴리오, 펀드, 대출
  - 파트너: 추천코드, 수익, 정산
  - 전문가: 서비스관리, 상담, 수익
  - 관리자: 관리 대시보드

---

## 2부: 메인 페이지 통합 재설계

### 현재 문제
- 3대 NPL 마켓 카드가 딜 브릿지와 연결 안 됨
- 추천 매물이 관리자 설정 아님 (하드코딩)
- 분석 사례가 하드코딩

### 통합 설계

```
[히어로] — "NPL 투자, 이제 스마트하게 매칭하세요" + CTA
    ↓
[가이드 배너] — "처음이신가요?" → /guide
    ↓
[실시간 거래 피드] — LiveFeed (거래 완료 실시간)
    ↓
[3대 NPL 마켓] — 임의매각 / 경공매 / 비경매
    → 각각 /exchange?type=XXX 로 연결 (딜 브릿지와 통합)
    ↓
[추천 매물] — **관리자 설정** (api/v1/listings/featured → admin에서 관리)
    → 각 매물 "상세보기" → /exchange/{id} (딜 브릿지 상세)
    ↓
[통계 카드] — 총 매물, 거래완료, 기관수, 회원수 (AnimatedCounter)
    ↓
[분석 사례] — **관리자 설정** (api/v1/cases/featured → admin에서 관리)
    ↓
[전문가 추천] — 인기 전문가 3명 → /professional
    ↓
[서비스 허브] — 6개 서비스 카테고리 카드 → 각 서비스
    ↓
[파트너/보안] — 참여 기관, 보안 인증 배지
    ↓
[CTA] — "지금 시작하세요" + 가입 버튼
```

### 관리자에서 설정해야 하는 것들
- 추천 매물 (featured listings) → `admin/listings`에서 "추천" 토글
- 분석 사례 (featured cases) → `admin/cases`에서 관리
- 배너 → `admin/banners`에서 관리
- 공지사항 → `admin/notices`에서 관리

---

## 3부: 3대 NPL 마켓 ↔ 딜 브릿지 통합

### 핵심: 3대 마켓의 매물 = 딜 브릿지의 매각 공고

```
임의매각 ──→ /exchange?type=DISTRESSED_SALE
경공매   ──→ /exchange?type=AUCTION_NPL
비경매   ──→ /exchange?type=NON_AUCTION_NPL
```

### deal_listings 테이블에 listing_type 필드 활용
- `DISTRESSED_SALE` = 임의매각
- `AUCTION_NPL` = 경공매
- `NON_AUCTION_NPL` = 비경매

### 딜 브릿지 메인에 타입별 탭/필터 추가
```
[전체] [임의매각] [경공매] [비경매]
```

### 수정 파일
- `exchange/page.tsx` — listing_type 탭/필터 추가
- `page.tsx` (메인) — 3대 마켓 카드 → /exchange?type=XXX 링크
- `api/v1/exchange/listings/route.ts` — type 파라미터 지원

---

## 4부: 푸터 통합

### 현재: 5컬럼 (NPL 마켓 / 거래 매칭 & 분석 / 커뮤니티 & 전문 서비스 / 매수자 & 매도자)
### 통합: 6컬럼

```
NPLatform          NPL 마켓        거래 & 딜룸      서비스 & 전문가    인사이트        고객지원
────────          ────────        ──────────      ────────────    ─────────      ────────
회사 소개          NPL 검색        딜 브릿지        전문가 찾기       시장 개요       공지사항
                  NPL 지도        AI 매칭          법률 전문가       통계 분석       고객센터
                  NPL 입찰        딜룸             세무 전문가       뉴스           요금제
                  전체 매물        매수자 포털       공인중개사        지식센터        사용 가이드
                                 매도자 포털       커뮤니티          트렌드 분석      서비스 소개

────────────────────────────────────────────────────────────────────────────────
© 2026 TransFarmer Inc. | 이용약관 | 개인정보처리방침 | NPLatform v12.0
```

---

## 5부: 실행 순서

### Step 1: 네비게이션 + 푸터 재구성
- `navigation.tsx` — 5개 드롭다운으로 변경
- `footer.tsx` — 6컬럼으로 변경
- `mobile-tab-bar.tsx` — 5개 탭 매칭
- `mobile-drawer.tsx` — 5개 섹션

### Step 2: 메인 페이지 통합
- `page.tsx` — 3대 마켓 → /exchange?type=XXX 연결
- `page.tsx` — 추천 매물 API 연동
- `page.tsx` — 분석 사례 API 연동

### Step 3: 딜 브릿지 3대 마켓 통합
- `exchange/page.tsx` — listing_type 탭/필터
- `api/v1/exchange/listings/route.ts` — type 파라미터

### Step 4: 뉴스 내부 통합
- `news/[id]/page.tsx` — 뉴스 상세 (내부 표시)
- `news/page.tsx` — 외부 링크 → 내부 이동

### Step 5: 관리자 추천/사례 관리
- `admin/listings` — "추천 매물" 토글
- `admin/cases/page.tsx` — 분석 사례 관리 (신규)
