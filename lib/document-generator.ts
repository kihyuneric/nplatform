/**
 * Generate contract document content (for PDF/DOCX generation)
 * Uses existing jsPDF and docx libraries
 */

export interface ContractData {
  dealId: string
  sellerName: string
  buyerName: string
  debtPrincipal: number
  agreedPrice: number
  collateralType: string
  collateralAddress: string
  contractDate: string
  settlementDate: string
  specialTerms?: string
}

export function generateContractContent(data: ContractData): string {
  return `
채권양도양수계약서

제1조 (목적)
본 계약은 양도인이 보유한 부실채권을 양수인에게 양도함에 있어 필요한 사항을 정한다.

제2조 (양도인)
성명(상호): ${data.sellerName}

제3조 (양수인)
성명(상호): ${data.buyerName}

제4조 (양도 대상 채권)
- 채권원금: ${formatKoreanWon(data.debtPrincipal)}
- 담보물 유형: ${data.collateralType}
- 담보물 소재지: ${data.collateralAddress}

제5조 (양도가격)
금 ${formatKoreanWon(data.agreedPrice)} (부가가치세 별도)

제6조 (지급조건)
양수인은 계약 체결일로부터 ${data.settlementDate}까지 양도가격 전액을 양도인이 지정하는 계좌로 입금한다.

제7조 (양도일 및 효력발생일)
본 계약에 의한 채권양도의 효력은 양수인이 양도가격 전액을 지급한 날에 발생한다.

제8조 (표명 및 보증)
양도인은 다음 사항을 표명하고 보증한다:
(1) 양도 대상 채권이 적법하게 존재함
(2) 양도 대상 채권에 제3자의 권리가 설정되어 있지 않음
(3) 양도인이 양도 대상 채권을 처분할 권한이 있음

${data.specialTerms ? `제9조 (특약사항)\n${data.specialTerms}` : ''}

계약일: ${data.contractDate}

양도인: ${data.sellerName} (서명)
양수인: ${data.buyerName} (서명)
`.trim()
}

export function generateNDAContent(params: {
  disclosingParty: string
  receivingParty: string
  date: string
  duration?: string
  scope?: string
}): string {
  return `
비밀유지계약서 (NDA)

본 비밀유지계약(이하 "본 계약")은 ${params.date}자로 체결됩니다.

공개자: ${params.disclosingParty}
수신자: ${params.receivingParty}

제1조 (비밀정보의 정의)
본 계약에서 "비밀정보"란 공개자가 수신자에게 제공하는 ${params.scope || '부실채권 관련 일체의 정보'}를 의미합니다.

제2조 (비밀유지 의무)
수신자는 비밀정보를 제3자에게 공개하거나 본래 목적 외에 사용하지 않습니다.

제3조 (유효기간)
본 계약의 유효기간은 체결일로부터 ${params.duration || '2년'}입니다.

제4조 (비밀정보의 반환)
본 계약이 종료되면 수신자는 비밀정보가 포함된 모든 자료를 공개자에게 반환하거나 폐기한다.

제5조 (위반 시 손해배상)
수신자가 본 계약을 위반하여 공개자에게 손해를 끼친 경우, 수신자는 공개자에게 그 손해를 배상할 책임이 있다.

공개자: ${params.disclosingParty} (서명)
수신자: ${params.receivingParty} (서명)
`.trim()
}

