-- ============================================================
-- 009: 분석/설정/지원 테이블
-- analytics_events, user_preferences, support_tickets
-- 경매 통계, 실거래가, 민원, 파이프라인
-- ============================================================

-- ─── 분석 이벤트 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);

-- ─── 사용자 환경설정 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_regions TEXT[] DEFAULT '{}',
  preferred_types TEXT[] DEFAULT '{}',
  preferred_price_range JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{"email":true,"push":true,"kakao":false,"sms":false}',
  display_settings JSONB DEFAULT '{"theme":"light","language":"ko","items_per_page":20}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- ─── 고객지원 티켓 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'OTHER' CHECK (category IN ('SERVICE','TRANSACTION','LISTING','CONTRACT','PRIVACY','TECHNICAL','BILLING','OTHER')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED','ESCALATED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

-- ─── 고객지원 티켓 댓글 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- 내부 메모 여부
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_support_ticket_comments_ticket ON support_ticket_comments(ticket_id);

-- ─── 경매 통계 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  court TEXT,
  auction_type TEXT CHECK (auction_type IN ('COURT_AUCTION','PUBLIC_SALE')),
  collateral_type TEXT,
  address TEXT,
  sido TEXT,
  sigungu TEXT,
  appraised_value BIGINT,
  minimum_bid BIGINT,
  winning_bid BIGINT,
  winning_rate DECIMAL(5,2),
  auction_date DATE,
  auction_round INT DEFAULT 1,
  bidder_count INT,
  result TEXT CHECK (result IN ('SOLD','FAILED','WITHDRAWN','POSTPONED')),
  source TEXT CHECK (source IN ('COURT','KAMCO','MANUAL')),
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auction_stats_case ON auction_statistics(case_number);
CREATE INDEX idx_auction_stats_region ON auction_statistics(sido, sigungu);
CREATE INDEX idx_auction_stats_date ON auction_statistics(auction_date);

-- ─── 실거래가 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_type TEXT,
  sido TEXT,
  sigungu TEXT,
  dong TEXT,
  jibun TEXT,
  apartment_name TEXT,
  exclusive_area DECIMAL(10,2),
  deal_amount BIGINT,
  deal_date DATE,
  floor INT,
  build_year INT,
  source TEXT DEFAULT 'MOLIT',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trade_prices_region ON trade_prices(sido, sigungu);
CREATE INDEX idx_trade_prices_date ON trade_prices(deal_date);
CREATE INDEX idx_trade_prices_apt ON trade_prices(apartment_name);

-- ─── 데이터 파이프라인 실행 기록 ────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name TEXT NOT NULL CHECK (pipeline_name IN ('COURT_AUCTION','KAMCO_PUBLIC_SALE','MOLIT_TRADE_PRICE','MATCHING_BATCH')),
  status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','COMPLETED','FAILED','PARTIAL')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  records_processed INT DEFAULT 0,
  records_inserted INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_pipeline_runs_name ON pipeline_runs(pipeline_name);
CREATE INDEX idx_pipeline_runs_started ON pipeline_runs(started_at DESC);
