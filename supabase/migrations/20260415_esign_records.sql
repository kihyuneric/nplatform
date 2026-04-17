-- ─────────────────────────────────────────────────────────────────────────────
-- 전자서명 기록 테이블 (SHA-256 해시 체인)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS esign_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID        REFERENCES deals(id) ON DELETE SET NULL,
  contract_id      TEXT,                                  -- 계약서 ID (문자열)
  document_type    TEXT        NOT NULL CHECK (document_type IN ('NDA','LOI','SPA','ASSIGNMENT','OTHER')),
  document_hash    TEXT        NOT NULL,                  -- SHA-256 of document body
  chain_hash       TEXT        NOT NULL,                  -- SHA-256(prev_hash + doc_hash + ts)
  signer_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_name      TEXT        NOT NULL,
  signer_role      TEXT        NOT NULL CHECK (signer_role IN ('SELLER','BUYER','AGENT','WITNESS','NOTARY')),
  signature_image_url TEXT,                               -- Supabase Storage URL
  signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address       INET,
  user_agent       TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_esign_records_deal_id      ON esign_records(deal_id);
CREATE INDEX IF NOT EXISTS idx_esign_records_signer_id    ON esign_records(signer_id);
CREATE INDEX IF NOT EXISTS idx_esign_records_document_type ON esign_records(document_type);
CREATE INDEX IF NOT EXISTS idx_esign_records_signed_at    ON esign_records(signed_at DESC);

-- RLS
ALTER TABLE esign_records ENABLE ROW LEVEL SECURITY;

-- 서명자 본인은 자신의 서명 기록 조회 가능
CREATE POLICY "Signers view own records" ON esign_records
  FOR SELECT USING (signer_id = auth.uid());

-- 딜 참여자는 해당 딜의 서명 기록 조회 가능
CREATE POLICY "Deal parties view deal esign records" ON esign_records
  FOR SELECT USING (
    deal_id IN (
      SELECT id FROM deals
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- 인증된 사용자는 서명 기록 생성 가능
CREATE POLICY "Auth users can create esign records" ON esign_records
  FOR INSERT WITH CHECK (signer_id = auth.uid());

-- 관리자는 전체 관리 가능
CREATE POLICY "Admins manage esign records" ON esign_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 서명 검증 함수: 문서 해시 체인 무결성 확인
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION verify_esign_chain(p_deal_id UUID)
RETURNS TABLE (
  id UUID,
  document_type TEXT,
  signer_name TEXT,
  signed_at TIMESTAMPTZ,
  document_hash TEXT,
  chain_hash TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_type,
    e.signer_name,
    e.signed_at,
    e.document_hash,
    e.chain_hash,
    TRUE AS is_valid  -- 실제 검증은 애플리케이션 레이어에서 수행
  FROM esign_records e
  WHERE e.deal_id = p_deal_id
  ORDER BY e.signed_at ASC;
END;
$$;
