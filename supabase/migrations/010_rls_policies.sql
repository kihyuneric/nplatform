-- ============================================================
-- 010: RLS 정책 (002~009 테이블용)
-- 001에서 이미 설정된 테이블은 제외
-- ============================================================

-- ─── RLS 활성화 ─────────────────────────────────────────────

ALTER TABLE deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nda_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_directory_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- ─── 관리자 헬퍼 함수 ──────────────────────────────────────
-- 관리자 여부 확인 함수 (재사용)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 딜룸 정책 ──────────────────────────────────────────────

-- deal_rooms: 참여자 또는 생성자만 조회
CREATE POLICY deal_rooms_select ON deal_rooms FOR SELECT USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM deal_room_participants
    WHERE deal_room_id = deal_rooms.id AND user_id = auth.uid()
  )
  OR is_admin()
);
CREATE POLICY deal_rooms_insert ON deal_rooms FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY deal_rooms_update ON deal_rooms FOR UPDATE USING (created_by = auth.uid() OR is_admin());

-- deal_room_participants: 같은 딜룸 참여자만
CREATE POLICY deal_room_participants_select ON deal_room_participants FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM deal_room_participants drp
    WHERE drp.deal_room_id = deal_room_participants.deal_room_id AND drp.user_id = auth.uid()
  )
  OR is_admin()
);
CREATE POLICY deal_room_participants_insert ON deal_room_participants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM deal_rooms WHERE id = deal_room_participants.deal_room_id AND created_by = auth.uid()
  )
  OR is_admin()
);

-- deal_room_messages: 같은 딜룸 참여자만
CREATE POLICY deal_room_messages_select ON deal_room_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM deal_room_participants
    WHERE deal_room_id = deal_room_messages.deal_room_id AND user_id = auth.uid()
  )
  OR is_admin()
);
CREATE POLICY deal_room_messages_insert ON deal_room_messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM deal_room_participants
    WHERE deal_room_id = deal_room_messages.deal_room_id AND user_id = auth.uid()
  )
);

-- ─── NDA / 계약 정책 ────────────────────────────────────────

CREATE POLICY nda_agreements_select ON nda_agreements FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY nda_agreements_insert ON nda_agreements FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY contract_requests_select ON contract_requests FOR SELECT USING (
  buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin()
);
CREATE POLICY contract_requests_insert ON contract_requests FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY contract_requests_update ON contract_requests FOR UPDATE USING (
  buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin()
);

-- ─── 수요/매칭/AI 정책 ─────────────────────────────────────

CREATE POLICY demand_surveys_select ON demand_surveys FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY demand_surveys_insert ON demand_surveys FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY demand_surveys_update ON demand_surveys FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY matching_results_select ON matching_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM demand_surveys WHERE id = matching_results.survey_id AND user_id = auth.uid())
  OR is_admin()
);

CREATE POLICY ai_analysis_select ON ai_analysis_results FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY ai_analysis_insert ON ai_analysis_results FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── 관심/알림 설정 정책 ────────────────────────────────────

CREATE POLICY favorites_select ON favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY favorites_insert ON favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY favorites_delete ON favorites FOR DELETE USING (user_id = auth.uid());

CREATE POLICY alert_settings_select ON alert_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY alert_settings_insert ON alert_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY alert_settings_update ON alert_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY alert_settings_delete ON alert_settings FOR DELETE USING (user_id = auth.uid());

-- ─── 검색/동의 로그 정책 ───────────────────────────────────

CREATE POLICY search_logs_select ON search_logs FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY search_logs_insert ON search_logs FOR INSERT WITH CHECK (true); -- 비로그인도 가능

CREATE POLICY consent_logs_select ON consent_logs FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY consent_logs_insert ON consent_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── 전문가 정책 ────────────────────────────────────────────

-- professionals: 활성 전문가는 공개 조회, 수정은 본인만
CREATE POLICY professionals_select ON professionals FOR SELECT USING (
  status = 'ACTIVE' OR user_id = auth.uid() OR is_admin()
);
CREATE POLICY professionals_insert ON professionals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY professionals_update ON professionals FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY consultation_reviews_select ON consultation_reviews FOR SELECT USING (true); -- 리뷰는 공개
CREATE POLICY consultation_reviews_insert ON consultation_reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY institution_kyc_select ON institution_kyc_profiles FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY institution_kyc_insert ON institution_kyc_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY institution_kyc_update ON institution_kyc_profiles FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- ─── 쿠폰 정책 ─────────────────────────────────────────────

