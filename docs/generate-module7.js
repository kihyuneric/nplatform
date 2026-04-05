const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };

const heading = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, children: [new TextRun(text)] });
const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });
const bold = (text) => new TextRun({ text, bold: true, font: "Arial", size: 22 });
const run = (text, opts = {}) => new TextRun({ text, font: "Arial", size: 22, ...opts });

const headerCell = (text, w) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: { fill: C.navy, type: ShadingType.CLEAR }, verticalAlign: "center",
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })]
});
const cell = (text, w, opts = {}) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...opts })] })]
});
const multiCell = (texts, w, opts = {}) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  children: texts.map(t => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(t), font: "Arial", size: 20, ...opts })] }))
});
const makeTable = (headers, rows, colWidths) => {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: colWidths,
    rows: [ new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => {
        if (Array.isArray(c)) return multiCell(c, colWidths[i]);
        if (typeof c === "object" && c.text) return cell(c.text, colWidths[i], c);
        return cell(c, colWidths[i]);
      }) })) ] });
};

const numbering = { config: [
  { reference: "bullets", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
  ]},
  { reference: "numbers", levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
  ]}
]};
const bullet = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const bullet2 = (t) => new Paragraph({ numbering: { reference: "bullets", level: 1 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => new Paragraph({ spacing: { after: 200 } });

// ══════════════════════════════════════════════════════════════
const children = [];

// ── COVER ──
children.push(new Paragraph({ spacing: { before: 3000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Module 7", font: "Arial", size: 48, color: C.blue })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "대시보드/통계/관리자 + 모니터링 세부 기획서", font: "Arial", size: 32, color: C.gray })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
children.push(new Paragraph({ spacing: { before: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Version 2.0 | 2026.03.13 | Figma: 대시보드, 통계, 관리자", { color: C.gray })] }));
children.push(pageBreak());
children.push(heading("목차"));
children.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 1. 모듈 개요
// ══════════════════════════════════════════════════════════════
children.push(heading("1. 모듈 개요"));
children.push(p([run("플랫폼 운영 관리 + 경공매 통계 서비스 + 시스템 모니터링 모듈입니다. 관리자는 RBAC 기반으로 전체 플랫폼을 관리하고, 불변 감사 로그로 모든 관리 활동을 추적합니다. 경공매 통계는 모든 사용자에게 공개됩니다.")]));

children.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["라우트", "페이지명", "권한", "설명"],
  [
    ["/admin", "관리자 대시보드", "ADMIN, SUPER_ADMIN", "KPI, 차트, 긴급 알림, SLA 트래킹"],
    ["/admin/users", "사용자 관리", "ADMIN, SUPER_ADMIN", "전체 사용자 CRUD + 역할 변경"],
    ["/admin/kyc", "KYC 심사", "ADMIN, SUPER_ADMIN", "기관 가입 심사 큐 (72시간 SLA)"],
    ["/admin/listings", "매물 관리", "ADMIN, SUPER_ADMIN", "매물 검수 + 추천 설정 (48시간 SLA)"],
    ["/admin/audit-logs", "감사 로그", "SUPER_ADMIN", "불변 감사 로그 조회 (검색/필터)"],
    ["/admin/complaints", "민원 관리", "ADMIN, SUPER_ADMIN", "민원 접수/처리 (14영업일 SLA)"],
    ["/admin/system", "시스템 모니터링", "SUPER_ADMIN", "API 상태, DB, 파이프라인, 알림"],
    ["/admin/settings", "시스템 설정", "SUPER_ADMIN", "수수료/API키/알림 템플릿"],
    ["/statistics", "경공매 통계", "Public", "법원별/유형별/지역별 통계"],
    ["/statistics/trend", "추이 분석", "Public", "기간별 추이 + 지역 히트맵"],
  ],
  [1800, 1200, 1500, 4860]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 2. RBAC (역할 기반 접근 제어)
// ══════════════════════════════════════════════════════════════
children.push(heading("2. RBAC (역할 기반 접근 제어)"));

children.push(heading("2.1 역할별 관리 권한 매트릭스", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["기능", "SUPER_ADMIN", "ADMIN", "비고"],
  [
    ["사용자 조회", "O", "O", "전체 사용자"],
    ["사용자 역할 변경", "O", "X", "SUPER_ADMIN만"],
    ["사용자 정지/해제", "O", "O", ""],
    ["사용자 삭제", "O", "X", "SUPER_ADMIN만 (익명화)"],
    ["KYC 심사 (승인/반려)", "O", "O", ""],
    ["매물 검수 (승인/반려)", "O", "O", ""],
    ["매물 추천 설정", "O", "O", "is_featured 토글"],
    ["감사 로그 조회", "O", "X", "SUPER_ADMIN만"],
    ["민원 처리", "O", "O", ""],
    ["시스템 모니터링", "O", "X", "SUPER_ADMIN만"],
    ["시스템 설정 변경", "O", "X", "SUPER_ADMIN만"],
    ["관리자 계정 생성", "O", "X", "SUPER_ADMIN만"],
  ],
  [2500, 1200, 1200, 4460]
));
children.push(spacer());

children.push(heading("2.2 RBAC 구현", HeadingLevel.HEADING_2));
children.push(code("// middleware.ts - 관리자 페이지 접근 제어"));
children.push(code("if (pathname.startsWith('/admin')) {"));
children.push(code("  const user = await getUser(supabase);"));
children.push(code("  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {"));
children.push(code("    return NextResponse.redirect('/');"));
children.push(code("  }"));
children.push(code("  // SUPER_ADMIN 전용 페이지 체크"));
children.push(code("  const superOnlyPaths = ['/admin/audit-logs', '/admin/system', '/admin/settings'];"));
children.push(code("  if (superOnlyPaths.some(p => pathname.startsWith(p)) && user.role !== 'SUPER_ADMIN') {"));
children.push(code("    return NextResponse.redirect('/admin');"));
children.push(code("  }"));
children.push(code("}"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 3. 관리자 대시보드
// ══════════════════════════════════════════════════════════════
children.push(heading("3. 관리자 대시보드"));

children.push(heading("3.1 KPI 카드", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["KPI", "계산 SQL", "업데이트", "색상/긴급도"],
  [
    ["오늘 신규 가입", "COUNT(users WHERE created_at::date = today)", "실시간", "Blue"],
    ["신규 매물", "COUNT(listings WHERE created_at::date = today)", "실시간", "Green"],
    ["KYC 대기", "COUNT(WHERE kyc_status = 'PENDING')", "실시간", "Orange (3건+ 시 Red)"],
    ["검수 대기", "COUNT(WHERE status = 'PENDING_REVIEW')", "실시간", "Orange (5건+ 시 Red)"],
    ["활성 딜룸", "COUNT(deal_rooms WHERE status = 'ACTIVE')", "실시간", "Purple"],
    ["이번달 거래액", "SUM(contract_requests.amount WHERE COMPLETED 이번달)", "일 1회", "Navy"],
    ["민원 미처리", "COUNT(complaints WHERE status = 'OPEN')", "실시간", "Red (1건+ 시)"],
    ["SLA 초과", "KYC 72h + 매물 48h + 민원 14일 초과 건수", "실시간", "Red (1건+ 시)"],
  ],
  [1200, 3000, 800, 4360]
));
children.push(spacer());

children.push(heading("3.2 차트", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["차트", "타입", "데이터", "기간", "인터랙션"],
  [
    ["사용자 증가", "Area Chart", "일별 가입자 (역할별 색상)", "30일", "호버 → 상세"],
    ["매물 등록/완료", "Stacked Bar", "일별 등록/완료/삭제", "30일", "클릭 → 필터"],
    ["마켓별 비율", "Donut", "3대 마켓 매물 비율", "현재", "호버 → %"],
    ["거래액 추이", "Line", "월별 거래 완료 금액", "12개월", "줌/브러시"],
    ["전환 퍼널", "Funnel", "검색→상세→관심→계약→완료", "30일", "단계별 %"],
  ],
  [1200, 1000, 2200, 800, 4160]
));
children.push(spacer());

children.push(heading("3.3 SLA 트래킹 위젯", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["SLA 항목", "기준", "표시 내용", "자동 액션"],
  [
    ["KYC 심사", "72시간", "대기 건수 / 초과 건수 / 평균 처리시간", "초과 시 SUPER_ADMIN 이메일"],
    ["매물 검수", "48시간", "대기 건수 / 초과 건수 / 검수 완료율", "초과 시 ADMIN 알림"],
    ["민원 처리", "14영업일", "접수/처리중/완료 건수 / 초과 건수", "7일 경과 시 에스컬레이션"],
    ["계약 응답", "72시간", "매각사 미응답 건수", "48시간 경과 시 리마인더 발송"],
  ],
  [1000, 700, 3500, 4160]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 4. 사용자 관리 + KYC 심사
// ══════════════════════════════════════════════════════════════
children.push(heading("4. 사용자 관리"));

children.push(heading("4.1 사용자 목록 테이블", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["컬럼", "내용", "정렬/필터", "액션"],
  [
    ["이름", "pgcrypto 복호화 후 표시", "가나다순", "-"],
    ["이메일", "이메일 주소 (마스킹: a***@gmail.com)", "-", "복사"],
    ["역할", "역할 뱃지 (색상 구분)", "역할별 필터", "SUPER: 변경"],
    ["기관명", "기관투자자/금융기관만", "-", "-"],
    ["가입일", "YYYY.MM.DD", "최신순 기본", "-"],
    ["상태", "활성/비활성/정지 뱃지", "상태별 필터", "정지/해제"],
    ["KYC", "승인/대기/반려/미신청", "KYC 필터", "상세 보기"],
    ["MFA", "활성/비활성", "-", "-"],
    ["최근 활동", "최근 로그인 일시", "-", "-"],
  ],
  [800, 2200, 1500, 4860]
));
children.push(spacer());

children.push(heading("4.2 KYC 심사 화면", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["영역", "내용", "컴포넌트"],
  [
    ["심사 큐", "대기 목록 (접수순), 긴급도 표시 (SLA 기준)", "KycQueue (테이블 + 배지)"],
    ["신청 정보", "기관명, 유형, 사업자번호, 대표자, 담당자", "KycApplicationDetail"],
    ["첨부 서류", "사업자등록증 + 금융업 라이선스 PDF 뷰어", "PdfViewer (react-pdf)"],
    ["자동 검증", "국세청 API 결과 표시 (유효/무효/폐업)", "VerificationBadge"],
    ["심사 액션", "승인(Green) / 반려(Red, 사유 필수)", "ApproveRejectButtons"],
    ["심사 이력", "이전 심사 기록 (반려→재신청 이력)", "KycHistory (타임라인)"],
  ],
  [1000, 3500, 4860]
));
children.push(spacer());

children.push(heading("4.3 KYC 심사 API", HeadingLevel.HEADING_2));
children.push(code("GET /api/v1/admin/kyc?status=PENDING&sort=created_at_asc&cursor=xxx"));
children.push(code("  Response: { data: KycApplication[], next_cursor, total }"));
children.push(spacer());
children.push(code("GET /api/v1/admin/kyc/:id"));
children.push(code("  Response: { application: KycApplication, verification: NtsResult, history: KycEvent[] }"));
children.push(spacer());
children.push(code("POST /api/v1/admin/kyc/:id/approve"));
children.push(code("  Response: { approved: true, user_id, new_role }"));
children.push(code("  → 자동: users.kyc_status = 'APPROVED', role 업데이트, 이메일 알림, audit_log"));
children.push(spacer());
children.push(code("POST /api/v1/admin/kyc/:id/reject"));
children.push(code("  Request: { reason: string }  // 필수"));
children.push(code("  Response: { rejected: true }"));
children.push(code("  → 자동: users.kyc_status = 'REJECTED', 사유 이메일 발송, audit_log"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 5. 매물 관리 (검수)
// ══════════════════════════════════════════════════════════════
children.push(heading("5. 매물 관리 (검수)"));

children.push(makeTable(
  ["기능", "상세", "API"],
  [
    ["검수 대기 목록", "PENDING_REVIEW 상태 매물 (접수순, SLA 표시)", "GET /api/v1/admin/listings?status=PENDING_REVIEW"],
    ["검수 상세", "매물 전체 정보 미리보기 (실제 게시 화면과 동일)", "GET /api/v1/admin/listings/:id"],
    ["검수 체크리스트", "필수 정보 완성도, 이미지 품질, 가격 적정성, 중복 여부", "자동 체크 + 수동 확인"],
    ["승인", "status → ACTIVE, 매각사에 승인 알림", "POST /api/v1/admin/listings/:id/approve"],
    ["반려", "status → REJECTED, 사유 입력 + 수정 안내", "POST /api/v1/admin/listings/:id/reject"],
    ["수정 요청", "특정 필드 수정 요청 + 코멘트 (거절 안함)", "POST /api/v1/admin/listings/:id/request-edit"],
    ["추천 설정", "is_featured = true + 만료일 설정 (홈 노출)", "PATCH /api/v1/admin/listings/:id/feature"],
  ],
  [1200, 3500, 4660]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 6. 불변 감사 로그
// ══════════════════════════════════════════════════════════════
children.push(heading("6. 불변 감사 로그 (Immutable Audit Logs)"));
children.push(p([bold("전자금융거래법 준수 - 모든 관리 활동을 불변 기록으로 5년 보관:")]));

children.push(heading("6.1 감사 대상 액션", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["카테고리", "액션", "기록 내용"],
  [
    ["사용자", "USER_ROLE_CHANGE, USER_SUSPEND, USER_DELETE", "대상 유저, 이전/이후 값, 사유"],
    ["KYC", "KYC_APPROVE, KYC_REJECT", "대상 기관, 검증 결과, 사유"],
    ["매물", "LISTING_APPROVE, LISTING_REJECT, LISTING_FEATURE", "대상 매물, 이전/이후 상태"],
    ["계약", "CONTRACT_STATUS_CHANGE", "계약ID, 이전/이후 상태, 변경자"],
    ["시스템", "SETTINGS_CHANGE, API_KEY_ROTATE", "변경 항목, 이전/이후 값"],
    ["보안", "MFA_UNENROLL, LOGIN_LOCKOUT, SUSPICIOUS_ACTIVITY", "대상 유저, IP, 상세"],
    ["데이터", "DATA_EXPORT, DATA_DELETE, BACKFILL_RUN", "데이터 범위, 건수"],
  ],
  [1000, 3500, 4860]
));
children.push(spacer());

children.push(heading("6.2 감사 로그 테이블 (INSERT-ONLY)", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE audit_logs ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id),     -- 수행자"));
children.push(code("  action TEXT NOT NULL,                            -- 액션 코드"));
children.push(code("  entity_type TEXT NOT NULL,                       -- USER | LISTING | CONTRACT | SYSTEM"));
children.push(code("  entity_id UUID,                                 -- 대상 ID"));
children.push(code("  old_value JSONB,                                -- 변경 전 값"));
children.push(code("  new_value JSONB,                                -- 변경 후 값"));
children.push(code("  metadata JSONB,                                 -- 추가 정보 (사유 등)"));
children.push(code("  ip_address INET NOT NULL,"));
children.push(code("  user_agent TEXT,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(spacer());
children.push(code("-- 불변성 보장: UPDATE/DELETE 차단 RLS"));
children.push(code("ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;"));
children.push(code("CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (true);"));
children.push(code("CREATE POLICY audit_select ON audit_logs FOR SELECT"));
children.push(code("  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));"));
children.push(code("-- UPDATE, DELETE 정책 없음 = 차단"));
children.push(spacer());
children.push(code("-- 인덱스"));
children.push(code("CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);"));
children.push(code("CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);"));
children.push(code("CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);"));
children.push(spacer());

children.push(heading("6.3 감사 로그 조회 UI", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["필터", "타입", "옵션"],
  [
    ["기간", "Date Range Picker", "최근 7일 / 30일 / 90일 / 직접 입력"],
    ["액션", "Multi-select", "전체 액션 코드 목록"],
    ["수행자", "검색 (Autocomplete)", "관리자 이름/이메일 검색"],
    ["대상 유형", "Select", "USER / LISTING / CONTRACT / SYSTEM"],
    ["대상 ID", "UUID 입력", "특정 엔티티 추적"],
  ],
  [1000, 2000, 6360]
));
children.push(bullet("결과: 테이블 (시간, 수행자, 액션, 대상, 상세) + JSON 상세 보기 모달"));
children.push(bullet("내보내기: CSV 다운로드 (감사 용도)"));
children.push(bullet("보관: 5년 (전자금융거래법), pg_cron으로 5년 초과 데이터 아카이빙"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 7. 민원 관리
// ══════════════════════════════════════════════════════════════
children.push(heading("7. 민원 관리"));
children.push(p([bold("금융소비자보호법 - 접수 → 14영업일 내 처리 → 결과 통보:")]));

children.push(makeTable(
  ["기능", "상세", "API"],
  [
    ["민원 접수", "사용자: /mypage/complaint 또는 이메일/전화", "POST /api/v1/complaints"],
    ["민원 목록", "관리자: 접수일순, 상태별 필터, SLA 긴급도", "GET /api/v1/admin/complaints"],
    ["민원 상세", "민원 내용, 첨부파일, 관련 거래, 처리 이력", "GET /api/v1/admin/complaints/:id"],
    ["처리", "답변 작성 + 상태 변경 (처리중→완료)", "PATCH /api/v1/admin/complaints/:id"],
    ["결과 통보", "이메일 + 인앱 알림으로 처리 결과 전달", "자동 (상태 변경 시)"],
    ["에스컬레이션", "7영업일 경과 시 SUPER_ADMIN 알림", "자동 (pg_cron 체크)"],
  ],
  [1000, 3500, 4860]
));
children.push(spacer());

children.push(code("CREATE TABLE complaints ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
children.push(code("  category TEXT NOT NULL CHECK (category IN ('SERVICE','TRANSACTION','TECHNICAL','OTHER')),"));
children.push(code("  title TEXT NOT NULL,"));
children.push(code("  content TEXT NOT NULL,"));
children.push(code("  attachments JSONB DEFAULT '[]',      -- [{url, name, size}]"));
children.push(code("  related_entity_type TEXT,             -- CONTRACT | LISTING | DEAL_ROOM"));
children.push(code("  related_entity_id UUID,"));
children.push(code("  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),"));
children.push(code("  assigned_to UUID REFERENCES users(id),"));
children.push(code("  resolution TEXT,                      -- 처리 결과"));
children.push(code("  resolved_at TIMESTAMPTZ,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 8. 시스템 모니터링 (/admin/system)
// ══════════════════════════════════════════════════════════════
children.push(heading("8. 시스템 모니터링 대시보드"));
children.push(p([bold("SUPER_ADMIN 전용 - 시스템 헬스, 데이터 파이프라인, 비즈니스 KPI 통합 모니터링:")]));

children.push(heading("8.1 시스템 헬스", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["지표", "데이터 소스", "표시", "알림 기준"],
  [
    ["API 응답시간", "Sentry / Vercel Analytics", "P50/P95/P99 실시간 차트", "P95 > 1s → P2"],
    ["에러율", "Sentry", "4xx/5xx 비율 (시간대별 차트)", "5xx > 5% → P1"],
    ["활성 세션", "Supabase Auth", "현재 로그인 사용자 수", "정보 표시만"],
    ["DB 연결", "Supabase Dashboard API", "연결 수 / 최대 연결, 풀 사용률", "> 80% → P2"],
    ["느린 쿼리", "pg_stat_statements", "실행시간 Top 10 쿼리", "> 3s → P2"],
    ["Storage 사용량", "Supabase Storage API", "사용량 / 한도 (%, 바 차트)", "> 80% → P2"],
  ],
  [1200, 2000, 2800, 3360]
));
children.push(spacer());

children.push(heading("8.2 데이터 파이프라인 상태", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["파이프라인", "스케줄", "표시 내용", "실패 시"],
  [
    ["대법원 경매정보", "매일 03:00", "마지막 실행 시각, 수집 건수, 소요시간", "재실행 버튼 + 에러 로그"],
    ["캠코 온비드", "매일 04:00", "마지막 실행 시각, 수집 건수, 소요시간", "재실행 버튼 + 에러 로그"],
    ["국토부 실거래가", "매월 1일", "마지막 실행 시각, 수집 건수", "재실행 버튼 + 에러 로그"],
    ["매칭 엔진 배치", "매일 02:00", "처리 설문 수, 매칭 건수, 소요시간", "재실행 버튼"],
    ["알림 발송 큐", "실시간", "대기 건수, 실패율, 마지막 발송 시각", "큐 초기화 버튼"],
  ],
  [1200, 800, 3500, 3860]
));
children.push(spacer());

children.push(heading("8.3 비즈니스 KPI (실시간)", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["KPI", "쿼리", "차트 타입"],
  [
    ["오늘 가입/매물/계약/매칭", "각 테이블 COUNT WHERE today", "4-Card (숫자 + 전일 비교)"],
    ["전환 퍼널", "검색→상세→관심→계약 전환율", "Funnel Chart"],
    ["매칭 엔진", "평균 점수, 80+ 비율, 관심등록 전환율", "Gauge + Number"],
    ["수익", "이번달 거래완료 금액, 수수료 수입", "Number + Line (추이)"],
  ],
  [2000, 3500, 3860]
));
children.push(spacer());

children.push(heading("8.4 알림 설정", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["등급", "조건", "채널", "대응 시간"],
  [
    ["P1 (긴급)", "API 에러율 > 5%, 서버 다운, DB 연결 실패", "Slack (즉시) + 이메일 + SMS", "15분 이내"],
    ["P2 (주의)", "느린 쿼리 > 3s, Storage 80%+, SLA 초과", "Slack (1시간) + 이메일", "4시간 이내"],
    ["P3 (정보)", "일일 리포트: KPI 요약, 파이프라인 상태", "이메일 (일 1회)", "다음 영업일"],
  ],
  [1000, 3000, 2500, 2860]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 9. 경공매 통계 시스템
// ══════════════════════════════════════════════════════════════
children.push(heading("9. 경공매 통계 시스템"));

children.push(heading("9.1 통계 대시보드 레이아웃", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["영역", "내용", "위치", "컴포넌트"],
  [
    ["필터 바", "기간/법원/지역/물건유형/경매-공매", "상단 고정", "StatisticsFilterBar"],
    ["핵심 지표", "전국 평균 낙찰가율, 매각률, 총 건수, 총 금액", "4-Card Grid", "StatKpiCards"],
    ["법원별 차트", "법원별 낙찰가율 Bar (상위 20)", "좌 1/2", "CourtBarChart (Recharts)"],
    ["유형별 차트", "담보유형별 낙찰가율 Donut + Bar", "우 1/2", "TypeDonutChart (Recharts)"],
    ["지역 히트맵", "시도별 매물 밀집도 + 낙찰가율", "Full width", "KoreaHeatmap (D3.js)"],
    ["추이 차트", "월별/분기별 낙찰가율 추이 Line", "Full width", "TrendLineChart (Recharts)"],
    ["상세 테이블", "법원x유형 교차 통계", "Full width", "CrossTable (정렬/필터)"],
  ],
  [1000, 2500, 800, 5060]
));
children.push(spacer());

children.push(heading("9.2 통계 필터 상세", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["필터", "타입", "옵션", "기본값"],
  [
    ["기간", "Date Range Picker", "1개월/3개월/6개월/1년/직접입력", "6개월"],
    ["법원", "Multi-select (검색)", "전국 57개 법원", "전체"],
    ["지역", "Cascading (시도→시군구)", "17개 시도 + 하위", "전체"],
    ["물건유형", "Checkbox Group", "아파트/상가/토지/빌딩/기타", "전체"],
    ["경매/공매", "Radio", "전체/경매/공매", "전체"],
    ["회차", "Select", "전체/1회/2회/3회이상", "전체"],
  ],
  [1000, 1800, 2500, 4060]
));
children.push(spacer());

children.push(heading("9.3 차트 사양", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["차트", "라이브러리", "데이터", "인터랙션"],
  [
    ["법원별 Bar", "Recharts BarChart", "법원명, 평균낙찰가율, 건수", "호버→툴팁, 클릭→법원 필터"],
    ["유형별 Donut", "Recharts PieChart", "담보유형, 건수, 비율", "호버→퍼센트 표시"],
    ["추이 Line", "Recharts LineChart", "월별 날짜, 낙찰가율, 매각률", "줌/패닝, 기간 브러시"],
    ["지역 히트맵", "D3.js + TopoJSON", "시도별 좌표, 매물수, 낙찰가율", "호버→상세, 클릭→드릴다운"],
    ["교차 테이블", "Custom Table", "법원x유형 2차원 데이터", "정렬, 클릭→상세 필터"],
  ],
  [1200, 1500, 2500, 4160]
));
children.push(spacer());

children.push(heading("9.4 통계 API", HeadingLevel.HEADING_2));
children.push(code("GET /api/v1/statistics/summary"));
children.push(code("  Query: ?period=6m&region=서울&type=아파트&auction_type=AUCTION"));
children.push(code("  Response: {"));
children.push(code("    avg_winning_rate: number,        // 평균 낙찰가율 (%)"));
children.push(code("    sale_rate: number,               // 매각률 (%)"));
children.push(code("    total_count: number,             // 총 건수"));
children.push(code("    total_amount: number,            // 총 금액 (억원)"));
children.push(code("    period: { start: string, end: string }"));
children.push(code("  }"));
children.push(spacer());
children.push(code("GET /api/v1/statistics/by-court"));
children.push(code("  Response: { courts: { name, code, avg_rate, count, amount }[] }"));
children.push(spacer());
children.push(code("GET /api/v1/statistics/by-type"));
children.push(code("  Response: { types: { name, avg_rate, count, ratio }[] }"));
children.push(spacer());
children.push(code("GET /api/v1/statistics/trend"));
children.push(code("  Response: { months: { date, avg_rate, sale_rate, count }[] }"));
children.push(spacer());
children.push(code("GET /api/v1/statistics/heatmap"));
children.push(code("  Response: { regions: { name, code, lat, lng, count, avg_rate, amount }[] }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 10. 데이터 파이프라인
// ══════════════════════════════════════════════════════════════
children.push(heading("10. 데이터 파이프라인"));

children.push(heading("10.1 수집 스케줄", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["파이프라인", "소스", "스케줄", "구현", "저장 테이블"],
  [
    ["경매 통계", "대법원 경매정보 API", "매일 03:00", "Supabase Edge Function (cron)", "auction_statistics"],
    ["공매 통계", "캠코 온비드 API", "매일 04:00", "Supabase Edge Function (cron)", "auction_statistics"],
    ["실거래가", "국토부 실거래가 API", "매월 1일 06:00", "Supabase Edge Function (cron)", "trade_prices"],
    ["매칭 배치", "내부 데이터", "매일 02:00", "PostgreSQL Function + pg_cron", "matching_results"],
  ],
  [1000, 1500, 1000, 2500, 3360]
));
children.push(spacer());

children.push(heading("10.2 ETL 프로세스", HeadingLevel.HEADING_2));
children.push(code("// Supabase Edge Function: crawl-court/index.ts"));
children.push(code("// 1. Extract"));
children.push(code("const response = await fetch(COURT_API_URL, { timeout: 30000 });"));
children.push(code("// retry 3회 with exponential backoff (1s, 2s, 4s)"));
children.push(code(""));
children.push(code("// 2. Transform"));
children.push(code("const normalized = rawData.map(item => ({"));
children.push(code("  court_name: item.court,"));
children.push(code("  region: extractRegion(item.address),"));
children.push(code("  collateral_type: mapCollateralType(item.type),"));
children.push(code("  winning_rate: item.winning_amount / item.appraisal_amount * 100,"));
children.push(code("  // ... 정규화"));
children.push(code("}));"));
children.push(code("// 중복 제거: case_number + auction_date unique"));
children.push(code(""));
children.push(code("// 3. Load"));
children.push(code("const { error } = await supabase.from('auction_statistics')"));
children.push(code("  .upsert(normalized, { onConflict: 'case_number,auction_date' });"));
children.push(code("// 체크섬 검증: 건수 비교"));
children.push(spacer());

children.push(heading("10.3 데이터 품질 모니터링", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["체크", "기준", "액션"],
  [
    ["건수 변동", "|오늘 - 어제| > 30%", "관리자 알림 (비정상 수집 의심)"],
    ["필수 필드 NULL", "NULL 비율 < 1%", "경고 로그 + 해당 레코드 플래그"],
    ["이상치", "낙찰가율 > 200% 또는 < 10%", "플래그 + 수동 확인 큐"],
    ["데이터 신선도", "마지막 업데이트 > 25시간", "/admin/system 경고 표시"],
    ["중복 체크", "case_number + auction_date", "UPSERT로 자동 방지"],
  ],
  [1200, 2500, 5660]
));
children.push(spacer());

children.push(heading("10.4 백필 & 장애 복구", HeadingLevel.HEADING_2));
children.push(bullet("초기 로딩: 최근 2년치 데이터 일괄 수집 (배치, 1000건/요청, 페이지네이션)"));
children.push(bullet("실패 복구: dead_letter_queue 테이블 → /admin/system에서 수동 재처리 버튼"));
children.push(bullet("Idempotency: UPSERT + 처리 완료 체크섬 기록 → 중복 실행 안전"));
children.push(bullet("모니터링: 파이프라인 실행 결과 → pipeline_runs 테이블 기록 → 대시보드 표시"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 11. DB 스키마
// ══════════════════════════════════════════════════════════════
children.push(heading("11. DB 스키마"));

children.push(heading("11.1 auction_statistics", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE auction_statistics ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  case_number TEXT,                    -- 사건번호"));
children.push(code("  court_name TEXT NOT NULL,"));
children.push(code("  court_code TEXT,"));
children.push(code("  region TEXT NOT NULL,"));
children.push(code("  sub_region TEXT,"));
children.push(code("  collateral_type TEXT NOT NULL,"));
children.push(code("  auction_type TEXT NOT NULL CHECK (auction_type IN ('AUCTION','PUBLIC_SALE')),"));
children.push(code("  appraisal_amount NUMERIC,"));
children.push(code("  winning_amount NUMERIC,"));
children.push(code("  winning_rate NUMERIC,               -- 낙찰가율 (%)"));
children.push(code("  auction_round INT,"));
children.push(code("  result TEXT CHECK (result IN ('SOLD','UNSOLD','CANCELLED')),"));
children.push(code("  auction_date DATE NOT NULL,"));
children.push(code("  address TEXT,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  UNIQUE(case_number, auction_date)   -- 중복 방지"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_auction_date_region ON auction_statistics(auction_date, region);"));
children.push(code("CREATE INDEX idx_auction_court ON auction_statistics(court_name, auction_date);"));
children.push(code("CREATE INDEX idx_auction_type ON auction_statistics(collateral_type, auction_date);"));
children.push(code("-- 파티셔닝 (Phase 3, 데이터 100만건+):"));
children.push(code("-- CREATE TABLE auction_statistics PARTITION BY RANGE (auction_date);"));
children.push(spacer());

children.push(heading("11.2 trade_prices", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE trade_prices ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  region TEXT NOT NULL,"));
children.push(code("  sub_region TEXT,"));
children.push(code("  address TEXT,"));
children.push(code("  property_type TEXT NOT NULL,"));
children.push(code("  area_sqm NUMERIC,"));
children.push(code("  price NUMERIC NOT NULL,             -- 만원 단위"));
children.push(code("  floor INT,"));
children.push(code("  trade_date DATE NOT NULL,"));
children.push(code("  source TEXT DEFAULT '국토부',"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_trade_region ON trade_prices(region, trade_date);"));
children.push(spacer());

children.push(heading("11.3 pipeline_runs", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE pipeline_runs ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  pipeline_name TEXT NOT NULL,         -- 'crawl-court' | 'crawl-kamco' | ..."));
children.push(code("  status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED')),"));
children.push(code("  records_processed INT DEFAULT 0,"));
children.push(code("  records_inserted INT DEFAULT 0,"));
children.push(code("  records_updated INT DEFAULT 0,"));
children.push(code("  error_message TEXT,"));
children.push(code("  started_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  completed_at TIMESTAMPTZ,"));
children.push(code("  duration_ms INT                     -- 소요시간 (ms)"));
children.push(code(");"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 12. RLS 정책
// ══════════════════════════════════════════════════════════════
children.push(heading("12. RLS 정책"));

children.push(makeTable(
  ["테이블", "SELECT", "INSERT", "UPDATE", "DELETE"],
  [
    ["audit_logs", "SUPER_ADMIN만", "service_role만", "불가", "불가"],
    ["complaints", "user_id = auth.uid() OR ADMIN", "user_id = auth.uid()", "ADMIN (status/resolution)", "-"],
    ["auction_statistics", "모든 인증 사용자", "service_role만 (cron)", "-", "service_role만"],
    ["trade_prices", "모든 인증 사용자", "service_role만 (cron)", "-", "service_role만"],
    ["pipeline_runs", "SUPER_ADMIN만", "service_role만", "service_role만", "-"],
  ],
  [1500, 2000, 1500, 1800, 2560]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 13. 에러 처리 + 엣지 케이스
// ══════════════════════════════════════════════════════════════
children.push(heading("13. 에러 처리 + 엣지 케이스"));

children.push(heading("13.1 API 에러 코드", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["HTTP", "code", "message", "발생 조건"],
  [
    ["403", "ADMIN_REQUIRED", "관리자 권한이 필요합니다", "ADMIN/SUPER 아닌 유저"],
    ["403", "SUPER_ADMIN_REQUIRED", "최고 관리자 권한이 필요합니다", "감사로그/시스템/설정 접근"],
    ["400", "REJECT_REASON_REQUIRED", "반려 사유를 입력해주세요", "KYC/매물 반려 시 사유 누락"],
    ["409", "ALREADY_PROCESSED", "이미 처리된 항목입니다", "KYC/매물 중복 처리"],
    ["500", "PIPELINE_ERROR", "데이터 수집 중 오류가 발생했습니다", "크롤링 실패"],
  ],
  [500, 2000, 3200, 3660]
));
children.push(spacer());

children.push(heading("13.2 엣지 케이스", HeadingLevel.HEADING_2));
children.push(bullet("외부 API 다운: 대법원/캠코 API 응답 없을 시 → retry 3회 → 실패 로그 + 관리자 알림 + 이전 데이터 유지"));
children.push(bullet("대량 KYC 접수: 동시 다수 심사 요청 → 심사 큐 순서 보장 (created_at ASC)"));
children.push(bullet("감사 로그 용량: 5년치 데이터 → 월별 파티셔닝 + 오래된 데이터 Cold Storage 이전"));
children.push(bullet("통계 데이터 0건: 필터 조건에 맞는 데이터 없을 시 → EmptyState + '조건 변경' 안내"));
children.push(bullet("관리자 동시 심사: 같은 KYC를 두 관리자가 동시 처리 → optimistic lock (version 컬럼)"));
children.push(bullet("히트맵 렌더링 성능: 시도 17개 + 시군구 250개 → SVG 최적화 + 드릴다운 분리 로딩"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 14. 컴포넌트 트리
// ══════════════════════════════════════════════════════════════
children.push(heading("14. 컴포넌트 트리"));

children.push(heading("14.1 관리자 대시보드", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/admin/page.tsx"));
children.push(code("├── AdminKpiCards: { kpis: AdminKpi[] }"));
children.push(code("│   └── KpiCard: { label, value, change, icon, urgency }"));
children.push(code("├── AdminCharts: {}"));
children.push(code("│   ├── UserGrowthChart: { data: { date, count, role }[] }"));
children.push(code("│   ├── ListingChart: { data: { date, created, completed, deleted }[] }"));
children.push(code("│   ├── MarketDonut: { data: { type, count, ratio }[] }"));
children.push(code("│   └── RevenueLine: { data: { month, amount }[] }"));
children.push(code("├── SlaTracker: { items: SlaItem[] }"));
children.push(code("│   └── SlaCard: { name, deadline, pending, overdue, avgTime }"));
children.push(code("└── QuickActions: {}"));
children.push(code("    ├── PendingKycBadge: { count: number }"));
children.push(code("    └── PendingListingBadge: { count: number }"));
children.push(spacer());

children.push(heading("14.2 통계 페이지", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/statistics/page.tsx"));
children.push(code("├── StatisticsFilterBar: { filters: StatFilter; onChange: (f: StatFilter) => void }"));
children.push(code("│   ├── PeriodPicker: { value: DateRange; onChange }"));
children.push(code("│   ├── CourtSelector: { selected: string[]; onChange }"));
children.push(code("│   ├── RegionCascader: { selected: string[]; onChange }"));
children.push(code("│   ├── TypeCheckboxGroup: { selected: string[]; onChange }"));
children.push(code("│   └── AuctionTypeRadio: { value: string; onChange }"));
children.push(code("├── StatKpiCards: { summary: StatSummary }"));
children.push(code("├── CourtBarChart: { data: CourtStat[] } // Recharts"));
children.push(code("├── TypeDonutChart: { data: TypeStat[] } // Recharts"));
children.push(code("├── KoreaHeatmap: { data: RegionStat[] } // D3.js + TopoJSON"));
children.push(code("├── TrendLineChart: { data: TrendPoint[] } // Recharts"));
children.push(code("└── CrossTable: { data: CrossStat[][] } // 정렬/필터 가능"));
children.push(spacer());

children.push(heading("14.3 시스템 모니터링", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/admin/system/page.tsx"));
children.push(code("├── SystemHealthCards: {}"));
children.push(code("│   ├── ApiLatencyChart: { data: { time, p50, p95, p99 }[] }"));
children.push(code("│   ├── ErrorRateChart: { data: { time, rate_4xx, rate_5xx }[] }"));
children.push(code("│   ├── DbConnectionGauge: { current, max }"));
children.push(code("│   └── StorageUsageBar: { used, total }"));
children.push(code("├── PipelineStatus: { runs: PipelineRun[] }"));
children.push(code("│   └── PipelineCard: { run: PipelineRun; onRerun: () => void }"));
children.push(code("├── BusinessKpiPanel: {}"));
children.push(code("│   ├── TodayMetrics: { signups, listings, contracts, matches }"));
children.push(code("│   └── ConversionFunnel: { data: FunnelStep[] }"));
children.push(code("└── AlertSettingsPanel: { alerts: AlertConfig[] }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 15. 시스템 설정
// ══════════════════════════════════════════════════════════════
children.push(heading("15. 시스템 설정"));

children.push(makeTable(
  ["설정 항목", "타입", "설명", "접근 권한"],
  [
    ["사이트 기본정보", "Text/Image", "사이트명, 로고, 연락처, 주소", "SUPER_ADMIN"],
    ["수수료율", "Number (%)", "거래 중개 수수료율", "SUPER_ADMIN"],
    ["프리미엄 요금", "Currency", "추천매물/상단고정 비용", "SUPER_ADMIN"],
    ["이메일 템플릿", "Rich Text", "가입환영/KYC승인/알림 등", "ADMIN"],
    ["API 키 관리", "Secret (마스킹)", "카카오맵/등기소/AI서버", "SUPER_ADMIN"],
    ["크롤링 스케줄", "Cron Expression", "데이터 수집 주기 변경", "SUPER_ADMIN"],
    ["Rate Limit", "Number", "역할별 요청 한도 조정", "SUPER_ADMIN"],
    ["알림 채널 설정", "Toggle + Config", "Slack webhook, SendGrid 설정", "SUPER_ADMIN"],
  ],
  [1200, 1200, 2500, 4460]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 16. 접근성 + 반응형
// ══════════════════════════════════════════════════════════════
children.push(heading("16. 접근성 + 반응형"));

children.push(makeTable(
  ["영역", "요구사항", "구현"],
  [
    ["차트 접근성", "모든 차트에 대체 텍스트 테이블 제공", "aria-label + hidden data table"],
    ["히트맵", "색상만으로 구분 안됨, 수치 표시 필수", "색상 + 텍스트 라벨 동시 표시"],
    ["테이블 정렬", "정렬 상태 스크린 리더 안내", "aria-sort 속성"],
    ["필터", "모든 필터 키보드 조작", "Select/Checkbox 기본 키보드 지원"],
    ["관리자 모바일", "관리자 페이지는 Desktop 우선", "min-width: 1024px 권장, 축소 가능"],
    ["통계 반응형", "Mobile: 차트 1열, Tablet: 2열, Desktop: 그리드", "CSS Grid + breakpoint"],
  ],
  [1200, 3000, 5160]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 17. 개발 체크리스트
// ══════════════════════════════════════════════════════════════
children.push(heading("17. 개발 체크리스트"));

children.push(heading("17.1 개발 일정", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["우선순위", "태스크", "예상 일정", "의존성"],
  [
    ["P0", "관리자 대시보드 KPI + 차트 + SLA 트래킹", "Day 1-2", "DB 스키마"],
    ["P0", "사용자 관리 테이블 + 검색 + RBAC", "Day 2-3", "users 테이블"],
    ["P0", "KYC 심사 화면 + 승인/반려 + SLA", "Day 3-4", "institution_profiles"],
    ["P0", "매물 검수 화면 + 승인/반려 + 추천 설정", "Day 4-5", "npl_listings"],
    ["P1", "불변 감사 로그 + 조회 UI + CSV 내보내기", "Day 5-6", "audit_logs RLS"],
    ["P1", "민원 관리 CRUD + SLA 에스컬레이션", "Day 6-7", "complaints 테이블"],
    ["P1", "경공매 통계 필터 + 핵심지표 API", "Day 7-8", "auction_statistics"],
    ["P1", "Recharts 차트 (Bar/Line/Donut/Funnel)", "Day 8-9", "통계 API"],
    ["P1", "D3.js 지역 히트맵 (한국 시도 TopoJSON)", "Day 9-10", "통계 API"],
    ["P2", "데이터 파이프라인 (Edge Function × 3)", "Day 10-11", "Supabase Edge"],
    ["P2", "시스템 모니터링 대시보드 (/admin/system)", "Day 11-12", "pipeline_runs"],
    ["P2", "시스템 설정 + 리포트 생성", "Day 12-13", "전체 완료"],
    ["P3", "반응형 + 접근성 + 성능 최적화", "Day 13", "전체 UI"],
  ],
  [800, 3000, 1000, 4560]
));
children.push(spacer());

children.push(heading("17.2 테스트 항목", HeadingLevel.HEADING_2));
children.push(bullet("단위 테스트: RBAC 권한 체크, 통계 집계 함수, 파이프라인 ETL 로직"));
children.push(bullet("통합 테스트: KYC 심사 → 승인 → 역할 변경 → 이메일 발송 → 감사 로그"));
children.push(bullet("RLS 테스트: ADMIN vs SUPER_ADMIN 접근 범위, audit_logs UPDATE/DELETE 차단"));
children.push(bullet("E2E 테스트: 관리자 로그인 → KYC 심사 → 매물 검수 → 통계 조회"));
children.push(bullet("보안 테스트: 일반 유저 /admin 접근 차단, 감사 로그 불변성"));
children.push(bullet("성능 테스트: 통계 쿼리 P95 < 500ms (10만건 기준), 히트맵 렌더링 < 1s"));
children.push(bullet("파이프라인 테스트: 수집 → 변환 → 저장 → 품질 체크 전체 플로우"));

children.push(heading("17.3 완료 기준 (DoD)", HeadingLevel.HEADING_2));
children.push(bullet("RBAC: ADMIN/SUPER_ADMIN 권한 분리 완전 동작"));
children.push(bullet("감사 로그: INSERT-only, UPDATE/DELETE 불가 확인"));
children.push(bullet("KYC SLA: 72시간 초과 시 자동 에스컬레이션 동작"));
children.push(bullet("통계: 6개월 데이터 기준 P95 응답 < 500ms"));
children.push(bullet("파이프라인: 3개 수집기 cron 실행 + 실패 시 알림 동작"));
children.push(bullet("히트맵: D3.js 한국 지도 정상 렌더링 + 드릴다운"));
children.push(bullet("Lighthouse: Performance 90+, Accessibility 90+"));

// ══════════════════════════════════════════════════════════════
// BUILD
// ══════════════════════════════════════════════════════════════
const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 30, bold: true, color: C.blue }, paragraph: { spacing: { before: 280, after: 160 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 26, bold: true, color: C.navy }, paragraph: { spacing: { before: 200, after: 120 } } },
    ]
  },
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [
        new TextRun({ text: "NPLATFORM Module 7: 대시보드/통계/관리자 | ", font: "Arial", size: 16, color: C.gray }),
        new TextRun({ text: "Confidential", font: "Arial", size: 16, color: C.red, italics: true }),
      ]})
    ]})},
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "\u00A9 2026 NPLATFORM. Page ", font: "Arial", size: 16, color: C.gray }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
      ]})
    ]})},
    children
  }]
});

const outPath = __dirname + "/NPL_Module7_Dashboard_Stats_Admin_v2.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`Created: ${outPath} (${Math.round(buf.length/1024)}KB)`);
});
