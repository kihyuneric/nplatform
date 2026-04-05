-- ============================================================
-- 011: 추가 복합 인덱스 (성능 최적화)
-- 002~009 테이블의 자주 사용되는 쿼리 패턴 최적화
-- 단일 컬럼 인덱스는 각 마이그레이션에서 이미 생성됨
-- ============================================================

-- ─── deal_listings 복합 인덱스 (001 보완) ───────────────────
CREATE INDEX IF NOT EXISTS idx_deal_listings_status_created ON deal_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_listings_collateral_region ON deal_listings(collateral_type, collateral_region);
CREATE INDEX IF NOT EXISTS idx_deal_listings_visibility_status ON deal_listings(visibility, status);

-- ─── deal_rooms 복합 인덱스 ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deal_rooms_status_created ON deal_rooms(status, created_at DESC);

-- ─── contract_requests 복합 인덱스 ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_contract_requests_status_created ON contract_requests(status, created_at DESC);

-- ─── notifications 복합 인덱스 ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);

-- ─── posts 복합 인덱스 ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_category_status_created ON posts(category, status, created_at DESC);

-- ─── subscriptions 복합 인덱스 (001 보완) ───────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

-- ─── analytics_events 복합 인덱스 ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_user_type_created ON analytics_events(user_id, event_type, created_at);

-- ─── support_tickets 복합 인덱스 ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority ON support_tickets(status, priority);

-- ─── 텍스트 검색용 GIN 인덱스 ──────────────────────────────
-- 게시글 제목/내용 검색
CREATE INDEX IF NOT EXISTS idx_posts_title_gin ON posts USING gin(to_tsvector('simple', title));
-- 공지 제목 검색
CREATE INDEX IF NOT EXISTS idx_notices_title_gin ON notices USING gin(to_tsvector('simple', title));
-- 매물 주소 검색
CREATE INDEX IF NOT EXISTS idx_deal_listings_address_gin ON deal_listings USING gin(to_tsvector('simple', coalesce(collateral_address, '')));
