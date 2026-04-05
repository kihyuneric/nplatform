-- ============================================================
-- 021_rpc_functions.sql
-- 서버사이드 RPC 함수 모음
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. increment_view — court_auction_listings 조회수 증가
--    클라이언트에서 await supabase.rpc('increment_view', { listing_id: id })
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_view(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE court_auction_listings
  SET    view_count  = view_count + 1,
         updated_at  = now()
  WHERE  id = listing_id;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 2. increment_bookmark — 북마크 수 증감
--    action: 'add' | 'remove'
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_bookmark(listing_id uuid, action text DEFAULT 'add')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF action = 'add' THEN
    UPDATE court_auction_listings
    SET    bookmark_count = GREATEST(0, bookmark_count + 1),
           updated_at     = now()
    WHERE  id = listing_id;
  ELSE
    UPDATE court_auction_listings
    SET    bookmark_count = GREATEST(0, bookmark_count - 1),
           updated_at     = now()
    WHERE  id = listing_id;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 3. get_auction_stats — 경매 매물 집계 통계 (대시보드용)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_auction_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total',        COUNT(*),
    'scheduled',    COUNT(*) FILTER (WHERE status = 'SCHEDULED'),
    'bidding',      COUNT(*) FILTER (WHERE status = 'BIDDING'),
    'sold',         COUNT(*) FILTER (WHERE status = 'SOLD'),
    'unsold',       COUNT(*) FILTER (WHERE status = 'UNSOLD'),
    'screened',     COUNT(*) FILTER (WHERE ai_verdict IS NOT NULL),
    'unscreened',   COUNT(*) FILTER (WHERE ai_verdict IS NULL),
    'strong_buy',   COUNT(*) FILTER (WHERE ai_verdict = 'STRONG_BUY'),
    'buy',          COUNT(*) FILTER (WHERE ai_verdict = 'BUY'),
    'consider',     COUNT(*) FILTER (WHERE ai_verdict = 'CONSIDER'),
    'caution',      COUNT(*) FILTER (WHERE ai_verdict = 'CAUTION'),
    'stop',         COUNT(*) FILTER (WHERE ai_verdict = 'STOP'),
    'avg_discount', ROUND(
      AVG(
        CASE WHEN appraised_value > 0
          THEN (1.0 - min_bid_price::numeric / appraised_value) * 100
          ELSE NULL
        END
      )::numeric, 2
    )
  )
  INTO result
  FROM court_auction_listings;

  RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 4. get_commission_summary — 수수료 집계 (관리자 대시보드용)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_commission_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_count',      COUNT(*),
    'pending_count',    COUNT(*) FILTER (WHERE status = 'PENDING'),
    'invoiced_count',   COUNT(*) FILTER (WHERE status = 'INVOICED'),
    'paid_count',       COUNT(*) FILTER (WHERE status = 'PAID'),
    'total_amount',     COALESCE(SUM(total_amount), 0),
    'pending_amount',   COALESCE(SUM(total_amount) FILTER (WHERE status IN ('PENDING','INVOICED')), 0),
    'paid_amount',      COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0),
    'avg_rate',         ROUND(AVG(commission_rate) * 100, 4)
  )
  INTO result
  FROM deal_commissions;

  RETURN result;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 5. upsert_npl_price_index — NBI 주간 지수 업서트
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_npl_price_index(
  p_week_start    date,
  p_property_type text,
  p_region        text,
  p_avg_bid_rate  numeric,
  p_sample_count  integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id           uuid;
  v_prev_rate    numeric;
  v_wow_change   numeric;
BEGIN
  -- 전주 낙찰가율 조회
  SELECT avg_bid_rate INTO v_prev_rate
  FROM   npl_price_index
  WHERE  week_start    = p_week_start - INTERVAL '7 days'
    AND  property_type = p_property_type
    AND  region        = p_region
  ORDER  BY created_at DESC
  LIMIT  1;

  v_wow_change := CASE WHEN v_prev_rate IS NOT NULL AND v_prev_rate > 0
    THEN ROUND((p_avg_bid_rate - v_prev_rate) / v_prev_rate * 100, 4)
    ELSE NULL
  END;

  INSERT INTO npl_price_index
    (week_start, property_type, region, avg_bid_rate, sample_count, wow_change)
  VALUES
    (p_week_start, p_property_type, p_region, p_avg_bid_rate, p_sample_count, v_wow_change)
  ON CONFLICT (week_start, property_type, region)
  DO UPDATE SET
    avg_bid_rate = EXCLUDED.avg_bid_rate,
    sample_count = EXCLUDED.sample_count,
    wow_change   = v_wow_change,
    updated_at   = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- 6. grant_credits — 크레딧 지급 (어드민 / 플랜 갱신 시)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id    uuid,
  p_amount     integer,
  p_reason     text DEFAULT 'MONTHLY_GRANT'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- credit_balances 업서트
  INSERT INTO credit_balances (user_id, balance, used_this_month)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = credit_balances.balance + p_amount;

  -- 이력 기록 (credit_transactions 테이블이 있으면)
  BEGIN
    INSERT INTO credit_transactions (user_id, amount, type, reason, created_at)
    VALUES (p_user_id, p_amount, 'GRANT', p_reason, now());
  EXCEPTION
    WHEN undefined_table THEN NULL;  -- 테이블 없으면 무시
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- RPC 권한 부여
-- ─────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION increment_view(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION increment_bookmark(uuid, text)         TO authenticated;
GRANT EXECUTE ON FUNCTION get_auction_stats()                    TO authenticated;
GRANT EXECUTE ON FUNCTION get_commission_summary()               TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_npl_price_index(date,text,text,numeric,integer) TO service_role;
GRANT EXECUTE ON FUNCTION grant_credits(uuid, integer, text)     TO service_role;