CREATE POLICY coupons_select ON coupons FOR SELECT USING (status = 'ACTIVE' OR is_admin());
CREATE POLICY coupons_insert ON coupons FOR INSERT WITH CHECK (is_admin());
CREATE POLICY coupons_update ON coupons FOR UPDATE USING (is_admin());

CREATE POLICY coupon_uses_select ON coupon_uses FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY coupon_uses_insert ON coupon_uses FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── 파트너 정책 ────────────────────────────────────────────

CREATE POLICY partners_select ON partners FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY partners_insert ON partners FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY partners_update ON partners FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY partner_settlements_select ON partner_settlements FOR SELECT USING (
  EXISTS (SELECT 1 FROM partners WHERE id = partner_settlements.partner_id AND user_id = auth.uid())
  OR is_admin()
);

-- ─── 커뮤니티 정책 ──────────────────────────────────────────

-- posts: 공개 게시글은 누구나 조회
CREATE POLICY posts_select ON posts FOR SELECT USING (
  status = 'PUBLISHED' OR author_id = auth.uid() OR is_admin()
);
CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY posts_update ON posts FOR UPDATE USING (author_id = auth.uid() OR is_admin());

CREATE POLICY post_comments_select ON post_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM posts WHERE id = post_comments.post_id AND (status = 'PUBLISHED' OR author_id = auth.uid()))
  OR is_admin()
);
CREATE POLICY post_comments_insert ON post_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY post_comments_update ON post_comments FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY post_likes_select ON post_likes FOR SELECT USING (true);
CREATE POLICY post_likes_insert ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY post_likes_delete ON post_likes FOR DELETE USING (user_id = auth.uid());

-- ─── 기관 디렉토리 정책 ────────────────────────────────────

-- institutions: 공개 조회
CREATE POLICY institutions_select ON institutions FOR SELECT USING (true);
CREATE POLICY institutions_insert ON institutions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY institutions_update ON institutions FOR UPDATE USING (is_admin());

CREATE POLICY institution_members_select ON institution_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM institution_members im WHERE im.institution_id = institution_members.institution_id AND im.user_id = auth.uid() AND im.role = 'TENANT_ADMIN')
  OR is_admin()
);
CREATE POLICY institution_members_insert ON institution_members FOR INSERT WITH CHECK (is_admin());

CREATE POLICY inst_dir_favorites_select ON institution_directory_favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY inst_dir_favorites_insert ON institution_directory_favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY inst_dir_favorites_delete ON institution_directory_favorites FOR DELETE USING (user_id = auth.uid());

-- ─── 알림/공지 정책 ────────────────────────────────────────

CREATE POLICY notifications_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (user_id = auth.uid()); -- is_read 업데이트용

-- notices: 공개된 공지는 누구나 조회
CREATE POLICY notices_select ON notices FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY notices_insert ON notices FOR INSERT WITH CHECK (is_admin());
CREATE POLICY notices_update ON notices FOR UPDATE USING (is_admin());

-- ─── 분석/설정/지원 정책 ───────────────────────────────────

CREATE POLICY analytics_events_select ON analytics_events FOR SELECT USING (is_admin());
CREATE POLICY analytics_events_insert ON analytics_events FOR INSERT WITH CHECK (true); -- 모든 사용자 이벤트 기록

CREATE POLICY user_preferences_select ON user_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_preferences_insert ON user_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_preferences_update ON user_preferences FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY support_tickets_select ON support_tickets FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY support_tickets_insert ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY support_tickets_update ON support_tickets FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY support_ticket_comments_select ON support_ticket_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = support_ticket_comments.ticket_id AND (user_id = auth.uid() OR is_admin()))
);
CREATE POLICY support_ticket_comments_insert ON support_ticket_comments FOR INSERT WITH CHECK (author_id = auth.uid());

-- auction_statistics, trade_prices: 공개 데이터
CREATE POLICY auction_stats_select ON auction_statistics FOR SELECT USING (true);
CREATE POLICY auction_stats_insert ON auction_statistics FOR INSERT WITH CHECK (is_admin());

CREATE POLICY trade_prices_select ON trade_prices FOR SELECT USING (true);
CREATE POLICY trade_prices_insert ON trade_prices FOR INSERT WITH CHECK (is_admin());

-- pipeline_runs: 관리자만
CREATE POLICY pipeline_runs_select ON pipeline_runs FOR SELECT USING (is_admin());
CREATE POLICY pipeline_runs_insert ON pipeline_runs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY pipeline_runs_update ON pipeline_runs FOR UPDATE USING (is_admin());
