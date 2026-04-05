# NPLatform 공동투자 & 거래소 기획서
## "전문 투자자 팀이 함께 투자하는 NPL 거래 플랫폼"

---

## 핵심 원칙

### ❌ 이것은 아닙니다
- 조각투자 X (누구나 소액 참여하는 증권형)
- 크라우드펀딩 X (불특정 다수 모집)
- 개인 일반인 투자 X

### ✅ 이것입니다
- **자격 있는 전문 투자자**만 참여
- **팀을 구성**하여 공동 투자
- **단독 투자**도 물론 가능
- 대부업체, 자산운용사, 법인투자자, 전문개인투자자(자격 인증)

---

## 1. 투자자 자격 체계

### 1.1 자격 등급
```
┌─────────────────────────────────────────────────────┐
│                  투자자 자격 등급                      │
├──────────┬──────────────────────────────────────────┤
│ 등급      │ 자격 요건                                 │
├──────────┼──────────────────────────────────────────┤
│ 🏢 기관   │ 대부업체, 자산운용사, 캐피탈, 저축은행      │
│ Tier 1   │ → 사업자등록증 + 금융업 인허가증            │
│          │ → 자본금 10억 이상                         │
│          │ → 제한 없음 (단독/공동/팀장 모두 가능)       │
├──────────┼──────────────────────────────────────────┤
│ 🏛️ 법인   │ NPL 투자 법인, 부동산 투자법인              │
│ Tier 2   │ → 법인등기부등본 + 사업자등록증              │
│          │ → 자본금 5억 이상 또는 NPL 투자 실적 3건+   │
│          │ → 단독/공동 가능, 팀장 가능                 │
├──────────┼──────────────────────────────────────────┤
│ 👤 전문   │ 전문개인투자자                              │
│ Tier 3   │ → 금융투자업 자격증 또는                    │
│          │ → NPL 투자 실적 5건+ 증빙 또는              │
│          │ → 순자산 10억 이상 증빙                     │
│          │ → 단독/공동참여 가능, 팀장은 Tier2 이상     │
├──────────┼──────────────────────────────────────────┤
│ 🚫 일반   │ 위 자격 미충족                             │
│ 불가      │ → 검색/분석/시뮬레이션만 가능               │
│          │ → 투자/입찰/거래 참여 불가                  │
│          │ → "투자자 자격 인증" 안내 표시               │
└──────────┴──────────────────────────────────────────┘
```

### 1.2 자격 인증 프로세스
```
페이지: /investor/verification

Step 1 - 투자자 유형 선택
  [기관 Tier1] [법인 Tier2] [전문개인 Tier3]

Step 2 - 서류 업로드
  Tier1: 사업자등록증, 금융업인허가증, 재무제표
  Tier2: 법인등기부등본, 사업자등록증, 투자실적 증빙
  Tier3: 자격증 사본 또는 투자실적 5건 증빙 또는 재산세 납부확인

Step 3 - 관리자 심사 (1~3 영업일)
  → 승인: 투자자 배지 부여, 거래 기능 활성화
  → 반려: 사유 안내, 재신청 가능
  → 보완요청: 추가 서류 요청

Step 4 - 인증 완료
  프로필에 인증 배지 표시: 🏢 기관인증 / 🏛️ 법인인증 / 👤 전문투자자
  인증 유효기간: 1년 (연 1회 갱신)

API:
  POST /api/v1/investor/verification — 인증 신청
  GET  /api/v1/investor/verification/status — 인증 상태 확인
  PUT  /api/v1/investor/verification/renew — 갱신

DB:
  investor_verifications (
    id, user_id, tier, documents[], status,
    reviewed_by, reviewed_at, reject_reason,
    expires_at, created_at
  )
```

---

## 2. 공동투자 팀 시스템

