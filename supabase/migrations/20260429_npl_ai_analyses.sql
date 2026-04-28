-- Phase G7+ 2026-04-29 — npl_ai_analyses 테이블 정식화
--
-- 사용자 정책:
--   매물등록 → NPL 분석 자동 / 수정 시 분석/보고서/딜룸 자동 동기화 / 하드코딩 금지
--
-- 본 migration:
--   1) npl_ai_analyses 테이블 생성 (IF NOT EXISTS — 운영 dashboard 로 만든 경우 보호)
--   2) unified_report JSONB 컬럼 추가 (보고서 전체 영구 저장)
--   3) RLS 정책: 본인 row 만 select/update/delete · auth user 만 insert
--   4) listing_id · user_id · created_at 인덱스
--   5) Supabase Realtime publication 등록 (postgres_changes 구독)

-- ─── 1. 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.npl_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.npl_listings(id) ON DELETE SET NULL,

  -- 핵심 KPI
  grade TEXT,                      -- A+/A/B+/B/C/D/F (UI verdict)
  risk_score NUMERIC(5,2),         -- 0~100
  recommendation TEXT,             -- BUY / HOLD / AVOID

  -- 통계 컨텍스트 (옵션)
  bid_rate_stats JSONB,            -- 낙찰가율
  court_info JSONB,                -- 법원 정보
  similar_cases JSONB,             -- 인근 경매 사례
  transaction_cases JSONB,         -- 인근 실거래
  risk_factors JSONB,              -- 리스크 4팩터 raw

  -- Phase G7+ 2026-04-29 신규 — 통합 보고서 전체 (UnifiedAnalysisReport JSON)
  unified_report JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. unified_report 컬럼 (이미 테이블이 있는 경우 보호) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'npl_ai_analyses'
      AND column_name = 'unified_report'
  ) THEN
    ALTER TABLE public.npl_ai_analyses ADD COLUMN unified_report JSONB;
  END IF;
END $$;

-- ─── 3. 인덱스 ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_npl_ai_analyses_listing_id
  ON public.npl_ai_analyses(listing_id);
CREATE INDEX IF NOT EXISTS idx_npl_ai_analyses_user_id
  ON public.npl_ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_npl_ai_analyses_created_at
  ON public.npl_ai_analyses(created_at DESC);
-- 매물별 가장 최근 분석 (PATCH 시 lookup) 용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_npl_ai_analyses_listing_recent
  ON public.npl_ai_analyses(listing_id, created_at DESC);

-- ─── 4. updated_at 자동 갱신 트리거 ─────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_npl_ai_analyses_updated ON public.npl_ai_analyses;
CREATE TRIGGER trg_npl_ai_analyses_updated
  BEFORE UPDATE ON public.npl_ai_analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. RLS 정책 ────────────────────────────────────────────
ALTER TABLE public.npl_ai_analyses ENABLE ROW LEVEL SECURITY;

-- 자기 행 조회
DROP POLICY IF EXISTS "npl_ai_analyses_select_own" ON public.npl_ai_analyses;
CREATE POLICY "npl_ai_analyses_select_own"
  ON public.npl_ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- 매물 소유자도 자기 매물의 분석은 조회 가능 (딜룸/보고서 동기화)
DROP POLICY IF EXISTS "npl_ai_analyses_select_listing_owner" ON public.npl_ai_analyses;
CREATE POLICY "npl_ai_analyses_select_listing_owner"
  ON public.npl_ai_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.npl_listings l
      WHERE l.id = npl_ai_analyses.listing_id
        AND l.seller_id = auth.uid()
    )
  );

-- 본인 row INSERT
DROP POLICY IF EXISTS "npl_ai_analyses_insert_own" ON public.npl_ai_analyses;
CREATE POLICY "npl_ai_analyses_insert_own"
  ON public.npl_ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 row UPDATE
DROP POLICY IF EXISTS "npl_ai_analyses_update_own" ON public.npl_ai_analyses;
CREATE POLICY "npl_ai_analyses_update_own"
  ON public.npl_ai_analyses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 row DELETE
DROP POLICY IF EXISTS "npl_ai_analyses_delete_own" ON public.npl_ai_analyses;
CREATE POLICY "npl_ai_analyses_delete_own"
  ON public.npl_ai_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 6. Realtime publication ───────────────────────────────
-- supabase_realtime publication 에 테이블 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.npl_ai_analyses;
    EXCEPTION
      WHEN duplicate_object THEN
        -- 이미 publication 에 있음 — 무시
        NULL;
    END;
  END IF;
END $$;

COMMENT ON TABLE public.npl_ai_analyses IS
  'Phase G7+ NPL AI 분석 결과 — listing 변경 시 자동 재계산 → 보고서/딜룸 동기화';
COMMENT ON COLUMN public.npl_ai_analyses.unified_report IS
  'UnifiedAnalysisReport JSON 전체 — buildListingReport(listing) 결과 또는 사용자 위저드 결과';
