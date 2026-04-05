-- ============================================================
-- 온톨로지 커리큘럼 v2 마이그레이션
-- 기존 테이블 DROP 후 재생성 (131개 개념 + 강의 제목/내용 + 레벨)
-- ============================================================

-- 기존 테이블 삭제 (의존성 순서)
DROP TABLE IF EXISTS myauction.tb_ontology_path_step CASCADE;
DROP TABLE IF EXISTS myauction.tb_ontology_path CASCADE;
DROP TABLE IF EXISTS myauction.tb_ontology_youtube_concept CASCADE;
DROP TABLE IF EXISTS myauction.tb_ontology_youtube CASCADE;
DROP TABLE IF EXISTS myauction.tb_ontology_relation CASCADE;
DROP TABLE IF EXISTS myauction.tb_ontology_concept CASCADE;
DROP TABLE IF EXISTS myauction.tb_ontology_domain CASCADE;

-- 1. 도메인 테이블
CREATE TABLE myauction.tb_ontology_domain (
  domain_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INT DEFAULT 0
);

-- 2. 개념 테이블 (v2: lecture_title, lecture_content, estimated_minutes, level 추가)
CREATE TABLE myauction.tb_ontology_concept (
  concept_id SERIAL PRIMARY KEY,
  domain_id INT REFERENCES myauction.tb_ontology_domain(domain_id),
  parent_concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  keywords TEXT[],
  summary TEXT,
  lecture_title VARCHAR(200),
  lecture_content TEXT,
  estimated_minutes INT DEFAULT 30,
  level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 관계 테이블
CREATE TABLE myauction.tb_ontology_relation (
  relation_id SERIAL PRIMARY KEY,
  source_concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  target_concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  relation_type VARCHAR(20) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  description TEXT
);

-- 4. 유튜브 소스 테이블
CREATE TABLE myauction.tb_ontology_youtube (
  youtube_id SERIAL PRIMARY KEY,
  video_id VARCHAR(20),
  channel_name VARCHAR(100),
  title VARCHAR(300),
  transcript TEXT,
  published_at TIMESTAMP,
  view_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 유튜브-개념 매핑 테이블
CREATE TABLE myauction.tb_ontology_youtube_concept (
  id SERIAL PRIMARY KEY,
  youtube_id INT REFERENCES myauction.tb_ontology_youtube(youtube_id),
  concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  relevance FLOAT DEFAULT 1.0,
  timestamp_start INT,
  timestamp_end INT
);

-- 6. 학습경로 테이블 (v2: level, prerequisites 추가)
CREATE TABLE myauction.tb_ontology_path (
  path_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_audience VARCHAR(100),
  estimated_hours INT,
  domain_id INT REFERENCES myauction.tb_ontology_domain(domain_id),
  sort_order INT DEFAULT 0,
  level VARCHAR(20),
  prerequisites TEXT[]
);

-- 7. 학습경로 단계 테이블
CREATE TABLE myauction.tb_ontology_path_step (
  step_id SERIAL PRIMARY KEY,
  path_id INT REFERENCES myauction.tb_ontology_path(path_id),
  concept_id INT REFERENCES myauction.tb_ontology_concept(concept_id),
  step_order INT NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  description TEXT
);

-- 인덱스
CREATE INDEX idx_ont_concept_domain ON myauction.tb_ontology_concept(domain_id);
CREATE INDEX idx_ont_concept_parent ON myauction.tb_ontology_concept(parent_concept_id);
CREATE INDEX idx_ont_concept_level ON myauction.tb_ontology_concept(level);
CREATE INDEX idx_ont_relation_source ON myauction.tb_ontology_relation(source_concept_id);
CREATE INDEX idx_ont_relation_target ON myauction.tb_ontology_relation(target_concept_id);
CREATE INDEX idx_ont_relation_type ON myauction.tb_ontology_relation(relation_type);
CREATE INDEX idx_ont_yt_concept ON myauction.tb_ontology_youtube_concept(concept_id);
CREATE INDEX idx_ont_path_step ON myauction.tb_ontology_path_step(path_id, step_order);
CREATE INDEX idx_ont_path_level ON myauction.tb_ontology_path(level);
