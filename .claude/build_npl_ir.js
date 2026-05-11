/**
 * NPLatform Investor Deck — Build Script
 *
 * 26 slides · McKinsey Ink + Electric Blue + Ripple Cyan + Gold accent
 * Synthesized from:
 *   - 트랜스파머 IR Deck VF4 (2026.04, 35 slides)
 *   - XRF Ripple Deck v3 (2026.05, 20 slides)
 *   - KB 위탁테스트 발표자료 (2026, 21 slides)
 *   - NPLatform 소개자료 (2025.12, 21 slides)
 *
 * Focus: NPLatform = 트랜스파머 핵심 비즈니스 (거래수수료 모델)
 */
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches
pres.title = "NPLatform Investor Deck";
pres.author = "Kim Kihyun, Ph.D. · CEO, TRANSFARMER";
pres.company = "트랜스파머 (TRANSFARMER Inc.)";

// ─── Design Tokens ─────────────────────────────────────────
const INK = "0A1628";        // deep navy
const INK_MID = "1B3A5C";    // mid navy
const ELECTRIC = "2251FF";   // electric blue (primary CTA)
const ELECTRIC_DARK = "1A47CC";
const CYAN = "00A9F4";       // ripple cyan (global accent)
const GOLD = "C9A961";       // premium gold
const PAPER = "FFFFFF";
const PAPER_TINT = "F8FAFC";
const PAPER_DEEP = "EEF2F7";
const TEXT_PRIMARY = "0A1628";
const TEXT_MID = "475569";
const TEXT_MUTED = "94A3B8";
const BORDER = "E2E8F0";
const SUCCESS = "10B981";

const FONT_HEAD = "Georgia";
const FONT_BODY = "Calibri";

// ─── Helper: Slide Footer ──────────────────────────────────
function addFooter(slide, num, total) {
  // Bottom electric blue thin line
  slide.addShape(pres.ShapeType.line, {
    x: 0.5, y: 7.2, w: 12.33, h: 0,
    line: { color: BORDER, width: 0.5 },
  });
  // Brand mark
  slide.addText("NPLatform · Investor Deck · Confidential · May 2026", {
    x: 0.5, y: 7.22, w: 8, h: 0.25,
    fontFace: FONT_BODY, fontSize: 8, color: TEXT_MUTED,
    align: "left", valign: "middle",
  });
  // Page number
  slide.addText(`${num}`, {
    x: 12.0, y: 7.22, w: 0.83, h: 0.25,
    fontFace: FONT_HEAD, fontSize: 9, color: TEXT_MUTED,
    align: "right", valign: "middle", italic: true,
  });
}

// ─── Helper: Top Eyebrow + Title ───────────────────────────
function addHeader(slide, eyebrow, title, subtitle) {
  slide.addText(eyebrow, {
    x: 0.5, y: 0.4, w: 12, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: ELECTRIC,
    charSpacing: 30,
  });
  slide.addText(title, {
    x: 0.5, y: 0.75, w: 12.3, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: INK,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.4, w: 12.3, h: 0.4,
      fontFace: FONT_BODY, fontSize: 14, color: TEXT_MID,
    });
  }
}

// ════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: INK };

  // Top accent stripes
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0.06, w: 13.33, h: 0.02, fill: { color: CYAN }, line: { color: CYAN } });

  // Bottom-left logo mark
  s.addShape(pres.ShapeType.rect, { x: 0.6, y: 0.5, w: 0.7, h: 0.7, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addText("N", { x: 0.6, y: 0.5, w: 0.7, h: 0.7, fontFace: FONT_HEAD, fontSize: 38, bold: true, color: PAPER, align: "center", valign: "middle" });
  s.addText("NPLatform", { x: 1.45, y: 0.55, w: 4, h: 0.6, fontFace: FONT_HEAD, fontSize: 26, bold: true, color: PAPER, valign: "middle", charSpacing: -10 });

  // Eyebrow
  s.addText("INVESTOR DECK · 2026", {
    x: 0.6, y: 2.4, w: 12, h: 0.4,
    fontFace: FONT_BODY, fontSize: 12, bold: true, color: CYAN,
    charSpacing: 60,
  });

  // Hero title
  s.addText("AI 가 가격을 매기고, 시장이 거래한다", {
    x: 0.6, y: 2.85, w: 12, h: 1.0,
    fontFace: FONT_HEAD, fontSize: 44, bold: true, color: PAPER, charSpacing: -15,
  });
  s.addText("국내 유일 AI 기반 NPL 거래 플랫폼", {
    x: 0.6, y: 3.85, w: 12, h: 0.6,
    fontFace: FONT_HEAD, fontSize: 30, color: "A8CDE8", italic: true,
  });

  // Tagline
  s.addText(
    "한국 부실채권 시장의 정보 비대칭을 해소하고, AI 가치평가로 거래를 가속하며, 글로벌 자본(XRF/Ripple)과 연결합니다.",
    { x: 0.6, y: 4.7, w: 12, h: 0.6, fontFace: FONT_BODY, fontSize: 14, color: "CBD5E1" }
  );

  // KPI strip
  const kpis = [
    { label: "등록 감정평가", val: "₩5.7조" },
    { label: "회원 금융기관", val: "130+" },
    { label: "최단 Exit", val: "33일" },
    { label: "예측 정확도", val: "90%+" },
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.1;
    s.addShape(pres.ShapeType.rect, { x, y: 5.5, w: 2.95, h: 0.95, fill: { color: "0F2540" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addText(k.val, { x: x + 0.15, y: 5.55, w: 2.7, h: 0.5, fontFace: FONT_HEAD, fontSize: 24, bold: true, color: PAPER });
    s.addText(k.label, { x: x + 0.15, y: 6.05, w: 2.7, h: 0.35, fontFace: FONT_BODY, fontSize: 10, color: "94A3B8", charSpacing: 20 });
  });

  // Bottom info
  s.addText("Kim Kihyun, Ph.D.  ·  CEO, TRANSFARMER", { x: 0.6, y: 6.8, w: 7, h: 0.3, fontFace: FONT_BODY, fontSize: 11, color: "94A3B8" });
  s.addText("ceo@transfarmer.co.kr  ·  www.nplatform.ai", { x: 7.6, y: 6.8, w: 5.7, h: 0.3, fontFace: FONT_BODY, fontSize: 11, color: "94A3B8", align: "right" });
}

// ════════════════════════════════════════════════════════════
// SLIDE 2 — EXECUTIVE SUMMARY (60-second)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "01 · 60-SECOND SUMMARY", "왜 NPLatform 인가", "한국 부실채권 시장 ₩43조 — AI 가 가치를 매기고, 시장이 즉시 거래한다.");

  const cards = [
    { num: "1", title: "검증된 트랙션", body: "베타 6개월 만에 등록 감정평가 ₩5.7조 · 784건 · 회원 금융기관 130+", color: ELECTRIC },
    { num: "2", title: "1금융 신뢰 확보", body: "KB국민은행 여신관리부 위탁테스트 (7개월 ₩1.5억) · NH·toss·K뱅크 파트너십", color: INK },
    { num: "3", title: "양면 시장 우위", body: "공급: 130+ 금융기관  /  수요: 땅집고옥션 12,000명 + 月 89만 트래픽", color: GOLD },
    { num: "4", title: "단순한 BM", body: "거래수수료 0.5~1.5% (양면) + Premium 가입료 + 분석 리포트 매출", color: ELECTRIC },
    { num: "5", title: "글로벌 Upside", body: "XRF/Ripple MOU · 한국 NPL → 글로벌 RWA 토큰화 (PoC $200K 진행)", color: CYAN },
    { num: "6", title: "3년 매출 ₩253억", body: "2026 ₩17.6억 → 2027 ₩61억 → 2028 ₩253억 · 영업이익률 65.3%", color: SUCCESS },
  ];

  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.22;
    const y = 2.0 + row * 2.45;
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 2.25, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 0.06, fill: { color: c.color }, line: { color: c.color } });
    // Number
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.3, w: 0.55, h: 0.55, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.num, { x: x + 0.25, y: y + 0.3, w: 0.55, h: 0.55, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: PAPER, align: "center", valign: "middle" });
    // Title
    s.addText(c.title, { x: x + 0.95, y: y + 0.32, w: 2.95, h: 0.45, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });
    // Body
    s.addText(c.body, { x: x + 0.25, y: y + 0.95, w: 3.55, h: 1.2, fontFace: FONT_BODY, fontSize: 11, color: TEXT_MID });
  });

  addFooter(s, 2);
}

// ════════════════════════════════════════════════════════════
// SLIDE 3 — MISSION / VISION
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });

  s.addText("VISION", { x: 0.6, y: 0.6, w: 12, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 60 });

  s.addText("We Price, Digitize, and Globalize", { x: 0.6, y: 1.2, w: 12, h: 0.85, fontFace: FONT_HEAD, fontSize: 40, bold: true, color: PAPER, charSpacing: -10 });
  s.addText("Distressed Real-World Assets.", { x: 0.6, y: 2.05, w: 12, h: 0.85, fontFace: FONT_HEAD, fontSize: 40, bold: true, italic: true, color: "A8CDE8", charSpacing: -10 });

  s.addText(
    "한국 부실채권을 AI 로 정확히 가격 매기고, 디지털 거래소로 유동성을 만들고,\n글로벌 RWA 자본시장과 연결하는 핀테크 인프라.",
    { x: 0.6, y: 3.2, w: 12, h: 1.2, fontFace: FONT_BODY, fontSize: 16, color: "CBD5E1", lineSpacingMultiple: 1.4 }
  );

  // 3 pillar funnel
  const pillars = [
    { stage: "AI Pricing", text: "100억+ 부동산 빅데이터", num: "30만 건/년", color: ELECTRIC },
    { stage: "Digital Marketplace", text: "5단계 거래 프로세스", num: "33일 평균 Exit", color: CYAN },
    { stage: "Global RWA", text: "XRF · Ripple · RLUSD", num: "$1.2T 아시아 NPL", color: GOLD },
  ];
  pillars.forEach((p, i) => {
    const x = 0.6 + i * 4.22;
    s.addShape(pres.ShapeType.rect, { x, y: 5.0, w: 4.0, h: 1.7, fill: { color: "0F2540" }, line: { color: p.color, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y: 5.0, w: 0.06, h: 1.7, fill: { color: p.color }, line: { color: p.color } });
    s.addText(`STAGE 0${i + 1}`, { x: x + 0.25, y: 5.15, w: 3.6, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true, color: p.color, charSpacing: 40 });
    s.addText(p.stage, { x: x + 0.25, y: 5.4, w: 3.6, h: 0.45, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: PAPER });
    s.addText(p.text, { x: x + 0.25, y: 5.85, w: 3.6, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: "94A3B8" });
    s.addText(p.num, { x: x + 0.25, y: 6.25, w: 3.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: p.color, italic: true });
  });

  s.addText("NPLatform · Investor Deck · 2026", { x: 0.5, y: 7.22, w: 12.33, h: 0.25, fontFace: FONT_BODY, fontSize: 8, color: TEXT_MUTED });
  s.addText("3", { x: 12.0, y: 7.22, w: 0.83, h: 0.25, fontFace: FONT_HEAD, fontSize: 9, italic: true, color: TEXT_MUTED, align: "right" });
}

