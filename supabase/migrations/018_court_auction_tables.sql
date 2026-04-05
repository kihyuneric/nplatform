-- ============================================================
-- 018_court_auction_tables.sql
-- 법원경매 & 부동산 데이터 통합 스키마
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. 법원경매 매물 (court_auction_listings)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_auction_listings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number         text        UNIQUE NOT NULL,          -- 2024타경12345
  court_name          text        NOT NULL,                 -- 서울중앙지방법원
  court_code          text,                                 -- 서울중앙 (내부코드)

  -- 물건 정보
  property_type       text        NOT NULL,                 -- 아파트|다세대|토지|상가|공장|기타
  property_sub_type   text,                                 -- 주거용오피스텔 등 세부 유형
  address             text        NOT NULL,
  sido                text,                                 -- 서울특별시
  sigungu             text,                                 -- 강남구
  dong                text,                                 -- 역삼동
  detail_address      text,                                 -- 상세주소 (노출제한 가능)
  latitude            numeric(10,7),
  longitude           numeric(10,7),
  area_m2             numeric(10,2),                        -- 전용면적(㎡)
  land_area_m2        numeric(10,2),                        -- 토지면적(㎡)
  floor               integer,                              -- 층수
  total_floors        integer,                              -- 총층수
  build_year          integer,                              -- 준공연도

  -- 경매 금액
  appraised_value     bigint      NOT NULL,                 -- 감정평가액
  min_bid_price       bigint      NOT NULL,                 -- 최저매각가
  winning_bid         bigint,                               -- 낙찰가 (완료 후)
  winning_bid_rate    numeric(5,4),                         -- 낙찰가율 (winning/appraised)
  deposit_amount      bigint,                               -- 입찰보증금

  -- 경매 진행 현황
  status              text        NOT NULL DEFAULT 'SCHEDULED',
    -- SCHEDULED|BIDDING|SOLD|UNSOLD|CANCELLED|WITHDRAWN
  auction_date        date,                                 -- 경매 기일
  auction_count       integer     NOT NULL DEFAULT 1,       -- 몇 회차
  previous_min_bid    bigint,                               -- 이전 최저매각가
  result_at           timestamptz,                          -- 낙찰/유찰 확정일시

  -- 채권 정보
  creditor_name       text,                                 -- 채권자 (금융기관명)
  creditor_type       text,                                 -- BANK|SAVINGS_BANK|CREDIT_UNION|CAPITAL|ETC
  loan_principal      bigint,                               -- 원금
  loan_balance        bigint,                               -- 잔액 (이자 포함)
  total_claim         bigint,                               -- 총 청구액 (경매신청채권액)
  senior_claim        bigint,                               -- 선순위 채권 합계
  junior_claim        bigint,                               -- 후순위 채권 합계
  lien_count          integer     DEFAULT 0,                -- 근저당 건수
  seizure_count       integer     DEFAULT 0,                -- 압류 건수

  -- 임차인 정보
  tenant_count        integer     DEFAULT 0,
  total_tenant_deposit bigint,                              -- 임차보증금 합계
  has_opposing_force  boolean     DEFAULT false,            -- 대항력 있는 임차인 여부
  lease_detail        jsonb       DEFAULT '[]',             -- [{name, deposit, from, to, opposing}]

  -- AI 스크리닝 결과
  ai_roi_estimate     numeric(6,2),                         -- 예상 ROI (%)
  ai_risk_score       integer     CHECK (ai_risk_score BETWEEN 0 AND 100),
  ai_bid_prob         numeric(5,4),                         -- 낙찰 가능성 (0~1)
  ai_verdict          text,
    -- STRONG_BUY|BUY|CONSIDER|CAUTION|STOP
  ai_reasoning        text,                                 -- AI 판단 근거
  ai_screened_at      timestamptz,
  ai_model_version    text        DEFAULT 'v1',

  -- 연계 데이터
  related_listing_id  uuid,                                 -- exchange 매물 ID (연결 시)
  external_id         text,                                 -- 원본 시스템 ID
  source              text        NOT NULL DEFAULT 'COURT', -- COURT|MANUAL|PARTNER

  -- 메타
  raw_data            jsonb       DEFAULT '{}',             -- 원본 크롤 데이터 보존
  images              jsonb       DEFAULT '[]',             -- [{url, caption, type}]
  documents           jsonb       DEFAULT '[]',             -- [{url, type, name}]
  notes               text,
  is_featured         boolean     DEFAULT false,
  view_count          integer     DEFAULT 0,
  bookmark_count      integer     DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  deleted_at          timestamptz
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cal_status         ON court_auction_listings (status);
CREATE INDEX IF NOT EXISTS idx_cal_auction_date   ON court_auction_listings (auction_date);
CREATE INDEX IF NOT EXISTS idx_cal_sido           ON court_auction_listings (sido);
CREATE INDEX IF NOT EXISTS idx_cal_sigungu        ON court_auction_listings (sigungu);
CREATE INDEX IF NOT EXISTS idx_cal_property_type  ON court_auction_listings (property_type);
CREATE INDEX IF NOT EXISTS idx_cal_creditor_type  ON court_auction_listings (creditor_type);
CREATE INDEX IF NOT EXISTS idx_cal_ai_verdict     ON court_auction_listings (ai_verdict);
CREATE INDEX IF NOT EXISTS idx_cal_min_bid        ON court_auction_listings (min_bid_price);
CREATE INDEX IF NOT EXISTS idx_cal_appraised      ON court_auction_listings (appraised_value);
CREATE INDEX IF NOT EXISTS idx_cal_updated_at     ON court_auction_listings (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cal_case_number    ON court_auction_listings (case_number);
CREATE INDEX IF NOT EXISTS idx_cal_geo            ON court_auction_listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
-- 전문검색
CREATE INDEX IF NOT EXISTS idx_cal_fts ON court_auction_listings
  USING gin(to_tsvector('korean', coalesce(address,'') || ' ' || coalesce(creditor_name,'') || ' ' || case_number));

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_court_auction_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_cal_updated_at ON court_auction_listings;
CREATE TRIGGER trg_cal_updated_at
  BEFORE UPDATE ON court_auction_listings
  FOR EACH ROW EXECUTE FUNCTION update_court_auction_updated_at();

-- ─────────────────────────────────────────────────────────
-- 2. 경매 기일 이력 (auction_schedule_history)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_schedule_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid        NOT NULL REFERENCES court_auction_listings(id) ON DELETE CASCADE,
  auction_count   integer     NOT NULL,
  auction_date    date        NOT NULL,
  min_bid_price   bigint      NOT NULL,
  result          text,       -- SOLD|UNSOLD|CANCELLED
  winning_bid     bigint,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ash_listing_id ON auction_schedule_history (listing_id);

-- ─────────────────────────────────────────────────────────
-- 3. 북마크 (auction_bookmarks)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_bookmarks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid        NOT NULL REFERENCES court_auction_listings(id) ON DELETE CASCADE,
  note        text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_ab_user_id    ON auction_bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_ab_listing_id ON auction_bookmarks (listing_id);

-- ─────────────────────────────────────────────────────────
-- 4. 데이터 수집 로그 (data_sync_logs)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_sync_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text        NOT NULL,    -- COURT_AUCTION|MOLIT|CUSTOM
  sync_type       text        NOT NULL,    -- FULL|INCREMENTAL|MANUAL
  started_at      timestamptz DEFAULT now(),
  finished_at     timestamptz,
  total_records   integer     DEFAULT 0,
  new_records     integer     DEFAULT 0,
  updated_records integer     DEFAULT 0,
  error_count     integer     DEFAULT 0,
  status          text        DEFAULT 'RUNNING',  -- RUNNING|SUCCESS|PARTIAL|FAILED
  error_detail    text,
  triggered_by    uuid        REFERENCES auth.users(id)
);

