-- ─────────────────────────────────────────────────────────────────────────────
-- Phase G1 — debtor_type + special_conditions V2
-- 선행문서: docs/NPLatform_Refactor_Dev_Plan_2026Q2.md (Phase G1)
-- ─────────────────────────────────────────────────────────────────────────────
-- 목적:
--   1) npl_listings 에 debtor_type 컬럼 추가 (개인/법인 질권대출 LTV 분기)
--   2) npl_listings 에 special_conditions JSONB + special_conditions_version 추가
--   3) 기존 로우는 version=1 로 백필 (V1 25항목 legacy)
--
-- debtor_type 적용 범위:
--   - 매물등록·입찰등록: 입력/저장되지만 UI 가시화 X (G6 편집화면에서 수정 가능)
--   - 분석 보고서: 기본값 분기에 사용 (INDIVIDUAL=0.75, CORPORATE=0.90)
--
-- special_conditions_version:
--   1 = legacy 25항목 camelCase boolean 객체
--   2 = V2 18항목 { version: 2, checked: string[] } 구조
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. debtor_type ──────────────────────────────────────────────────────────
ALTER TABLE npl_listings
  ADD COLUMN IF NOT EXISTS debtor_type TEXT
    CHECK (debtor_type IN ('INDIVIDUAL', 'CORPORATE'));

COMMENT ON COLUMN npl_listings.debtor_type IS
  '채무자 유형 — 개인(INDIVIDUAL) / 법인(CORPORATE). 분석보고서 질권대출 LTV 기본값 분기 (개인 75% / 법인 90%).';

CREATE INDEX IF NOT EXISTS idx_npl_listings_debtor_type
  ON npl_listings(debtor_type);

-- ── 2. special_conditions (JSONB) + version ─────────────────────────────────
ALTER TABLE npl_listings
  ADD COLUMN IF NOT EXISTS special_conditions JSONB
    DEFAULT '{"version": 2, "checked": []}'::jsonb;

ALTER TABLE npl_listings
  ADD COLUMN IF NOT EXISTS special_conditions_version SMALLINT
    DEFAULT 2
    CHECK (special_conditions_version IN (1, 2));

COMMENT ON COLUMN npl_listings.special_conditions IS
  '특수조건 체크 상태. version=1 은 legacy 25항목 boolean 객체, version=2 는 { version: 2, checked: string[] } (18항목).';
COMMENT ON COLUMN npl_listings.special_conditions_version IS
  '스키마 버전 — 1 = 25항목 camelCase (deprecated), 2 = 18항목 × 3-버킷 (현행).';

-- ── 3. 기존 로우 백필 ───────────────────────────────────────────────────────
-- 기존 로우가 NULL 이면 version=1 로 간주 (legacy). Application 레이어의
-- lib/npl/unified-report/special-conditions-migration.ts#normalizeToV2Payload 가
-- 읽기 시 V1→V2 변환 수행.
UPDATE npl_listings
  SET special_conditions_version = 1
  WHERE special_conditions_version IS NULL
    AND created_at < NOW();  -- 이 마이그레이션 실행 시점 이전 로우만

-- ── 4. 무결성 조건 ─────────────────────────────────────────────────────────
-- special_conditions 가 NULL 이 되지 않도록 기본값 강제.
UPDATE npl_listings
  SET special_conditions = '{}'::jsonb
  WHERE special_conditions IS NULL;

-- ── 5. 인덱스 — 특수조건 버킷별 필터 가속 ──────────────────────────────────
-- GIN 인덱스 (checked 배열 안에 특정 key 포함 여부 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_npl_listings_special_conditions_gin
  ON npl_listings USING GIN ((special_conditions -> 'checked'));
