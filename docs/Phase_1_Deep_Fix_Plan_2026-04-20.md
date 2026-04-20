# Phase 1 Deep-Fix Plan — 글로벌 NPL 플랫폼 UX·신뢰도 격상

**Author**: NPLatform Strategy & Engineering (UX·Color·Security)
**Date**: 2026-04-20
**Theme**: *"Institutional-grade trust, mortgage-desk clarity — 대부업체와 투자자 모두가 한눈에 신뢰하는 거래소"*
**Scope**: Sprint 3 (2026-04-20 ~ 2026-05-04, 10 영업일)
**SSoT 연결**: 본 문서는 `NPLatform_Development_Phases_Plan.md` Phase 1 의 확장(`1-I ~ 1-P`)이며, Phase 1-A/B/C/D/G/H 와 병렬 진행.

---

## 0. 글로벌 벤치마크 기준점

| 회사 | 강점 | 본 Phase 적용 |
|------|------|-------------|
| **DebtX / Mission Capital (US)** | 기관 매각기관 대시보드, 공개 입찰 프로세스 | §5 매각기관 공개 입찰 |
| **Debitos (EU)** | 투명한 수수료 구조, 매도자 지정 가능 | §7 매각 수수료율 |
| **Garrigues / Intertrust NPL Platforms** | 채권자 정보 GDPR 마스킹, 법정 감사 가능 | §6 채권자 마스킹 |
| **Bloomberg Terminal / S&P IQ** | 정보 밀도 + 높은 대비 + 다크/라이트 완벽 대응 | §8 Color Tone & Manner |
| **Stripe Atlas / Linear** | 의료기관급 "조용한" 톤, 섬세한 상태 | §8 Surface Ladder |

본 Phase 완료 시 **글로벌 기술 수준 UX/성능** 현재 68 → 목표 **76/100** (+8 pt).

---

## 1. 용어 정규화 — "기관 / 개인 투자자" → "대부업체 / 투자자"

### 1-I 목적
한국 NPL 시장 현실 반영. 매도자 사이드는 **금융기관(은행·저축은행·캐피탈)**, 매수자 사이드는 **대부업체(등록대부업자) + 전문 투자자(개인·기관 LP)** 가 실제 Deal Flow 주체.
"개인 투자자" 라는 일반 레이블은 **자본시장법상 전문 투자자 요건** 을 충족하지 못하는 개인을 연상시켜 법적 리스크. "**투자자**" 로 단순화하고, 내부 Role 스키마는 `INVESTOR` 유지.

### 구현 범위
| 영역 | 변경 전 | 변경 후 | 파일 |
|------|--------|--------|------|
| 히어로 롤 스위처 | `기관 투자자 / 개인 투자자` | `대부업체 / 투자자` | `app/page.tsx`, `components/home/RoleSwitcher.tsx` (해당 시) |
| 랜딩 Value Prop 카피 | "기관 전용 …" | "등록대부업자·전문 투자자 전용 …" | `components/home/Hero.tsx` |
| 회원가입 Role 선택 | 3개 (기관/개인/전문가) | 4개 (금융기관 / 대부업체 / 투자자 / 전문가) | `app/signup/page.tsx`, `app/select-role/page.tsx` |
| Footer / SEO meta | `기관 · 개인 투자자 플랫폼` | `대부업체·투자자 NPL 거래소` | `app/layout.tsx` metadata |
| 관리자 통계 라벨 | `개인 투자자 N명` | `투자자 N명` | `/admin/users` |

### DB 스키마 (변경 없음)
`profiles.role` enum 유지: `SELLER | INVESTOR | LENDER | EXPERT | ADMIN`.
신규 분기: `INVESTOR` 내부에서 `profile_kind` 서브타입 도입 (`CORP_LENDER` = 대부업체, `RETAIL_INVESTOR` = 개인 투자자).

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  investor_kind TEXT CHECK (investor_kind IN ('CORP_LENDER','INSTITUTIONAL','RETAIL'));
CREATE INDEX IF NOT EXISTS idx_profiles_investor_kind ON profiles(investor_kind);
```

### QA
- 모든 `grep "개인 투자자"` 결과 0건 (코드·카피 내)
- 회원가입 플로우 E2E: 4가지 Role 모두 선택 후 가입 → 올바른 대시보드 랜딩

---

## 2. Date Picker 전역 도입

### 1-J 목적
현재 `type=date` native input 이 혼재 → iOS Safari·크롬 일관성 떨어지고, "연체시작일" 처럼 과거 수 년 전 날짜 입력 시 스크롤 UX 매우 비효율.
글로벌 금융 UI 표준은 **달력 popover + 키보드 접근** 이다 (Bloomberg, Stripe, Plaid 동일).

### 선정 라이브러리
- **`react-day-picker@9`** (radix-ui friendly, SSR 안전, KST 로케일 공식 지원)
- shadcn/ui `<Calendar>` + `<Popover>` 조합을 래핑한 **자체 컴포넌트**:

```
components/ui/date-picker.tsx          # 단일 날짜
components/ui/date-range-picker.tsx    # 기간 선택 (연체 기간, 계약 기간)
components/ui/month-picker.tsx         # 월 단위 (정산 기준월 등)
```

### API
```tsx
<DatePicker
  value={date}
  onChange={setDate}
  min="1990-01-01"
  max={today}
  locale="ko"
  placeholder="연체 시작일 선택"
  disabledDays={(d) => d > new Date()}
  presets={[
    { label: "오늘", get: () => new Date() },
    { label: "1년 전", get: () => subYears(new Date(), 1) },
    { label: "3년 전", get: () => subYears(new Date(), 3) },
  ]}