// ════════════════════════════════════════════════════════════
// SLIDE 4 — PROBLEM (한국 NPL 시장 비효율)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "02 · MARKET PROBLEM", "한국 NPL 시장은 ₩43조 — 그러나 정보 비대칭으로 거래는 막혀있다", "은행은 매각이 늦고, 매입사는 가격을 못 매기며, 글로벌 자본은 진입조차 못 한다.");

  // Left: Pain stats
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 6.0, h: 4.5, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 6.0, h: 0.06, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addText("매각사 (은행·2금융권) 페인", { x: 0.7, y: 2.15, w: 5.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  const sellerPains = [
    { stat: "₩43조", body: "은행 12.5조 + 비은행 31.2조 누적 NPL — BIS 비율 압박" },
    { stat: "+76%", body: "PF 연체율 '23.3월 2.01% → '24.3월 3.55% 급등" },
    { stat: "6개월+", body: "평균 매각 소요 — 외주 가치평가 의존, 표준화 부재" },
    { stat: "₩1,500만", body: "보고서 1건 외주 비용 — 인력·비용·일정 모두 비효율" },
  ];
  sellerPains.forEach((p, i) => {
    const y = 2.7 + i * 0.85;
    s.addText(p.stat, { x: 0.7, y, w: 1.7, h: 0.7, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: ELECTRIC });
    s.addText(p.body, { x: 2.5, y: y + 0.05, w: 3.8, h: 0.7, fontFace: FONT_BODY, fontSize: 11, color: TEXT_MID, valign: "middle" });
  });

  // Right: Buyer/Investor pain
  s.addShape(pres.ShapeType.rect, { x: 6.85, y: 2.0, w: 6.0, h: 4.5, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
  s.addShape(pres.ShapeType.rect, { x: 6.85, y: 2.0, w: 6.0, h: 0.06, fill: { color: GOLD }, line: { color: GOLD } });
  s.addText("매입사·투자자 페인", { x: 7.05, y: 2.15, w: 5.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  const buyerPains = [
    { stat: "60%", body: "지난 20년 경매 낙찰자 손실률 — '감'에 의존한 투자" },
    { stat: "30만 건/년", body: "역대 최대 경매 물량 — 옥석 가리기 불가능" },
    { stat: "흩어진 매물", body: "은행·AMC·대부업체 별도 채널 — 한 곳에서 비교 불가" },
    { stat: "글로벌 차단", body: "한국 대부업법 · USD 460k 자본요건 — 외국인 투자자 진입 불가" },
  ];
  buyerPains.forEach((p, i) => {
    const y = 2.7 + i * 0.85;
    s.addText(p.stat, { x: 7.05, y, w: 1.95, h: 0.7, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: GOLD });
    s.addText(p.body, { x: 9.1, y: y + 0.05, w: 3.65, h: 0.7, fontFace: FONT_BODY, fontSize: 11, color: TEXT_MID, valign: "middle" });
  });

  // Bottom takeaway
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 6.65, w: 12.33, h: 0.45, fill: { color: INK }, line: { color: INK } });
  s.addText('"데이터는 있어도 판단(Decision)할 알고리즘이 없고, 거래소(Marketplace)도 없다."', {
    x: 0.5, y: 6.65, w: 12.33, h: 0.45,
    fontFace: FONT_HEAD, fontSize: 14, italic: true, color: PAPER, align: "center", valign: "middle",
  });

  addFooter(s, 4);
}

// ════════════════════════════════════════════════════════════
// SLIDE 5 — MARKET SIZE (TAM/SAM/SOM)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "03 · MARKET SIZE", "한국 ₩145.8조 TAM + 글로벌 $16T RWA Upside", "대한민국 부동산 담보부 부실채권은 매년 ₩47.1조 매각 시장 — 글로벌 NPL 까지 합치면 $1.2T+");

  // Left: 3 nested boxes (TAM/SAM/SOM)
  const tamX = 0.5, tamY = 2.0, tamW = 6.5, tamH = 4.6;
  s.addShape(pres.ShapeType.rect, { x: tamX, y: tamY, w: tamW, h: tamH, fill: { color: PAPER_TINT }, line: { color: TEXT_MUTED, width: 1, dashType: "dash" } });
  s.addText("TAM · ₩145.8조", { x: tamX + 0.25, y: tamY + 0.15, w: tamW - 0.5, h: 0.4, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: INK });
  s.addText("Total Addressable · 한국 NPL+경매+공매 총액", { x: tamX + 0.25, y: tamY + 0.55, w: tamW - 0.5, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID });

  // SAM
  const samX = tamX + 0.4, samY = tamY + 1.0, samW = tamW - 0.8, samH = tamH - 1.4;
  s.addShape(pres.ShapeType.rect, { x: samX, y: samY, w: samW, h: samH, fill: { color: "DBEAFE" }, line: { color: ELECTRIC, width: 1 } });
  s.addText("SAM · ₩78.8조", { x: samX + 0.2, y: samY + 0.15, w: samW - 0.4, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: ELECTRIC_DARK });
  s.addText("Service Available · NPL 매각+경공매 낙찰액", { x: samX + 0.2, y: samY + 0.55, w: samW - 0.4, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: ELECTRIC_DARK });

  // SOM
  const somX = samX + 0.4, somY = samY + 0.95, somW = samW - 0.8, somH = samH - 1.3;
  s.addShape(pres.ShapeType.rect, { x: somX, y: somY, w: somW, h: somH, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addText("SOM", { x: somX + 0.2, y: somY + 0.15, w: somW - 0.4, h: 0.35, fontFace: FONT_BODY, fontSize: 12, bold: true, color: PAPER, charSpacing: 60 });
  s.addText("₩5조", { x: somX + 0.2, y: somY + 0.5, w: somW - 0.4, h: 0.7, fontFace: FONT_HEAD, fontSize: 32, bold: true, color: PAPER });
  s.addText("매각자문 ₩4.7조 + 경공매 컨설팅 ₩3,170억", { x: somX + 0.2, y: somY + 1.25, w: somW - 0.4, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: PAPER });

  // Right: Global Upside
  s.addShape(pres.ShapeType.rect, { x: 7.5, y: 2.0, w: 5.35, h: 4.6, fill: { color: INK }, line: { color: INK } });
  s.addText("GLOBAL UPSIDE", { x: 7.7, y: 2.2, w: 5, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 60 });
  s.addText("아시아·글로벌 RWA 시장", { x: 7.7, y: 2.55, w: 5, h: 0.5, fontFace: FONT_HEAD, fontSize: 20, bold: true, color: PAPER });

  const globals = [
    { v: "$1.2T+", l: "Asian NPL Market", d: "한국 + 일본 + 동남아 누적" },
    { v: "$16T", l: "2030 RWA Token Market", d: "기관 자본 디지털화" },
    { v: "$5.8B", l: "Current RWA TVL", d: "0.1% 미만 — 인프라 구축기" },
    { v: "$280T", l: "Global Illiquid Assets", d: "부동산 $326T 포함" },
  ];
  globals.forEach((g, i) => {
    const y = 3.2 + i * 0.78;
    s.addText(g.v, { x: 7.7, y, w: 1.7, h: 0.65, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: CYAN });
    s.addText(g.l, { x: 9.5, y, w: 3.2, h: 0.3, fontFace: FONT_BODY, fontSize: 11, bold: true, color: PAPER });
    s.addText(g.d, { x: 9.5, y: y + 0.3, w: 3.2, h: 0.3, fontFace: FONT_BODY, fontSize: 9, color: "94A3B8" });
  });

  addFooter(s, 5);
}

// ════════════════════════════════════════════════════════════
// SLIDE 6 — SOLUTION (One-Stop)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "04 · SOLUTION", "국내 유일 원스톱 NPL 거래 플랫폼", "공급자 (금융기관) 와 매입사를 직결하는 5단계 디지털 거래 프로세스 — 평균 33일 Exit");

  // 5-step horizontal flow
  const steps = [
    { num: "01", title: "NPL 등록", body: "AI OCR 자동 채움\nExcel/PDF 1분 업로드" },
    { num: "02", title: "AI 분석", body: "회수율 · 낙찰가\n위험도 자동 산출" },
    { num: "03", title: "매수 의향서", body: "자금 증빙 + LOI\n비공개 제출" },
    { num: "04", title: "비공개 협의", body: "플랫폼 중개\n양면 가격 합의" },
    { num: "05", title: "거래 성사", body: "전자계약 + ESCROW\n채권 양도" },
  ];

  const stepW = 2.35, stepGap = 0.16;
  steps.forEach((step, i) => {
    const x = 0.5 + i * (stepW + stepGap);
    const y = 2.2;
    // Card
    s.addShape(pres.ShapeType.rect, { x, y, w: stepW, h: 2.5, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: stepW, h: 0.06, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
    // Number circle
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.85, y: y + 0.3, w: 0.65, h: 0.65, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
    s.addText(step.num, { x: x + 0.85, y: y + 0.3, w: 0.65, h: 0.65, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: PAPER, align: "center", valign: "middle" });
    // Title
    s.addText(step.title, { x: x + 0.1, y: y + 1.05, w: stepW - 0.2, h: 0.45, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK, align: "center" });
    // Body
    s.addText(step.body, { x: x + 0.1, y: y + 1.55, w: stepW - 0.2, h: 0.85, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID, align: "center" });

    // Arrow
    if (i < steps.length - 1) {
      s.addText("›", { x: x + stepW + 0.0, y: y + 1.05, w: 0.18, h: 0.4, fontFace: FONT_HEAD, fontSize: 24, bold: true, color: ELECTRIC, align: "center", valign: "middle" });
    }
  });

  // Bottom: 33일 Exit 사례
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.1, w: 12.33, h: 1.8, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
  s.addText("✓ 33일 Exit 실증 사례", { x: 0.7, y: 5.25, w: 5, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: SUCCESS });

  const exitFacts = [
    { l: "원금", v: "₩37억" },
    { l: "유찰", v: "2·3회 연속" },
    { l: "Exit", v: "33일" },
    { l: "낙찰가", v: "₩39억" },
    { l: "수익", v: "+₩2억" },
  ];
  exitFacts.forEach((f, i) => {
    const x = 0.7 + i * 2.42;
    s.addText(f.l, { x, y: 5.85, w: 2.2, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 40 });
    s.addText(f.v, { x, y: 6.15, w: 2.2, h: 0.6, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: INK });
  });

  addFooter(s, 6);
}

// ════════════════════════════════════════════════════════════
// SLIDE 7 — AI ENGINE
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "05 · AI QUANT ENGINE", "100억+ 빅데이터 위에서 작동하는 정량 의사결정 엔진", "기존 시장은 '감(感)' · NPLatform 은 데이터 — 90% 이상 예측 정확도 확보");

  // Left: 4 capability blocks
  const caps = [
    { v: "100억+", l: "부동산 금융 빅데이터", d: "경매·공매·실거래·등기·공시·뉴스" },
    { v: "80가지", l: "위험 조건 자동 검증", d: "권리관계·선순위·물건 상태 자동 필터" },
    { v: "10초", l: "분석 완료 시간", d: "Summary 6p · Report 30p+" },
    { v: "90%+", l: "낙찰가 예측 정확도", d: "최근 3개월 평균 오차 5%" },
  ];
  caps.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 3.35;
    const y = 2.0 + row * 1.55;
    s.addShape(pres.ShapeType.rect, { x, y, w: 3.2, h: 1.4, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.06, h: 1.4, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
    s.addText(c.v, { x: x + 0.2, y: y + 0.1, w: 2.95, h: 0.55, fontFace: FONT_HEAD, fontSize: 26, bold: true, color: ELECTRIC });
    s.addText(c.l, { x: x + 0.2, y: y + 0.65, w: 2.95, h: 0.3, fontFace: FONT_BODY, fontSize: 11, bold: true, color: INK });
    s.addText(c.d, { x: x + 0.2, y: y + 0.95, w: 2.95, h: 0.4, fontFace: FONT_BODY, fontSize: 9, color: TEXT_MID });
  });

  // Right: AI Output structure
  s.addShape(pres.ShapeType.rect, { x: 7.4, y: 2.0, w: 5.45, h: 4.5, fill: { color: INK }, line: { color: INK } });
  s.addText("AI OUTPUT STRUCTURE", { x: 7.6, y: 2.15, w: 5, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 50 });
  s.addText("4 Decision Scores", { x: 7.6, y: 2.5, w: 5, h: 0.5, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: PAPER });

  const scores = [
    { name: "Price Score", desc: "AI 시세 (감정가가 아닌 현 시점 시세)" },
    { name: "Risk Score", desc: "권리·시장·유동성 4팩터 종합" },
    { name: "Expected Bid", desc: "예상 낙찰가 + 신뢰구간" },
    { name: "Recovery", desc: "회수율 + Monte Carlo 시뮬레이션" },
  ];
  scores.forEach((sc, i) => {
    const y = 3.2 + i * 0.75;
    s.addShape(pres.ShapeType.rect, { x: 7.6, y, w: 5.05, h: 0.62, fill: { color: "0F2540" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addShape(pres.ShapeType.rect, { x: 7.6, y, w: 0.06, h: 0.62, fill: { color: CYAN }, line: { color: CYAN } });
    s.addText(sc.name, { x: 7.85, y: y + 0.05, w: 2, h: 0.55, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: PAPER, valign: "middle" });
    s.addText(sc.desc, { x: 9.85, y: y + 0.05, w: 2.7, h: 0.55, fontFace: FONT_BODY, fontSize: 9, color: "94A3B8", valign: "middle" });
  });

  addFooter(s, 7);
}

// ════════════════════════════════════════════════════════════
// SLIDE 8 — TRACTION
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "06 · TRACTION (BETA · 6 MONTHS)", "베타 6개월 — ₩5.7조 등록, 33일 Exit, 130+ 회원사", "2025년 9월 정식 론칭 · 단 6개월 만에 검증 완료된 시장 흡수력");

  // 4 huge KPIs in top
  const kpis = [
    { v: "784건", l: "등록 NPL 건수", c: ELECTRIC },
    { v: "₩5.7조", l: "감정평가 총액", c: INK },
    { v: "₩1.4조", l: "근저당 설정금액", c: GOLD },
    { v: "₩1.17조", l: "대출원금 총액", c: SUCCESS },
  ];
  kpis.forEach((k, i) => {
    const x = 0.5 + i * 3.13;
    s.addShape(pres.ShapeType.rect, { x, y: 2.0, w: 2.95, h: 1.7, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y: 2.0, w: 2.95, h: 0.08, fill: { color: k.c }, line: { color: k.c } });
    s.addText(k.v, { x: x + 0.15, y: 2.3, w: 2.65, h: 0.85, fontFace: FONT_HEAD, fontSize: 32, bold: true, color: k.c });
    s.addText(k.l, { x: x + 0.15, y: 3.15, w: 2.65, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: TEXT_MID, charSpacing: 20 });
  });

  // Bottom: Operational metrics
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 4.0, w: 6.0, h: 2.9, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
  s.addText("거래 가속화 지표", { x: 0.7, y: 4.15, w: 5.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  const ops = [
    { l: "평균 거래 마감", v: "33일", n: "기존 6개월 대비 5x 가속" },
    { l: "AI 분석 시간", v: "10초", n: "기존 보고서 1주일+ → 즉시" },
    { l: "보고서 비용 절감", v: "98%", n: "₩1,500만 외주 → 클릭 1회" },
    { l: "예측 오차범위", v: "5%", n: "최근 3개월 낙찰물건 평균" },
  ];
  ops.forEach((op, i) => {
    const y = 4.7 + i * 0.55;
    s.addText(op.v, { x: 0.7, y, w: 1.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: ELECTRIC });
    s.addText(op.l, { x: 2.3, y: y + 0.05, w: 2.0, h: 0.4, fontFace: FONT_BODY, fontSize: 12, bold: true, color: INK });
    s.addText(op.n, { x: 4.3, y: y + 0.1, w: 2.0, h: 0.35, fontFace: FONT_BODY, fontSize: 9, color: TEXT_MUTED, italic: true });
  });

  // Right: Trafficmetrics
  s.addShape(pres.ShapeType.rect, { x: 6.85, y: 4.0, w: 6.0, h: 2.9, fill: { color: INK_MID }, line: { color: INK_MID } });
  s.addText("플랫폼 트래픽 (땅집고옥션 통합)", { x: 7.05, y: 4.15, w: 5.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: PAPER });

  const traffic = [
    { l: "누적 트래픽", v: "89만+" },
    { l: "총 방문자", v: "13만+" },
    { l: "가입자", v: "1.2만+" },
    { l: "평균 체류시간", v: "4분 19초", g: "+236%" },
  ];
  traffic.forEach((t, i) => {
    const y = 4.7 + i * 0.55;
    s.addText(t.v, { x: 7.05, y, w: 2.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: CYAN });
    s.addText(t.l, { x: 9.7, y: y + 0.05, w: 2.0, h: 0.4, fontFace: FONT_BODY, fontSize: 12, color: PAPER });
    if (t.g) {
      s.addText(t.g, { x: 11.7, y: y + 0.05, w: 1.0, h: 0.4, fontFace: FONT_HEAD, fontSize: 13, bold: true, italic: true, color: SUCCESS });
    }
  });

  addFooter(s, 8);
}

// ════════════════════════════════════════════════════════════
// SLIDE 9 — TRACK RECORD (금융권)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "07 · INSTITUTIONAL TRACK RECORD", "1금융 · 2금융 · 인터넷은행 · AMC 동시 진입", "한국 금융권 핵심 플레이어들이 NPLatform 의 기술과 시장을 이미 검증");

  // 5 verified card layout
  const refs = [
    { tier: "VERIFIED", name: "KB국민은행", since: "2026.04~", desc: "여신관리부 위탁테스트 계약\n부실채권 평가시스템 구축\n금융위 위탁테스트 7개월 ₩1.5억", color: ELECTRIC, badge: INK },
    { tier: "VERIFIED", name: "NH농협중앙회", since: "2024~2025", desc: "65개 지점 부실채권 분석 PoC\n마케팅 플랫폼 PoC 완료", color: ELECTRIC, badge: INK },
    { tier: "PARTNER", name: "Toss", since: "2025.10~", desc: "우수 파트너사 선정\nAI 경매 서비스 In-app 제공\nMini-App Challenge 수상", color: GOLD, badge: INK },
    { tier: "PARTNER", name: "Kbank", since: "2026.02~", desc: "공동사업 파트너 선정\nIn-App 1,500만+ MAU\n광고/마케팅 신사업 런칭", color: GOLD, badge: INK },
    { tier: "GLOBAL", name: "XRPL · Ripple", since: "2026.01~", desc: "MOU + 글로벌 PoC ($200K)\n비지분 투자기업 후보\n글로벌 RWA 인프라 연계", color: CYAN, badge: INK },
  ];

  refs.forEach((r, i) => {
    const x = 0.5 + i * 2.51;
    const y = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.36, h: 3.4, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.36, h: 0.4, fill: { color: r.color }, line: { color: r.color } });
    s.addText(r.tier, { x: x + 0.15, y, w: 2.06, h: 0.4, fontFace: FONT_BODY, fontSize: 9, bold: true, color: PAPER, charSpacing: 50, valign: "middle" });
    s.addText(r.name, { x: x + 0.15, y: y + 0.55, w: 2.06, h: 0.5, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(r.since, { x: x + 0.15, y: y + 1.05, w: 2.06, h: 0.3, fontFace: FONT_BODY, fontSize: 10, italic: true, color: TEXT_MUTED });
    s.addText(r.desc, { x: x + 0.15, y: y + 1.45, w: 2.06, h: 1.85, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID });
  });

  // Bottom: Member firms list
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.6, w: 12.33, h: 1.3, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
  s.addText("회원 금융기관 130+ (검증·인증 완료)", { x: 0.7, y: 5.7, w: 12, h: 0.35, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: INK });

  const members = [
    { l: "1금융", v: "KB국민은행 · 토스뱅크 · iM금융그룹 · K뱅크" },
    { l: "2금융", v: "MG새마을금고 · 수협 · 신협 · 산림조합 · 모아저축은행 · 한국투자저축은행" },
    { l: "AMC·대부", v: "UAMCO · MG신용정보 · 투자마블 · 바른NPL · LF자산운용 · 30+ 대부업체" },
  ];
  members.forEach((m, i) => {
    const y = 6.05 + i * 0.27;
    s.addText(m.l, { x: 0.7, y, w: 1.2, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true, color: ELECTRIC, charSpacing: 30 });
    s.addText(m.v, { x: 1.95, y, w: 10.7, h: 0.25, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID });
  });

  addFooter(s, 9);
}

// ════════════════════════════════════════════════════════════
// SLIDE 10 — KB 위탁테스트 상세
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "08 · KB 위탁테스트 (FLAGSHIP REFERENCE)", "KB국민은행 여신관리부 — 7개월 ₩1.5억 Pilot 진행 중", "금융위 인증 위탁테스트 — 1금융권 NPL 평가 시스템 구축의 표준 만들기");

  // Left: KB testing facts
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 5.7, h: 4.5, fill: { color: INK }, line: { color: INK } });
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 5.7, h: 0.06, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });

  s.addText("FLAGSHIP CONTRACT", { x: 0.7, y: 2.15, w: 5.4, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: CYAN, charSpacing: 60 });
  s.addText("KB국민은행 여신관리부", { x: 0.7, y: 2.5, w: 5.4, h: 0.5, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: PAPER });

  const kbfacts = [
    { l: "위탁사", v: "주식회사 국민은행" },
    { l: "테스트 기간", v: "2026.04.06 ~ 2026.10.31 (7개월)" },
    { l: "신청 분야", v: "여신관리 · 부실채권 분석" },
    { l: "예산 규모", v: "₩1억 4,964만 (인건비 1.12억 + 클라우드 0.25억 + API 0.12억)" },
    { l: "수혜 부서", v: "여신심사 · 리스크관리 · 자산건전성 · NPL 운용" },
  ];
  kbfacts.forEach((f, i) => {
    const y = 3.2 + i * 0.55;
    s.addText(f.l, { x: 0.7, y, w: 1.5, h: 0.5, fontFace: FONT_BODY, fontSize: 9, bold: true, color: CYAN, charSpacing: 30, valign: "top" });
    s.addText(f.v, { x: 2.25, y, w: 3.85, h: 0.5, fontFace: FONT_BODY, fontSize: 11, color: PAPER, valign: "top" });
  });

  // Right: 7 monthly milestones timeline
  s.addText("7-MONTH ROADMAP", { x: 6.6, y: 2.0, w: 6.5, h: 0.4, fontFace: FONT_BODY, fontSize: 11, bold: true, color: ELECTRIC, charSpacing: 60 });
  s.addText("월별 단계별 수행 계획", { x: 6.6, y: 2.4, w: 6.5, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  const milestones = [
    { m: "M1 · 04월", t: "요구사항 구체화" },
    { m: "M2 · 05월", t: "설계 · Infra 준비" },
    { m: "M3 · 06월", t: "AI 모델 1차 커스터마이징" },
    { m: "M4 · 07월", t: "AI 모델 고도화 + Pilot API" },
    { m: "M5 · 08월", t: "내부 부서 테스트" },
    { m: "M6 · 09월", t: "리포트 표준화 + QA" },
    { m: "M7 · 10월", t: "시범서비스 + 최종보고" },
  ];
  milestones.forEach((m, i) => {
    const y = 3.0 + i * 0.5;
    s.addShape(pres.ShapeType.ellipse, { x: 6.7, y: y + 0.07, w: 0.3, h: 0.3, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
    s.addText(m.m, { x: 7.15, y, w: 1.7, h: 0.4, fontFace: FONT_BODY, fontSize: 10, bold: true, color: ELECTRIC });
    s.addText(m.t, { x: 8.95, y, w: 4.0, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: TEXT_MID });
  });

  // KPI strip at bottom
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 6.65, w: 12.33, h: 0.45, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
  s.addText("✓ Target KPIs:  100+ 케이스 검증  ·  -50% 분석시간 단축  ·  KB 본계약 전환 + 전 금융권 확산", {
    x: 0.5, y: 6.65, w: 12.33, h: 0.45,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: SUCCESS, align: "center", valign: "middle",
  });

  addFooter(s, 10);
}

// ════════════════════════════════════════════════════════════
// SLIDE 11 — 정부·기관 검증
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "09 · GOVERNMENT VALIDATION", "대한민국 부동산 금융 4대 기관에서 모두 인증", "금융위 · 국토부 · KAMCO · 한국언론진흥재단 — 기술과 사업성 동시 검증");

  const awards = [
    { date: "2025.09", inst: "금융위원회 · 금융감독원", award: "위탁테스트 기업 선정", desc: "디지털 금융기술 내재화 사업\n금융 테스트베드 비용 수혜기업 ('26.04)", color: ELECTRIC, tier: "★★★ TIER-1 FINANCIAL REGULATOR" },
    { date: "2025.08", inst: "국토교통부", award: "부동산서비스산업 창업경진대회 최우수상", desc: "국토부 장관상\n부동산 분야 정부 인증", color: GOLD, tier: "MINISTRY VALIDATION" },
    { date: "2025.09", inst: "한국자산관리공사 (KAMCO)", award: "Startup TechBlaze 우수상", desc: "AI Transformation 제안\n공공 AMC 검증", color: GOLD, tier: "PUBLIC AMC VALIDATION" },
    { date: "2025.09", inst: "한국언론진흥재단", award: "미디어 스타트업 장려상", desc: "부동산 뉴스 AI 분석 서비스\n빅카인즈 (BIGKinds) 협력", color: CYAN, tier: "MEDIA TECH AWARD" },
  ];

  awards.forEach((a, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.25;
    const y = 2.0 + row * 2.4;
    s.addShape(pres.ShapeType.rect, { x, y, w: 6.0, h: 2.2, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.08, h: 2.2, fill: { color: a.color }, line: { color: a.color } });
    s.addText(a.tier, { x: x + 0.2, y: y + 0.15, w: 5.7, h: 0.25, fontFace: FONT_BODY, fontSize: 8, bold: true, color: a.color, charSpacing: 50 });
    s.addText(a.inst, { x: x + 0.2, y: y + 0.4, w: 5.7, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(a.award, { x: x + 0.2, y: y + 0.85, w: 5.7, h: 0.4, fontFace: FONT_BODY, fontSize: 12, bold: true, color: ELECTRIC });
    s.addText(a.desc, { x: x + 0.2, y: y + 1.3, w: 5.7, h: 0.7, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID });
    s.addText(a.date, { x: x + 5.0, y: y + 0.15, w: 0.9, h: 0.3, fontFace: FONT_HEAD, fontSize: 11, italic: true, color: TEXT_MUTED, align: "right" });
  });

  addFooter(s, 11);
}

// ════════════════════════════════════════════════════════════
// SLIDE 12 — 매수자 풀 (땅집고옥션)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "10 · DEMAND-SIDE MOAT", "땅집고옥션 — 매수자 풀 12,000명 + 月 89만 트래픽", "조선일보 땅집고가 운영하는 국내 최대 경매·NPL 미디어 채널 → CAC 거의 0");

  // Left: Big number
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 4.5, h: 4.6, fill: { color: INK }, line: { color: INK } });
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 4.5, h: 0.06, fill: { color: GOLD }, line: { color: GOLD } });

  s.addText("매수자 풀 (활성)", { x: 0.7, y: 2.2, w: 4.1, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: GOLD, charSpacing: 50 });
  s.addText("12,000+", { x: 0.7, y: 2.6, w: 4.1, h: 1.2, fontFace: FONT_HEAD, fontSize: 64, bold: true, color: PAPER });
  s.addText("경매·NPL 활성 투자자", { x: 0.7, y: 3.85, w: 4.1, h: 0.4, fontFace: FONT_BODY, fontSize: 13, color: "A8CDE8" });

  s.addText("月 200만+ MAU", { x: 0.7, y: 4.55, w: 4.1, h: 0.4, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: GOLD });
  s.addText("조선일보 땅집고 — 국내 1위 부동산 미디어\n주 3회 NPL 기사 + 유튜브 45만 구독자", {
    x: 0.7, y: 4.95, w: 4.1, h: 1.0,
    fontFace: FONT_BODY, fontSize: 11, color: "CBD5E1", lineSpacingMultiple: 1.4,
  });

  // Right: 4 channels
  const channels = [
    { name: "조선일보 땅집고", scale: "200만+ MAU", desc: "주 3회 NPL 기사 (아웃링크) · 유튜브 45만+", c: GOLD },
    { name: "K뱅크 In-App", scale: "1,500만+ MAU", desc: "공동사업 파트너 (2026.02~) · AI 경매 서비스 + 광고", c: ELECTRIC },
    { name: "Toss In-App", scale: "Tier-1", desc: "우수 파트너사 선정 (2025.10~) · AI 경매 in app", c: ELECTRIC },
    { name: "건대 부동산학과", scale: "석사 500+", desc: "협력 채널 — 매년 신규 매입사 펀넬 진입", c: CYAN },
    { name: "NPL 인플루언서", scale: "1만+ CRM", desc: "유튜브·카카오 채널·오픈채팅방 · 리타게팅 광고", c: CYAN },
  ];

  s.addText("MARKETING CHANNEL STACK", { x: 5.3, y: 2.0, w: 7.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: ELECTRIC, charSpacing: 60 });
  s.addText("매수자 유입 5대 채널 — 평균 CAC ≈ 0", { x: 5.3, y: 2.3, w: 7.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  channels.forEach((ch, i) => {
    const y = 2.85 + i * 0.78;
    s.addShape(pres.ShapeType.rect, { x: 5.3, y, w: 7.55, h: 0.66, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 0.5 } });
    s.addShape(pres.ShapeType.rect, { x: 5.3, y, w: 0.08, h: 0.66, fill: { color: ch.c }, line: { color: ch.c } });
    s.addText(ch.name, { x: 5.5, y: y + 0.05, w: 2.5, h: 0.55, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: INK, valign: "middle" });
    s.addText(ch.scale, { x: 8.0, y: y + 0.05, w: 1.5, h: 0.55, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: ch.c, valign: "middle" });
    s.addText(ch.desc, { x: 9.6, y: y + 0.05, w: 3.2, h: 0.55, fontFace: FONT_BODY, fontSize: 9, color: TEXT_MID, valign: "middle" });
  });

  addFooter(s, 12);
}

