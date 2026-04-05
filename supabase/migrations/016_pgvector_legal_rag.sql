-- Migration 016: pgvector + Legal RAG 임베딩 테이블
-- NPL 법률 문서 RAG 검색을 위한 벡터 DB 구성

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 법률 임베딩 테이블
CREATE TABLE IF NOT EXISTS legal_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 원본 문서 정보
  content     TEXT NOT NULL,           -- 청크 텍스트 (검색/컨텍스트에 활용)
  title       TEXT,                    -- 문서 제목
  source      TEXT NOT NULL,           -- 출처: 'civil_execution_act', 'npl_regulation', 'court_precedent', 'fss_guideline', 'custom'
  source_url  TEXT,                    -- 원본 URL (있을 경우)
  doc_id      TEXT,                    -- 원본 문서 ID (청크 그룹화용)
  chunk_index INTEGER DEFAULT 0,       -- 문서 내 청크 순서
  -- 임베딩
  embedding   vector(1536),            -- OpenAI text-embedding-3-small / Anthropic voyage-multilingual-2
  -- 검색 메타데이터
  category    TEXT,                    -- 'auction', 'npl_transfer', 'bankruptcy', 'tenant_rights', 'mortgage', 'tax_lien'
  tags        TEXT[] DEFAULT '{}',     -- 검색 태그
  language    TEXT DEFAULT 'ko',
  -- 관리
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat 인덱스 (코사인 유사도 기반)
-- lists=100 → 임베딩 1만건 미만에 적합
CREATE INDEX IF NOT EXISTS legal_embeddings_embedding_idx
  ON legal_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 카테고리 인덱스 (필터링용)
CREATE INDEX IF NOT EXISTS legal_embeddings_category_idx
  ON legal_embeddings (category);

-- 소스 인덱스
CREATE INDEX IF NOT EXISTS legal_embeddings_source_idx
  ON legal_embeddings (source);

-- doc_id 인덱스 (청크 그룹화)
CREATE INDEX IF NOT EXISTS legal_embeddings_doc_id_idx
  ON legal_embeddings (doc_id);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_legal_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_legal_embeddings_updated_at ON legal_embeddings;
CREATE TRIGGER set_legal_embeddings_updated_at
  BEFORE UPDATE ON legal_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_embeddings_updated_at();

-- ─── RAG 검색 함수 ───────────────────────────────────────────
-- 코사인 유사도 기반 K-NN 검색 + 카테고리 필터

CREATE OR REPLACE FUNCTION search_legal_embeddings(
  query_embedding  vector(1536),
  match_threshold  FLOAT DEFAULT 0.7,
  match_count      INT   DEFAULT 5,
  filter_category  TEXT  DEFAULT NULL
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  title      TEXT,
  source     TEXT,
  category   TEXT,
  tags       TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.content,
    le.title,
    le.source,
    le.category,
    le.tags,
    1 - (le.embedding <=> query_embedding) AS similarity
  FROM legal_embeddings le
  WHERE
    1 - (le.embedding <=> query_embedding) > match_threshold
    AND (filter_category IS NULL OR le.category = filter_category)
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── RAG 통계 뷰 ─────────────────────────────────────────────
CREATE OR REPLACE VIEW legal_embeddings_stats AS
SELECT
  source,
  category,
  COUNT(*) AS chunk_count,
  COUNT(DISTINCT doc_id) AS doc_count,
  MAX(created_at) AS last_updated
FROM legal_embeddings
GROUP BY source, category;

-- ─── RLS 정책 ────────────────────────────────────────────────
ALTER TABLE legal_embeddings ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 읽기 허용 (공개 접근 차단)
CREATE POLICY "auth_users_can_read_embeddings"
  ON legal_embeddings FOR SELECT
  TO authenticated
  USING (true);

-- 서비스 역할만 쓰기 허용
CREATE POLICY "service_role_can_write_embeddings"
  ON legal_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