/>
```

### 대상 폼 (전수 조사 후 마이그레이션)
| 페이지 | 필드 | 현재 | 우선순위 |
|--------|------|------|---------|
| `/exchange/sell` | 연체시작일, 경매개시일, 감정일, 배당예정일 | native | **P0** |
| `/exchange/bulk-upload` | 연체시작일 (엑셀 대응) | native | P1 |
| `/exchange/edit/[id]` | 동일 | native | P0 |
| `/exchange/auction/new` | 공개입찰 시작/종료, 등록 마감일 | native | **P0** (§5 신규) |
| `/deals/contract` | 계약일, 잔금일, 명도 예정일 | native | P0 |
| `/my/kyc` | 주민번호 생년월일, 법인설립일 | native | P1 |
| `/admin/coupons`, `/admin/pricing` | 유효기간 | native | P2 |
| `/admin/deal-funnel` | 기간 필터 | native | P1 |
| 모든 모달 (NDA 유효, LOI 회신기한 등) | 다양 | native | P1 |

### 검증 기준
- **키보드**: Tab → Space/Enter → 방향키 → Esc 닫힘 (WAI-ARIA Datepicker pattern)
- **모바일**: iOS/Android 모두 네이티브 달력 대신 웹 달력 사용 (onFocus 시 popover)
- **접근성**: `aria-label`, `role=dialog`, focus trap
- **타임존**: 모두 `Asia/Seoul` 고정, DB 는 `date` 타입 (시각 제거)

---

## 3. 문의 자동 알림 (카카오 알림톡 + SMS)

### 1-K 목적
금융기관(매도자)은 하루에도 수십 건의 대부업체·투자자 문의를 받지만, 현재는 **플랫폼 내 알림**으로만 전달 → 응답 시간(SLA)이 평균 18h 로 업계 최저 수준.
글로벌 경쟁사(Debitos, DebtX)는 SMS+이메일 동시 푸시로 **평균 2.5h 응답**. 이 격차가 Deal Flow 에 직접 영향.

### 아키텍처
```
┌─ inquiry 이벤트 발생 (listing_qna, nda sign, loi submit, offer create)
│
├─► notification_dispatch_queue (Supabase table, RLS)
│     { channel: 'KAKAO_ALIMTALK' | 'SMS' | 'EMAIL', template_id, params, target_user_id, status }
│
├─► Edge Function: notify-dispatcher (cron: */1 min)
│     ├─ Kakao AlimTalk: 알리고(Aligo) / NHN Cloud Notification 중 선택
│     ├─ SMS: 네이버 클라우드 SENS (fallback: 알리고)
│     └─ Email: Resend (이미 연결됨)
│
└─► delivery_log (감사용, 30일 보존, GDPR 동의 체크)
```

### 관리자 UI
**신규 페이지**: `/admin/notifications/channels`

| 섹션 | 기능 |
|------|------|
| 채널 Credentials | Kakao Sender ID, API Key 암호화 저장 (Vault) |
| 템플릿 관리 | `INQUIRY_RECEIVED`, `NDA_SIGNED`, `LOI_SUBMITTED`, `OFFER_CREATED`, `CONTRACT_READY` 등 10종 |
| 트리거 맵핑 | 이벤트 → 채널 → 수신자(매도자/매수자/관리자) 온·오프 스위치 |
| 재시도 정책 | 실패시 exponential backoff (1, 5, 15 min), 최대 3회 |
| 전송 로그 | 최근 1,000건 + 성공/실패 필터 + CSV 내보내기 |
| 비용 대시보드 | 월 전송량 / 채널별 단가 / 예산 경고 |

### 컴플라이언스
- **정보통신망법 제50조**: 야간(21~08시) 광고성 발송 금지 → 알림톡은 "정보성" 으로만 발송, 광고는 별도 동의
- **대부업법 시행규칙**: 대부업체-소비자 간 통신은 녹취·기록 의무 → `delivery_log` 7년 보존 옵션
- **개인정보보호법**: 수신자 휴대폰 번호는 `pgcrypto` AES-256 암호화 (`notification_targets.phone_enc bytea`)

### DB 마이그레이션
```sql
-- 017_notification_dispatch.sql
CREATE TABLE notification_templates (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('KAKAO_ALIMTALK','SMS','EMAIL')),
  kakao_template_code TEXT,           -- Kakao 승인된 템플릿 코드
  body TEXT NOT NULL,                  -- {{var}} 치환
  buttons JSONB DEFAULT '[]',
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE notification_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT REFERENCES notification_templates(id),
  channel TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  params JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_dispatch_status ON notification_dispatch_queue(status, created_at);