### 2.1 팀 구성
```
┌─────────────────────────────────────────────┐
│              공동투자 팀 구조                  │
├─────────────────────────────────────────────┤
│                                             │
│   👑 팀장 (Lead Investor)                    │
│   └─ Tier1 또는 Tier2 필수                   │
│   └─ 투자 의사결정 대표                       │
│   └─ 계약 체결 권한                           │
│   └─ 최소 지분율 30% 이상                     │
│                                             │
│   👥 팀원 (Co-Investors)                     │
│   └─ Tier1, Tier2, Tier3 모두 가능           │
│   └─ 최소 2명 ~ 최대 10명                    │
│   └─ 각자 투자금액/지분율 설정                 │
│   └─ 팀 내 의결은 지분율 과반수                │
│                                             │
│   📋 팀 규칙                                  │
│   └─ 팀원 전원 투자자 자격 인증 필수           │
│   └─ 투자금 합계 = 입찰금액                   │
│   └─ 수익 분배 = 지분율 비례                  │
│   └─ 팀장이 거래 실무 대표                    │
│                                             │
└─────────────────────────────────────────────┘
```

### 2.2 팀 생성/관리 페이지
```
페이지: /teams

기능:
  ① 팀 생성
    팀명, 팀 설명, 투자 전략 (보수/중립/공격)
    팀장 자동 설정 (생성자)
    팀 공개/비공개 선택

  ② 팀원 초대
    이메일/사용자ID로 초대
    초대 수락 시 팀 참여
    팀원별 역할 설정 (분석담당, 법률담당, 자금담당 등)

  ③ 팀 대시보드 (/teams/[id])
    팀원 목록 (이름, 인증등급, 역할, 예상 투자금)
    팀 투자 이력 (과거 공동투자 실적)
    팀 자금 현황 (팀원별 가용 투자금)
    팀 채팅 (딜룸과 별도의 팀 내부 소통)
    팀 문서함 (공유 분석자료, 메모)

  ④ 팀 설정
    팀원 추가/제거
    의결 규칙 변경 (과반수/만장일치/팀장 단독)
    해산

페이지 목록:
  /teams — 내 팀 목록
  /teams/new — 팀 생성
  /teams/[id] — 팀 대시보드
  /teams/[id]/members — 팀원 관리
  /teams/[id]/chat — 팀 내부 채팅
  /teams/[id]/docs — 팀 문서함
  /teams/[id]/history — 투자 이력
  /teams/explore — 팀 탐색 (공개 팀 검색, 합류 신청)

API:
  POST   /api/v1/teams — 팀 생성
  GET    /api/v1/teams — 내 팀 목록
  GET    /api/v1/teams/[id] — 팀 상세
  POST   /api/v1/teams/[id]/invite — 팀원 초대
  POST   /api/v1/teams/[id]/join — 합류 신청
  PUT    /api/v1/teams/[id]/members/[uid] — 역할 변경
  DELETE /api/v1/teams/[id]/members/[uid] — 팀원 제거
  GET    /api/v1/teams/explore — 공개 팀 탐색

DB:
  investment_teams (
    id, name, description, strategy, is_public,
    lead_user_id, max_members, decision_rule,
    created_at
  )
  team_members (
    id, team_id, user_id, role, status,
    committed_amount, share_pct, joined_at
  )
  team_messages (
    id, team_id, user_id, content, created_at
  )
  team_documents (
    id, team_id, user_id, title, file_url, created_at
  )
```

---

## 3. 투자 방식 (단독 vs 공동)

### 3.1 단독 투자
```
기존과 동일:
  자격 인증된 투자자 1인이 직접 입찰/거래

플로우:
  매물 발견 → 분석 → NDA → 입찰 → 낙찰 → 계약 → 정산

참여 자격: Tier1, Tier2, Tier3 모두 가능
```

