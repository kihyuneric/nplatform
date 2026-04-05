const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };
const heading = (t, l = HeadingLevel.HEADING_1) => new Paragraph({ heading: l, children: [new TextRun(t)] });
const p = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });
const bold = (t) => new TextRun({ text: t, bold: true, font: "Arial", size: 22 });
const run = (t, o = {}) => new TextRun({ text: t, font: "Arial", size: 22, ...o });
const headerCell = (text, w) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: { fill: C.navy, type: ShadingType.CLEAR }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })] });
const cell = (text, w, o = {}) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined, children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...o })] })] });
const makeTable = (h, rows, cw) => { const t = cw.reduce((a,b)=>a+b,0); return new Table({ width:{size:t,type:WidthType.DXA}, columnWidths:cw, rows:[new TableRow({children:h.map((x,i)=>headerCell(x,cw[i]))}), ...rows.map(r=>new TableRow({children:r.map((c,i)=>cell(typeof c==="object"?c.text:c,cw[i],typeof c==="object"?c:{}))}))] }); };
const numbering = { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }] }, { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] };
const bullet = (t, l = 0) => new Paragraph({ numbering: { reference: "bullets", level: l }, spacing: { after: 60 }, children: [run(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });

const ch = [];

// COVER
ch.push(new Paragraph({ spacing: { before: 3000 } }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Module 3", font: "Arial", size: 48, color: C.blue })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPL 상세 페이지 + AI 분석 솔루션 세부 기획서", font: "Arial", size: 32, color: C.gray })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
ch.push(new Paragraph({ spacing: { before: 400 } }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Version 2.0 | 2026.03.13 | Figma: NPL 상세 (1075-14975)", { color: C.gray })] }));
ch.push(new Paragraph({ children: [new PageBreak()] }));
ch.push(heading("목차"));
ch.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 1. 모듈 개요 ═══
ch.push(heading("1. 모듈 개요"));
ch.push(heading("1.1 목적", HeadingLevel.HEADING_2));
ch.push(p([run("NPL 상세 + AI 분석 모듈은 투자자가 개별 매물의 상세 정보를 확인하고, AI 기반 분석 도구를 활용하여 투자 의사결정을 내리는 핵심 모듈입니다. "), run("'기본적인 정보와 분석에 대한 솔루션들이 장착되어 있어서 별도 고민을 하지 않아도 되는' 경험을 제공합니다.")]));

ch.push(heading("1.2 담당 라우트", HeadingLevel.HEADING_2));
ch.push(makeTable(["라우트","페이지명","접근 권한","설명"],[
  ["/listings/[id]","매물 상세","Public (Teaser) → Auth (Full)","3-Stage 정보 공개"],
  ["/listings/[id]/analysis","AI 분석 탭","Authenticated","통합 AI 분석 결과 대시보드"],
  ["/investor/price-analysis","AI 가격 예측","Authenticated","독립형 가격 예측 도구"],
  ["/investor/registry-analysis","등기 권리분석","Authenticated","등기부등본 AI 분석"],
  ["/investor/winning-rate","낙찰가율 AI","Authenticated","경매 낙찰가율 예측"],
  ["/investor/simulator","수익률 시뮬레이터","Authenticated","경매 + 채권 매입 수익률"],
],[2500,1500,1800,3560]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 2. 상세 페이지 ═══
ch.push(heading("2. NPL 상세 페이지 (/listings/[id])"));

ch.push(heading("2.1 3-Stage 정보 공개 체계", HeadingLevel.HEADING_2));
ch.push(makeTable(["Stage","조건","공개 정보","비공개 정보"],[
  ["Stage 1 (Teaser)","Public (비로그인)","위치(구/동), 담보유형, 감정가, AI추정가, 이미지(워터마크), 경매일정, 대표 정보","상세주소, 채무자정보, 등기부, 계약서, 상세문서"],
  ["Stage 2 (NDA)","로그인 + NDA 서명","상세주소, 등기부등본, 채권상세 구조, 경매이력 전체, 채무자정보(일부마스킹)","내부보고서, 채무자 연락처, 계약서 원본"],
  ["Stage 3 (Full)","NDA + KYC 승인 + 딜룸 참여","전체 데이터룸: 내부보고서, 감정평가서, 계약서, 채무자 전체정보, 법적문서 전체","없음 (전체 공개)"],
],[1200,1800,3200,3160]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("2.2 페이지 레이아웃", HeadingLevel.HEADING_2));
ch.push(makeTable(["영역","구성","높이/위치"],[
  ["이미지 갤러리","메인 이미지 (16:9) + 썸네일 4개 그리드 + '더보기' 오버레이","상단 영역, 480px (Desktop)"],
  ["핵심 정보 바","마켓뱃지 + 제목 + 주소 + 핵심금액 + CTA 버튼","이미지 하단, sticky"],
  ["탭 네비게이션","기본정보 | 위치/주변 | AI분석 | 등기부 | 경매이력 | 문서","sticky top: 64px (GNB 높이)"],
  ["탭 콘텐츠","각 탭별 상세 내용 (스크롤 연동)","메인 콘텐츠 영역"],
  ["우측 사이드바","가격 요약 + CTA + 담당자 정보 + 관련 매물","Desktop only, width: 360px, sticky"],
],[1500,3500,4360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

ch.push(heading("2.3 마켓별 상세 페이지 차이", HeadingLevel.HEADING_2));

ch.push(heading("2.3.1 급매 부동산 (DISTRESSED_SALE) 상세", HeadingLevel.HEADING_3));
ch.push(makeTable(["섹션","표시 항목","특이사항"],[
  ["핵심 정보","시세, 급매가, 할인율, AI예측가, 면적, 층/향","할인율 Red 강조, AI가격 Purple"],
  ["시세 비교표","KB시세, 실거래가, 호가, AI예측가 비교 테이블","Bar Chart 시각화"],
  ["주변 시세","동일 단지 최근 거래 5건 + 인근 단지 시세","Table + 지도 마커"],
  ["AI 가격 분석","SHAP feature importance, 유사사례 5건, 신뢰구간","차트 + 테이블"],
  ["물건 정보","면적, 층, 방/욕실, 주차, 건축년도, 관리비","2-Column 정보 그리드"],
  ["위치/교통","카카오맵 + 주변 인프라(학교/지하철/편의시설)","지도 + POI 마커"],
  ["CTA","'급매 문의하기' + '가격 협상 요청'","Primary CTA 고정 바"],
],[1500,3500,4360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("2.3.2 경매/공매 NPL (AUCTION_NPL) 상세", HeadingLevel.HEADING_3));
ch.push(makeTable(["섹션","표시 항목","특이사항"],[
  ["경매 정보","사건번호, 법원, 경매일, 회차, 감정가, 최저가, 보증금","D-Day 카운트다운 강조"],
  ["입찰 가이드","입찰 절차, 필요 서류, 보증금 계산, 유의사항","Step-by-step 카드"],
  ["낙찰가율 AI","AI 예측 낙찰가율, 확률분포, 통계 비교","게이지 + 히스토그램"],
  ["등기부 분석","등기부등본 자동 열람 + AI 권리분석 결과","위험도 스코어 + 상세항목"],
  ["경매 이력","회차별 최저가/유찰/낙찰 이력 테이블","타임라인 + 가격추이 차트"],
  ["수익률 시뮬레이터","낙찰가 입력 → 즉시 수익률 계산","인라인 시뮬레이터"],
  ["CTA","'관심 매물 등록' + '입찰 알림 설정'","경매일 D-7 자동 알림"],
],[1500,3500,4360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("2.3.3 비경매 NPL (NON_AUCTION_NPL) 상세", HeadingLevel.HEADING_3));
ch.push(makeTable(["섹션","표시 항목","특이사항"],[
  ["채권 개요","채권원금, 이자, 담보가치, LTV, 매각방식, 매각기관","기관 인증뱃지 + 로고"],
  ["채권 구조","선순위/후순위 채권 구조 다이어그램","시각적 워터폴 차트"],
  ["담보 정보","담보물건 위치, 유형, 감정가, 현재 상태","지도 + 물건 사진"],
  ["NDA 요구","NDA 서명 전: 블러 오버레이, 서명 후: 상세 공개","전자서명 플로우"],
  ["데이터룸","Stage 3: 전체 문서 접근 (폴더 구조)","파일 리스트 + 다운로드"],
  ["채권 수익분석","채권 매입 수익률 시뮬레이터","인라인 시뮬레이터"],
  ["CTA","'NDA 서명하기' → '계약 요청하기' → '딜룸 입장'","Stage별 CTA 변경"],
],[1500,3500,4360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

ch.push(heading("2.4 이미지 갤러리", HeadingLevel.HEADING_2));
ch.push(makeTable(["기능","상세","기술"],[
  ["메인 이미지","16:9 비율, 최대 1200px 너비, object-fit: cover","Next.js Image + WebP"],
  ["썸네일 그리드","4장 그리드 (2×2), 5장 이상시 마지막에 '+N장 더보기' 오버레이","CSS Grid"],
  ["라이트박스","클릭 시 풀스크린 갤러리 모달, 좌우 화살표 네비게이션","동적 import (코드분할)"],
  ["스와이프","모바일: 좌우 스와이프, 인디케이터 닷","touch event + transform"],
  ["워터마크","Teaser(Stage 1)에서는 'NPLATFORM' 워터마크 오버레이","CSS overlay + opacity"],
  ["Placeholder","이미지 없을 때: 담보유형별 기본 일러스트","SVG placeholder"],
],[1500,3500,4360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 3. AI 가격 예측 ═══
ch.push(heading("3. AI 가격 예측 시스템"));

ch.push(heading("3.1 모델 아키텍처", HeadingLevel.HEADING_2));
ch.push(makeTable(["항목","상세"],[
  ["모델","XGBoost Regressor"],
  ["학습 데이터","국토부 실거래가 (최근 5년) + 공시지가 + 인프라 데이터"],
  ["Feature 수","42개 (위치, 면적, 층, 건축년도, 주변시세, 인프라거리 등)"],
  ["평가 지표","MAE: 5.2%, MAPE: 7.8%, R²: 0.94"],
  ["설명 가능성","SHAP (SHapley Additive exPlanations)"],
  ["추론 서버","Python FastAPI (GPU 불필요, CPU 충분)"],
  ["응답 시간","< 2초 (단일 예측)"],
  ["갱신 주기","월 1회 실거래가 데이터 반영 재학습"],
],[2000,7360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("3.2 입력 인터페이스", HeadingLevel.HEADING_2));
ch.push(makeTable(["필드","타입","필수","설명","Validation"],[
  ["주소","카카오 주소 검색","필수","도로명/지번 주소 입력 → API 좌표 변환","주소 API 매칭 필수"],
  ["담보유형","Select","필수","APT/OFFICETEL/VILLA/COMMERCIAL/LAND/etc","Enum"],
  ["전용면적","Number (㎡)","필수","전용면적 직접 입력","1~10000 범위"],
  ["층","Number","조건부","아파트/오피스텔/빌라시 필수","1~100"],
  ["건축년도","Number","선택","직접 입력 또는 자동 (API)","1960~현재"],
  ["방/욕실 수","Number/Number","선택","방 수, 욕실 수","0~20"],
  ["향","Select","선택","남향/동향/서향/북향/남동/남서 등","Enum"],
],[1200,1200,600,2500,3860]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("3.3 결과 대시보드", HeadingLevel.HEADING_2));
ch.push(makeTable(["영역","내용","시각화"],[
  ["예측가","AI 추정가: 4.85억 (95% 신뢰구간: 4.2~5.5억)","큰 숫자 + 범위 바"],
  ["SHAP 차트","Feature Importance: 위치 35%, 면적 22%, 층 15%...","Waterfall Chart (Recharts)"],
  ["유사 사례","최근 6개월 유사 거래 5건 (주소, 면적, 가격, 거래일)","Table + 지도 마커"],
  ["시세 비교","KB시세, 공시가, 실거래평균 vs AI예측 비교","Grouped Bar Chart"],
  ["가격 추이","해당 지역 최근 2년 가격 추이","Line Chart (월별)"],
  ["신뢰도","모델 신뢰도 점수: 87/100 (데이터 충분도 기반)","Progress Bar"],
],[1200,3500,4660]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

ch.push(heading("3.4 API: POST /api/ai/price-estimate", HeadingLevel.HEADING_2));
ch.push(code("// Request"));
ch.push(code("POST /api/ai/price-estimate"));
ch.push(code("Authorization: Bearer {token}"));
ch.push(code("{"));
ch.push(code("  address: string,        // 전체 주소"));
ch.push(code("  lat: number, lng: number, // 좌표"));
ch.push(code("  collateral_type: string,"));
ch.push(code("  area_sqm: number,"));
ch.push(code("  floor?: number,"));
ch.push(code("  built_year?: number,"));
ch.push(code("  rooms?: number,"));
ch.push(code("  bathrooms?: number,"));
ch.push(code("  direction?: string"));
ch.push(code("}"));
ch.push(new Paragraph({ spacing: { after: 100 } }));
ch.push(code("// Response 200"));
ch.push(code("{"));
ch.push(code("  estimated_price: number,     // 4억8500만"));
ch.push(code("  confidence_low: number,      // 4억2000만"));
ch.push(code("  confidence_high: number,     // 5억5000만"));
ch.push(code("  confidence_score: number,    // 87"));
ch.push(code("  shap_values: Array<{ feature: string, value: number, impact: number }>,"));
ch.push(code("  similar_cases: Array<{ address, area, price, date, distance_km }>,"));
ch.push(code("  market_comparison: { kb_price, official_price, avg_trade_price },"));
ch.push(code("  analysis_id: string          // 결과 저장 ID"));
ch.push(code("}"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 4. 등기 권리분석 ═══
ch.push(heading("4. AI 등기부등본 권리분석"));

ch.push(heading("4.1 분석 파이프라인", HeadingLevel.HEADING_2));
ch.push(makeTable(["단계","처리","기술","소요시간"],[
  ["1. 업로드","PDF 파일 수신 + 유효성 검증","Multer + file-type check","< 1초"],
  ["2. 파싱","PDF 텍스트 추출","PDF.js (pdf-parse)","1~3초"],
  ["3. OCR (필요시)","스캔본 이미지 OCR","Tesseract.js (한국어 모델)","5~15초"],
  ["4. 구조화","갑구/을구 섹션 분리 + 항목 파싱","정규식 + 규칙 기반","< 1초"],
  ["5. AI 분석","권리관계 분석 + 위험요소 탐지","GPT-4 API (structured output)","3~8초"],
  ["6. 스코어링","위험도 점수 산출 (0~100)","가중치 기반 스코어링","< 1초"],
  ["7. 보고서","분석 보고서 생성 + 저장","Template + DB 저장","< 1초"],
],[1200,2200,2200,3760]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("4.2 분석 항목 상세", HeadingLevel.HEADING_2));
ch.push(makeTable(["구분","분석 항목","위험 판단 기준","위험도 가중치"],[
  ["갑구 (소유권)","소유권 이전 이력","빈번한 이전, 가등기, 가처분","25%"],
  ["갑구","압류/가압류","건수, 금액, 채권자","20%"],
  ["갑구","가처분/예고등기","존재 여부, 유형","15%"],
  ["갑구","경매개시결정","경매 진행 상태","10%"],
  ["을구 (저당)","근저당권 설정","채권최고액 대비 감정가 비율","15%"],
  ["을구","전세권","보증금 규모, 대항력","10%"],
  ["을구","지상권/지역권","토지 이용 제한","5%"],
],[1200,1800,2500,3860]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("4.3 결과 보고서 UI", HeadingLevel.HEADING_2));
ch.push(makeTable(["영역","내용","시각화"],[
  ["종합 위험도","점수 (0~100) + 등급 (안전/주의/위험/매우위험)","원형 게이지 (Green→Red)"],
  ["갑구 요약","소유자 정보, 소유권 변동 이력, 압류/가압류 현황","타임라인 + 위험 아이콘"],
  ["을구 요약","근저당 설정 현황, 채권최고액 합계, 전세권","금액 워터폴 차트"],
  ["위험 요소","개별 위험 항목 리스트 (심각도별 정렬)","빨강/주황/노랑 카드"],
  ["권리 관계도","소유자 ↔ 채권자 ↔ 세입자 관계","다이어그램"],
  ["AI 코멘트","GPT-4 기반 종합 분석 의견","텍스트 + 하이라이트"],
  ["조치 사항","투자 전 확인 필요 사항 체크리스트","체크리스트"],
],[1200,3200,4960]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

ch.push(heading("4.4 자동 등기부 열람", HeadingLevel.HEADING_2));
ch.push(makeTable(["항목","상세"],[
  ["대상","경매/공매 NPL (AUCTION_NPL) 물건"],
  ["API","인터넷등기소 열람 API 연동"],
  ["트리거","상세 페이지 진입 시 자동 (최근 열람 7일 이내면 캐시 사용)"],
  ["비용","건당 700원 (플랫폼 부담 또는 사용자 크레딧 차감)"],
  ["저장","Supabase Storage에 PDF 저장 + registry_documents 테이블 메타데이터"],
  ["갱신","경매일 D-7 자동 재열람 (권리변동 감지)"],
],[2000,7360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 5. 낙찰가율 AI ═══
ch.push(heading("5. 경매 낙찰가율 AI 추정"));

ch.push(heading("5.1 모델 아키텍처", HeadingLevel.HEADING_2));
ch.push(makeTable(["항목","상세"],[
  ["모델","Random Forest + Quantile Regression (10/25/50/75/90 분위)"],
  ["학습 데이터","전국 법원경매 낙찰 데이터 (최근 5년, 약 50만건)"],
  ["Feature","법원, 물건유형, 지역(시도/시군구), 면적, 감정가, 회차, 경매유형"],
  ["평가 지표","MAE: 4.1%, Coverage(90%): 92.3%"],
  ["추론 서버","Python FastAPI"],
  ["응답 시간","< 1.5초"],
],[2000,7360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("5.2 결과 시각화", HeadingLevel.HEADING_2));
ch.push(makeTable(["시각화","설명","라이브러리"],[
  ["게이지 차트","예측 낙찰가율 표시 (0~150%), 구간 색상","Recharts Gauge"],
  ["확률분포","분위수별 낙찰가율 분포 (히스토그램)","Recharts Bar"],
  ["추이 차트","해당 조건 최근 2년 낙찰가율 추이","Recharts Line"],
  ["비교 테이블","동일법원/유형 평균 vs AI예측 vs 전국 평균","Table"],
  ["유사 낙찰 사례","동일 조건 최근 낙찰 5건","카드 리스트"],
],[1500,3500,4360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 6. 수익률 시뮬레이터 ═══
ch.push(heading("6. 수익률 시뮬레이터"));

ch.push(heading("6.1 Mode A: 경매 수익률", HeadingLevel.HEADING_2));
ch.push(p([bold("개인 투자자 / 매매사업자 대상 경매 투자 수익률 분석")]));
ch.push(makeTable(["입력 필드","타입","기본값","설명"],[
  ["감정가","Currency","0","법원 감정가"],
  ["낙찰예상가(%)","Slider 30-120%","70%","감정가 대비 낙찰 비율"],
  ["수리/리모델링비","Currency","0","투입 예정 수리비"],
  ["보유기간","Slider 1-60개월","12","예상 보유 기간"],
  ["대출비율(LTV)","Slider 0-80%","60%","대출 활용 비율"],
  ["대출금리","Slider 2-10%","4.5%","연이율"],
  ["예상매도가","Currency 또는 %","감정가 100%","매도 예상가"],
],[1500,1200,1000,5660]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(p([bold("자동 계산 비용 항목:")]));
ch.push(makeTable(["비용 항목","계산 공식","비고"],[
  ["취득세","낙찰가 × 세율 (주택 1~3%, 비주택 4.6%)","담보유형별 자동 적용"],
  ["법무사 비용","50~100만원 (구간별 정액)","낙찰가 기준"],
  ["등록면허세","낙찰가 × 0.2%",""],
  ["이전비용","50만원 (정액)","명도 비용 별도"],
  ["중개수수료","매도가 × 0.4~0.9% (구간별)","법정 요율"],
  ["양도소득세","(매도가 - 취득가 - 필요경비) × 세율","보유기간별 세율"],
  ["대출이자","대출금 × 금리 × 보유기간/12","월복리"],
],[1500,3000,4860]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(p([bold("출력:")]));
ch.push(makeTable(["출력 항목","계산","표시"],[
  ["총 투입금","낙찰가 - 대출금 + 수리비 + 취득세 + 법무사 + 등록","큰 숫자 (Navy)"],
  ["총 수익","매도가 - 낙찰가 - 모든비용 - 양도세","큰 숫자 (Blue/Red)"],
  ["수익률 (ROI)","총수익 / 총투입금 × 100","% (큰 Bold)"],
  ["연환산수익률","(1 + ROI)^(12/보유기간) - 1","% + 은행금리 비교"],
  ["레버리지 효과","대출 사용 수익률 vs 미사용 수익률","비교 바 차트"],
],[1500,3000,4860]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

ch.push(heading("6.2 Mode B: 채권 매입 수익률", HeadingLevel.HEADING_2));
ch.push(p([bold("기관투자자 대상 부실채권 매입 수익률 분석")]));
ch.push(makeTable(["입력 필드","타입","설명"],[
  ["채권원금","Currency","원금 잔액"],
  ["미수이자","Currency","연체 이자"],
  ["매입가(%)","Slider 10-100%","채권원금 대비 매입 비율"],
  ["담보가치","Currency","감정가 또는 AI추정가"],
  ["회수 시나리오","Radio","정상변제 / 경매배당 / 임의매각 / 채권재매각"],
  ["예상 회수기간","Slider 1-36개월","시나리오별"],
  ["법적비용","Currency","소송/경매 비용 예상"],
],[1500,1200,6660]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(p([bold("시나리오별 출력:")]));
ch.push(makeTable(["시나리오","회수액 계산","특이사항"],[
  ["정상변제","채권원금 + 미수이자 전액 회수","최선 시나리오, 확률 낮음"],
  ["경매배당","MIN(담보가치 × 낙찰가율, 채권원금+이자) - 선순위","배당순위 고려, AI낙찰가율 연동"],
  ["임의매각","담보물 협의매각 금액 - 선순위 - 비용","협의매각 할인율 적용"],
  ["채권재매각","매입가 × 재매각비율 (보통 110-150%)","채권시장 가격 기준"],
],[1500,3000,4860]));
ch.push(new Paragraph({ spacing: { after: 200 } }));
ch.push(bullet("4개 시나리오 동시 비교 테이블 + Bar Chart"));
ch.push(bullet("Best/Worst/Expected 케이스 하이라이트"));
ch.push(bullet("결과 PDF 내보내기 (docx-js 또는 jsPDF)"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 7. 컴포넌트 트리 ═══
ch.push(heading("7. 컴포넌트 트리"));

ch.push(heading("7.1 상세 페이지", HeadingLevel.HEADING_2));
ch.push(code("app/(public)/listings/[id]/page.tsx"));
ch.push(code("├── ImageGallery.tsx → LightboxModal.tsx"));
ch.push(code("├── ListingHeader.tsx (뱃지+제목+주소+가격)"));
ch.push(code("├── DetailTabs.tsx (sticky 탭 네비게이션)"));
ch.push(code("│   ├── BasicInfoTab.tsx (기본정보)"));
ch.push(code("│   ├── LocationTab.tsx (위치+카카오맵+주변시세)"));
ch.push(code("│   ├── AIAnalysisTab.tsx (AI 분석 결과)"));
ch.push(code("│   │   ├── PriceEstimateCard.tsx"));
ch.push(code("│   │   ├── WinningRateCard.tsx"));
ch.push(code("│   │   └── RightsAnalysisCard.tsx"));
ch.push(code("│   ├── RegistryTab.tsx (등기부등본)"));
ch.push(code("│   │   ├── RegistryViewer.tsx (PDF 뷰어)"));
ch.push(code("│   │   └── RightsReport.tsx (분석 보고서)"));
ch.push(code("│   ├── AuctionHistoryTab.tsx (경매 이력)"));
ch.push(code("│   └── DocumentsTab.tsx (문서 목록)"));
ch.push(code("├── DetailSidebar.tsx (우측)"));
ch.push(code("│   ├── PriceSummary.tsx"));
ch.push(code("│   ├── CTAButtons.tsx (Stage별 분기)"));
ch.push(code("│   ├── AgentInfo.tsx (담당자)"));
ch.push(code("│   └── RelatedListings.tsx"));
ch.push(code("└── StageGate.tsx (정보공개 단계 제어)"));

ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("7.2 AI 도구 페이지 공통", HeadingLevel.HEADING_2));
ch.push(code("app/(auth)/investor/[tool]/page.tsx"));
ch.push(code("├── ToolHeader.tsx (도구명+설명)"));
ch.push(code("├── InputForm.tsx (도구별 입력폼)"));
ch.push(code("├── LoadingOverlay.tsx (분석 진행중)"));
ch.push(code("│   └── ProgressSteps.tsx (단계별 진행바)"));
ch.push(code("├── ResultDashboard.tsx (결과)"));
ch.push(code("│   ├── 도구별 차트 컴포넌트들"));
ch.push(code("│   └── ExportButton.tsx (PDF/저장)"));
ch.push(code("└── AnalysisHistory.tsx (이전 분석 목록)"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 8. DB 스키마 ═══
ch.push(heading("8. DB 스키마"));

ch.push(code("CREATE TABLE ai_analysis_results ("));
ch.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
ch.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
ch.push(code("  listing_id UUID REFERENCES npl_listings(id), -- nullable (독립 분석 시)"));
ch.push(code("  analysis_type TEXT NOT NULL, -- PRICE_ESTIMATE | RIGHTS_ANALYSIS | WINNING_RATE | PROFIT_SIM"));
ch.push(code("  input_data JSONB NOT NULL,"));
ch.push(code("  result_data JSONB NOT NULL,"));
ch.push(code("  confidence_score INT, -- 0-100"));
ch.push(code("  status TEXT DEFAULT 'COMPLETED', -- PENDING | PROCESSING | COMPLETED | FAILED"));
ch.push(code("  processing_time_ms INT,"));
ch.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
ch.push(code(");"));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(code("CREATE TABLE registry_documents ("));
ch.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
ch.push(code("  listing_id UUID REFERENCES npl_listings(id),"));
ch.push(code("  user_id UUID REFERENCES users(id), -- 업로드한 사용자"));
ch.push(code("  document_type TEXT NOT NULL, -- AUTO_FETCHED | USER_UPLOADED"));
ch.push(code("  file_url TEXT NOT NULL, -- Supabase Storage URL"));
ch.push(code("  file_size INT,"));
ch.push(code("  analysis_id UUID REFERENCES ai_analysis_results(id),"));
ch.push(code("  fetched_at TIMESTAMPTZ, -- 자동열람 시각"));
ch.push(code("  expires_at TIMESTAMPTZ, -- 유효기간 (열람 후 7일)"));
ch.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
ch.push(code(");"));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(code("CREATE INDEX idx_analysis_user_type ON ai_analysis_results(user_id, analysis_type, created_at DESC);"));
ch.push(code("CREATE INDEX idx_analysis_listing ON ai_analysis_results(listing_id, analysis_type);"));
ch.push(code("CREATE INDEX idx_registry_listing ON registry_documents(listing_id);"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 9. 에러 처리 ═══
ch.push(heading("9. 에러 처리 및 엣지 케이스"));
ch.push(makeTable(["시나리오","처리","UI"],[
  ["AI 모델 서버 다운","Fallback: '현재 AI 분석을 이용할 수 없습니다' + 캐시된 이전 결과 표시","에러 카드 + 재시도 버튼"],
  ["PDF 파싱 실패","OCR 폴백 시도 → 실패시 '파일을 읽을 수 없습니다'","파일 재업로드 안내"],
  ["등기부 자동열람 실패","수동 업로드 안내 + 재시도","'자동 열람에 실패했습니다. 직접 업로드해주세요'"],
  ["분석 타임아웃 (30초)","취소 + 재시도 안내","프로그레스바 중단 + 재시도 버튼"],
  ["Stage 미충족 접근","Stage 안내 모달 (NDA 서명 유도 또는 KYC 안내)","블러 오버레이 + CTA"],
  ["이미 분석 존재","캐시된 분석 결과 표시 + '재분석' 옵션","이전 결과 + 재분석 버튼"],
  ["비정상 입력값","입력 검증 → 에러 메시지","필드별 인라인 에러"],
],[1800,3000,4560]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 10. 개발 체크리스트 ═══
ch.push(heading("10. 개발 체크리스트"));
ch.push(makeTable(["우선순위","태스크","일정","의존성"],[
  ["P0","상세 페이지 기본 레이아웃 + 탭","Day 1-2","매물 API"],
  ["P0","3-Stage 정보 공개 로직","Day 2-3","Auth + NDA"],
  ["P0","마켓별 상세 분기 (3종)","Day 3-4","상세 레이아웃"],
  ["P0","이미지 갤러리 + 라이트박스","Day 4",""],
  ["P1","AI 가격 예측 UI + API 연동","Day 5-6","FastAPI 서버"],
  ["P1","등기부 권리분석 UI + 업로드","Day 6-7","PDF.js + GPT-4 API"],
  ["P1","낙찰가율 AI UI + 차트","Day 7-8","FastAPI 모델"],
  ["P1","수익률 시뮬레이터 (Mode A+B)","Day 8-10","계산 로직"],
  ["P2","SHAP 차트, 분포 차트","Day 10-11","Recharts"],
  ["P2","등기부 자동열람 연동","Day 11","인터넷등기소 API"],
  ["P2","분석 결과 저장/이력","Day 12","DB 스키마"],
  ["P3","PDF 내보내기","Day 12-13","jsPDF"],
  ["P3","반응형 + 성능 최적화","Day 13-14","전체"],
],[1000,3000,1200,5160]));

// BUILD
const doc = new Document({ numbering,
  styles: { default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 30, bold: true, color: C.blue }, paragraph: { spacing: { before: 280, after: 160 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 26, bold: true, color: C.navy }, paragraph: { spacing: { before: 200, after: 120 } } },
    ]},
  sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("NPLATFORM Module 3: 상세+AI분석 | ", { size: 16, color: C.gray }), run("Confidential", { size: 16, color: C.red, italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("© 2026 NPLATFORM. Page ", { size: 16, color: C.gray }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray })] })] }) },
    children: ch
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = __dirname + "/NPL_Module3_Detail_AI_Analysis.docx";
  fs.writeFileSync(out, buf);
  console.log(`Created: ${out} (${Math.round(buf.length/1024)}KB)`);
});