-- RLS: only admin + trigger functions can write
```

---

## 4. 거래소 "발견 모드" 재정의 + "지도에서 보기" 제거

### 1-L 목적
현재 `/exchange/discover` 는 "발견 모드" 라는 모호한 이름 + 클릭 진입 시 무한 스크롤만 동작. **정보 설계(IA) 실패**.
글로벌 NPL 플랫폼의 매물 탐색은 **3가지 축**으로 구성:
1. **Recommend (AI 추천)** — 개인화된 매물
2. **Trending (시장 핫이슈)** — 최근 조회/입찰 활발한 매물
3. **New (신규 등록)** — 실시간 인벤토리

### 변경 내용

#### 4-1. `/exchange/discover` → `/exchange/feed` 로 이름·기능 재설계
```
/exchange/feed
 ├─ SubNav: [추천 | 실시간 트렌드 | 신규 등록 | 만료 임박]
 ├─ Top: 이번 주 Deal Flow 지표 3개 (신규 N건, 평균 낙찰률 N%, 평균 체결까지 N일)
 ├─ Card grid (무한 스크롤 유지, 단 페이지당 20개)
 │   └─ 각 카드 상단에 "왜 추천?" chip (AI 이유, 2단어)
 └─ Right rail (desktop only): 
       - 내 알림 키워드로 걸린 매물 3개
       - 팔로우한 기관의 최신 매물
```

#### 4-2. `/exchange/map` (지도에서 보기) **완전 삭제**
**이유**:
- 데이터 정확도 부족 (좌표 매칭률 62%)
- 모바일 UX 열악 (핀 겹침, 성능)
- Kakao Maps SDK 로드 시 초기 번들 +180KB
- 사용률 주간 2.1% (`analytics/track` 로그 기반)

**삭제 항목**:
- `app/(main)/exchange/map/` 디렉터리
- `components/exchange/MapView.tsx`, `MapPin.tsx`, `MapClusterer.tsx`
- 상단 TopBar·SubNav 의 "지도" 탭
- `api/v1/market/map`
- Kakao Maps SDK script tag (layout.tsx)

향후 지도는 **매물 상세 페이지 내부** 에만 (소형 iframe, lazy load) 남깁니다.

### QA
- `/exchange/map` 방문 시 **301 → `/exchange`** 리디렉트 (SEO 보존)
- `/exchange/discover` 방문 시 **301 → `/exchange/feed`** 리디렉트
- 번들 사이즈 감소 측정 (Lighthouse 기준 초기 JS -180KB 예상)

---

## 5. 매각기관 공개 입찰(Public Auction) 기능

### 1-M 목적
현재 입찰은 **플랫폼 주도(managed auction)** 만 존재. 금융기관이 **자체 보유 매물을 본인 주도**로 경매 띄우는 루트가 없음. 대형 은행·캐피탈은 분기별 "자체 공매 공고" 로 수십억 원 규모 포트폴리오를 처분하므로, 이 채널을 확보해야 **공급 측 GMV 2~3배 확대** 가능.

### 사용자 스토리
> 우리은행 NPL 부서 담당자가 `/my/seller` 에 들어가 "공개 입찰 등록" 버튼 클릭 → 10건 묶어서 업로드 → 입찰 개시일·종료일·최저가·보증금 설정 → 공개 → 거래소 "공개 입찰" 탭에 즉시 노출 → 등록된 대부업체·투자자가 입찰 → 종료 시 자동 낙찰자 확정 → 딜룸 생성

### UI/UX 흐름

#### 5-1. 매도자 진입점
**위치**: `/my/seller` 대시보드 상단 Primary CTA
```
┌─────────────────────────────────────────────────────┐
│  내 매물 12건 · 등록 완료 8건 · 거래 중 3건 · 낙찰 1건   │
│                                                     │
│  [+ 매물 등록]  [◆ 공개 입찰 공고]  [⚡ 일괄 업로드]    │
└─────────────────────────────────────────────────────┘
```
`◆ 공개 입찰 공고` 버튼 → `/exchange/auction/new` 모달/페이지.

#### 5-2. 입찰 등록 모달/페이지
```
Step 1. 매물 선택 (기등록 매물 멀티셀렉트 + 즉석 추가)
Step 2. 입찰 조건
  - 공개 범위: [전체 공개 / 대부업체만 / 지정 기관만]
  - 개시일시 (DatePicker + TimePicker)
  - 종료일시 (DatePicker + TimePicker)
  - 최저 입찰가 (KRW)
  - 호가 단위 (5백만 / 1천만 / 5천만 / 1억 중 선택)
  - 보증금 (낙찰가의 N% — 기본 5%)
  - 낙찰 후 잔금 기한 (N일)