// ════════════════════════════════════════════════════════════
// SLIDE 13 — 매수자 수요 분석 (6 segments)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "11 · BUYER DEMAND ANALYSIS", "매입사 수요 — 6개 핵심 자산군 + ₩50억~₩300억 Avg Ticket", "현장 인터뷰 30+ — 매입사들이 원하는 NPL 의 형태가 명확히 분화됨");

  const segments = [
    { name: "PF 관련 NPL", price: "건설 중단 사업장", desc: "수도권 골조 단계 사업장\n저가 매입 + 마무리 준공 → 매각", color: ELECTRIC },
    { name: "노유자시설", price: "₩50~60억", desc: "요양원 (서울·경기남부)\n초고령사회 진입 + 정부지원 안정성", color: GOLD },
    { name: "숙박시설", price: "₩150~300억", desc: "명동·종로·강남 숙박/오피스/상가\n중국인 무비자 + 관광객 회복", color: ELECTRIC },
    { name: "시행부지", price: "20%+ 할인", desc: "수도권 3종 일반주거 이상\n분양시장 불확실 → 저가 토지", color: GOLD },
    { name: "수익형 건물", price: "꼬마빌딩", desc: "서울 주요권역 1,000평+\n토지희소성 + 리모델링 가치", color: ELECTRIC },
    { name: "공장", price: "₩50억 이하", desc: "화성·평택·김포 산업거점\n임대수익 안정 + 규제 적음", color: GOLD },
  ];

  segments.forEach((seg, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.22;
    const y = 2.0 + row * 2.4;
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 2.2, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 0.08, fill: { color: seg.color }, line: { color: seg.color } });
    s.addText(seg.name, { x: x + 0.2, y: y + 0.2, w: 3.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });
    s.addText(seg.price, { x: x + 0.2, y: y + 0.65, w: 3.6, h: 0.35, fontFace: FONT_BODY, fontSize: 12, bold: true, italic: true, color: seg.color });
    s.addText(seg.desc, { x: x + 0.2, y: y + 1.05, w: 3.6, h: 1.05, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID, lineSpacingMultiple: 1.3 });
  });

  addFooter(s, 13);
}

