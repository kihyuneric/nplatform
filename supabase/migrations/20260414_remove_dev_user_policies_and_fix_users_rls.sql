-- ============================================================
-- Migration: Remove dev_user hardcoded policies + fix users RLS
-- ============================================================

-- 1. Drop all "Dev user" policies that hardcode the dev UUID
DROP POLICY IF EXISTS "Dev user can manage cases" ON npl_cases;
DROP POLICY IF EXISTS "Dev user can manage assumptions" ON npl_case_assumptions;
DROP POLICY IF EXISTS "Dev user can manage properties" ON npl_case_properties;
DROP POLICY IF EXISTS "Dev user can manage rights" ON npl_case_rights;
DROP POLICY IF EXISTS "Dev user can manage tenants" ON npl_case_tenants;
DROP POLICY IF EXISTS "Dev user can manage distributions" ON npl_distributions;
DROP POLICY IF EXISTS "Dev user can manage returns" ON npl_returns;
DROP POLICY IF EXISTS "Dev user can manage sensitivity" ON npl_sensitivity;
DROP POLICY IF EXISTS "Dev user can manage auction history" ON npl_auction_history;

-- 2. Fix users table: remove overly permissive "Public profiles viewable" (qual: true)
--    Keep the scoped "Users can view own profile" policy
DROP POLICY IF EXISTS "Public profiles viewable" ON users;

-- 3. Add admin management policy for users table
CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Add user self-insert policy (for registration via auth trigger)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