-- ─────────────────────────────────────────────────────────
-- 5. RLS 정책
-- ─────────────────────────────────────────────────────────
ALTER TABLE court_auction_listings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_schedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bookmarks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_logs           ENABLE ROW LEVEL SECURITY;

-- 법원경매 목록: 로그인 사용자 읽기 가능
DROP POLICY IF EXISTS "cal_select_auth"  ON court_auction_listings;
CREATE POLICY "cal_select_auth" ON court_auction_listings
  FOR SELECT USING (
    deleted_at IS NULL
    AND auth.role() = 'authenticated'
  );

-- 관리자만 삽입/수정/삭제
DROP POLICY IF EXISTS "cal_admin_write" ON court_auction_listings;
CREATE POLICY "cal_admin_write" ON court_auction_listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')
    )
  );

-- 경매 기일 이력: 인증 사용자 읽기
DROP POLICY IF EXISTS "ash_select_auth" ON auction_schedule_history;
CREATE POLICY "ash_select_auth" ON auction_schedule_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- 북마크: 본인 것만
DROP POLICY IF EXISTS "ab_own" ON auction_bookmarks;
CREATE POLICY "ab_own" ON auction_bookmarks
  FOR ALL USING (user_id = auth.uid());

-- 데이터 수집 로그: 관리자만
DROP POLICY IF EXISTS "dsl_admin" ON data_sync_logs;
CREATE POLICY "dsl_admin" ON data_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN','SUPER_ADMIN')
    )
  );

-- ─────────────────────────────────────────────────────────
-- 6. Realtime 활성화
-- ─────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE court_auction_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bookmarks;