// ════════════════════════════════════════════════════════════
// SLIDE 14 — Business Model (Take-rate 중심)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "12 · BUSINESS MODEL", "Take-Rate 중심 + 가입료 + Premium 분석 — 거래 1건당 ARPU ₩5,400만", "매각사·매입사 양면 수수료가 핵심 매출 — 거래량 늘수록 매출 비례 상승");

  // 4 revenue streams
  const streams = [
    {
      name: "거래 수수료 (메인)",
      pct: "70%",
      desc: "매각사 0.5~0.9% + 매입사 0.5~1.5% (낙찰가 기준)",
      detail: "전속 등록 시 매각사 0.3% 우대 / 평균 거래액 ₩30억 → ₩5,100만/건",
      color: ELECTRIC,
    },
    {
      name: "가입 및 이용료",
      pct: "15%",
      desc: "매각사 ₩100만/월 · 투자그룹 ₩200만/월",
      detail: "신규 6개월 무료 (사업자/명함 인증) → 7개월차 자동 전환",
      color: INK,
    },
    {
      name: "Premium 분석 리포트",
      pct: "10%",
      desc: "₩50만~₩300만/건",
      detail: "KB·자산운용사 커스터마이징 / 권리분석 / 경매 시뮬",
      color: GOLD,
    },
    {
      name: "광고·마케팅 (땅집고옥션)",
      pct: "5%",
      desc: "K뱅크 In-app · 인플루언서",
      detail: "성장 트래픽으로 광고 매출 자연 발생",
      color: CYAN,
    },
  ];

  streams.forEach((st, i) => {
    const x = 0.5 + i * 3.13;
    const y = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.95, h: 3.2, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.95, h: 0.08, fill: { color: st.color }, line: { color: st.color } });

    s.addText(st.pct, { x: x + 0.2, y: y + 0.2, w: 2.55, h: 0.7, fontFace: FONT_HEAD, fontSize: 30, bold: true, color: st.color });
    s.addText("매출 비중", { x: x + 0.2, y: y + 0.85, w: 2.55, h: 0.25, fontFace: FONT_BODY, fontSize: 9, color: TEXT_MUTED, charSpacing: 30 });
    s.addText(st.name, { x: x + 0.2, y: y + 1.2, w: 2.55, h: 0.5, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: INK });
    s.addText(st.desc, { x: x + 0.2, y: y + 1.7, w: 2.55, h: 0.7, fontFace: FONT_BODY, fontSize: 10, color: ELECTRIC });
    s.addText(st.detail, { x: x + 0.2, y: y + 2.45, w: 2.55, h: 0.7, fontFace: FONT_BODY, fontSize: 9, color: TEXT_MID, italic: true });
  });

  // Bottom: Per-Deal Math
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.45, w: 12.33, h: 1.45, fill: { color: INK }, line: { color: INK } });
  s.addText("Per-Deal Unit Economics (평균 거래액 ₩30억 기준)", { x: 0.7, y: 5.55, w: 7, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: PAPER });

  const math = [
    { l: "매각사 수수료", v: "₩2,100만", n: "0.7% 평균" },
    { l: "매입사 수수료", v: "₩3,000만", n: "1.0% 평균" },
    { l: "분석 리포트", v: "₩300만", n: "Premium 옵션" },
    { l: "Total ARPU/Deal", v: "₩5,400만", n: "거래 1건 평균 매출" },
  ];
  math.forEach((m, i) => {
    const x = 0.7 + i * 3.05;
    s.addText(m.v, { x, y: 6.0, w: 2.85, h: 0.5, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: i === 3 ? CYAN : PAPER });
    s.addText(m.l, { x, y: 6.45, w: 2.85, h: 0.25, fontFace: FONT_BODY, fontSize: 10, color: i === 3 ? CYAN : "94A3B8" });
    s.addText(m.n, { x, y: 6.65, w: 2.85, h: 0.2, fontFace: FONT_BODY, fontSize: 8, italic: true, color: i === 3 ? CYAN : TEXT_MUTED });
  });

  addFooter(s, 14);
}

