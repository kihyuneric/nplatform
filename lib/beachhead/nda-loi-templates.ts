// ─── NDA / LOI 표준 템플릿 (한·영) ──────────────────────────
// lib/ai/contract-generator.ts 의 variable binding ({{KEY}}) 과 연동.
// 매도자용 표준 계약서: NDA(비밀유지계약) + LOI(투자의향서)

export interface ContractTemplate {
  id: string
  type: "NDA" | "LOI"
  lang: "ko" | "en"
  version: string
  title: string
  body: string
  requiredVars: string[]
  optionalVars: string[]
}

// ─── NDA (한국어) ──────────────────────────────────────
const NDA_KO: ContractTemplate = {
  id: "NDA_KO_V1",
  type: "NDA",
  lang: "ko",
  version: "1.0.0",
  title: "비밀유지계약서 (NDA)",
  requiredVars: [
    "DISCLOSER_NAME", "DISCLOSER_BIZNO", "DISCLOSER_ADDRESS", "DISCLOSER_REPRESENTATIVE",
    "RECIPIENT_NAME", "RECIPIENT_BIZNO", "RECIPIENT_ADDRESS", "RECIPIENT_REPRESENTATIVE",
    "LISTING_ID", "LISTING_TITLE", "EFFECTIVE_DATE", "EXPIRY_DATE",
  ],
  optionalVars: ["LISTING_COLLATERAL_ADDRESS", "PENALTY_AMOUNT"],
  body: `비밀유지계약서 (Non-Disclosure Agreement)

제1조 (목적)
본 계약은 "{{DISCLOSER_NAME}}" (이하 "공개자")가 "{{RECIPIENT_NAME}}" (이하 "수령자")에게 NPL 매물({{LISTING_ID}} - {{LISTING_TITLE}}) 관련 기밀정보를 제공함에 있어, 해당 정보의 보호를 위한 양 당사자의 권리와 의무를 정하는 것을 목적으로 합니다.

제2조 (기밀정보의 정의)
가. "기밀정보"란 공개자가 수령자에게 서면, 구두, 전자적 수단 또는 기타 방법으로 제공하는 일체의 정보를 말합니다.
나. 여기에는 채권 원장, 담보물 감정평가서, 채무자 정보, 재무제표, 거래 조건, 가격 정보 등이 포함됩니다.
다. 다만, 다음 각 호에 해당하는 정보는 기밀정보에서 제외합니다:
  (1) 수령 당시 이미 공지된 정보
  (2) 수령자가 합법적으로 이미 보유한 정보
  (3) 제3자로부터 비밀유지 의무 없이 적법하게 취득한 정보
  (4) 수령자가 기밀정보에 의하지 않고 독자적으로 개발한 정보

제3조 (비밀유지 의무)
가. 수령자는 기밀정보를 본 계약의 목적(매물 검토 및 투자 판단) 이외의 용도로 사용할 수 없습니다.
나. 수령자는 사전 서면 동의 없이 제3자에게 기밀정보를 공개, 누설 또는 전달할 수 없습니다.
다. 수령자는 기밀정보에 접근하는 자를 최소한으로 제한하고, 접근자에게 동등한 비밀유지 의무를 부과해야 합니다.

제4조 (기밀정보의 반환 및 파기)
가. 계약 종료 시 또는 공개자의 요청 시, 수령자는 기밀정보 및 그 복제물을 즉시 반환 또는 파기해야 합니다.
나. 파기 시 공개자에게 파기 확인서를 제출해야 합니다.

제5조 (계약 기간)
본 계약의 유효기간은 {{EFFECTIVE_DATE}}부터 {{EXPIRY_DATE}}까지로 합니다. 다만, 비밀유지 의무는 계약 종료 후 2년간 존속합니다.

제6조 (위약벌)
본 계약을 위반할 경우, 위반 당사자는 상대방에게 {{PENALTY_AMOUNT}} 또는 실제 손해액 중 큰 금액을 배상해야 합니다.

제7조 (준거법 및 관할)
본 계약은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 서울중앙지방법원을 제1심 관할 법원으로 합니다.

제8조 (전자서명)
본 계약은 NPLatform 플랫폼을 통한 전자서명으로 체결되며, 전자문서 및 전자거래 기본법에 따라 서면 계약과 동일한 법적 효력을 가집니다.

[공개자]
상호: {{DISCLOSER_NAME}}
사업자번호: {{DISCLOSER_BIZNO}}
주소: {{DISCLOSER_ADDRESS}}
대표자: {{DISCLOSER_REPRESENTATIVE}}
서명: ___________________________

[수령자]
상호: {{RECIPIENT_NAME}}
사업자번호: {{RECIPIENT_BIZNO}}
주소: {{RECIPIENT_ADDRESS}}
대표자: {{RECIPIENT_REPRESENTATIVE}}
서명: ___________________________

체결일: {{EFFECTIVE_DATE}}
`,
}