export function generateDDReportContent(params: {
  dealId: string
  listingTitle: string
  items: { title: string; status: string; note: string }[]
  riskFlags: string[]
  overallGrade: string
}): string {
  const itemLines = params.items.map((item, i) =>
    `${i + 1}. ${item.title}: [${item.status}] ${item.note || '-'}`
  ).join('\n')

  return `
실사 보고서 (Due Diligence Report)

대상: ${params.listingTitle}
작성일: ${new Date().toISOString().split('T')[0]}
종합 등급: ${params.overallGrade}

━━━ 체크리스트 결과 ━━━
${itemLines}

━━━ 리스크 플래그 ━━━
${params.riskFlags.length > 0 ? params.riskFlags.map(f => `⚠ ${f}`).join('\n') : '발견된 리스크 없음'}

━━━ 종합 의견 ━━━
본 실사는 NPLatform AI 시스템의 자동 검증과 담당자 수동 검토를 거쳤습니다.
위 체크리스트 항목을 기반으로 종합 등급 ${params.overallGrade}을 부여합니다.
`.trim()
}

export function generateDDContract(params: {
  client: string
  provider: string
  scope: string
  fee: string
  duration: string
}): string {
  const today = new Date().toISOString().split('T')[0]
  return `
실사 위임계약서

본 계약은 ${today}자로 아래 당사자 간에 체결됩니다.

위임인(이하 "갑"): ${params.client}
수임인(이하 "을"): ${params.provider}

제1조 (목적)
본 계약은 갑이 을에게 부실채권 관련 실사(Due Diligence) 업무를 위임하고, 을이 이를 수행함에 있어 필요한 사항을 정함을 목적으로 한다.

제2조 (실사 범위)
${params.scope || '을은 갑이 지정하는 부실채권 및 담보물에 대한 법률적, 재무적, 물리적 실사를 수행한다.'}

제3조 (수임료)
갑은 을에게 실사 수임료로 ${params.fee || '별도 협의'}를 지급한다.

제4조 (수행 기간)
본 계약에 의한 실사 수행기간은 ${params.duration || '계약 체결일로부터 30일'}로 한다.

제5조 (비밀유지)
을은 실사 과정에서 취득한 일체의 정보를 제3자에게 공개하지 아니한다.

제6조 (보고 의무)
을은 실사 완료 후 갑에게 실사 보고서를 서면으로 제출한다.

제7조 (손해배상)
을의 귀책사유로 인하여 갑에게 손해가 발생한 경우, 을은 이를 배상할 책임이 있다.

제8조 (분쟁 해결)
본 계약에 관한 분쟁은 대한상사중재원의 중재에 의하여 해결한다.

계약일: ${today}

위임인(갑): ${params.client} (서명)
수임인(을): ${params.provider} (서명)
`.trim()
}

export function generateConsultingContract(params: {
  client: string
  consultant: string
  scope: string
  fee: string
  period: string
}): string {
  const today = new Date().toISOString().split('T')[0]
  return `
자문계약서

본 계약은 ${today}자로 아래 당사자 간에 체결됩니다.

의뢰인(이하 "갑"): ${params.client}
자문인(이하 "을"): ${params.consultant}

제1조 (목적)
본 계약은 갑이 을에게 부실채권 거래 관련 전문 자문을 의뢰하고, 을이 이를 수행함에 있어 필요한 사항을 정함을 목적으로 한다.

제2조 (자문 범위)
${params.scope || '을은 갑의 부실채권 투자 및 거래 전반에 대한 법률적, 세무적 자문을 제공한다.'}

제3조 (자문료)
갑은 을에게 자문료로 ${params.fee || '별도 협의'}를 지급한다.

제4조 (자문 기간)
본 계약의 유효기간은 ${params.period || '계약 체결일로부터 6개월'}로 한다.

제5조 (비밀유지)
을은 자문 과정에서 취득한 갑의 영업 비밀 및 개인정보를 제3자에게 누설하지 아니한다.

제6조 (책임 제한)
을의 자문은 갑의 의사결정을 위한 참고 자료이며, 최종 판단 및 결정은 갑의 책임으로 한다.

제7조 (계약 해지)
각 당사자는 30일 전 서면 통지로 본 계약을 해지할 수 있다.

제8조 (분쟁 해결)
본 계약에 관한 분쟁은 갑의 소재지 관할 법원에서 해결한다.

계약일: ${today}

의뢰인(갑): ${params.client} (서명)
자문인(을): ${params.consultant} (서명)
`.trim()
}