// ════════════════════════════════════════════════════════════
// SLIDE 15 — Triple Revenue Engine
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "13 · TRIPLE REVENUE ENGINE", "Cashflow + Scale-up + Global Upside — 3개 수익 트랙 동시 가동", "현재 매출 영역 (B2C·B2B) + 글로벌 확장 (XRF Global RWA) 가 모두 가동 중");

  const tracks = [
    {
      name: "TRACK 1 · B2C",
      tag: "Cashflow Platform",
      items: ["거래수수료 (1만+ 회원)", "Premium 멤버십 (₩30만/150만/년)", "경매·NPL 컨설팅 (1.6만+ 가입자)"],
      partners: "조선일보 땅집고 · 인플루언서 · 땅집고옥션",
      color: ELECTRIC,
      icon: "₩",
    },
    {
      name: "TRACK 2 · B2B",
      tag: "Scale-up SaaS",
      items: ["NPL 평가 SaaS (KB 모델)", "K뱅크 In-app 광고 (1,500만+)", "B2B 부동산 컨설팅"],
      partners: "KB국민은행 · K뱅크 · Toss · 자산운용사",
      color: INK,
      icon: "$",
    },
    {
      name: "TRACK 3 · GLOBAL RWA",
      tag: "Upside",
      items: ["NPL 토큰화 (XRPL MPT)", "RLUSD 분배·ODL Corridor", "Y3 누적 AUM $184M+"],
      partners: "Ripple · 자산운용사 · PE",
      color: CYAN,
      icon: "★",
    },
  ];

  tracks.forEach((t, i) => {
    const x = 0.5 + i * 4.22;
    const y = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 4.7, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 0.5, fill: { color: t.color }, line: { color: t.color } });
    s.addText(t.icon, { x: x + 0.15, y: y + 0.05, w: 0.5, h: 0.4, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: PAPER, valign: "middle" });
    s.addText(t.name, { x: x + 0.7, y: y + 0.05, w: 3.2, h: 0.4, fontFace: FONT_BODY, fontSize: 11, bold: true, color: PAPER, charSpacing: 40, valign: "middle" });

    s.addText(t.tag, { x: x + 0.2, y: y + 0.65, w: 3.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 18, bold: true, italic: true, color: t.color });
    s.addText("매출 라인", { x: x + 0.2, y: y + 1.15, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 30 });

    t.items.forEach((it, idx) => {
      const yy = y + 1.5 + idx * 0.4;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: yy + 0.13, w: 0.13, h: 0.13, fill: { color: t.color }, line: { color: t.color } });
      s.addText(it, { x: x + 0.45, y: yy, w: 3.4, h: 0.35, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID, valign: "middle" });
    });

    s.addText("Partners", { x: x + 0.2, y: y + 3.4, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 30 });
    s.addText(t.partners, { x: x + 0.2, y: y + 3.7, w: 3.6, h: 0.9, fontFace: FONT_BODY, fontSize: 10, color: t.color, italic: true });
  });

  addFooter(s, 15);
}

// ════════════════════════════════════════════════════════════
// SLIDE 16 — Why Now (3 macro convergence)
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "14 · WHY NOW", "3대 거시 흐름 수렴 — AI · NPL 공급 · RWA 인프라", "Demand Pull + Tech Push 모두 임계점 — 12~18개월 선점 기회");

  const trends = [
    {
      cat: "DEMAND PULL",
      title: "한국 NPL 공급 폭증",
      stats: ["은행 NPL 매각 ₩47조/년", "PF 연체율 76% 급등 ('23→'24)", "비은행권 NPL 31.2조 (2배 증가)"],
      desc: "BIS 규제 + 부실 자산 증가 → 1금융 + 2금융 양면 매각 압박",
      color: ELECTRIC,
    },
    {
      cat: "TECH PUSH",
      title: "AI 가치평가 임계점",
      stats: ["100억+ 빅데이터 정형화", "감정평가 5x 정확도 (자체 검증)", "10초 분석 + 90% 정확도"],
      desc: "전통 외주 보고서 모델 → AI 자동화로 비용 98% 절감",
      color: INK,
    },
    {
      cat: "GLOBAL UPSIDE",
      title: "RWA 인프라 성숙",
      stats: ["XRPL MPT (XLS-33) Native RWA", "RLUSD · ODL · MAS 라이선스", "BlackRock BUIDL · JPM Onyx 진입"],
      desc: "글로벌 기관 자본 RWA 진입 → 한국 NPL 첫 case study 선점",
      color: CYAN,
    },
  ];

  trends.forEach((t, i) => {
    const x = 0.5 + i * 4.22;
    const y = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 4.7, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.08, h: 4.7, fill: { color: t.color }, line: { color: t.color } });

    s.addText(t.cat, { x: x + 0.25, y: y + 0.2, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: t.color, charSpacing: 60 });
    s.addText(t.title, { x: x + 0.25, y: y + 0.55, w: 3.6, h: 0.55, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: INK });

    s.addShape(pres.ShapeType.rect, { x: x + 0.25, y: y + 1.2, w: 3.55, h: 0, line: { color: BORDER, width: 0.5 } });

    t.stats.forEach((st, idx) => {
      const yy = y + 1.4 + idx * 0.55;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: yy + 0.18, w: 0.12, h: 0.12, fill: { color: t.color }, line: { color: t.color } });
      s.addText(st, { x: x + 0.5, y: yy, w: 3.3, h: 0.5, fontFace: FONT_BODY, fontSize: 11, color: INK, valign: "middle" });
    });

    s.addText(t.desc, { x: x + 0.25, y: y + 3.4, w: 3.55, h: 1.15, fontFace: FONT_BODY, fontSize: 10, italic: true, color: TEXT_MID, lineSpacingMultiple: 1.4 });
  });

  addFooter(s, 16);
}

// ════════════════════════════════════════════════════════════
// SLIDE 17 — Competitive Landscape
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "15 · COMPETITIVE LANDSCAPE", "Valuation Logic + Marketplace 동시 보유 — 국내 유일", "타사는 '데이터' 만 보유 · NPLatform 은 '가치평가 로직 + AI Engine + Marketplace' 모두 보유");

  // Comparison table
  const headers = ["", "NPLatform", "A사", "B사", "C사"];
  const rows = [
    ["AI 수준", "★★★★★", "★★", "★", "★"],
    ["빅데이터 규모", "100억건", "30억건", "20억건", "5억건"],
    ["거래 Marketplace", "✓ Yes", "✗ 정보만", "✗ 정보만", "✗"],
    ["가치평가 로직", "✓ AI Quant", "△ 단순예측", "✗", "✗"],
    ["B2B 금융기관", "KB·NH·toss·K뱅크", "유료 구독제", "유료 구독제", "무료"],
    ["글로벌 RWA", "✓ XRF·Ripple", "✗", "✗", "✗"],
    ["타깃", "기관+개인+글로벌", "전문 투자자", "전문 투자자", "입문자"],
  ];

  // Table layout
  const tableX = 0.5, tableY = 2.0, colW = [2.7, 2.6, 2.5, 2.5, 2.0];
  const totalW = colW.reduce((a, b) => a + b, 0);

  // Header row
  let cx = tableX;
  s.addShape(pres.ShapeType.rect, { x: tableX, y: tableY, w: totalW, h: 0.5, fill: { color: INK }, line: { color: INK } });
  headers.forEach((h, i) => {
    s.addText(h, {
      x: cx, y: tableY, w: colW[i], h: 0.5,
      fontFace: FONT_HEAD, fontSize: 12, bold: true,
      color: i === 1 ? CYAN : PAPER,
      align: "center", valign: "middle",
    });
    cx += colW[i];
  });

  // Data rows
  rows.forEach((row, ri) => {
    cx = tableX;
    const ry = tableY + 0.5 + ri * 0.5;
    s.addShape(pres.ShapeType.rect, { x: tableX, y: ry, w: totalW, h: 0.5, fill: { color: ri % 2 === 0 ? PAPER_TINT : PAPER }, line: { color: BORDER, width: 0.5 } });
    row.forEach((cell, ci) => {
      const isFirst = ci === 0;
      const isUs = ci === 1;
      s.addText(cell, {
        x: cx, y: ry, w: colW[ci], h: 0.5,
        fontFace: isFirst ? FONT_BODY : FONT_BODY,
        fontSize: isFirst ? 11 : 11,
        bold: isFirst || isUs,
        color: isUs ? ELECTRIC : (isFirst ? INK : TEXT_MID),
        align: isFirst ? "left" : "center",
        valign: "middle",
      });
      cx += colW[ci];
    });
  });

  // Highlight us column
  s.addShape(pres.ShapeType.rect, {
    x: tableX + colW[0], y: tableY, w: colW[1], h: 0.5 + rows.length * 0.5,
    fill: { type: "none" }, line: { color: ELECTRIC, width: 2 },
  });

  // Bottom moat statement
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 6.55, w: 12.33, h: 0.4, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addText('"데이터는 있어도 가치평가 로직은 없다. NPLatform 은 둘 다 있다."', {
    x: 0.5, y: 6.55, w: 12.33, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, italic: true, color: PAPER, align: "center", valign: "middle",
  });

  addFooter(s, 17);
}

