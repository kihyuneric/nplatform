-- ============================================================
-- 008: 알림/공지/배너 확장 테이블
-- notifications, notices
-- 001의 banners 보완
-- ============================================================

-- ─── 알림 (notifications) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'MATCHING','CONTRACT','DEAL_ROOM','KYC','LISTING','ALERT',
    'SYSTEM','COMPLAINT','DEAL_UPDATE','NEW_LISTING','MATCH','PAYMENT','REFERRAL'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ─── 공지사항 (notices) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'GENERAL' CHECK (category IN ('GENERAL','MAINTENANCE','UPDATE','EVENT','IMPORTANT','REGULATION')),
  author_id UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  attachment_urls TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notices_category ON notices(category);
CREATE INDEX idx_notices_published ON notices(is_published, published_at DESC);