export function generateMOUContent(params: {
  partyA: string
  partyB: string
  purpose: string
  duration: string
}): string {
  const today = new Date().toISOString().split('T')[0]
  return `
업무협약서 (MOU)

본 업무협약서는 ${today}자로 아래 당사자 간에 체결됩니다.

갑: ${params.partyA}
을: ${params.partyB}

제1조 (목적)
본 협약은 갑과 을이 ${params.purpose || '부실채권 거래 활성화 및 상호 발전'}을 위하여 업무 협력 관계를 구축함에 있어 필요한 사항을 정함을 목적으로 한다.

제2조 (협력 내용)
갑과 을은 다음 각 호의 사항에 대하여 상호 협력한다.
(1) 부실채권 매물 정보 공유
(2) 투자자 네트워크 연계
(3) 공동 세미나 및 교육 프로그램 개최
(4) 시장 분석 자료 교환

제3조 (협약 기간)
본 협약의 유효기간은 ${params.duration || '체결일로부터 1년'}으로 하며, 양 당사자 합의에 따라 연장할 수 있다.

제4조 (비밀유지)
양 당사자는 본 협약 이행 과정에서 취득한 상대방의 비밀정보를 제3자에게 공개하지 아니한다.

제5조 (비용 부담)
본 협약 이행에 따른 비용은 별도 합의가 없는 한 각자 부담한다.

제6조 (협약 해지)
각 당사자는 30일 전 서면 통지로 본 협약을 해지할 수 있다.

제7조 (법적 구속력)
본 협약은 양 당사자의 우호적 협력 의사를 확인하는 것으로, 법적 구속력이 있는 계약은 필요 시 별도로 체결한다.

계약일: ${today}

갑: ${params.partyA} (서명)
을: ${params.partyB} (서명)
`.trim()
}

export function generateServiceContract(params: {
  provider: string
  user: string
  scope: string
  fee: string
}): string {
  const today = new Date().toISOString().split('T')[0]
  return `
서비스이용계약서

본 계약은 ${today}자로 아래 당사자 간에 체결됩니다.

서비스 제공자(이하 "갑"): ${params.provider}
이용자(이하 "을"): ${params.user}

제1조 (목적)
본 계약은 갑이 제공하는 NPL 거래 플랫폼 서비스(이하 "서비스")의 이용 조건을 정함을 목적으로 한다.

제2조 (서비스 범위)
${params.scope || '갑은 을에게 부실채권 검색, 분석, 거래 매칭 등의 온라인 플랫폼 서비스를 제공한다.'}

제3조 (이용료)
을은 갑에게 서비스 이용료로 ${params.fee || '별도 요금표에 따른 금액'}을 지급한다.

제4조 (서비스 이용 기간)
본 계약은 체결일로부터 유효하며, 을이 해지를 요청하지 않는 한 자동으로 갱신된다.

제5조 (개인정보 보호)
갑은 을의 개인정보를 관계 법령에 따라 보호하며, 서비스 제공 목적 외에 사용하지 아니한다.

제6조 (지적재산권)
서비스에 포함된 모든 콘텐츠의 지적재산권은 갑에게 귀속된다.

제7조 (면책)
갑은 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대하여 책임을 지지 아니한다.

제8조 (계약 해지)
을은 언제든지 서비스 이용을 중단하고 본 계약을 해지할 수 있다.

제9조 (분쟁 해결)
본 계약에 관한 분쟁은 서울중앙지방법원을 관할 법원으로 한다.

계약일: ${today}

서비스 제공자(갑): ${params.provider} (서명)
이용자(을): ${params.user} (서명)
`.trim()
}

function formatKoreanWon(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(0)}억원`
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만원`
  }
  return `${amount.toLocaleString()}원`
}

// 추가 계약서 함수들은 126~314행에 정의됨