// ════════════════════════════════════════════════════════════
// SLIDE 18 — XRF / Ripple Two-Token Model
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: CYAN }, line: { color: CYAN } });

  s.addText("16 · GLOBAL UPSIDE · XRF FOUNDATION", { x: 0.5, y: 0.4, w: 12.3, h: 0.3, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 40 });
  s.addText("한국 NPL → 글로벌 RWA Two-Token Architecture", { x: 0.5, y: 0.75, w: 12.3, h: 0.65, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: PAPER });
  s.addText("Ripple Labs MOU · 글로벌 PoC $200K 진행 중 — 한국발 첫 글로벌 RWA Case Study", { x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontFace: FONT_BODY, fontSize: 14, italic: true, color: "A8CDE8" });

  // 2-column architecture
  const colW = 5.9, colH = 4.4, leftX = 0.5, rightX = 6.95, colY = 2.0;

  // Left: NPL Security Token
  s.addShape(pres.ShapeType.rect, { x: leftX, y: colY, w: colW, h: colH, fill: { color: "0F2540" }, line: { color: ELECTRIC, width: 1 } });
  s.addShape(pres.ShapeType.rect, { x: leftX, y: colY, w: colW, h: 0.5, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addText("NPL SECURITY TOKEN", { x: leftX + 0.2, y: colY, w: colW - 0.4, h: 0.5, fontFace: FONT_BODY, fontSize: 12, bold: true, color: PAPER, charSpacing: 60, valign: "middle" });
  s.addText("경제적 권리 담지", { x: leftX + 0.2, y: colY + 0.6, w: colW - 0.4, h: 0.5, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: PAPER });

  const leftItems = [
    ["발행자", "SG Pte Ltd SPV"],
    ["법적 성격", "Capital Markets Product"],
    ["MAS 규제", "SFA s.274/275 면제"],
    ["가격", "NAV 변동"],
    ["담보", "NPL Pool (간접)"],
    ["유통", "Whitelist · Accredited Only"],
    ["표준", "XRPL MPT (XLS-33)"],
  ];
  leftItems.forEach((it, idx) => {
    const yy = colY + 1.25 + idx * 0.42;
    s.addText(it[0], { x: leftX + 0.25, y: yy, w: 1.8, h: 0.35, fontFace: FONT_BODY, fontSize: 10, color: "94A3B8", valign: "middle" });
    s.addText(it[1], { x: leftX + 2.15, y: yy, w: colW - 2.4, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: PAPER, valign: "middle" });
  });

  // Right: USD Stablecoin
  s.addShape(pres.ShapeType.rect, { x: rightX, y: colY, w: colW, h: colH, fill: { color: "0F2540" }, line: { color: CYAN, width: 1 } });
  s.addShape(pres.ShapeType.rect, { x: rightX, y: colY, w: colW, h: 0.5, fill: { color: CYAN }, line: { color: CYAN } });
  s.addText("USD STABLECOIN (RLUSD)", { x: rightX + 0.2, y: colY, w: colW - 0.4, h: 0.5, fontFace: FONT_BODY, fontSize: 12, bold: true, color: INK, charSpacing: 60, valign: "middle" });
  s.addText("분배·결제 통화", { x: rightX + 0.2, y: colY + 0.6, w: colW - 0.4, h: 0.5, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: PAPER });

  const rightItems = [
    ["발행자", "Ripple (RLUSD)"],
    ["법적 성격", "E-money / DPT"],
    ["MAS 규제", "기 승인 발행자 (XRF 책임 무)"],
    ["가격", "USD 1.00 고정"],
    ["담보", "발행사 자체 준비자산"],
    ["유통", "공개 유통 가능"],
    ["표준", "XRPL IOU"],
  ];
  rightItems.forEach((it, idx) => {
    const yy = colY + 1.25 + idx * 0.42;
    s.addText(it[0], { x: rightX + 0.25, y: yy, w: 1.8, h: 0.35, fontFace: FONT_BODY, fontSize: 10, color: "94A3B8", valign: "middle" });
    s.addText(it[1], { x: rightX + 2.15, y: yy, w: colW - 2.4, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: PAPER, valign: "middle" });
  });

  // Bottom takeaway
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 6.55, w: 12.33, h: 0.4, fill: { color: CYAN }, line: { color: CYAN } });
  s.addText('"NPL 의 가치는 Security Token 이 담고, 수익의 안정성은 Stablecoin 이 배달한다."', {
    x: 0.5, y: 6.55, w: 12.33, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, italic: true, color: INK, align: "center", valign: "middle",
  });

  s.addText("NPLatform · Investor Deck · 2026", { x: 0.5, y: 7.22, w: 12.33, h: 0.25, fontFace: FONT_BODY, fontSize: 8, color: TEXT_MUTED });
  s.addText("18", { x: 12.0, y: 7.22, w: 0.83, h: 0.25, fontFace: FONT_HEAD, fontSize: 9, italic: true, color: TEXT_MUTED, align: "right" });
}

// ════════════════════════════════════════════════════════════
// SLIDE 19 — XRF 3-Year Roadmap
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "17 · XRF 3-YEAR ROADMAP", "Korea PoC → Asia Scale — Y3 200건 / AUM $184M / 50,000+ LPs", "한국 NPL 시장 집중 (Y1~2) → 일본·동남아 확장 (Y3+) — Ripple과 함께");

  const years = [
    {
      year: "Y1 · 2026",
      tag: "PILOT",
      title: "Korea PoC",
      kpis: [["Deals", "10건"], ["AUM", "$6M"], ["LPs", "1,000"]],
      milestones: ["XRF Foundation 설립", "첫 NPL Pool 토큰 발행", "Ripple MOU 체결", "5~10명 첫 청약 → 회수"],
      color: ELECTRIC,
    },
    {
      year: "Y2 · 2027",
      tag: "EXPANSION",
      title: "Korea Scale",
      kpis: [["Deals", "50건"], ["AUM", "$30M"], ["LPs", "5,000"]],
      milestones: ["Series A $30M 클로징", "기관 LP 진입 시작", "Pool #5~#20 연속 발행", "두 번째 시장 (Vietnam) 검토"],
      color: INK,
    },
    {
      year: "Y3 · 2028",
      tag: "SCALE ★",
      title: "Asia Multi-Market",
      kpis: [["Deals", "200건"], ["AUM", "$184M"], ["LPs", "50,000+"]],
      milestones: ["Vietnam pilot 가동", "일본·싱가포르 도입", "Tier-1 PE·SWF 참여", "RLUSD 누적 $250M+ 분배"],
      color: CYAN,
    },
  ];

  years.forEach((y, i) => {
    const x = 0.5 + i * 4.22;
    const yy = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y: yy, w: 4.0, h: 4.7, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y: yy, w: 4.0, h: 0.5, fill: { color: y.color }, line: { color: y.color } });

    s.addText(y.year, { x: x + 0.2, y: yy + 0.05, w: 2.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: PAPER, valign: "middle" });
    s.addText(y.tag, { x: x + 2.8, y: yy + 0.1, w: 1.0, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: PAPER, charSpacing: 40, align: "right", valign: "middle" });

    s.addText(y.title, { x: x + 0.2, y: yy + 0.65, w: 3.6, h: 0.5, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: INK });

    // KPIs
    y.kpis.forEach((k, idx) => {
      const kx = x + 0.2 + idx * 1.27;
      s.addShape(pres.ShapeType.rect, { x: kx, y: yy + 1.25, w: 1.2, h: 0.85, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 0.5 } });
      s.addText(k[0], { x: kx, y: yy + 1.3, w: 1.2, h: 0.25, fontFace: FONT_BODY, fontSize: 8, bold: true, color: TEXT_MUTED, charSpacing: 30, align: "center" });
      s.addText(k[1], { x: kx, y: yy + 1.55, w: 1.2, h: 0.5, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: y.color, align: "center" });
    });

    // Milestones
    s.addText("MILESTONES", { x: x + 0.2, y: yy + 2.3, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 50 });
    y.milestones.forEach((m, idx) => {
      const mx = x + 0.2;
      const my = yy + 2.65 + idx * 0.45;
      s.addShape(pres.ShapeType.ellipse, { x: mx + 0.05, y: my + 0.13, w: 0.13, h: 0.13, fill: { color: y.color }, line: { color: y.color } });
      s.addText(m, { x: mx + 0.3, y: my, w: 3.5, h: 0.4, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MID, valign: "middle" });
    });
  });

  addFooter(s, 19);
}

// ════════════════════════════════════════════════════════════
// SLIDE 20 — Korea 3-Year Financial Plan
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "18 · 3-YEAR FINANCIAL PLAN", "₩17.6억 → ₩61억 → ₩253억 — 영업이익률 65.3% 도달", "B2C 안정적 매출 + B2B 금융기관 SaaS 가속화 + RWA 글로벌 확장");

  const years = [
    {
      year: "2026",
      sub: "Foundation",
      revenue: "₩17.6억",
      profit: "₩4.1억",
      margin: "23.3%",
      mix: [["B2C", 65], ["B2B", 30], ["RWA", 5]],
      note: "B2C 매출 + KB 위탁 + XRF PoC",
      color: ELECTRIC,
    },
    {
      year: "2027",
      sub: "Acceleration",
      revenue: "₩61억",
      profit: "₩27.4억",
      margin: "44.9%",
      mix: [["B2C", 35], ["B2B", 50], ["RWA", 15]],
      note: "B2B SaaS 본격 매출 + 글로벌 RWA 시작",
      color: INK,
    },
    {
      year: "2028",
      sub: "Scale ★",
      revenue: "₩253억",
      profit: "₩165억",
      margin: "65.3%",
      mix: [["B2C", 20], ["B2B", 50], ["RWA", 30]],
      note: "RWA 글로벌 확장 + 반복 매출 폭증",
      color: CYAN,
    },
  ];

  years.forEach((y, i) => {
    const x = 0.5 + i * 4.22;
    const yy = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y: yy, w: 4.0, h: 4.7, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y: yy, w: 4.0, h: 0.06, fill: { color: y.color }, line: { color: y.color } });

    // Year header
    s.addText(y.year, { x: x + 0.2, y: yy + 0.2, w: 2.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 24, bold: true, color: y.color });
    s.addText(y.sub, { x: x + 0.2, y: yy + 0.65, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 11, italic: true, color: TEXT_MUTED });

    // Revenue
    s.addText("매출", { x: x + 0.2, y: yy + 1.05, w: 3.6, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 40 });
    s.addText(y.revenue, { x: x + 0.2, y: yy + 1.3, w: 3.6, h: 0.65, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: INK });

    // Profit + Margin row
    s.addText("영업이익", { x: x + 0.2, y: yy + 2.05, w: 1.8, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 30 });
    s.addText(y.profit, { x: x + 0.2, y: yy + 2.3, w: 1.8, h: 0.45, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: SUCCESS });

    s.addText("이익률", { x: x + 2.0, y: yy + 2.05, w: 1.8, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 30 });
    s.addText(y.margin, { x: x + 2.0, y: yy + 2.3, w: 1.8, h: 0.45, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: y.color });

    // Mix bars
    s.addText("매출 믹스", { x: x + 0.2, y: yy + 2.85, w: 3.6, h: 0.25, fontFace: FONT_BODY, fontSize: 9, bold: true, color: TEXT_MUTED, charSpacing: 40 });
    let cumX = x + 0.2;
    const mixW = 3.6;
    const mixColors = [ELECTRIC, INK, CYAN];
    y.mix.forEach((m, idx) => {
      const w = (mixW * m[1]) / 100;
      s.addShape(pres.ShapeType.rect, { x: cumX, y: yy + 3.15, w, h: 0.35, fill: { color: mixColors[idx] }, line: { color: mixColors[idx] } });
      if (m[1] >= 18) {
        s.addText(`${m[0]} ${m[1]}%`, { x: cumX, y: yy + 3.15, w, h: 0.35, fontFace: FONT_BODY, fontSize: 9, bold: true, color: PAPER, align: "center", valign: "middle" });
      }
      cumX += w;
    });

    // Note
    s.addText(y.note, { x: x + 0.2, y: yy + 3.7, w: 3.6, h: 1.0, fontFace: FONT_BODY, fontSize: 10, italic: true, color: TEXT_MID, lineSpacingMultiple: 1.4 });
  });

  addFooter(s, 20);
}