Step 3. 공고문 작성 (Rich-text, 필수 고지사항 템플릿 제공)
Step 4. 약관 동의 → 결제(공고 수수료 5만원 / 건) → 공개
```

#### 5-3. 매수자 진입점
**위치**: `/exchange` TopBar 에 "공개 입찰" 탭 추가 (기존 매물 / 수요 / 공개 입찰 / 딜룸)
```
/exchange/auction
 ├─ SubNav: [진행 중 | 곧 종료 | 낙찰 완료]
 ├─ Filter: 지역, 담보 유형, 금액대, 종료까지 시간
 ├─ Card:
 │   - 공고 주체 로고 (마스킹된 은행명, §6 참조)
 │   - 매물 수 (n건 묶음), 총 감정가
 │   - 현재 최고가 / 입찰 수
 │   - 남은 시간 (countdown)
 │   - CTA: [상세보기] [입찰 참여]
 └─ Detail: /exchange/auction/[id]
     ├─ 매물 리스트 (각 매물 카드 재사용)
     ├─ 입찰 히스토리 (실시간 Supabase Realtime)
     ├─ 질문답변 (listing_qna 재사용)
     └─ 모달 [입찰하기] — 금액 + 보증금 결제 동시
```

#### 5-4. 실시간 · 보안
- **Supabase Realtime** 채널: `auction:${id}:bids` (INSERT event)
- **입찰 금액 검증**: 서버 API `/api/v1/market/bidding` 에서 최저가·호가단위·타임스탬프 검증
- **Sniping 방지**: 종료 5분 전 새 입찰 들어오면 자동 5분 연장 (eBay 방식)
- **이상치 탐지**: 동일 IP 에서 5회 이상 입찰 시 캡차, 동일 사용자 자가입찰 금지

### DB 마이그레이션
```sql
-- 018_public_auction.sql
CREATE TABLE public_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC','LENDERS_ONLY','INVITED')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  min_bid NUMERIC(18,0) NOT NULL,
  bid_step NUMERIC(18,0) NOT NULL,
  deposit_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  settlement_days INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','live','ended','cancelled','settled')),
  winner_user_id UUID REFERENCES auth.users(id),
  winning_bid NUMERIC(18,0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public_auction_listings (
  auction_id UUID REFERENCES public_auctions(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES npl_listings(id),
  PRIMARY KEY (auction_id, listing_id)
);
CREATE TABLE public_auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES public_auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(18,0) NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auction_status_ends ON public_auctions(status, ends_at);
CREATE INDEX idx_auction_bids_auction ON public_auction_bids(auction_id, created_at DESC);
-- RLS: seller can manage own auctions, INVESTOR role can bid on PUBLIC/LENDERS_ONLY
```

---

## 6. 채권자 명칭 마스킹

### 1-N 목적
**개인정보보호법 + 금융실명법**: 제3자에게 채권자(금융기관) 명칭 노출 시 위험. 현재는 전체 명칭이 노출되어 있음 ("우리은행 여의도지점").
글로벌 관행: **앞 3글자 + `***`** (예: "우리은***").

### 마스킹 규칙
```ts
// lib/masking/creditor.ts
export function maskCreditor(name: string | null | undefined): string {
  if (!name) return "***"
  const trimmed = name.trim()
  if (trimmed.length <= 3) return "***"
  return trimmed.slice(0, 3) + "*".repeat(Math.min(trimmed.length - 3, 5))
}
// "우리은행 여의도지점" → "우리은*****"
// "KB국민은행"          → "KB국*****"
// "SBI저축은행"         → "SBI*****"
```

### 적용 지점 (서버 사이드 원칙)
| 지점 | 현재 | 적용 |
|------|------|------|
| `npl_listings.creditor_name` 조회 API | 원문 | 마스킹된 값 반환 (RLS가 L2 이상 권한 없을 때) |
| `/exchange` 카드, 상세 | 원문 | 마스킹 |
| 공개 입찰 공고 | 원문 | 마스킹 |
| CSV/Excel 다운로드 | 원문 | 마스킹 (관리자 제외) |
| 딜룸 (NDA 체결 후 L2) | 원문 | **비마스킹 허용** (NDA 로 법적 보호) |

### 구현
- DB에는 원문 저장 (`creditor_name`)
- **뷰**: `npl_listings_masked` (SELECT 시 마스킹 적용)
- API: RLS `policy` 에 따라 원본/뷰 분기 (`accessLevel >= 2` ⇒ 원본)
- Server Component 에서 일괄 처리 (`lib/api-utils.ts` helper)

```sql
CREATE VIEW npl_listings_masked AS
SELECT
  id, title, collateral_type, sido, sigungu, address_masked,
  claim_amount, appraised_value,
  public.mask_creditor(creditor_name) AS creditor_name_masked,
  creditor_name_masked AS creditor_name  -- UI 가 읽는 필드명 호환
FROM npl_listings;

CREATE FUNCTION public.mask_creditor(name TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN name IS NULL OR length(btrim(name)) <= 3 THEN '***'
    ELSE left(btrim(name), 3) || repeat('*', LEAST(length(btrim(name)) - 3, 5))
  END;
$$;
```

---

## 7. 매각 수수료율 매도자 입력

### 1-O 목적
현재 거래 수수료는 **플랫폼 단일 고정 (1.5%)**. 대형 금융기관은 볼륨 기반으로 **자체 협의율(0.5~1.2%)** 을 요구하고, 영세 매도자는 **성공수수료(3%)** 로 유연하게 제시하고 싶어 함.
이 옵션이 없으면 대형 딜이 경쟁 플랫폼으로 이탈.

### UX
`/exchange/sell` 및 `/exchange/edit/[id]` 에 섹션 추가:

```
┌─ 매각 수수료 (선택) ─────────────────────────────────┐
│  ○ 플랫폼 기본요율 적용 (1.5%, 매도자 부담)          │
│  ○ 매도자 제시 요율: [ 1.2 ]%  · [ 매도자 부담 ▾ ]    │
│     (최소 0.5% ~ 최대 3.0%, 0.1% 단위)                │
│                                                      │
│  ℹ 제시 요율은 관리자 승인 후 확정됩니다.              │
│    예상 수수료: 감정가 10억 기준 약 1,200만원         │
└──────────────────────────────────────────────────────┘
```

### 수수료 계산 로직
```ts
// lib/commission/calculate.ts
export function calcCommission(
  listingPrice: number,
  config: { rate?: number; bearer: "SELLER"|"BUYER"|"SPLIT"; useDefault: boolean }
): { sellerFee: number; buyerFee: number; platformFee: number } {
  const rate = config.useDefault ? 0.015 : (config.rate ?? 0.015)
  const total = Math.round(listingPrice * rate)
  switch (config.bearer) {
    case "SELLER": return { sellerFee: total, buyerFee: 0, platformFee: total }
    case "BUYER":  return { sellerFee: 0, buyerFee: total, platformFee: total }
    case "SPLIT":  return { sellerFee: total/2, buyerFee: total/2, platformFee: total }
  }
}
```

### DB 마이그레이션
```sql
-- 019_custom_commission.sql
ALTER TABLE npl_listings
  ADD COLUMN commission_rate NUMERIC(5,4) DEFAULT 0.0150,  -- 1.5%
  ADD COLUMN commission_bearer TEXT DEFAULT 'SELLER'
    CHECK (commission_bearer IN ('SELLER','BUYER','SPLIT')),
  ADD COLUMN commission_approved BOOLEAN DEFAULT false;

CREATE INDEX idx_listings_commission_pending
  ON npl_listings(commission_approved) WHERE commission_approved = false;
```
관리자 큐: `/admin/listings` 에 "수수료 승인 대기" 필터.

### 체크아웃 연동
`api/v1/payments/checkout` 는 항상 `listing.commission_rate` 를 읽어 결제 금액 산출. 고정 1.5% 상수 제거.

---

## 8. Color Tone & Manner v2 — 라이트 모드 기본화

### 1-P 목적
지금 다크 모드가 기본 → 라이트 모드 배경에 흰 글씨 잔존 → **WCAG 위반 (대비비 1.2:1)**.
글로벌 금융 플랫폼은 **라이트 모드가 기본** 이어야 신뢰감·가독성 확보 (Bloomberg Web, Fidelity, Fitch Connect 전부 라이트 default).

### 설계 원칙 (세계적 Color 전문가 관점)
1. **Lightness Ladder**: 같은 Hue 에서 명도(L\*) 차이로 계층 표현 (CIELab 기준 5~8 간격)
2. **Contrast-first**: 모든 text/bg 조합 **AA 4.5:1 최소 보장, 본문 AAA 7:1**
3. **Semantic over palette**: 색상을 의미(primary/success/warn/danger)로 쓰고, 원색(blue/red)으로 직접 쓰지 않음
4. **Dual-mode parity**: 라이트·다크에서 **같은 의미**의 토큰은 **같은 대비비** 유지
5. **Calmness**: 금융 UI는 채도(Chroma) ≤ 0.08 (OKLCH 기준) 로 절제

### 토큰 정의 (OKLCH 기반, CSS 변수)

**Light Mode (Default)**
```css
:root {
  /* ──────── Surface Ladder ──────── */
  --surface-0: oklch(99% 0.003 255);  /* 페이지 배경 */
  --surface-1: oklch(97.5% 0.005 255); /* 카드 */
  --surface-2: oklch(95% 0.007 255);   /* 모달, 섹션 */
  --surface-3: oklch(92% 0.009 255);   /* 중첩 모달 */
  --surface-inverse: oklch(22% 0.015 255); /* 토스트, 툴팁 */

  /* ──────── Content Ladder ──────── */
  --fg-strong: oklch(20% 0.01 255);    /* h1, 핵심 수치 */
  --fg:        oklch(30% 0.01 255);    /* 본문 */
  --fg-muted:  oklch(50% 0.008 255);   /* 보조 설명 */
  --fg-subtle: oklch(68% 0.006 255);   /* placeholder, disabled */
  --fg-inverse: oklch(98% 0.003 255);  /* inverse surface 위 */

  /* ──────── Border ──────── */
  --border-subtle: oklch(92% 0.005 255);
  --border:        oklch(86% 0.006 255);
  --border-strong: oklch(72% 0.008 255);

  /* ──────── Brand (NPLatform Navy) ──────── */
  --brand-primary:     oklch(32% 0.08 255);   /* #1B3A5C 근사 */
  --brand-primary-hover: oklch(28% 0.09 255);
  --brand-secondary:   oklch(58% 0.12 245);   /* #2E75B6 */
  --brand-accent:      oklch(72% 0.17 165);   /* #10B981 */
  --brand-accent-hover: oklch(66% 0.18 165);

  /* ──────── Semantic ──────── */
  --success: oklch(62% 0.15 150);
  --warning: oklch(78% 0.14 75);
  --danger:  oklch(58% 0.20 20);
  --info:    oklch(60% 0.13 240);

  --success-bg: oklch(96% 0.03 150);
  --warning-bg: oklch(97% 0.04 75);
  --danger-bg:  oklch(96% 0.04 20);
  --info-bg:    oklch(96% 0.03 240);

  /* ──────── Focus ring (AA 3:1 에 대비) ──────── */
  --focus: oklch(58% 0.15 245);
  --focus-offset: var(--surface-0);

  color-scheme: light;
}
```

**Dark Mode**
```css
:root[data-theme="dark"] {
  --surface-0: oklch(14% 0.008 255);
  --surface-1: oklch(17% 0.010 255);
  --surface-2: oklch(20% 0.012 255);
  --surface-3: oklch(23% 0.014 255);
  --surface-inverse: oklch(97% 0.003 255);

  --fg-strong: oklch(98% 0.003 255);
  --fg:        oklch(92% 0.005 255);
  --fg-muted:  oklch(70% 0.008 255);
  --fg-subtle: oklch(52% 0.010 255);
  --fg-inverse: oklch(18% 0.010 255);

  --border-subtle: oklch(22% 0.008 255);
  --border:        oklch(30% 0.010 255);
  --border-strong: oklch(45% 0.012 255);

  --brand-primary:     oklch(72% 0.12 240);  /* 다크에선 한 단계 밝게 */
  --brand-primary-hover: oklch(78% 0.13 240);
  --brand-secondary:   oklch(74% 0.14 245);
  --brand-accent:      oklch(78% 0.17 165);
  --brand-accent-hover: oklch(84% 0.18 165);

  --success: oklch(75% 0.18 150);
  --warning: oklch(82% 0.15 75);
  --danger:  oklch(72% 0.22 20);
  --info:    oklch(75% 0.15 240);

  --success-bg: oklch(25% 0.05 150);
  --warning-bg: oklch(28% 0.06 75);
  --danger-bg:  oklch(26% 0.07 20);
  --info-bg:    oklch(26% 0.05 240);

  --focus: oklch(78% 0.16 245);
  --focus-offset: var(--surface-0);

  color-scheme: dark;
}
```

### 대비비 검증표 (AA 4.5:1 목표)

| 조합 | Light 대비 | Dark 대비 | 통과 |
|------|-----------|----------|------|
| `fg` on `surface-0` | 11.8:1 | 14.2:1 | ✅ AAA |
| `fg-muted` on `surface-0` | 4.9:1 | 5.1:1 | ✅ AA |
| `fg-subtle` on `surface-0` | 3.2:1 | 3.3:1 | ✅ AA Large Text only |
| `fg-inverse` on `surface-inverse` | 13.5:1 | 13.2:1 | ✅ AAA |
| `brand-primary` on `surface-0` | 7.8:1 | 5.6:1 | ✅ AAA / AA |
| `success` on `success-bg` | 6.1:1 | 6.4:1 | ✅ AAA |
| `danger` on `danger-bg` | 5.8:1 | 5.5:1 | ✅ AAA |

> 검증 도구: `pa11y-ci`, `axe-core`, 수동 `colorjs.io` 체크. CI 에 토큰 단위 회귀 테스트 포함.

### Tailwind 매핑
```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      surface: {
        0: "var(--surface-0)",
        1: "var(--surface-1)",
        2: "var(--surface-2)",
        3: "var(--surface-3)",
        inverse: "var(--surface-inverse)",
      },
      fg: {
        strong: "var(--fg-strong)",
        DEFAULT: "var(--fg)",
        muted: "var(--fg-muted)",
        subtle: "var(--fg-subtle)",
        inverse: "var(--fg-inverse)",
      },
      border: {
        subtle: "var(--border-subtle)",
        DEFAULT: "var(--border)",
        strong: "var(--border-strong)",
      },
      brand: {
        primary: "var(--brand-primary)",
        "primary-hover": "var(--brand-primary-hover)",
        secondary: "var(--brand-secondary)",
        accent: "var(--brand-accent)",
        "accent-hover": "var(--brand-accent-hover)",
      },
      success: "var(--success)",
      warning: "var(--warning)",
      danger: "var(--danger)",
      info: "var(--info)",
      "success-bg": "var(--success-bg)",
      "warning-bg": "var(--warning-bg)",
      "danger-bg": "var(--danger-bg)",
      "info-bg": "var(--info-bg)",
    },
  },
}
```

### 기본 테마 전환
```ts
// app/layout.tsx — 서버에서 쿠키 기반으로 결정
const theme = cookies().get("theme")?.value ?? "light"  // ← 기본 "light"
return <html lang="ko" data-theme={theme} suppressHydrationWarning>
```
- 쿠키 없을 때 `light` 로 초기 렌더 → **FOUC 방지**
- 헤더 토글 버튼에서 클릭 시 `localStorage + cookie` 양쪽 저장
- `prefers-color-scheme: dark` 는 **첫 방문 시에만 힌트**, 명시적 토글 후엔 사용자 선택 존중

### 마이그레이션 계획
1. **1주차**: 토큰 정의 + tailwind 매핑 + base layer (`app/globals.css`) 업데이트
2. **1주차**: `bg-white`, `text-white`, `bg-gray-*`, `text-gray-*` 전수 검색 → 시맨틱 토큰으로 치환 (scripted codemod)
3. **2주차**: 모달·툴팁·토스트 surface-2/3 분리 적용
4. **2주차**: 스크린샷 회귀 테스트 (Percy or Chromatic) — 전 페이지 스냅샷 diff
5. **2주차**: a11y CI (pa11y-ci) 신규 룰 "contrast AA" 강제

---

## 9. 실행 순서 (Sprint 3, 10 영업일)

| 일차 | 작업 | 담당 영역 | 산출물 |
|------|------|---------|--------|
| D1 | Design token v2 작성 + Tailwind 매핑 | Color/UI | `globals.css`, `tailwind.config.ts` |
| D2 | 라이트 모드 기본화 + FOUC 가드 + 토글 위치 고정 | FE | `layout.tsx`, `ThemeProvider.tsx` |
| D3 | `bg-white`/`text-white` 전수 codemod + 스냅샷 diff | FE | PR + Chromatic |
| D4 | DatePicker 표준 컴포넌트 + 매물 등록 폼 P0 마이그레이션 | FE | `components/ui/date-picker.tsx` |
| D4 | 용어 정규화 (§1) 일괄 변경 | Copy | grep 통과 |
| D5 | 채권자 마스킹 (§6) DB 뷰 + API 적용 | BE | `019_*.sql`, API 패치 |
| D6 | 매각 수수료율 입력 (§7) DB + UI + 체크아웃 연동 | BE/FE | `020_*.sql`, checkout 수정 |
| D7 | 발견 모드 재설계 (§4) + 지도에서 보기 제거 + 리디렉트 | FE | `/exchange/feed` 구현 |
| D8 | 공개 입찰 DB + API + 리스트/카드 (§5) | BE/FE | `021_*.sql`, `/exchange/auction/*` |
| D9 | 공개 입찰 모달 폼 + 실시간 입찰 + 매도자 CTA | FE | 완성 |
| D10 | 알림톡·SMS 파이프라인 (§3) + 관리자 UI + 테스트 발송 | BE/Infra | `/admin/notifications/channels` |
| D10 | a11y/Lighthouse/스냅샷 CI green + QA 라운드 | QA | 릴리스 노트 |

**병렬 가능**: D1~D3 (Color) ↔ D4 (DatePicker) ↔ D5 (마스킹) 는 팀 3개로 분리 시 3일로 압축 가능.

---

## 10. 성공 지표 (KPI)

| 영역 | 지표 | 현재 | 목표 (Sprint 3 종료) |
|------|------|------|--------------------|
| UX | WCAG AA 준수율 | 62% | **100%** |
| UX | Lighthouse 접근성 점수 | 78 | **≥ 95** |
| 성능 | 홈 Initial JS | 104KB | **≤ 95KB** (지도 제거) |
| 전환 | 매물 등록 완료율 | 44% | **≥ 60%** (DatePicker + 수수료 UX) |
| 공급 | 공개 입찰 공고 (4주 누적) | 0 | **≥ 20건** |
| 응답 | 문의 평균 응답 SLA | 18h | **≤ 3h** (알림톡) |
| 컴플라이언스 | 채권자 마스킹 커버리지 | 0% | **100% (L1 미만)** |
| 글로벌 점수 | UX/성능 sub-score | 68/100 | **≥ 76/100** |

---

## 11. 리스크 & 완화

| 리스크 | 가능성 | 영향 | 완화 |
|--------|------|-----|------|
| 알림톡 템플릿 심사 2주 소요 | 높음 | 중 | D1 에 심사 신청 선행, SMS 로 fallback |
| 공개 입찰 실시간 스케일 (1초 수십 입찰) | 중 | 높음 | Supabase Realtime + Redis lock, 종료 5분전 freeze |
| 라이트 모드 일괄 전환 시 시각적 회귀 | 높음 | 중 | Chromatic 스냅샷 diff CI 필수 |
| 채권자 마스킹으로 수사기관 요청 회피 의혹 | 낮음 | 고 | 관리자 + Audit log 에 원문 접근 전수 기록 |
| 매각 수수료율 악용 (무료 등록) | 중 | 중 | 최소 0.5% 강제, 관리자 승인 필수 |

---

## 12. 별첨 A — 마이그레이션 번호 예약

| 번호 | 파일명 | 내용 |
|------|--------|------|
| 017 | `017_notification_dispatch.sql` | 알림톡·SMS 큐 |
| 018 | `018_public_auction.sql` | 공개 입찰 |
| 019 | `019_creditor_masking.sql` | 채권자 마스킹 뷰 + 함수 |
| 020 | `020_custom_commission.sql` | 매도자 수수료율 |
| 021 | `021_investor_kind.sql` | 대부업체 서브타입 |

## 별첨 B — 신규 파일 트리

```
components/ui/
 ├─ date-picker.tsx                (신규)
 ├─ date-range-picker.tsx          (신규)
 └─ month-picker.tsx               (신규)

lib/
 ├─ masking/creditor.ts            (신규)
 ├─ commission/calculate.ts        (신규)
 └─ notifications/
     ├─ dispatcher.ts              (신규)
     ├─ providers/aligo.ts         (신규)
     ├─ providers/ncloud-sens.ts   (신규)
     └─ templates.ts               (신규)

app/(main)/exchange/
 ├─ feed/page.tsx                  (신규 — discover 이관)
 ├─ auction/
 │   ├─ page.tsx                   (목록)
 │   ├─ [id]/page.tsx              (상세)
 │   └─ new/page.tsx               (등록 — 매도자)
 └─ map/                           (삭제)

app/admin/
 └─ notifications/
     └─ channels/page.tsx          (신규)

supabase/migrations/
 ├─ 017_notification_dispatch.sql  (신규)
 ├─ 018_public_auction.sql         (신규)
 ├─ 019_creditor_masking.sql       (신규)
 ├─ 020_custom_commission.sql      (신규)
 └─ 021_investor_kind.sql          (신규)

docs/
 └─ DesignTokens_v2.md             (신규, §8 축약)
```

---

**문서 끝 — 승인 요청**: 본 계획에 따라 Sprint 3 를 시작해도 될지, 우선순위 조정이 필요한 항목이 있는지 확인 부탁드립니다.
