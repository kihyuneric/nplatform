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
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => new Paragraph({ spacing: { after: 200 } });

// ══════════════════════════════════════════════════════════════
const children = [];

// ── COVER ──
children.push(new Paragraph({ spacing: { before: 3000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Module 6", font: "Arial", size: 48, color: C.blue })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "계약/딜룸 + 회원체계 + MFA/KYC 세부 기획서", font: "Arial", size: 32, color: C.gray })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
children.push(new Paragraph({ spacing: { before: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Version 2.0 | 2026.03.13 | Figma: 계약요청, Signup, MFA", { color: C.gray })] }));
children.push(pageBreak());
children.push(heading("목차"));
children.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 1. 모듈 개요
// ══════════════════════════════════════════════════════════════
children.push(heading("1. 모듈 개요"));
children.push(p([run("투자 의사결정 후 실제 거래를 완결하는 핵심 모듈입니다. 회원가입 → 본인인증(KYC) → NDA → 계약 요청 → 협상 → 딜룸 → 클로징까지 전체 거래 라이프사이클을 관리하며, MFA(2단계 인증)로 금융 거래의 보안을 강화합니다.")]));

children.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["라우트", "페이지명", "권한", "설명"],
  [
    ["/auth/signup", "회원가입", "Public", "4종 역할별 가입 플로우"],
    ["/auth/login", "로그인", "Public", "이메일 + 소셜 + MFA 로그인"],
    ["/auth/verify", "이메일 인증", "Public", "인증 코드 확인"],
    ["/auth/reset-password", "비밀번호 재설정", "Public", "이메일 기반 재설정"],
    ["/auth/mfa-setup", "MFA 설정", "Authenticated", "TOTP QR 코드 스캔 + 백업코드"],
    ["/contract/new", "계약 요청", "Authenticated + KYC", "매물 선택 → 조건 제안"],
    ["/contract/[id]", "계약 상세", "참여자", "협상 과정 + 상태 추적 + 타임라인"],
    ["/deal-rooms", "딜룸 목록", "Authenticated", "참여중 딜룸 리스트"],
    ["/deal-rooms/[id]", "딜룸 상세", "참여자", "문서센터/채팅/체크리스트/타임라인"],
    ["/mypage", "마이페이지", "Authenticated", "프로필/보안/알림/이력"],
    ["/mypage/security", "보안 설정", "Authenticated", "MFA/비밀번호/세션 관리"],
  ],
  [2000, 1200, 1500, 4660]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 2. 회원가입 체계
// ══════════════════════════════════════════════════════════════
children.push(heading("2. 회원가입 체계"));

children.push(heading("2.1 역할 선택 화면", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["역할 카드", "아이콘", "설명", "추가 필드", "KYC 필요"],
  [
    ["기관투자자 (BUYER_INST)", "Building2", "자산운용사/PEF/부동산펀드", "기관명, 사업자번호, 투자유형", "선택"],
    ["개인투자자 (BUYER_INDV)", "User", "경매/NPL 개인 투자자", "투자경험, 관심분야", "선택"],
    ["금융기관 (SELLER)", "Landmark", "은행/캐피탈/AMC/신탁사", "기관유형, 라이선스번호", "필수"],
    ["파트너 (PARTNER)", "Handshake", "법무/감정/세무/자문 전문가", "전문분야, 자격증번호", "선택"],
  ],
  [1800, 800, 2000, 2200, 2560]
));
children.push(spacer());

children.push(heading("2.2 공통 가입 필드", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["필드", "타입", "필수", "검증 규칙", "에러 메시지"],
  [
    ["이메일", "Email", "필수", "이메일 형식 + 실시간 중복 체크", "이미 가입된 이메일입니다"],
    ["비밀번호", "Password", "필수", "8자+, 영문+숫자+특수문자", "비밀번호는 8자 이상, 영문+숫자+특수문자 포함"],
    ["비밀번호 확인", "Password", "필수", "비밀번호 일치", "비밀번호가 일치하지 않습니다"],
    ["이름", "Text", "필수", "2~20자, 한글/영문", "이름은 2~20자로 입력해주세요"],
    ["연락처", "Phone", "필수", "010-XXXX-XXXX", "올바른 연락처를 입력해주세요"],
    ["이용약관", "Checkbox", "필수", "필수 3개 + 선택 1개", "필수 약관에 동의해주세요"],
  ],
  [1000, 800, 500, 2500, 4560]
));
children.push(spacer());

children.push(heading("2.3 동의 관리 (consent_logs)", HeadingLevel.HEADING_2));
children.push(p([bold("개인정보보호법 Art.35 준수 - 동의 이력 완전 기록:")]));
children.push(makeTable(
  ["동의 항목", "필수", "내용", "법적 근거"],
  [
    ["서비스 이용약관", "필수", "서비스 이용에 관한 기본 약관", "전자상거래법"],
    ["개인정보 수집/이용", "필수", "이름, 연락처, 이메일 수집 목적/기간", "개인정보보호법 Art.14"],
    ["개인정보 제3자 제공", "필수", "매각사↔매입사 정보 공유 범위", "개인정보보호법 Art.17"],
    ["마케팅 수신", "선택", "이메일/SMS 마케팅 수신 동의", "정보통신망법"],
  ],
  [1500, 500, 3500, 3860]
));
children.push(code("CREATE TABLE consent_logs ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(code("  consent_type TEXT NOT NULL, -- 'TERMS' | 'PRIVACY' | 'THIRD_PARTY' | 'MARKETING'"));
children.push(code("  agreed BOOLEAN NOT NULL,"));
children.push(code("  version TEXT NOT NULL,        -- 약관 버전 (v1.0, v1.1 등)"));
children.push(code("  ip_address INET,"));
children.push(code("  user_agent TEXT,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(code("-- 동의 이력은 UPDATE 불가, 변경 시 새 레코드 INSERT"));
children.push(spacer());

children.push(heading("2.4 소셜 로그인", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["Provider", "Supabase 설정", "버튼 디자인", "수집 정보"],
  [
    ["카카오", "Kakao OAuth2 Provider", "노란 배경 #FEE500 + 카카오 로고", "이름, 이메일"],
    ["네이버", "Naver OAuth2 Provider", "초록 배경 #03C75A + 네이버 로고", "이름, 이메일, 연락처"],
    ["Google", "Google OAuth2 Provider", "흰 배경 + G 로고", "이름, 이메일"],
  ],
  [1000, 2000, 2500, 3860]
));
children.push(bullet("소셜 로그인 후에도 역할 선택 + 추가 정보 입력 단계 필요"));
children.push(bullet("기존 이메일 계정과 소셜 계정 연동 가능 (마이페이지 > 보안 설정)"));
children.push(bullet("소셜 로그인 시에도 필수 약관 동의 필요 (첫 로그인 시)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 3. MFA (2단계 인증)
// ══════════════════════════════════════════════════════════════
children.push(heading("3. MFA (2단계 인증) - 크리티컬"));
children.push(p([bold("금융 거래 플랫폼 보안 강화를 위한 TOTP 기반 MFA:")]));

children.push(heading("3.1 MFA 정책", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["역할", "MFA 정책", "적용 시점", "우회 가능"],
  [
    ["SUPER_ADMIN", "필수", "첫 로그인 시 강제 설정", "불가"],
    ["ADMIN", "필수", "첫 로그인 시 강제 설정", "불가"],
    ["SELLER (금융기관)", "필수", "KYC 승인 후 강제 설정", "불가"],
    ["BUYER_INST (기관투자자)", "권장", "마이페이지에서 설정", "가능"],
    ["BUYER_INDV (개인투자자)", "선택", "마이페이지에서 설정", "가능"],
    ["PARTNER", "선택", "마이페이지에서 설정", "가능"],
  ],
  [2000, 800, 2500, 4060]
));
children.push(spacer());

children.push(heading("3.2 MFA 설정 플로우", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["단계", "동작", "UI 컴포넌트", "API"],
  [
    ["1. 시작", "MFA 활성화 버튼 클릭", "MfaSetupDialog (모달)", "-"],
    ["2. QR 스캔", "TOTP QR 코드 표시 (Google Authenticator/Authy)", "QrCode 컴포넌트", "POST /api/v1/auth/mfa/enroll"],
    ["3. 코드 확인", "6자리 OTP 코드 입력 → 검증", "OtpInput (6-digit)", "POST /api/v1/auth/mfa/verify"],
    ["4. 백업 코드", "10개 1회용 백업 코드 발급 + 다운로드", "BackupCodes + 다운로드 버튼", "응답에 포함"],
    ["5. 완료", "MFA 활성화 완료 안내", "SuccessDialog", "-"],
  ],
  [800, 2500, 2500, 3560]
));
children.push(spacer());

children.push(heading("3.3 MFA 로그인 플로우", HeadingLevel.HEADING_2));
children.push(code("// 로그인 2단계 흐름:"));
children.push(code("1. 이메일 + 비밀번호 입력 → signInWithPassword()"));
children.push(code("2. MFA 활성화된 계정 → Supabase가 mfa_challenge 반환"));
children.push(code("3. MFA 코드 입력 화면 표시 (MfaChallengeForm)"));
children.push(code("4. 6자리 TOTP 코드 입력 → POST /api/v1/auth/mfa/challenge"));
children.push(code("5. 검증 성공 → 세션 발급, 실패 → 재입력 (최대 5회)"));
children.push(code("6. 5회 실패 → 15분 lockout + 이메일 알림"));
children.push(spacer());

children.push(heading("3.4 MFA 복구", HeadingLevel.HEADING_2));
children.push(bullet("백업 코드 사용: 10개 중 미사용 코드 입력 (1회성, 사용 후 소멸)"));
children.push(bullet("관리자 해제: 고객지원 요청 → 본인확인(이메일+연락처) → 관리자 수동 MFA 해제"));
children.push(bullet("재등록: 해제 후 즉시 새 MFA 재설정 안내"));
children.push(spacer());

children.push(heading("3.5 MFA API", HeadingLevel.HEADING_2));
children.push(code("POST /api/v1/auth/mfa/enroll"));
children.push(code("  → Response: { factor_id: string, qr_code_url: string, backup_codes: string[] }"));
children.push(spacer());
children.push(code("POST /api/v1/auth/mfa/verify"));
children.push(code("  → Request: { factor_id: string, code: string }"));
children.push(code("  → Response: { verified: boolean }"));
children.push(spacer());
children.push(code("POST /api/v1/auth/mfa/challenge"));
children.push(code("  → Request: { factor_id: string, code: string }"));
children.push(code("  → Response: { session: SupabaseSession } | { error: 'INVALID_CODE' | 'LOCKED_OUT' }"));
children.push(spacer());
children.push(code("POST /api/v1/auth/mfa/unenroll"));
children.push(code("  → 권한: 본인 (+ MFA 코드 재확인) 또는 ADMIN"));
children.push(code("  → Response: { unenrolled: boolean }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 4. KYC 검증 (NICE/KCB + 국세청)
// ══════════════════════════════════════════════════════════════
children.push(heading("4. KYC 검증 상세"));

children.push(heading("4.1 개인 본인인증 (NICE API)", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["단계", "동작", "기술", "결과"],
  [
    ["1. 인증 요청", "본인인증 버튼 클릭", "NICE 본인확인 API 호출", "인증 팝업 URL 반환"],
    ["2. 인증 진행", "팝업에서 휴대폰/아이핀 인증", "NICE 팝업 (외부)", "인증 완료 콜백"],
    ["3. 결과 수신", "콜백으로 인증 결과 수신", "POST /api/v1/auth/nice-callback", "CI/DI 값 + 이름 + 생년월일"],
    ["4. 저장", "users.phone_verified = true", "Supabase UPDATE", "인증 완료"],
  ],
  [1000, 2000, 2500, 3860]
));
children.push(bullet("필수 시점: 첫 계약 요청 시 (가입 시에는 선택)"));
children.push(bullet("인증 유효기간: 1년 (갱신 필요)"));
children.push(spacer());

children.push(heading("4.2 기관 KYC (사업자 검증)", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["Step", "동작", "자동/수동", "검증 내용"],
  [
    ["1", "사업자번호 10자리 입력", "자동", "국세청 API 실시간 검증 → 상태(영업중/폐업/해당없음)"],
    ["2", "사업자등록증 PDF 업로드", "수동", "Supabase Storage 암호화 저장"],
    ["3", "금융업 라이선스 업로드", "수동", "은행/캐피탈/AMC/신탁사 라이선스 (SELLER만)"],
    ["4", "관리자 심사 대기열 진입", "자동", "KYC pending 상태 → 관리자 알림"],
    ["5-a", "승인", "수동", "role 업데이트 + 이메일 알림 + MFA 강제 설정(SELLER)"],
    ["5-b", "반려", "수동", "반려 사유 + 수정 안내 이메일 + 재신청 가능"],
  ],
  [500, 2500, 700, 5660]
));
children.push(spacer());

children.push(heading("4.3 KYC 상태머신", HeadingLevel.HEADING_2));
children.push(code("KYC_STATUS:"));
children.push(code("  NOT_STARTED → DOCUMENTS_UPLOADED → PENDING_REVIEW"));
children.push(code("  → APPROVED (완료)"));
children.push(code("  → REJECTED (→ DOCUMENTS_UPLOADED 재신청 가능)"));
children.push(code("  → EXPIRED (1년 후 → 갱신 필요)"));
children.push(spacer());

children.push(heading("4.4 국세청 사업자번호 검증 API", HeadingLevel.HEADING_2));
children.push(code("// POST /api/v1/institution/verify-business"));
children.push(code("Request: { business_number: string } // 10자리 (- 제외)"));
children.push(code("Response: {"));
children.push(code("  valid: boolean,"));
children.push(code("  company_name: string,"));
children.push(code("  business_type: string,            // 업종"));
children.push(code("  status: '영업중' | '폐업' | '해당없음',"));
children.push(code("  representative: string             // 대표자명"));
children.push(code("}"));
children.push(code("// Error 400: { code: 'INVALID_FORMAT', message: '사업자번호 형식이 올바르지 않습니다' }"));
children.push(code("// Error 404: { code: 'NOT_FOUND', message: '등록되지 않은 사업자번호입니다' }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 5. NDA (비밀유지계약) 프로세스
// ══════════════════════════════════════════════════════════════
children.push(heading("5. NDA (비밀유지계약) 프로세스"));

children.push(heading("5.1 NDA 플로우", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["단계", "동작", "UI 컴포넌트"],
  [
    ["1. NDA 트리거", "비경매 NPL 상세 Stage 2 접근 시", "블러 오버레이 + NdaRequiredModal"],
    ["2. NDA 문서 표시", "약관 형태 NDA 전문 표시 (전체 스크롤 필수)", "NdaViewer (스크롤 100% 감지)"],
    ["3. 전자서명", "Canvas 기반 서명 입력", "SignaturePad + '서명 지우기' + '서명 완료'"],
    ["4. 정보 확인", "서명자 정보 자동 입력 (이름, 소속, 날짜)", "읽기 전용 ConfirmCard"],
    ["5. PDF 생성", "서명 + 매물정보 → PDF 자동 생성 → SHA-256 해시", "NdaGeneratedDialog"],
    ["6. 정보 공개", "Stage 2 정보 즉시 공개", "블러 해제 + 전체 정보 표시"],
  ],
  [1000, 3500, 4860]
));
children.push(spacer());

children.push(heading("5.2 NDA 법적 요건", HeadingLevel.HEADING_2));
children.push(bullet("전자서명법 제3조: 전자서명의 효력 인정 → Canvas 서명 + 타임스탬프 + IP 기록"));
children.push(bullet("위변조 방지: PDF 생성 후 SHA-256 해시값 저장 → 검증 시 해시 비교"));
children.push(bullet("유효기간: 1년 (expires_at), 만료 후 재서명 필요"));
children.push(bullet("철회: 매각사 요청 시 NDA 철회 가능 (status → REVOKED)"));
children.push(spacer());

children.push(heading("5.3 NDA 테이블", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE nda_agreements ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,"));
children.push(code("  signature_data TEXT NOT NULL,       -- Base64 서명 이미지"));
children.push(code("  signed_name TEXT NOT NULL,"));
children.push(code("  signed_company TEXT,"));
children.push(code("  signed_ip INET,                    -- 서명 시 IP"));
children.push(code("  nda_pdf_url TEXT,                  -- Supabase Storage URL"));
children.push(code("  nda_pdf_hash TEXT,                 -- SHA-256 해시 (위변조 검증)"));
children.push(code("  signed_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 year',"));
children.push(code("  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','REVOKED')),"));
children.push(code("  UNIQUE(user_id, listing_id)"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_nda_user ON nda_agreements(user_id);"));
children.push(code("CREATE INDEX idx_nda_listing ON nda_agreements(listing_id);"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 6. 계약 요청 + 상태머신
// ══════════════════════════════════════════════════════════════
children.push(heading("6. 계약 요청 프로세스"));

children.push(heading("6.1 계약 요청 폼", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["필드", "타입", "필수", "검증", "설명"],
  [
    ["대상 매물", "자동 입력", "필수", "유효한 listing_id", "매물 상세에서 자동 연동"],
    ["제안 금액", "Currency", "필수", "양수, max 999억", "매입 희망 금액 (원)"],
    ["제안 조건", "TextArea", "선택", "max 2000자", "특수 조건, 단서 조항"],
    ["자금 출처", "Select", "필수", "enum 선택", "자기자금/대출/기관자금"],
    ["예상 일정", "Date Range", "선택", "미래 날짜", "매입 희망 기간"],
    ["첨부 문서", "File Upload", "선택", "PDF/DOCX, 각 20MB", "사업계획서, 자금증빙 등"],
  ],
  [1000, 800, 500, 1500, 5560]
));
children.push(spacer());

children.push(heading("6.2 계약 상태머신 (확장)", HeadingLevel.HEADING_2));
children.push(p([bold("금융소비자보호법 준수 - 청약철회 기간(COOLDOWN) 포함:")]));
children.push(makeTable(
  ["상태", "설명", "가능한 전이", "액션 / 트리거"],
  [
    ["PENDING", "요청 접수", "→ REVIEWING", "매각사에 이메일/인앱 알림"],
    ["REVIEWING", "매각사 검토중", "→ ACCEPTED / REJECTED / COUNTER", "매각사 결정 (72시간 SLA)"],
    ["COUNTER", "역제안", "→ ACCEPTED / REJECTED / COUNTER", "매입사 재협상 (무한 루프 가능)"],
    ["ACCEPTED", "조건 합의", "→ DEPOSIT_PENDING", "양측 합의 확인"],
    ["DEPOSIT_PENDING", "계약금 입금 대기", "→ DEPOSIT_CONFIRMED", "입금 확인 (수동/자동)"],
    ["DEPOSIT_CONFIRMED", "계약금 확인", "→ DEAL_ROOM_CREATED", "딜룸 자동 생성"],
    ["DEAL_ROOM_CREATED", "딜룸 운영중", "→ COOLDOWN", "문서 교환 완료 시"],
    ["COOLDOWN", "청약철회 기간 (7영업일)", "→ IN_PROGRESS / WITHDRAWN", "금융소비자보호법 준수"],
    ["WITHDRAWN", "청약 철회", "종료", "계약금 환불 처리"],
    ["IN_PROGRESS", "거래 진행중", "→ CLOSING", "잔금/소유권 이전 진행"],
    ["CLOSING", "클로징 단계", "→ COMPLETED", "최종 서류/잔금 확인"],
    ["COMPLETED", "거래 완료", "종료", "완료 처리 + 리뷰 요청"],
    ["REJECTED", "거절", "종료", "거절 사유 표시 + 알림"],
    ["CANCELLED", "취소 (양측 가능)", "종료", "취소 사유 필수 입력"],
  ],
  [1500, 1800, 2200, 3860]
));
children.push(spacer());

children.push(heading("6.3 계약 타임라인", HeadingLevel.HEADING_2));
children.push(p([run("모든 상태 변경은 audit_logs에 자동 기록되며, 계약 상세 페이지에서 타임라인으로 표시됩니다:")]));
children.push(code("// audit_logs INSERT trigger (상태 변경 시 자동)"));
children.push(code("INSERT INTO audit_logs ("));
children.push(code("  user_id, action, entity_type, entity_id,"));
children.push(code("  old_value, new_value, ip_address"));
children.push(code(") VALUES ("));
children.push(code("  auth.uid(), 'STATUS_CHANGE', 'contract_request', $contract_id,"));
children.push(code("  $old_status, $new_status, request.ip"));
children.push(code(");"));
children.push(spacer());

children.push(heading("6.4 계약 API", HeadingLevel.HEADING_2));
children.push(code("POST /api/v1/contracts"));
children.push(code("  Request: { listing_id, proposed_amount, conditions?, funding_source, schedule?, attachments? }"));
children.push(code("  Response 201: { id: string, status: 'PENDING', created_at: string }"));
children.push(spacer());
children.push(code("PATCH /api/v1/contracts/:id/status"));
children.push(code("  Request: { action: 'accept' | 'reject' | 'counter' | 'cancel', reason?: string, counter_amount?: number }"));
children.push(code("  Response 200: { id, status, updated_at }"));
children.push(code("  Error 403: { code: 'FORBIDDEN', message: '이 작업을 수행할 권한이 없습니다' }"));
children.push(code("  Error 409: { code: 'INVALID_TRANSITION', message: '현재 상태에서 불가능한 작업입니다' }"));
children.push(spacer());
children.push(code("GET /api/v1/contracts/:id/timeline"));
children.push(code("  Response: { events: { action, actor, timestamp, old_value, new_value }[] }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 7. 딜룸 (Deal Room)
// ══════════════════════════════════════════════════════════════
children.push(heading("7. 딜룸 (Deal Room) 시스템"));

children.push(heading("7.1 딜룸 구성", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["영역", "기능", "기술 스택", "컴포넌트"],
  [
    ["문서 센터", "폴더 구조, 업/다운로드, 버전 관리, 미리보기", "Supabase Storage + 메타데이터", "DocumentCenter"],
    ["실시간 채팅", "메시지 교환, 파일 첨부, 읽음확인, 인용답장", "Supabase Realtime subscriptions", "DealRoomChat"],
    ["체크리스트", "거래 단계 체크 (NDA→실사→계약→결제→이전)", "JSONB 배열 + 완료 토글", "DealChecklist"],
    ["타임라인", "모든 활동 시간순 로그 (자동 기록)", "audit_logs + 자동 기록", "DealTimeline"],
    ["참여자 관리", "참여자 추가/제거, 역할별 권한", "deal_room_participants + RLS", "ParticipantList"],
  ],
  [1000, 2200, 2500, 3660]
));
children.push(spacer());

children.push(heading("7.2 딜룸 채팅 상세", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["기능", "구현 상세", "UI"],
  [
    ["실시간 메시지", "Supabase Realtime: deal_room_messages INSERT 구독", "ChatMessage 컴포넌트"],
    ["파일 첨부", "이미지/PDF 인라인 (10MB 이하), Supabase Storage", "AttachmentPreview"],
    ["읽음 확인", "메시지 읽음 상태 + 마지막 읽은 시각 추적", "ReadReceipt (체크 마크)"],
    ["인용 답장", "reply_to FK로 원본 메시지 참조", "QuotedMessage 컴포넌트"],
    ["알림", "새 메시지 → 인앱 + 이메일 (5분 집계 후 발송)", "NotificationBell"],
    ["검색", "채팅 내 텍스트 검색 (pg_trgm)", "SearchMessages"],
    ["입력 표시", "상대방 입력중 표시 (Realtime presence)", "TypingIndicator"],
  ],
  [1000, 3500, 4860]
));
children.push(spacer());

children.push(heading("7.3 딜룸 체크리스트 기본 항목", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["순서", "단계", "담당", "자동 완료 조건"],
  [
    ["1", "NDA 체결", "양측", "nda_agreements 레코드 존재"],
    ["2", "기본 실사 자료 전달", "매각사", "필수 문서 3건+ 업로드"],
    ["3", "실사 완료", "매입사", "수동 체크"],
    ["4", "최종 조건 합의", "양측", "계약서 최종본 업로드"],
    ["5", "계약금 입금", "매입사", "DEPOSIT_CONFIRMED 상태"],
    ["6", "잔금 입금", "매입사", "수동 체크"],
    ["7", "소유권/채권 이전", "매각사", "수동 체크"],
    ["8", "거래 완료 확인", "양측", "양측 모두 체크 시 COMPLETED"],
  ],
  [500, 1800, 600, 6460]
));
children.push(spacer());

children.push(heading("7.4 딜룸 DB 스키마", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE deal_rooms ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  contract_id UUID NOT NULL REFERENCES contract_requests(id) ON DELETE CASCADE,"));
children.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id),"));
children.push(code("  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),"));
children.push(code("  checklist JSONB DEFAULT '[]',      -- [{step, label, completed, completed_at, completed_by}]"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  completed_at TIMESTAMPTZ"));
children.push(code(");"));
children.push(spacer());
children.push(code("CREATE TABLE deal_room_participants ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
children.push(code("  role TEXT DEFAULT 'MEMBER' CHECK (role IN ('OWNER','MEMBER','VIEWER')),"));
children.push(code("  joined_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  UNIQUE(deal_room_id, user_id)"));
children.push(code(");"));
children.push(spacer());
children.push(code("CREATE TABLE deal_room_messages ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,"));
children.push(code("  sender_id UUID NOT NULL REFERENCES users(id),"));
children.push(code("  message TEXT,"));
children.push(code("  attachment_url TEXT,"));
children.push(code("  attachment_name TEXT,"));
children.push(code("  attachment_size INT,               -- bytes"));
children.push(code("  reply_to UUID REFERENCES deal_room_messages(id),"));
children.push(code("  is_read BOOLEAN DEFAULT false,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_messages_room ON deal_room_messages(deal_room_id, created_at);"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 8. 마이페이지
// ══════════════════════════════════════════════════════════════
children.push(heading("8. 마이페이지"));

children.push(makeTable(
  ["탭", "내용", "라우트", "컴포넌트"],
  [
    ["프로필", "개인정보 수정, 프로필 이미지, 기관정보", "/mypage/profile", "ProfileForm"],
    ["보안 설정", "비밀번호 변경, MFA, 소셜 연동, 활성 세션", "/mypage/security", "SecuritySettings"],
    ["알림 설정", "채널별 ON/OFF, 맞춤 알림 조건", "/mypage/notifications", "NotificationSettings"],
    ["관심 매물", "찜한 매물 목록 (→ Module 5)", "/mypage/favorites", "FavoritesList (재사용)"],
    ["분석 이력", "AI 분석 결과 + PDF 내보내기", "/mypage/analysis", "AnalysisHistory (재사용)"],
    ["계약/딜 이력", "진행중 + 완료 계약/딜룸", "/mypage/contracts", "ContractHistory"],
    ["결제/크레딧", "크레딧 잔액, 충전, 이용 내역", "/mypage/billing", "BillingDashboard"],
    ["개인정보", "내 정보 열람/정정/삭제 요청 (PIPA Art.35)", "/mypage/privacy", "PrivacyCenter"],
  ],
  [1000, 2500, 2000, 3860]
));
children.push(spacer());

children.push(heading("8.1 개인정보 관리 (PIPA 준수)", HeadingLevel.HEADING_2));
children.push(code("// 개인정보보호법 Art.35 열람/정정/삭제 API"));
children.push(code("GET /api/v1/privacy/my-data          → 내 정보 JSON 내보내기"));
children.push(code("PUT /api/v1/privacy/update            → 정정 요청 (검증 후 반영)"));
children.push(code("DELETE /api/v1/privacy/delete-account → 탈퇴 + 익명화"));
children.push(code("  → users 데이터 익명화 (name→'탈퇴회원', email→random@deleted.nplatform.kr)"));
children.push(code("  → favorites, alert_settings → CASCADE 삭제"));
children.push(code("  → contract_requests, audit_logs → 법정 보관 (5년) 후 삭제 (pg_cron)"));
children.push(code("  → consent_logs → 영구 보관 (동의 이력 증빙)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 9. RLS 정책
// ══════════════════════════════════════════════════════════════
children.push(heading("9. RLS 정책"));

children.push(makeTable(
  ["테이블", "SELECT", "INSERT", "UPDATE", "DELETE"],
  [
    ["users", "id = auth.uid()", "-", "id = auth.uid()", "-"],
    ["consent_logs", "user_id = auth.uid()", "user_id = auth.uid()", "불가 (INSERT-only)", "불가"],
    ["nda_agreements", "user_id = auth.uid()", "user_id = auth.uid()", "불가", "불가"],
    ["contract_requests", "seller_id OR buyer_id = auth.uid()", "buyer_id = auth.uid()", "관련 당사자", "-"],
    ["deal_rooms", "participant.user_id = auth.uid()", "service_role", "participant", "-"],
    ["deal_room_messages", "participant.user_id = auth.uid()", "sender_id = auth.uid()", "sender (is_read만)", "-"],
    ["deal_room_participants", "participant.user_id = auth.uid()", "OWNER만", "OWNER만", "OWNER만"],
    ["institution_profiles", "user_id = auth.uid() OR ADMIN", "user_id = auth.uid()", "user_id = auth.uid()", "-"],
  ],
  [1500, 1800, 1500, 1500, 3060]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 10. 에러 처리 + 엣지 케이스
// ══════════════════════════════════════════════════════════════
children.push(heading("10. 에러 처리 + 엣지 케이스"));

children.push(heading("10.1 API 에러 코드", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["HTTP", "code", "message", "발생 조건"],
  [
    ["400", "VALIDATION_ERROR", "입력값이 올바르지 않습니다", "Zod 검증 실패"],
    ["400", "INVALID_BUSINESS_NUMBER", "사업자번호 형식이 올바르지 않습니다", "10자리 아님"],
    ["401", "MFA_REQUIRED", "2단계 인증이 필요합니다", "MFA 활성 계정 로그인"],
    ["401", "MFA_INVALID_CODE", "인증 코드가 올바르지 않습니다", "잘못된 TOTP 코드"],
    ["403", "KYC_REQUIRED", "본인인증이 필요합니다", "계약 요청 시 미인증"],
    ["403", "NDA_REQUIRED", "NDA 서명이 필요합니다", "Stage 2 접근 시"],
    ["409", "INVALID_TRANSITION", "현재 상태에서 불가능한 작업입니다", "잘못된 상태 전이"],
    ["409", "NDA_EXISTS", "이미 NDA가 체결되어 있습니다", "NDA 중복 서명"],
    ["423", "ACCOUNT_LOCKED", "계정이 잠겼습니다. 15분 후 다시 시도해주세요", "MFA 5회 실패"],
  ],
  [500, 1800, 3200, 3860]
));
children.push(spacer());

children.push(heading("10.2 엣지 케이스", HeadingLevel.HEADING_2));
children.push(bullet("계약 진행 중 매물이 삭제된 경우: 계약은 유지, 매물 정보는 스냅샷으로 보존"));
children.push(bullet("딜룸 채팅 중 한쪽이 탈퇴한 경우: 탈퇴 사실 표시, 메시지는 보존, 새 메시지 불가"));
children.push(bullet("COOLDOWN 기간 중 매입사가 철회: WITHDRAWN 상태, 계약금 환불 프로세스 시작"));
children.push(bullet("MFA 디바이스 분실: 백업 코드 → 관리자 해제 → 재설정 순서 안내"));
children.push(bullet("동시 역제안(COUNTER): 나중에 도착한 요청 409 반환, 최신 상태 기준"));
children.push(bullet("NDA 만료 후 접근: Stage 2 다시 블러 처리, 재서명 안내"));
children.push(bullet("소셜 로그인 이메일 중복: 기존 계정에 소셜 연동 안내 (자동 병합 불가)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 11. 컴포넌트 트리
// ══════════════════════════════════════════════════════════════
children.push(heading("11. 컴포넌트 트리"));

children.push(heading("11.1 인증 컴포넌트", HeadingLevel.HEADING_2));
children.push(code("// app/(auth)/signup/page.tsx"));
children.push(code("├── RoleSelector: { onSelect: (role: UserRole) => void }"));
children.push(code("│   └── RoleCard: { role: UserRole; icon: LucideIcon; description: string }"));
children.push(code("├── SignupForm: { role: UserRole }"));
children.push(code("│   ├── CommonFields: { register, errors } // React Hook Form"));
children.push(code("│   ├── RoleSpecificFields: { role: UserRole; register, errors }"));
children.push(code("│   └── ConsentCheckboxes: { consents: ConsentItem[]; onChange: (c: ConsentState) => void }"));
children.push(code("└── SocialLoginButtons: { providers: OAuthProvider[] }"));
children.push(spacer());

children.push(heading("11.2 MFA 컴포넌트", HeadingLevel.HEADING_2));
children.push(code("// components/auth/mfa-setup.tsx"));
children.push(code("├── MfaSetupDialog: { onComplete: () => void }"));
children.push(code("│   ├── QrCodeDisplay: { qrUrl: string }"));
children.push(code("│   ├── OtpInput: { length: 6; onComplete: (code: string) => void }"));
children.push(code("│   └── BackupCodesDisplay: { codes: string[]; onDownload: () => void }"));
children.push(code("└── MfaChallengeForm: { factorId: string; onSuccess: (session: Session) => void }"));
children.push(code("    ├── OtpInput: { length: 6 }"));
children.push(code("    └── BackupCodeInput: { onSubmit: (code: string) => void }"));
children.push(spacer());

children.push(heading("11.3 계약/딜룸 컴포넌트", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/contract/new/page.tsx"));
children.push(code("├── ContractRequestForm: { listing: NplListing }"));
children.push(code("│   ├── ListingPreview: { listing: NplListing }"));
children.push(code("│   ├── ProposalFields: { register, errors }"));
children.push(code("│   └── FileUploadZone: { maxFiles: 5; maxSize: 20MB; accept: 'pdf,docx' }"));
children.push(code("└── KycGate: { children: ReactNode } // KYC 미완료 시 안내 표시"));
children.push(spacer());
children.push(code("// app/(main)/deal-rooms/[id]/page.tsx"));
children.push(code("├── DealRoomHeader: { room: DealRoom; listing: NplListing }"));
children.push(code("├── DealRoomTabs: { active: 'chat' | 'documents' | 'checklist' | 'timeline' }"));
children.push(code("├── DealRoomChat: { roomId: string; userId: string }"));
children.push(code("│   ├── MessageList: { messages: DealRoomMessage[] }"));
children.push(code("│   │   └── ChatMessage: { msg: DealRoomMessage; isOwn: boolean }"));
children.push(code("│   ├── ChatInput: { onSend: (msg: string, file?: File) => void }"));
children.push(code("│   └── TypingIndicator: { isTyping: boolean; userName: string }"));
children.push(code("├── DocumentCenter: { roomId: string }"));
children.push(code("│   ├── FolderTree: { folders: Folder[] }"));
children.push(code("│   └── FileList: { files: DealDocument[]; onUpload: (f: File) => void }"));
children.push(code("├── DealChecklist: { items: ChecklistItem[]; onToggle: (step: number) => void }"));
children.push(code("└── DealTimeline: { events: AuditEvent[] }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 12. 보안 요구사항
// ══════════════════════════════════════════════════════════════
children.push(heading("12. 보안 요구사항"));

children.push(makeTable(
  ["영역", "위협", "방어 수단", "구현"],
  [
    ["인증", "무차별 대입", "5회 실패 → 15분 lockout + 이메일 알림", "Supabase Auth + Edge Function"],
    ["MFA", "TOTP 우회", "TOTP 30초 갱신 + 1회용 백업 코드 + lockout", "Supabase Auth MFA"],
    ["서명", "NDA 위변조", "SHA-256 해시 + IP/타임스탬프 기록", "서버사이드 해시 생성"],
    ["파일", "악성 파일 업로드", "MIME 타입 검증 + 확장자 화이트리스트 + 10MB 제한", "multer + magic-bytes"],
    ["채팅", "XSS", "DOMPurify + CSP 헤더", "클라이언트 + 미들웨어"],
    ["계약", "감사 추적", "audit_logs INSERT-only (UPDATE/DELETE 차단)", "RLS + trigger"],
    ["개인정보", "PII 노출", "pgcrypto AES-256 (이름, 연락처, 사업자번호)", "DB 컬럼 암호화"],
    ["세션", "세션 하이재킹", "HttpOnly + Secure + SameSite=Lax 쿠키", "Supabase Auth 기본"],
  ],
  [800, 1500, 3200, 3860]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 13. 접근성 + 반응형
// ══════════════════════════════════════════════════════════════
children.push(heading("13. 접근성 + 반응형"));

children.push(makeTable(
  ["영역", "요구사항", "구현"],
  [
    ["폼 접근성", "모든 input에 label 연결, 에러 메시지 aria-invalid", "React Hook Form + aria 속성"],
    ["비밀번호", "강도 표시기 스크린 리더 지원", "aria-live='polite' 강도 텍스트"],
    ["서명패드", "키보드 대체 (텍스트 서명 옵션)", "SignaturePad + TextSignature 토글"],
    ["채팅", "새 메시지 알림 스크린 리더", "aria-live='assertive' + 소리 알림 옵션"],
    ["체크리스트", "키보드로 체크 토글", "Space/Enter 키로 토글"],
    ["모달", "포커스 트랩 + ESC 닫기", "Dialog 컴포넌트 기본 지원"],
    ["반응형 채팅", "Mobile: 풀스크린, Desktop: 사이드 패널", "breakpoint 분기 레이아웃"],
  ],
  [1200, 3000, 5160]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 14. 개발 체크리스트
// ══════════════════════════════════════════════════════════════
children.push(heading("14. 개발 체크리스트"));

children.push(heading("14.1 개발 일정", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["우선순위", "태스크", "예상 일정", "의존성"],
  [
    ["P0", "회원가입 (4종 역할) + 이메일 인증 + 동의 관리", "Day 1-2", "DB 스키마"],
    ["P0", "로그인 + 소셜 로그인 (카카오/네이버/Google)", "Day 2-3", "Supabase Auth 설정"],
    ["P0", "MFA 설정 + 로그인 2단계 + 백업 코드", "Day 3-4", "로그인 완료"],
    ["P1", "KYC: 개인 본인인증 (NICE API) + 기관 사업자 검증", "Day 4-5", "회원가입 완료"],
    ["P1", "NDA 전자서명 + PDF 생성 + SHA-256 해시", "Day 5-6", "KYC 완료"],
    ["P1", "계약 요청 폼 + 상태머신 + 타임라인", "Day 6-8", "NDA 완료"],
    ["P1", "딜룸 생성 + 문서 센터 + 체크리스트", "Day 8-9", "계약 완료"],
    ["P1", "딜룸 실시간 채팅 (Supabase Realtime)", "Day 9-10", "딜룸 기본 완료"],
    ["P2", "마이페이지 (프로필/보안/알림/이력/개인정보)", "Day 10-12", "전체 기능"],
    ["P3", "RLS 정책 + 보안 검수 + 감사 로그 검증", "Day 12-13", "전체 완료"],
  ],
  [800, 3500, 1000, 4060]
));
children.push(spacer());

children.push(heading("14.2 테스트 항목", HeadingLevel.HEADING_2));
children.push(bullet("단위 테스트: 상태머신 전이 검증, MFA 코드 검증, 비밀번호 강도 계산"));
children.push(bullet("통합 테스트: 회원가입 → 이메일 인증 → 로그인 → MFA → 대시보드"));
children.push(bullet("RLS 테스트: 다른 유저의 계약/딜룸/NDA 접근 불가 확인"));
children.push(bullet("E2E 테스트: 매물 상세 → NDA → 계약 요청 → 딜룸 → 채팅 → 완료"));
children.push(bullet("보안 테스트: 브루트포스 lockout, XSS (채팅/메모), CSRF 방어"));
children.push(bullet("MFA 테스트: 설정 → 로그인 → 백업 코드 → 해제 → 재설정"));
children.push(bullet("성능 테스트: 채팅 동시 접속 100명, 메시지 지연 < 500ms"));

children.push(heading("14.3 완료 기준 (DoD)", HeadingLevel.HEADING_2));
children.push(bullet("모든 페이지 Preview 렌더링 확인"));
children.push(bullet("MFA 필수 역할(ADMIN, SELLER)에 강제 적용 확인"));
children.push(bullet("계약 상태 전이 모든 경로 테스트 통과"));
children.push(bullet("NDA PDF 해시 검증 동작 확인"));
children.push(bullet("audit_logs INSERT-only RLS 확인 (UPDATE/DELETE 차단)"));
children.push(bullet("딜룸 Realtime 채팅 양방향 동작 확인"));
children.push(bullet("개인정보 열람/삭제 API 정상 동작 (PIPA 준수)"));
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
        new TextRun({ text: "NPLATFORM Module 6: 계약/딜룸/회원/MFA | ", font: "Arial", size: 16, color: C.gray }),
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

const outPath = __dirname + "/NPL_Module6_Contract_DealRoom_Auth_v2.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`Created: ${outPath} (${Math.round(buf.length/1024)}KB)`);
});