// ─── NDA (English) ─────────────────────────────────────
const NDA_EN: ContractTemplate = {
  id: "NDA_EN_V1",
  type: "NDA",
  lang: "en",
  version: "1.0.0",
  title: "Non-Disclosure Agreement (NDA)",
  requiredVars: [
    "DISCLOSER_NAME", "DISCLOSER_BIZNO", "DISCLOSER_ADDRESS", "DISCLOSER_REPRESENTATIVE",
    "RECIPIENT_NAME", "RECIPIENT_BIZNO", "RECIPIENT_ADDRESS", "RECIPIENT_REPRESENTATIVE",
    "LISTING_ID", "LISTING_TITLE", "EFFECTIVE_DATE", "EXPIRY_DATE",
  ],
  optionalVars: ["LISTING_COLLATERAL_ADDRESS", "PENALTY_AMOUNT"],
  body: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of {{EFFECTIVE_DATE}} between:

DISCLOSING PARTY: {{DISCLOSER_NAME}} ("Discloser")
  Business Registration No.: {{DISCLOSER_BIZNO}}
  Address: {{DISCLOSER_ADDRESS}}
  Representative: {{DISCLOSER_REPRESENTATIVE}}

RECEIVING PARTY: {{RECIPIENT_NAME}} ("Recipient")
  Business Registration No.: {{RECIPIENT_BIZNO}}
  Address: {{RECIPIENT_ADDRESS}}
  Representative: {{RECIPIENT_REPRESENTATIVE}}

WHEREAS, Discloser possesses certain confidential information regarding NPL Listing {{LISTING_ID}} ("{{LISTING_TITLE}}") and desires to disclose such information to Recipient for the purpose of evaluating a potential investment transaction;

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any and all information disclosed by Discloser, including but not limited to loan ledgers, collateral appraisals, debtor information, financial statements, transaction terms, and pricing data. Excluded: (a) publicly available information; (b) information already possessed by Recipient; (c) lawfully obtained from third parties; (d) independently developed without reference to Confidential Information.

2. OBLIGATIONS
Recipient shall: (a) use Confidential Information solely for evaluating the potential transaction; (b) not disclose to any third party without prior written consent; (c) limit access to personnel with a need-to-know basis; (d) protect with at least the same degree of care as its own confidential information.

3. RETURN OR DESTRUCTION
Upon termination or Discloser's request, Recipient shall promptly return or destroy all Confidential Information and certify such destruction in writing.

4. TERM
This Agreement shall be effective from {{EFFECTIVE_DATE}} until {{EXPIRY_DATE}}. Confidentiality obligations shall survive for two (2) years after termination.

5. REMEDIES
In the event of breach, the breaching party shall pay {{PENALTY_AMOUNT}} or actual damages, whichever is greater, plus reasonable attorney's fees.

6. GOVERNING LAW
This Agreement shall be governed by the laws of the Republic of Korea. Disputes shall be submitted to the Seoul Central District Court.

7. ELECTRONIC SIGNATURE
This Agreement is executed via electronic signature on the NPLatform platform and shall have the same legal effect as a written agreement pursuant to the Electronic Documents and Transactions Act.

DISCLOSER: {{DISCLOSER_REPRESENTATIVE}} ___________________________
RECIPIENT: {{RECIPIENT_REPRESENTATIVE}} ___________________________
Date: {{EFFECTIVE_DATE}}
`,
}

// ─── LOI (한국어) ──────────────────────────────────────
const LOI_KO: ContractTemplate = {
  id: "LOI_KO_V1",
  type: "LOI",
  lang: "ko",
  version: "1.0.0",
  title: "투자의향서 (Letter of Intent)",
  requiredVars: [
    "BUYER_NAME", "BUYER_BIZNO", "BUYER_ADDRESS", "BUYER_REPRESENTATIVE",
    "SELLER_NAME", "SELLER_BIZNO", "SELLER_ADDRESS", "SELLER_REPRESENTATIVE",
    "LISTING_ID", "LISTING_TITLE", "COLLATERAL_ADDRESS",
    "PROPOSED_PRICE", "EARNEST_MONEY", "DUE_DILIGENCE_DAYS",
    "EFFECTIVE_DATE", "EXPIRY_DATE",
  ],
  optionalVars: ["SPECIAL_CONDITIONS", "FINANCING_METHOD"],
  body: `투자의향서 (Letter of Intent)

"{{BUYER_NAME}}" (이하 "매수의향자")는 "{{SELLER_NAME}}" (이하 "매도자")에게 아래 NPL 매물에 대한 투자 의향을 다음과 같이 표명합니다.

1. 대상 매물
  - 매물 ID: {{LISTING_ID}}
  - 명칭: {{LISTING_TITLE}}
  - 담보물 소재지: {{COLLATERAL_ADDRESS}}

2. 제안 조건
  - 매수 희망가격: {{PROPOSED_PRICE}}
  - 계약금(Earnest Money): {{EARNEST_MONEY}}
  - 실사(Due Diligence) 기간: {{DUE_DILIGENCE_DAYS}}일
  - 자금 조달 방법: {{FINANCING_METHOD}}

3. 실사 진행
가. 매수의향자는 본 LOI 수락일로부터 {{DUE_DILIGENCE_DAYS}}일 이내에 대상 매물에 대한 실사를 완료합니다.
나. 매도자는 실사에 필요한 자료를 성실히 제공해야 합니다.
다. 실사 결과 중대한 하자 발견 시, 매수의향자는 본 LOI를 철회할 수 있으며, 이 경우 계약금은 전액 반환됩니다.

4. 독점 협상권
가. 본 LOI 유효기간({{EFFECTIVE_DATE}} ~ {{EXPIRY_DATE}}) 동안 매도자는 동일 매물에 대해 제3자와 협상하지 않습니다.
나. 매도자가 독점 협상권을 위반할 경우, 매수의향자에게 계약금의 2배를 위약금으로 지급합니다.

5. 법적 구속력
가. 본 LOI는 제4조(독점 협상권) 및 비밀유지 조항에 한하여 법적 구속력을 가집니다.
나. 기타 조항은 양 당사자의 성실한 협상 의향을 표현하는 것으로, 최종 매매계약 체결 전까지는 법적 구속력이 없습니다.

6. 특약 사항
{{SPECIAL_CONDITIONS}}

7. 유효기간
본 LOI는 {{EFFECTIVE_DATE}}부터 {{EXPIRY_DATE}}까지 유효합니다.

[매수의향자]
상호: {{BUYER_NAME}}
사업자번호: {{BUYER_BIZNO}}
주소: {{BUYER_ADDRESS}}
대표자: {{BUYER_REPRESENTATIVE}}
서명: ___________________________

[매도자]
상호: {{SELLER_NAME}}
사업자번호: {{SELLER_BIZNO}}
주소: {{SELLER_ADDRESS}}
대표자: {{SELLER_REPRESENTATIVE}}
서명: ___________________________

체결일: {{EFFECTIVE_DATE}}
`,
}

// ─── LOI (English) ─────────────────────────────────────
const LOI_EN: ContractTemplate = {
  id: "LOI_EN_V1",
  type: "LOI",
  lang: "en",
  version: "1.0.0",
  title: "Letter of Intent (LOI)",
  requiredVars: [
    "BUYER_NAME", "BUYER_BIZNO", "BUYER_ADDRESS", "BUYER_REPRESENTATIVE",
    "SELLER_NAME", "SELLER_BIZNO", "SELLER_ADDRESS", "SELLER_REPRESENTATIVE",
    "LISTING_ID", "LISTING_TITLE", "COLLATERAL_ADDRESS",
    "PROPOSED_PRICE", "EARNEST_MONEY", "DUE_DILIGENCE_DAYS",
    "EFFECTIVE_DATE", "EXPIRY_DATE",
  ],
  optionalVars: ["SPECIAL_CONDITIONS", "FINANCING_METHOD"],
  body: `LETTER OF INTENT

This Letter of Intent ("LOI") is submitted by {{BUYER_NAME}} ("Buyer") to {{SELLER_NAME}} ("Seller") regarding the following NPL asset:

1. SUBJECT ASSET
  - Listing ID: {{LISTING_ID}}
  - Title: {{LISTING_TITLE}}
  - Collateral Address: {{COLLATERAL_ADDRESS}}

2. PROPOSED TERMS
  - Proposed Purchase Price: {{PROPOSED_PRICE}}
  - Earnest Money Deposit: {{EARNEST_MONEY}}
  - Due Diligence Period: {{DUE_DILIGENCE_DAYS}} days
  - Financing Method: {{FINANCING_METHOD}}

3. DUE DILIGENCE
(a) Buyer shall complete due diligence within {{DUE_DILIGENCE_DAYS}} days from acceptance of this LOI.
(b) Seller shall provide all reasonably requested materials in a timely manner.
(c) Should material defects be discovered, Buyer may withdraw this LOI and receive full refund of Earnest Money.

4. EXCLUSIVITY
(a) During the effective period ({{EFFECTIVE_DATE}} to {{EXPIRY_DATE}}), Seller shall not negotiate with third parties for the same asset.
(b) Breach of exclusivity entitles Buyer to a penalty of twice the Earnest Money Deposit.

5. BINDING EFFECT
(a) Only Section 4 (Exclusivity) and confidentiality provisions shall be legally binding.
(b) All other provisions express the parties' good-faith intent and are non-binding until execution of a definitive purchase agreement.

6. SPECIAL CONDITIONS
{{SPECIAL_CONDITIONS}}

7. TERM
This LOI shall be effective from {{EFFECTIVE_DATE}} until {{EXPIRY_DATE}}.

BUYER:
  Name: {{BUYER_NAME}}
  Business Reg. No.: {{BUYER_BIZNO}}
  Address: {{BUYER_ADDRESS}}
  Representative: {{BUYER_REPRESENTATIVE}}
  Signature: ___________________________

SELLER:
  Name: {{SELLER_NAME}}
  Business Reg. No.: {{SELLER_BIZNO}}
  Address: {{SELLER_ADDRESS}}
  Representative: {{SELLER_REPRESENTATIVE}}
  Signature: ___________________________

Date: {{EFFECTIVE_DATE}}
`,
}

// ─── 템플릿 레지스트리 ────────────────────────────────────
export const TEMPLATES: ContractTemplate[] = [NDA_KO, NDA_EN, LOI_KO, LOI_EN]

export function getTemplate(type: "NDA" | "LOI", lang: "ko" | "en"): ContractTemplate | undefined {
  return TEMPLATES.find(t => t.type === type && t.lang === lang)
}

export function bindVariables(template: ContractTemplate, vars: Record<string, string>): {
  filled: string
  missing: string[]
} {
  let filled = template.body
  const missing: string[] = []

  for (const key of template.requiredVars) {
    if (vars[key]) {
      filled = filled.replaceAll(`{{${key}}}`, vars[key])
    } else {
      missing.push(key)
    }
  }
  for (const key of template.optionalVars) {
    filled = filled.replaceAll(`{{${key}}}`, vars[key] ?? "N/A")
  }

  return { filled, missing }
}
