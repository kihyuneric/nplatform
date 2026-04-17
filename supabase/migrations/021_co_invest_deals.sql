-- ============================================================
-- 021: 공동투자(팀 딜) 전용 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS co_invest_deals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID        REFERENCES deal_listings(id) ON DELETE SET NULL,
  title             TEXT        NOT NULL,
  description       TEXT,
  target_amount     BIGINT      NOT NULL,                -- 총 목표 금액 (원)
  committed_amount  BIGINT      NOT NULL DEFAULT 0,      -- 현재 모집 금액
  expected_return   DECIMAL(5,2) NOT NULL,               -- 예상 수익률 (%)
  min_per_investor  BIGINT      NOT NULL DEFAULT 10000000,
  max_per_investor  BIGINT,
  deadline          DATE        NOT NULL,
  leader_user_id    UUID        REFERENCES auth.users(id),
  leader_intro      TEXT,
  contact_email     TEXT,
  status            TEXT        NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'FUNDED', 'CLOSED', 'CANCELLED')),
  investor_count    INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_co_invest_deals_listing   ON co_invest_deals(listing_id);
CREATE INDEX idx_co_invest_deals_leader    ON co_invest_deals(leader_user_id);
CREATE INDEX idx_co_invest_deals_status    ON co_invest_deals(status);
CREATE INDEX idx_co_invest_deals_deadline  ON co_invest_deals(deadline);

-- 공동투자 참여 내역
CREATE TABLE IF NOT EXISTS co_invest_participations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID        NOT NULL REFERENCES co_invest_deals(id) ON DELETE CASCADE,
  investor_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        BIGINT      NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED')),
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_id, investor_id)
);

CREATE INDEX idx_co_invest_part_deal     ON co_invest_participations(deal_id);
CREATE INDEX idx_co_invest_part_investor ON co_invest_participations(investor_id);

-- RLS
ALTER TABLE co_invest_deals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_invest_participations  ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (OPEN 딜만)
CREATE POLICY "co_invest_deals_public_read"
  ON co_invest_deals FOR SELECT
  USING (status = 'OPEN' OR leader_user_id = auth.uid());

-- 인증 사용자 생성
CREATE POLICY "co_invest_deals_insert"
  ON co_invest_deals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 리더만 수정
CREATE POLICY "co_invest_deals_update"
  ON co_invest_deals FOR UPDATE
  USING (leader_user_id = auth.uid());

-- 참여 내역: 본인만 조회
CREATE POLICY "co_invest_part_select"
  ON co_invest_participations FOR SELECT
  USING (investor_id = auth.uid());

CREATE POLICY "co_invest_part_insert"
  ON co_invest_participations FOR INSERT
  WITH CHECK (investor_id = auth.uid());