### 3.2 공동 투자 (팀 투자)
```
팀이 함께 입찰/거래

플로우:
  ① 팀장이 매물 발견 → 팀에 공유 ("이 매물 같이 투자할까요?")
  ② 팀원들이 분석 → 팀 채팅에서 논의
  ③ 각 팀원이 투자 금액 커밋 (약정)
     예: 총 10억 매물
         팀장 A: 4억 (40%) — Lead
         팀원 B: 3억 (30%)
         팀원 C: 2억 (20%)
         팀원 D: 1억 (10%)
  ④ 팀장이 팀 명의로 입찰 제출
  ⑤ 낙찰 → 팀 딜룸 자동 생성
  ⑥ 계약: 팀장이 대표 서명 + 팀원 동의
  ⑦ 자금: 팀원별 약정금 납입
  ⑧ 거래 완료 → 수익 지분율 비례 분배

페이지: /teams/[id]/invest/[listing_id]
  - 매물 요약 정보
  - 팀원별 투자금 입력/조정 슬라이더
  - 지분율 자동 계산 (원형 차트)
  - 예상 수익 분배 표
  - 팀 의결 상태 (찬성/반대/미응답)
  - "공동 입찰 제출" 버튼 (팀장만)

API:
  POST /api/v1/teams/[id]/invest — 공동투자 제안
  PUT  /api/v1/teams/[id]/invest/[listing_id]/commit — 금액 약정
  POST /api/v1/teams/[id]/invest/[listing_id]/vote — 의결 (찬성/반대)
  POST /api/v1/teams/[id]/invest/[listing_id]/submit — 입찰 제출
```

### 3.3 공개 공동투자 모집
```
팀장이 특정 매물에 대해 공동투자자를 공개 모집

페이지: /marketplace/co-invest

기능:
  - 팀장이 "공동투자 모집" 등록
    매물: [선택], 목표금액: [10억], 최소참여: [1억], 모집기간: [2주]
  - 공개 목록에 표시
    매물 요약, 팀장 프로필/실적, 현재 모집 현황
  - 진행률 바: [████████░░] 7.2억/10억 (72%)
  - 자격 인증된 투자자만 "참여 신청" 가능
  - 팀장이 참여자 승인/거부
  - 모집 완료 → 자동 팀 생성 → 공동 입찰

표시 정보:
  - 매물: 서초구 아파트, 감정가 15억, AI등급 A
  - 팀장: (주)한국NPL투자 (기관인증 ✓, 거래 실적 23건)
  - 모집: 목표 10억 / 현재 7.2억 (72%) / 참여자 4명
  - 조건: 최소 1억, 의결 과반수, 팀장 지분 30%+
  - 마감: D-5

API:
  POST /api/v1/co-invest — 모집 등록
  GET  /api/v1/co-invest — 모집 목록
  POST /api/v1/co-invest/[id]/apply — 참여 신청
  PUT  /api/v1/co-invest/[id]/approve — 승인/거부
```

---

## 4. 거래소 모드 (전문투자자 전용)

### 4.1 NPL 거래소 컨셉
```
⚠️ 조각투자 아님 — 전문투자자간 NPL 채권 매매

기존 보유자가 NPL 지분/채권을 다른 전문투자자에게 매도
= 2차 시장 (Secondary Market)

예시:
  A(대부업체)가 10억 NPL을 매입 → 6개월 보유
  → 상황 변화로 매도 희망
  → NPLatform 거래소에 "10억 NPL, 12억에 매도" 등록
  → B(자산운용사)가 11.5억에 매수 제안
  → 협상 → 체결

왜 필요한가:
  현재: NPL 보유 후 매도하려면 다시 개별 연락 → 비효율
  거래소: 보유 NPL을 즉시 시장에 올려 유동성 확보
```

