-- ============================================================
--  20260419: 딜룸 메시지 Realtime 퍼블리케이션 추가 + 읽음 처리
--  - deal_room_messages: postgres_changes 구독용으로 publication 등록
--  - deal_room_read_state: 참여자별 마지막 읽은 시점 저장
--  - REPLICA IDENTITY FULL — DELETE/UPDATE 시 OLD 로우 전체를 브로드캐스트
-- ============================================================

-- ─── 1. Publication 등록 (idempotent) ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deal_room_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deal_room_messages;
  END IF;
END $$;

ALTER TABLE deal_room_messages REPLICA IDENTITY FULL;

-- ─── 2. 읽음 처리 테이블 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_room_read_state (
  deal_room_id  UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_drrs_user
  ON deal_room_read_state(user_id, last_read_at DESC);

ALTER TABLE deal_room_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drrs_select_own ON deal_room_read_state;
CREATE POLICY drrs_select_own ON deal_room_read_state
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS drrs_upsert_own ON deal_room_read_state;
CREATE POLICY drrs_upsert_own ON deal_room_read_state
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS drrs_update_own ON deal_room_read_state;
CREATE POLICY drrs_update_own ON deal_room_read_state
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── 3. 미읽음 개수 함수 (단일 딜룸) ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_deal_room_unread_count(p_room UUID, p_user UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::int
  FROM deal_room_messages m
  LEFT JOIN deal_room_read_state r
    ON r.deal_room_id = m.deal_room_id AND r.user_id = p_user
  WHERE m.deal_room_id = p_room
    AND m.user_id <> p_user
    AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at);
$$;

COMMENT ON TABLE deal_room_read_state IS '참여자별 마지막 메시지 읽은 시각 (unread badge 계산용)';
