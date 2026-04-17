-- ─────────────────────────────────────────────────────────────────────────────
-- 021_deal_listings_compat_view.sql
-- Compatibility: makes deal_listings a view over npl_listings so that the
-- data-layer (which uses deal_listings) reads from the canonical table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Only create the view if deal_listings is NOT a real table
DO $$
BEGIN
  -- If deal_listings already exists as a real table, skip (backward-compat mode)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'deal_listings'
      AND table_type   = 'BASE TABLE'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW deal_listings AS
      SELECT
        id,
        seller_id,
        title,
        description,
        collateral_type,
        sido            AS collateral_region,
        address,
        NULL::text      AS location,
        NULL::text      AS location_detail,
        NULL::uuid      AS tenant_id,
        FALSE           AS is_featured,
        claim_amount    AS principal_amount,
        appraised_value,
        discount_rate,
        ai_grade        AS risk_grade,
        listing_type,
        status,
        visibility,
        view_count,
        interest_count,
        deadline,
        image_urls      AS images,
        0               AS asking_price_min,
        0               AS asking_price_max,
        ai_estimate_low,
        ai_estimate_high,
        0               AS validation_score,
        NULL::text      AS business_number,
        NULL::text      AS representative_name,
        NULL::text      AS institution,
        created_at,
        updated_at
      FROM npl_listings
    $view$;
  END IF;
END $$;
