-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1-M · Sprint 3 · D6 — 매도자 수수료율 개별 입력
-- ═══════════════════════════════════════════════════════════════════════════
-- 목적: 매도자가 매물 등록 시 희망 수수료율(0.3% ~ 0.9%)을 직접 입력할 수 있도록.
--
--   - 기본: 0.5% (INDIVIDUAL), 0.3% (INSTITUTIONAL 전속)
--   - 상한: 0.9% (프리미엄 노출 + 전담 매니저 포함)
--   - 범위: [0.003, 0.009]  (DB CHECK 제약)
--
-- 적용 테이블:
--   1) public.npl_listings      (canonical, Sprint 5~ 신규 매물)
--   2) public.deal_listings     (legacy compat view + 실 테이블이 있다면)
--
-- 호환성: NULL 허용 — 기존 행은 그대로 두고 fee-engine에서 rate null 시 기본값 사용.
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. npl_listings.seller_fee_rate
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='npl_listings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='npl_listings'
                     AND column_name='seller_fee_rate') THEN
      EXECUTE 'ALTER TABLE public.npl_listings ADD COLUMN seller_fee_rate NUMERIC(6,5) NULL';
      EXECUTE 'ALTER TABLE public.npl_listings ADD CONSTRAINT npl_listings_seller_fee_rate_range
               CHECK (seller_fee_rate IS NULL OR (seller_fee_rate >= 0.003 AND seller_fee_rate <= 0.009))';
      EXECUTE 'COMMENT ON COLUMN public.npl_listings.seller_fee_rate IS
               ''Phase 1-M D6: 매도자가 등록 시 입력한 희망 수수료율. 0.003(0.3%)~0.009(0.9%). NULL=기본(0.5%/0.3%).''';
    END IF;
  END IF;
END$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. deal_listings.seller_fee_rate  (legacy 실 테이블이 있을 때만)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='deal_listings'
               AND table_type='BASE TABLE') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='deal_listings'
                     AND column_name='seller_fee_rate') THEN
      EXECUTE 'ALTER TABLE public.deal_listings ADD COLUMN seller_fee_rate NUMERIC(6,5) NULL';
      EXECUTE 'ALTER TABLE public.deal_listings ADD CONSTRAINT deal_listings_seller_fee_rate_range
               CHECK (seller_fee_rate IS NULL OR (seller_fee_rate >= 0.003 AND seller_fee_rate <= 0.009))';
    END IF;
  END IF;
END$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. 검증 쿼리 (참고용)
-- ──────────────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='npl_listings' AND column_name='seller_fee_rate';
