-- 온톨로지 기반 커리큘럼 테이블 마이그레이션
-- myauction 스키마에 추가

-- 도메인 (최상위 분류)
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_domain (
  domain_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INT DEFAULT 0
);

-- 개념 노드 (온톨로지 핵심)
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_concept (
  concept_id SERIAL PRIMARY KEY,
  domain_id INT REFERENCES myauction.tb_ontology_domain(domain_id),
  parent_concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  keywords TEXT[],
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 개념 간 관계 (온톨로지 엣지)
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_relation (
  relation_id SERIAL PRIMARY KEY,
  source_concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  target_concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  relation_type VARCHAR(20) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  description TEXT
);

-- 유튜브 소스
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_youtube (
  youtube_id SERIAL PRIMARY KEY,
  video_id VARCHAR(20),
  channel_name VARCHAR(100),
  title VARCHAR(300),
  transcript TEXT,
  published_at TIMESTAMP,
  view_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 유튜브 <-> 개념 매핑 (N:M)
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_youtube_concept (
  id SERIAL PRIMARY KEY,
  youtube_id INT REFERENCES myauction.tb_ontology_youtube(youtube_id),
  concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  relevance FLOAT DEFAULT 1.0,
  timestamp_start INT,
  timestamp_end INT
);

-- 학습 경로
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_path (
  path_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_audience VARCHAR(100),
  estimated_hours INT,
  domain_id INT REFERENCES myauction.tb_ontology_domain(domain_id),
  sort_order INT DEFAULT 0
);

-- 학습 경로 단계
CREATE TABLE IF NOT EXISTS myauction.tb_ontology_path_step (
  step_id SERIAL PRIMARY KEY,
  path_id INT REFERENCES myauction.tb_ontology_path(path_id),
  concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  step_order INT NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  description TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ont_concept_domain ON myauction.tb_ontology_concept(domain_id);
CREATE INDEX IF NOT EXISTS idx_ont_concept_parent ON myauction.tb_ontology_concept(parent_concept_id);
CREATE INDEX IF NOT EXISTS idx_ont_relation_source ON myauction.tb_ontology_relation(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_ont_relation_target ON myauction.tb_ontology_relation(target_concept_id);
CREATE INDEX IF NOT EXISTS idx_ont_relation_type ON myauction.tb_ontology_relation(relation_type);
CREATE INDEX IF NOT EXISTS idx_ont_yt_concept ON myauction.tb_ontology_youtube_concept(concept_id);
CREATE INDEX IF NOT EXISTS idx_ont_path_step ON myauction.tb_ontology_path_step(path_id, step_order);

-- 시드 데이터: 5대 도메인
INSERT INTO myauction.tb_ontology_domain (name, description, icon, color, sort_order) VALUES
  ('내집마련', '생애 첫 주택 구매부터 갈아타기까지, 실거주 목적의 주택 취득 전략', 'Home', '#8B5CF6', 1),
  ('부동산', '부동산 투자의 기초 지식과 시장 분석, 세금, 법률 등 전반적인 부동산 지식', 'Building2', '#3B82F6', 2),
  ('경매', '법원 경매를 통한 부동산 취득 전략, 입찰, 권리분석, 명도 등', 'Gavel', '#EF4444', 3),
  ('공매', '캠코(온비드), 신탁공매, 국유재산 공매 등 공매를 통한 부동산 취득', 'Store', '#10B981', 4),
  ('부실채권', 'NPL(Non-Performing Loan) 매입, 배당분석, 유입/유찰 전략 등', 'FileText', '#F59E0B', 5)
ON CONFLICT DO NOTHING;
