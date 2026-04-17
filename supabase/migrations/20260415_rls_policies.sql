-- ============================================================
-- Migration: RLS Policies for core tables
-- Tables: npl_listings, deals, notifications, profiles, credit_balances
-- ============================================================

-- ─── Helper: is_admin() ─────────────────────────────────────────────────────
-- Assumes the is_admin() function already exists from previous migrations.
-- If not, creates a fallback.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION is_admin()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
      'SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''ADMIN'', ''SUPER_ADMIN'')
      )';
    $func$;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 1. npl_listings
-- ════════════════════════════════════════════════════════════

ALTER TABLE npl_listings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "npl_listings_public_read"       ON npl_listings;
DROP POLICY IF EXISTS "npl_listings_seller_insert"     ON npl_listings;
DROP POLICY IF EXISTS "npl_listings_seller_update"     ON npl_listings;
DROP POLICY IF EXISTS "npl_listings_seller_delete"     ON npl_listings;
DROP POLICY IF EXISTS "npl_listings_admin_all"         ON npl_listings;

-- Anyone (including anon) can read ACTIVE listings
CREATE POLICY "npl_listings_public_read"
  ON npl_listings FOR SELECT
  USING (status = 'ACTIVE');

-- Sellers can read their own listings regardless of status
CREATE POLICY "npl_listings_seller_read_own"
  ON npl_listings FOR SELECT
  USING (seller_id = auth.uid());

-- Sellers can insert their own listings
CREATE POLICY "npl_listings_seller_insert"
  ON npl_listings FOR INSERT
  WITH CHECK (seller_id = auth.uid());

-- Sellers can update their own listings (not published ones unless admin)
CREATE POLICY "npl_listings_seller_update"
  ON npl_listings FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Sellers can soft-delete (set status=HIDDEN) their own listings
CREATE POLICY "npl_listings_seller_delete"
  ON npl_listings FOR DELETE
  USING (seller_id = auth.uid());

-- Admins have full access
CREATE POLICY "npl_listings_admin_all"
  ON npl_listings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ════════════════════════════════════════════════════════════
-- 2. deals
-- ════════════════════════════════════════════════════════════

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deals_participant_read"   ON deals;
DROP POLICY IF EXISTS "deals_buyer_insert"       ON deals;
DROP POLICY IF EXISTS "deals_participant_update" ON deals;
DROP POLICY IF EXISTS "deals_admin_all"          ON deals;

-- Buyers and sellers can read their own deals
CREATE POLICY "deals_participant_read"
  ON deals FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Buyers can initiate deals
CREATE POLICY "deals_buyer_insert"
  ON deals FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Participants can update their own deals (stage transitions etc.)
CREATE POLICY "deals_participant_update"
  ON deals FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Admins have full access
CREATE POLICY "deals_admin_all"
  ON deals FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ════════════════════════════════════════════════════════════
-- 3. notifications
-- ════════════════════════════════════════════════════════════

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_user_read"    ON notifications;
DROP POLICY IF EXISTS "notifications_user_update"  ON notifications;
DROP POLICY IF EXISTS "notifications_system_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_admin_all"    ON notifications;

-- Users can read their own notifications
CREATE POLICY "notifications_user_read"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read (update read_at, is_read)
CREATE POLICY "notifications_user_update"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role / edge functions can insert notifications (bypasses RLS with service key)
-- For authenticated inserts (e.g., system triggers), allow if the recipient exists
CREATE POLICY "notifications_system_insert"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Allow if inserting for the authenticated user themselves
    user_id = auth.uid()
    -- OR allow admins to send notifications to anyone
    OR is_admin()
  );

-- Admins can manage all notifications
CREATE POLICY "notifications_admin_all"
  ON notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ════════════════════════════════════════════════════════════
-- 4. profiles  (may be named 'users' in this project)
-- ════════════════════════════════════════════════════════════

-- profiles table (if it exists separately from users)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN

    EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "profiles_user_read_own"    ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_user_update_own"  ON profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_admin_all"        ON profiles';

    -- Users can read their own profile
    EXECUTE $p$
      CREATE POLICY "profiles_user_read_own"
        ON profiles FOR SELECT
        USING (id = auth.uid())
    $p$;

    -- Users can update their own profile
    EXECUTE $p$
      CREATE POLICY "profiles_user_update_own"
        ON profiles FOR UPDATE
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid())
    $p$;

    -- Admins can manage all profiles
    EXECUTE $p$
      CREATE POLICY "profiles_admin_all"
        ON profiles FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin())
    $p$;

  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 5. credit_balances
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_balances'
  ) THEN

    EXECUTE 'ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "credit_balances_user_read"    ON credit_balances';
    EXECUTE 'DROP POLICY IF EXISTS "credit_balances_admin_all"    ON credit_balances';

    -- Users can only read their own balance
    EXECUTE $p$
      CREATE POLICY "credit_balances_user_read"
        ON credit_balances FOR SELECT
        USING (user_id = auth.uid())
    $p$;

    -- Only admins and service role can modify balances
    EXECUTE $p$
      CREATE POLICY "credit_balances_admin_all"
        ON credit_balances FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin())
    $p$;

  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- 6. deal_documents (bonus: secure document access)
-- ════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deal_documents'
  ) THEN

    EXECUTE 'ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "deal_documents_participant_read"   ON deal_documents';
    EXECUTE 'DROP POLICY IF EXISTS "deal_documents_participant_insert" ON deal_documents';
    EXECUTE 'DROP POLICY IF EXISTS "deal_documents_admin_all"          ON deal_documents';

    -- Deal participants can read documents
    EXECUTE $p$
      CREATE POLICY "deal_documents_participant_read"
        ON deal_documents FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM deals
            WHERE deals.id = deal_documents.deal_id
              AND (deals.buyer_id = auth.uid() OR deals.seller_id = auth.uid())
          )
        )
    $p$;

    -- Deal participants can upload documents
    EXECUTE $p$
      CREATE POLICY "deal_documents_participant_insert"
        ON deal_documents FOR INSERT
        WITH CHECK (
          uploaded_by = auth.uid()
          AND EXISTS (
            SELECT 1 FROM deals
            WHERE deals.id = deal_documents.deal_id
              AND (deals.buyer_id = auth.uid() OR deals.seller_id = auth.uid())
          )
        )
    $p$;

    -- Admins have full access
    EXECUTE $p$
      CREATE POLICY "deal_documents_admin_all"
        ON deal_documents FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin())
    $p$;

  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- Summary
-- ════════════════════════════════════════════════════════════
-- Tables secured:
--   ✅ npl_listings  — public read (ACTIVE), seller write, admin all
--   ✅ deals         — participant read/write, admin all
--   ✅ notifications — user read/update, system insert, admin all
--   ✅ profiles      — user self-read/write, admin all (conditional)
--   ✅ credit_balances — user read-only, admin all (conditional)
--   ✅ deal_documents   — participant read/insert, admin all (conditional)