### 4.2 거래소 UI
```
페이지: /exchange

┌─────────────────────────────────────────────────┐
│ NPL 거래소                          [필터] [알림] │
├────────────────┬────────────────────────────────┤
│                │                                │
│   매물 목록      │    선택된 매물 상세              │
│   (스크롤)      │                                │
│                │   서초구 아파트 NPL              │
│  ┌───────────┐ │   감정가: 15억                  │
│  │ 서초 아파트 │ │   현재 보유자: A대부업체          │
│  │ 매도 12억  │ │                                │
│  │ 입찰 3건   │ │   ┌──────────────────────┐    │
│  └───────────┘ │   │ 매도 호가              │    │
│  ┌───────────┐ │   │ 12.0억 ← 매도 1       │    │
│  │ 강남 상가  │ │   │ 12.5억 ← 매도 2       │    │
│  │ 매도 8억   │ │   ├──────────────────────┤    │
│  │ 입찰 1건   │ │   │ 매수 호가              │    │
│  └───────────┘ │   │ 11.5억 → 매수 1       │    │
│  ┌───────────┐ │   │ 11.0억 → 매수 2       │    │
│  │ 용인 토지  │ │   └──────────────────────┘    │
│  │ 매도 3억   │ │                                │
│  │ 새 매물    │ │   [매수 제안하기] [분석보기]     │
│  └───────────┘ │                                │
│                │   최근 체결 이력                  │
│                │   03.19 11.2억 체결              │
│                │   03.15 10.8억 체결              │
│                │                                │
├────────────────┴────────────────────────────────┤
│ 체결 통계: 오늘 3건 / 이번주 12건 / 총 거래액 156억 │
└─────────────────────────────────────────────────┘

참여 자격: Tier1, Tier2만 (Tier3은 열람만 가능)
```

### 4.3 거래소 기능 상세
```
매도 등록:
  - 보유 NPL 선택 (NPLatform에서 매입한 건)
  - 희망 매도가 설정
  - 공개/비공개 선택
  - 유효기간 설정

매수 제안:
  - 매수 희망가 입력
  - 조건부 제안 (실사 후 확정, 기간 조건 등)
  - 팀 명의 매수 가능

가격 협상:
  - 매도자-매수자 1:1 협상 (딜룸)
  - 역제안 (counter offer)
  - 최종가 합의 → 체결

체결 후:
  - 자동 딜룸 생성
  - 채권 양수도 계약 프로세스
  - 정산 (플랫폼 수수료 양측 각 0.5%)

페이지:
  /exchange — 거래소 메인
  /exchange/sell — 매도 등록
  /exchange/[id] — 매물 상세 (호가, 히스토리)
  /exchange/my — 내 거래 현황
  /exchange/history — 체결 이력

API:
  POST /api/v1/exchange/sell — 매도 등록
  POST /api/v1/exchange/bid — 매수 제안
  PUT  /api/v1/exchange/[id]/negotiate — 가격 협상
  POST /api/v1/exchange/[id]/close — 체결 확정
  GET  /api/v1/exchange — 거래소 목록
  GET  /api/v1/exchange/history — 체결 이력
```

---

## 5. 수익 분배 자동화

### 5.1 분배 구조
```
거래 완료 후 수익 발생 시:

총 수익 = 매각가 - 매입가 - 제비용 (세금, 수수료, 관리비)

분배:
  팀원별 수익 = 총 수익 × 지분율
  플랫폼 수수료 = 거래액 × 0.5% (매도측) + 0.5% (매수측)

예시:
  10억에 매입 (팀 4명) → 13억에 매각
  총 수익: 13억 - 10억 - 0.5억(제비용) = 2.5억

  팀장 A (40%): 1.0억 수익
  팀원 B (30%): 0.75억 수익
  팀원 C (20%): 0.5억 수익
  팀원 D (10%): 0.25억 수익
  플랫폼: 13억 × 1% = 0.13억 수수료
```

### 5.2 수익 대시보드
```
페이지: /teams/[id]/returns

표시:
  - 투자 원금 (팀원별)
  - 현재 평가액 (AI 기반)
  - 미실현 수익/손실
  - 실현 수익 (매각 완료 건)
  - 수익률 (IRR, ROI)
  - 비용 내역 (세금, 수수료, 관리비)

차트:
  - 투자 원금 vs 현재 가치 (BarChart)
  - 팀원별 지분 구성 (PieChart)
  - 수익 추이 (AreaChart)
```