// ════════════════════════════════════════════════════════════
// SLIDE 21 — Team
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "19 · TEAM", "Why Us — 데이터·부동산·금융 전 영역 시니어 리더십", "삼정KPMG · 삼성서울병원 · KB증권 · 한국신용평가 · 노무라 출신 핵심 6명");

  const team = [
    { role: "CEO", name: "김기현 Ph.D.", school: "성균관대 / 한양대 박사", career: ["삼정KPMG 전략컨설팅 이사", "삼성서울병원 정보전략실 책임", "DAMA 한국대표", "한림국제대 MBA 주임교수"], color: ELECTRIC },
    { role: "CFO", name: "조윤경", school: "북경대", career: ["KB증권 해외선물", "CALYON Bank FIM Sales", "TV조선 사회부 기자", "뉴스토마토 경제부 기자"], color: INK },
    { role: "CTO", name: "박성필", school: "성균관대 빅데이터 석사", career: ["DAMA 이사", "(주)앤서 개발이사", "(주)디에스앤텍 연구소 차장", "100억 데이터셋 설계"], color: ELECTRIC },
  ];

  const team2 = [
    { role: "PARTNER", name: "안영효", school: "건국대 부동산학 석사", career: ["바른NPL 의장", "전주대 부동산학과 객원교수", "법률사무소 글 자문위원", "(경매·NPL 부문 부대표)"], color: GOLD },
    { role: "PARTNER", name: "신지안", school: "건국대 부동산학 석사", career: ["청담어썸공인중개사 대표", "한국신용평가정보 AMC", "한신평신용정보 AMC본부", "MG신용정보 AMC본부 NPL"], color: GOLD },
    { role: "PARTNER", name: "이봉석", school: "서울대 / 동경대 도시공학 박사", career: ["땅집고옥션 부문 부대표", "노무라 부동산팀 팀장", "삼정KPMG 부동산본부 이사", "삼성물산 건설부문"], color: GOLD },
  ];

  const all = [...team, ...team2];
  all.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.22;
    const y = 2.0 + row * 2.4;
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 2.2, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 0.06, fill: { color: p.color }, line: { color: p.color } });

    s.addText(p.role, { x: x + 0.2, y: y + 0.15, w: 1.5, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: p.color, charSpacing: 50 });
    s.addText(p.name, { x: x + 0.2, y: y + 0.45, w: 3.6, h: 0.45, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: INK });
    s.addText(p.school, { x: x + 0.2, y: y + 0.9, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, italic: true, color: TEXT_MUTED });

    p.career.slice(0, 3).forEach((c, idx) => {
      const yy = y + 1.2 + idx * 0.3;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: yy + 0.1, w: 0.1, h: 0.1, fill: { color: p.color }, line: { color: p.color } });
      s.addText(c, { x: x + 0.45, y: yy, w: 3.4, h: 0.28, fontFace: FONT_BODY, fontSize: 9, color: TEXT_MID, valign: "middle" });
    });
  });

  addFooter(s, 21);
}

// ════════════════════════════════════════════════════════════
// SLIDE 22 — Use of Funds
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "20 · USE OF FUNDS · PRE-A 라운드", "Pre-A 10억 — 즉각적 매출 가속 + AI SaaS 고도화", "이미 확보 자금 ₩12.4억+ 기존 운영 + Pre-A ₩10억 추가로 12개월 런웨이 확보");

  // Left: Donut-style breakdown
  const allocations = [
    { name: "Sales & 영업조직", pct: 50, desc: "B2B 금융권 파이프라인 전담팀\nB2C 고액 자산가 컨설팅팀", color: ELECTRIC },
    { name: "AI 모델 / SaaS 고도화", pct: 25, desc: "AI 예측 정확도 향상\n금융기관 맞춤 SaaS 개발/운영", color: INK },
    { name: "Funnel 마케팅", pct: 25, desc: "강의 → 구독 → 컨설팅 퍼널\nOrganic 마케팅 조직 구축", color: GOLD },
  ];

  // Pie placeholder visual + text breakdown
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 6.0, h: 4.5, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
  s.addText("자금 사용 계획", { x: 0.7, y: 2.15, w: 5.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  // Visual proportional bars
  let cumY = 2.85;
  allocations.forEach((a) => {
    const h = (a.pct / 100) * 3.4;
    s.addShape(pres.ShapeType.rect, { x: 0.7, y: cumY, w: 5.6, h, fill: { color: a.color }, line: { color: a.color } });
    s.addText(`${a.pct}%`, { x: 0.7, y: cumY, w: 1.5, h, fontFace: FONT_HEAD, fontSize: 24, bold: true, color: PAPER, align: "center", valign: "middle" });
    s.addText(a.name, { x: 2.3, y: cumY, w: 3.9, h: h / 2, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: PAPER, valign: "bottom" });
    s.addText(a.desc, { x: 2.3, y: cumY + h / 2, w: 3.9, h: h / 2, fontFace: FONT_BODY, fontSize: 9, color: PAPER, valign: "top" });
    cumY += h;
  });

  // Right: Capital Stack
  s.addShape(pres.ShapeType.rect, { x: 6.85, y: 2.0, w: 6.0, h: 4.5, fill: { color: INK }, line: { color: INK } });
  s.addText("CAPITAL STACK", { x: 7.05, y: 2.15, w: 5.6, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 60 });
  s.addText("기 확보 + Pre-A = 22.4억+", { x: 7.05, y: 2.5, w: 5.6, h: 0.45, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: PAPER });

  const caps = [
    { tier: "EQUITY", v: "₩6억", desc: "Angel ₩1억 + Seed ₩2.5억 (소풍벤처스) + SI ₩2.5억 (조선일보)" },
    { tier: "비희석", v: "₩12.4억+", desc: "사업 매출 ₩4.2억 + TIPS R&D ₩3억 + 신보보증 ₩2.5억 + 지원사업 ₩1.7억+" },
    { tier: "Pre-A", v: "₩10억", desc: "Q2 2026 진행 — 영업조직 + AI/SaaS + 마케팅 (12개월 런웨이)" },
    { tier: "확정 매출", v: "₩4.9억+", desc: "KB ₩1.2억 + XRF ₩2.5억 + 건대 ₩0.5억 + 숙명 ₩0.3억 + 서비스 ₩0.9억" },
  ];

  caps.forEach((c, i) => {
    const y = 3.2 + i * 0.78;
    s.addShape(pres.ShapeType.rect, { x: 7.05, y, w: 5.6, h: 0.7, fill: { color: "0F2540" }, line: { color: "1E3A5F", width: 0.5 } });
    s.addShape(pres.ShapeType.rect, { x: 7.05, y, w: 0.08, h: 0.7, fill: { color: CYAN }, line: { color: CYAN } });
    s.addText(c.tier, { x: 7.25, y: y + 0.08, w: 1.4, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: CYAN, charSpacing: 40 });
    s.addText(c.v, { x: 7.25, y: y + 0.35, w: 1.4, h: 0.3, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: PAPER });
    s.addText(c.desc, { x: 8.7, y: y + 0.05, w: 3.9, h: 0.6, fontFace: FONT_BODY, fontSize: 9, color: "94A3B8", valign: "middle" });
  });

  addFooter(s, 22);
}

// ════════════════════════════════════════════════════════════
// SLIDE 23 — Roadmap & Exit
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "21 · ROADMAP & EXIT", "Best Practice 한국 → Asia AI 금융 인프라", "Series A 후 IPO · 글로벌 핀테크 M&A · 금융기관 M&A 3대 Exit 시나리오");

  // Horizontal timeline
  const phases = [
    { period: "2023~2025", phase: "Seed", title: "투자 유치 + PMF 검증", items: ["Angel + Seed + SI 라운드 6억", "금융권 PoC 다수", "TIPS R&D 선정", "AI/데이터바우처 공급기업"], color: TEXT_MUTED },
    { period: "2026", phase: "Pre-A", title: "B2C 영업·세일즈 집중", items: ["KB·K뱅크 사업화", "온라인 강의 + SaaS 연계", "파트너 영업 매출 구조 확보", "XRF 글로벌 PoC 검증"], color: ELECTRIC },
    { period: "2027~", phase: "Series A", title: "B2B 안정 + RWA 본격화", items: ["금융권 B2B 사업 확대", "글로벌 RWA 사업 본격화", "B2C 유저 기반 확대", "영업 파트너 매출 확대"], color: CYAN },
  ];

  phases.forEach((p, i) => {
    const x = 0.5 + i * 4.22;
    const y = 2.0;
    s.addShape(pres.ShapeType.rect, { x, y, w: 4.0, h: 3.8, fill: { color: PAPER_TINT }, line: { color: BORDER, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.08, h: 3.8, fill: { color: p.color }, line: { color: p.color } });
    s.addText(p.period, { x: x + 0.2, y: y + 0.2, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: TEXT_MUTED, charSpacing: 40 });
    s.addText(p.phase, { x: x + 0.2, y: y + 0.5, w: 3.6, h: 0.45, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: p.color });
    s.addText(p.title, { x: x + 0.2, y: y + 1.0, w: 3.6, h: 0.4, fontFace: FONT_BODY, fontSize: 12, italic: true, color: INK });

    p.items.forEach((it, idx) => {
      const yy = y + 1.55 + idx * 0.5;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: yy + 0.18, w: 0.13, h: 0.13, fill: { color: p.color }, line: { color: p.color } });
      s.addText(it, { x: x + 0.45, y: yy, w: 3.4, h: 0.45, fontFace: FONT_BODY, fontSize: 11, color: TEXT_MID, valign: "middle" });
    });
  });

  // Bottom: Exit Scenarios
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 6.0, w: 12.33, h: 0.95, fill: { color: INK }, line: { color: INK } });
  s.addText("EXIT SCENARIOS", { x: 0.7, y: 6.1, w: 12, h: 0.3, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 60 });

  const exits = [
    { num: "1", t: "금융기관 M&A", d: "KB·NH·신한·하나·우리 1금융권 인수" },
    { num: "2", t: "글로벌 핀테크 M&A", d: "Ripple·BlackRock·JPM 글로벌 RWA 시장" },
    { num: "3", t: "IPO", d: "AI 글로벌 핀테크 기업 상장 (KOSDAQ → 글로벌)" },
  ];
  exits.forEach((e, i) => {
    const x = 0.7 + i * 4.18;
    s.addText(`${e.num}. ${e.t}`, { x, y: 6.4, w: 4.0, h: 0.3, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: PAPER });
    s.addText(e.d, { x, y: 6.65, w: 4.0, h: 0.25, fontFace: FONT_BODY, fontSize: 9, color: "94A3B8" });
  });

  addFooter(s, 23);
}

