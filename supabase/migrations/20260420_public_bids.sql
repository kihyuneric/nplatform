-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1-M · Sprint 3 · D8 — 공개 입찰 시스템
-- ═══════════════════════════════════════════════════════════════════════════
-- 목적: 거래소 매물에 비공개 매수 수요가 아닌 "공개 입찰"을 허용하여
--       매도자가 매수 경쟁 상황을 투명하게 확인하고, 공개 bid를 통한
--       가격 발견(price discovery)을 촉진.
--
-- 핵심 개념:
--   - 1인 다회 입찰 가능 (최신 금액으로 갱신하는 replace 시맨틱)
--   - 입찰자 이름은 마스킹 (정책: NDA 체결 전)
--   - 집계 뷰(public_bids_summary)는 listing_id별 건수/최고가/평균가 노출
--
-- 액세스 정책:
--   - INSERT: 인증 사용자 누구나 (status='ACTIVE')
--   - SELECT(raw):
--       · 본인 입찰 (bidder_id = auth.uid())
--       · 해당 매물의 매도자 (npl_listings.seller_id = auth.uid())
--       · SUPER_ADMIN
--   - SELECT(summary view): authenticated + anon (공개)
--   - UPDATE: 본인 (withdraw) + 매도자 (accept/reject)
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. public_bids 테이블
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.public_bids (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID            NOT NULL,
  bidder_id       UUID            NOT NULL,            -- auth.users.id
  bidder_name     TEXT            NOT NULL,            -- 원본 (매도자/관리자만 조회)
  bidder_phone    TEXT,                                -- 연락처 (알림용, 비공개)
  bid_amount      NUMERIC(18,0)   NOT NULL CHECK (bid_amount > 0),
  bid_message     TEXT,                                -- 메모
  status          TEXT            NOT NULL DEFAULT 'ACTIVE'
                                    CHECK (status IN ('ACTIVE','WITHDRAWN','ACCEPTED','REJECTED','EXPIRED')),
  is_anonymous    BOOLEAN         NOT NULL DEFAULT true,
  contact_method  TEXT            DEFAULT 'KAKAO'
                                    CHECK (contact_method IN ('EMAIL','SMS','KAKAO','PHONE')),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_public_bids_listing
  ON public.public_bids (listing_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_bids_bidder
  ON public.public_bids (bidder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_bids_active_amount
  ON public.public_bids (listing_id, bid_amount DESC)
  WHERE status = 'ACTIVE';

COMMENT ON TABLE public.public_bids IS
  'Phase 1-M D8: 거래소 공개 입찰. bidder_name은 요약 뷰에서 마스킹됨.';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_public_bids_updated_at ON public.public_bids;
CREATE TRIGGER trg_public_bids_updated_at
  BEFORE UPDATE ON public.public_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- 3. 공개 요약 뷰 (누구나 SELECT 가능)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.public_bids_summary
WITH (security_invoker = true) AS
SELECT
  listing_id,
  COUNT(*) FILTER (WHERE status = 'ACTIVE')     AS active_count,
  COUNT(*)                                       AS total_count,
  MAX(bid_amount)  FILTER (WHERE status = 'ACTIVE') AS max_amount,
  MIN(bid_amount)  FILTER (WHERE status = 'ACTIVE') AS min_amount,
  ROUND(AVG(bid_amount) FILTER (WHERE status = 'ACTIVE'), 0) AS avg_amount,
  MAX(created_at)                                AS last_bid_at
FROM public.public_bids
GROUP BY listing_id;

COMMENT ON VIEW public.public_bids_summary IS
  'Phase 1-M D8: 공개 입찰 집계. bidder_id/name 비포함 — 누구나 안전하게 조회 가능.';

-- ──────────────────────────────────────────────────────────────────────────
-- 4. 라이선스/이름 마스킹 헬퍼 (차후 다른 곳에서도 재사용)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mask_bidder_name(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS $$
BEGIN
  IF name IS NULL OR length(trim(name)) = 0 THEN RETURN NULL; END IF;
  IF length(name) <= 1 THEN RETURN '*'; END IF;
  IF length(name) = 2 THEN RETURN substring(name, 1, 1) || '*'; END IF;
  RETURN substring(name, 1, 1) || repeat('*', length(name) - 2) || substring(name, length(name));
END$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RLS
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.public_bids ENABLE ROW LEVEL SECURITY;

-- 5-1. INSERT — 인증 사용자 본인 명의로만
DROP POLICY IF EXISTS public_bids_insert_self ON public.public_bids;
CREATE POLICY public_bids_insert_self ON public.public_bids
  FOR INSERT TO authenticated
  WITH CHECK (bidder_id = auth.uid());

-- 5-2. SELECT — 본인 입찰 OR 매도자 OR admin
DROP POLICY IF EXISTS public_bids_select_self_or_seller ON public.public_bids;
CREATE POLICY public_bids_select_self_or_seller ON public.public_bids
  FOR SELECT TO authenticated
  USING (
    bidder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.npl_listings l
      WHERE l.id = public_bids.listing_id
        AND l.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data ->> 'role') = 'SUPER_ADMIN'
    )
  );

-- 5-3. UPDATE — 본인은 withdraw만, 매도자는 accept/reject
DROP POLICY IF EXISTS public_bids_update_bidder ON public.public_bids;
CREATE POLICY public_bids_update_bidder ON public.public_bids
  FOR UPDATE TO authenticated
  USING (bidder_id = auth.uid())
  WITH CHECK (bidder_id = auth.uid());

DROP POLICY IF EXISTS public_bids_update_seller ON public.public_bids;
CREATE POLICY public_bids_update_seller ON public.public_bids
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.npl_listings l
      WHERE l.id = public_bids.listing_id
        AND l.seller_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 6. 권한
-- ──────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.public_bids_summary TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mask_bidder_name(TEXT) TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.public_bids TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. 검증 쿼리 (참고용)
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT public.mask_bidder_name('홍길동');    -- '홍*동'
-- SELECT public.mask_bidder_name('이');         -- '*'
-- SELECT public.mask_bidder_name('김철수');    -- '김*수'
-- SELECT * FROM public.public_bids_summary LIMIT 5;