---

## 6. 접근 제어 매트릭스

### 페이지별 접근 권한
```
┌──────────────────┬────────┬────────┬────────┬────────┐
│ 기능              │ 일반   │ Tier3  │ Tier2  │ Tier1  │
├──────────────────┼────────┼────────┼────────┼────────┤
│ 매물 검색         │ ✅     │ ✅     │ ✅     │ ✅     │
│ AI 분석           │ ✅     │ ✅     │ ✅     │ ✅     │
│ 시뮬레이터        │ ✅     │ ✅     │ ✅     │ ✅     │
│ 통계/리포트       │ 제한   │ ✅     │ ✅     │ ✅     │
├──────────────────┼────────┼────────┼────────┼────────┤
│ 입찰 참여         │ ❌     │ ✅     │ ✅     │ ✅     │
│ NDA 서명          │ ❌     │ ✅     │ ✅     │ ✅     │
│ 1:1 문의          │ ❌     │ ✅     │ ✅     │ ✅     │
│ 가격 제안         │ ❌     │ ✅     │ ✅     │ ✅     │
├──────────────────┼────────┼────────┼────────┼────────┤
│ 팀 참여           │ ❌     │ ✅     │ ✅     │ ✅     │
│ 팀 생성 (팀장)    │ ❌     │ ❌     │ ✅     │ ✅     │
│ 공동투자 모집     │ ❌     │ ❌     │ ✅     │ ✅     │
├──────────────────┼────────┼────────┼────────┼────────┤
│ 거래소 열람       │ ❌     │ ✅     │ ✅     │ ✅     │
│ 거래소 매수/매도  │ ❌     │ ❌     │ ✅     │ ✅     │
├──────────────────┼────────┼────────┼────────┼────────┤
│ 매물 등록 (매도)  │ ❌     │ ❌     │ ❌     │ ✅     │
│ 라이브 경매 주최  │ ❌     │ ❌     │ ❌     │ ✅     │
│ API 연동          │ ❌     │ ❌     │ ❌     │ ✅     │
└──────────────────┴────────┴────────┴────────┴────────┘

일반 사용자가 거래 기능 접근 시:
  → "투자자 자격 인증이 필요합니다" 모달
  → [자격 인증하기] 버튼 → /investor/verification
```

---

## 7. DB 스키마