// ════════════════════════════════════════════════════════════
// SLIDE 24 — IP & Defensible Moat
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  addHeader(s, "22 · INTELLECTUAL PROPERTY", "특허 8건 출원 + 상표 3건 + 통상실시권 1건", "AI 가치평가 로직과 부동산 데이터 인프라를 법적으로 보호");

  // Left: IP table
  const ipPatents = [
    { name: "AI 퀀트 기반 부동산 경공매 투자결정지원 시스템 및 방법", num: "10-2025-0144240", year: "2025" },
    { name: "머신러닝 기반 농지시세 예측시스템 및 방법", num: "10-2023-0117886", year: "2023" },
    { name: "농가대출 평가시스템 및 평가방법", num: "10-2023-0117883", year: "2023" },
    { name: "농지특성에 적합한 농작물추천시스템 및 방법", num: "10-2023-0117890", year: "2023" },
    { name: "강화학습모델 활용 생산플랜트 기초플랜 생성", num: "10-2024-0164632", year: "2024" },
    { name: "AI 기반 생산플랜트 자동화 견적 생성", num: "10-2024-0164611", year: "2024" },
    { name: "토지 융합 생산플랜트 수익 시뮬레이션", num: "10-2024-0164618", year: "2024" },
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 8.0, h: 4.7, fill: { color: PAPER }, line: { color: BORDER, width: 1 } });
  s.addText("특허 출원 (8건)", { x: 0.7, y: 2.15, w: 7.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: INK });

  ipPatents.forEach((p, i) => {
    const y = 2.65 + i * 0.55;
    s.addShape(pres.ShapeType.rect, { x: 0.7, y, w: 7.6, h: 0.5, fill: { color: i % 2 === 0 ? PAPER_TINT : PAPER }, line: { color: BORDER, width: 0.5 } });
    s.addText(p.name, { x: 0.85, y, w: 5.4, h: 0.5, fontFace: FONT_BODY, fontSize: 10, color: INK, valign: "middle" });
    s.addText(p.num, { x: 6.3, y, w: 1.5, h: 0.5, fontFace: FONT_BODY, fontSize: 9, italic: true, color: TEXT_MID, valign: "middle" });
    s.addText(p.year, { x: 7.85, y, w: 0.4, h: 0.5, fontFace: FONT_HEAD, fontSize: 11, bold: true, color: ELECTRIC, align: "right", valign: "middle" });
  });

  // Right: 등록 + 상표
  s.addShape(pres.ShapeType.rect, { x: 8.85, y: 2.0, w: 4.0, h: 4.7, fill: { color: INK }, line: { color: INK } });
  s.addText("등록 + 상표", { x: 9.05, y: 2.15, w: 3.6, h: 0.4, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 60 });

  s.addText("특허 (등록·통상실시권)", { x: 9.05, y: 2.6, w: 3.6, h: 0.3, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: PAPER });
  s.addText("빈집 추정 시스템 및 방법", { x: 9.05, y: 2.95, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: PAPER });
  s.addText("(한국부동산원 통상실시권)", { x: 9.05, y: 3.2, w: 3.6, h: 0.25, fontFace: FONT_BODY, fontSize: 9, italic: true, color: "94A3B8" });
  s.addText("10-2277291", { x: 9.05, y: 3.45, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, italic: true, color: CYAN });

  s.addText("상표 (출원 3건)", { x: 9.05, y: 4.0, w: 3.6, h: 0.3, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: PAPER });
  ["트랜스파머", "땅집고옥션 (2건)", "NPLatform (출원 예정)"].forEach((t, i) => {
    s.addText(`· ${t}`, { x: 9.05, y: 4.3 + i * 0.3, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: PAPER });
  });

  s.addShape(pres.ShapeType.rect, { x: 9.05, y: 5.5, w: 3.6, h: 1.0, fill: { color: "0F2540" }, line: { color: CYAN, width: 0.5 } });
  s.addText("Total IP", { x: 9.05, y: 5.55, w: 3.6, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: CYAN, charSpacing: 50, align: "center" });
  s.addText("12+", { x: 9.05, y: 5.85, w: 3.6, h: 0.55, fontFace: FONT_HEAD, fontSize: 32, bold: true, color: CYAN, align: "center" });

  addFooter(s, 24);
}

// ════════════════════════════════════════════════════════════
// SLIDE 25 — The Ask
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });

  s.addText("THE ASK · PRE-A 라운드", { x: 0.5, y: 0.4, w: 12.3, h: 0.3, fontFace: FONT_BODY, fontSize: 11, bold: true, color: CYAN, charSpacing: 60 });
  s.addText("₩10억 Pre-A — 12개월 런웨이로 매출 ₩61억 도달", { x: 0.5, y: 0.75, w: 12.3, h: 0.65, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: PAPER });
  s.addText("KB 위탁 본계약 + K뱅크 광고 사업 + XRF Series A 트리거", { x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontFace: FONT_BODY, fontSize: 14, italic: true, color: "A8CDE8" });

  // 4 mini-cards: Investor Value Props
  const props = [
    { num: "01", title: "검증된 트랙션", body: "베타 6개월 ₩5.7조 등록\n130+ 회원 금융기관\n33일 Exit 실증", color: ELECTRIC },
    { num: "02", title: "1금융권 이미 진입", body: "KB 위탁테스트 ₩1.5억\nNH·toss·K뱅크 파트너십\n금융위·KAMCO 인증", color: CYAN },
    { num: "03", title: "Unfair Advantage", body: "조선일보 땅집고 200만 MAU\n12,000+ 매수자 풀\nCAC ≈ 0", color: GOLD },
    { num: "04", title: "Global Upside", body: "Ripple MOU + $200K PoC\n$1.2T 아시아 NPL\n$16T 2030 RWA", color: ELECTRIC },
  ];

  props.forEach((p, i) => {
    const x = 0.5 + i * 3.13;
    const y = 2.2;
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.95, h: 3.0, fill: { color: "0F2540" }, line: { color: p.color, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.95, h: 0.06, fill: { color: p.color }, line: { color: p.color } });

    s.addText(p.num, { x: x + 0.2, y: y + 0.25, w: 2.55, h: 0.5, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: p.color });
    s.addText(p.title, { x: x + 0.2, y: y + 0.85, w: 2.55, h: 0.5, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: PAPER });
    s.addText(p.body, { x: x + 0.2, y: y + 1.4, w: 2.55, h: 1.5, fontFace: FONT_BODY, fontSize: 11, color: "CBD5E1", lineSpacingMultiple: 1.4 });
  });

  // Bottom CTA strip
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.6, w: 12.33, h: 1.4, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.6, w: 0.1, h: 1.4, fill: { color: CYAN }, line: { color: CYAN } });
  s.addText("INVITATION", { x: 0.8, y: 5.7, w: 12, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: "A8CDE8", charSpacing: 80 });
  s.addText("Join Korea's First AI-NPL Marketplace · Connect to Global RWA via Ripple", {
    x: 0.8, y: 6.0, w: 12, h: 0.5,
    fontFace: FONT_HEAD, fontSize: 20, bold: true, color: PAPER,
  });
  s.addText("ceo@transfarmer.co.kr  ·  010-6594-0314  ·  www.nplatform.ai  ·  www.zipgoai.com", {
    x: 0.8, y: 6.55, w: 12, h: 0.35,
    fontFace: FONT_BODY, fontSize: 11, color: "CBD5E1",
  });

  s.addText("NPLatform · Investor Deck · 2026", { x: 0.5, y: 7.22, w: 12.33, h: 0.25, fontFace: FONT_BODY, fontSize: 8, color: TEXT_MUTED });
  s.addText("25", { x: 12.0, y: 7.22, w: 0.83, h: 0.25, fontFace: FONT_HEAD, fontSize: 9, italic: true, color: TEXT_MUTED, align: "right" });
}

// ════════════════════════════════════════════════════════════
// SLIDE 26 — Closing
// ════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ELECTRIC }, line: { color: ELECTRIC } });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0.08, w: 13.33, h: 0.03, fill: { color: CYAN }, line: { color: CYAN } });

  // Centered closing
  s.addText("THE FUTURE OF NPL FINANCE", { x: 0.5, y: 1.5, w: 12.3, h: 0.4, fontFace: FONT_BODY, fontSize: 12, bold: true, color: CYAN, charSpacing: 80, align: "center" });

  s.addText("AI 가 가격을 매기고,", { x: 0.5, y: 2.2, w: 12.3, h: 0.9, fontFace: FONT_HEAD, fontSize: 48, bold: true, color: PAPER, charSpacing: -15, align: "center" });
  s.addText("시장이 즉시 거래한다.", { x: 0.5, y: 3.1, w: 12.3, h: 0.9, fontFace: FONT_HEAD, fontSize: 48, bold: true, italic: true, color: "A8CDE8", charSpacing: -15, align: "center" });

  s.addText(
    "한국 NPL 시장의 비효율을 해소하고, 글로벌 RWA 자본과 연결하는\nAI 기반 디지털 인프라를 함께 만들어갑시다.",
    { x: 0.5, y: 4.4, w: 12.3, h: 1.0, fontFace: FONT_BODY, fontSize: 16, color: "CBD5E1", align: "center", lineSpacingMultiple: 1.5 }
  );

  // Bottom contact
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.9, w: 12.33, h: 1.05, fill: { color: "0F2540" }, line: { color: ELECTRIC, width: 1 } });
  s.addText("Kim Kihyun, Ph.D.", { x: 0.5, y: 6.05, w: 12.33, h: 0.4, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: PAPER, align: "center" });
  s.addText("CEO, TRANSFARMER · Founder, NPLatform · XRF Foundation", { x: 0.5, y: 6.4, w: 12.33, h: 0.3, fontFace: FONT_BODY, fontSize: 12, italic: true, color: CYAN, align: "center" });
  s.addText("ceo@transfarmer.co.kr  ·  010-6594-0314  ·  www.nplatform.ai", { x: 0.5, y: 6.7, w: 12.33, h: 0.25, fontFace: FONT_BODY, fontSize: 11, color: "94A3B8", align: "center" });

  s.addText("NPLatform · Confidential · 2026", { x: 0.5, y: 7.22, w: 12.33, h: 0.25, fontFace: FONT_BODY, fontSize: 8, color: TEXT_MUTED, align: "center" });
}

// ─── SAVE ──────────────────────────────────────────────────
const outputPath = "C:/Users/82106/Desktop/2026 트랜스파머 IR ppt/NPLatform_IR_Deck_v1.pptx";
pres.writeFile({ fileName: outputPath }).then(() => {
  console.log(`✓ Saved: ${outputPath}`);
}).catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