```sql
-- 투자자 인증
CREATE TABLE investor_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tier TEXT NOT NULL CHECK (tier IN ('TIER1', 'TIER2', 'TIER3')),
  institution_type TEXT, -- 은행, 대부업체, AMC 등
  documents JSONB DEFAULT '[]', -- [{name, url, status}]
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 투자 팀
CREATE TABLE investment_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT CHECK (strategy IN ('CONSERVATIVE','MODERATE','AGGRESSIVE')),
  is_public BOOLEAN DEFAULT false,
  lead_user_id UUID NOT NULL REFERENCES auth.users(id),
  max_members INT DEFAULT 10,
  decision_rule TEXT DEFAULT 'MAJORITY' CHECK (decision_rule IN ('MAJORITY','UNANIMOUS','LEAD_ONLY')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED','DISSOLVED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 팀 멤버
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES investment_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT DEFAULT 'MEMBER', -- LEAD, ANALYST, LEGAL, FINANCE, MEMBER
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('INVITED','ACTIVE','LEFT')),
  committed_amount BIGINT DEFAULT 0,
  share_pct DECIMAL(5,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 공동투자 제안
CREATE TABLE co_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES investment_teams(id),
  listing_id UUID NOT NULL REFERENCES npl_listings(id),
  lead_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_amount BIGINT NOT NULL,
  min_participation BIGINT NOT NULL,
  current_amount BIGINT DEFAULT 0,
  participant_count INT DEFAULT 0,
  status TEXT DEFAULT 'RECRUITING' CHECK (status IN ('RECRUITING','FUNDED','BIDDING','COMPLETED','CANCELLED')),
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 공동투자 참여
CREATE TABLE co_investment_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  co_investment_id UUID NOT NULL REFERENCES co_investments(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount BIGINT NOT NULL,
  share_pct DECIMAL(5,2),
  status TEXT DEFAULT 'COMMITTED' CHECK (status IN ('APPLIED','COMMITTED','WITHDRAWN')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(co_investment_id, user_id)
);

-- 거래소 매물
CREATE TABLE exchange_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_listing_id UUID REFERENCES npl_listings(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  ask_price BIGINT NOT NULL,
  original_purchase_price BIGINT,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','NEGOTIATING','CLOSED','WITHDRAWN')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 거래소 매수 제안
CREATE TABLE exchange_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_listing_id UUID NOT NULL REFERENCES exchange_listings(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES investment_teams(id), -- 팀 명의 매수
  offer_price BIGINT NOT NULL,
  conditions TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','COUNTERED','WITHDRAWN')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 수익 분배
CREATE TABLE profit_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  co_investment_id UUID REFERENCES co_investments(id),
  deal_id UUID, -- 거래 ID
  total_revenue BIGINT,
  total_cost BIGINT,
  total_profit BIGINT,
  platform_fee BIGINT,
  distributions JSONB, -- [{user_id, share_pct, amount}]
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','DISTRIBUTED','DISPUTED')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. 신규 페이지 목록 (+18페이지)

```
투자자 인증:
  /investor/verification          — 자격 인증 신청
  /investor/verification/status   — 인증 상태

팀 관리:
  /teams                          — 내 팀 목록
  /teams/new                      — 팀 생성
  /teams/explore                  — 공개 팀 탐색
  /teams/[id]                     — 팀 대시보드
  /teams/[id]/members             — 팀원 관리
  /teams/[id]/chat                — 팀 내부 채팅
  /teams/[id]/invest/[listing_id] — 공동투자 의결

공동투자 모집:
  /marketplace/co-invest          — 공동투자 모집 목록
  /marketplace/co-invest/new      — 모집 등록
  /marketplace/co-invest/[id]     — 모집 상세

거래소:
  /exchange                       — 거래소 메인
  /exchange/sell                  — 매도 등록
  /exchange/[id]                  — 매물 상세 (호가)
  /exchange/my                    — 내 거래 현황

수익:
  /teams/[id]/returns             — 수익 분배 대시보드
```

---

## 9. 점수 배점 (기존 Disruption 모듈 대체)

| 항목 | 배점 |
|------|------|
| 투자자 자격 인증 시스템 | 15 |
| 팀 생성/관리/채팅 | 25 |
| 공동투자 (팀 입찰, 지분, 의결) | 30 |
| 공개 공동투자 모집 | 20 |
| 거래소 (매도/매수/협상/체결) | 35 |
| 수익 분배 자동화 | 15 |
| 접근 제어 매트릭스 | 10 |
| DB 스키마 (8 테이블) | 10 |
| API (15+ 라우트) | 10 |
| **합계** | **170** |

---

## 10. 최종 점수 체계 업데이트: **1,005점**

| 파트 | 배점 |
|------|------|
| Core | 400 |
| Super (매도/매수/매칭/인텔/운영) | 200 |
| Innovation (AI OCR/라이브경매/PWA/지식/외부API) | 100 |
| UI/UX 기술 (다크모드/반응형/Cmd+K) | 50 |
| UX 사용성 (가독성/가시성/편의성) | 85 |
| **공동투자 & 거래소** | **170** |
| **합계** | **1,005** |

---

*NPLatform 공동투자 & 거래소 기획서*
*"전문 투자자 팀이 함께 투자하는 NPL 거래 플랫폼"*
*작성일: 2026-03-20*
