// lib/external-apis/iros.ts
// 대법원 인터넷 등기소(IROS) 등기부등본 조회 연동
// 현재: Mock 모드 (실제 연동 시 IROS API 키 발급 필요)

export interface IrosRegistryItem {
  address: string              // 소재지
  registryNo: string           // 등기 고유번호
  landCategory: string         // 지목
  area: number                 // 면적 (m²)
  owners: IrosOwner[]
  encumbrances: IrosEncumbrance[]  // 담보·가압류 등
  rawText?: string
}

export interface IrosOwner {
  name: string           // 이름 (마스킹 가능)
  shareRatio: string     // 지분 (예: "1/1", "1/2")
  registeredAt: string
}

export interface IrosEncumbrance {
  type: string           // 근저당권, 가압류, 압류, etc.
  creditor: string       // 채권자
  amount: number         // 채권액 (원)
  registeredAt: string
  cancelledAt?: string
}

// ─── Mock 응답 데이터 ─────────────────────────────────────────────────────────
function mockRegistry(address: string): IrosRegistryItem {
  return {
    address,
    registryNo: `1101-${Math.random().toString().slice(2, 8)}-${Math.random().toString().slice(2, 6)}`,
    landCategory: "대",
    area: 245.5,
    owners: [
      { name: "김**", shareRatio: "1/1", registeredAt: "2019-05-12" },
    ],
    encumbrances: [
      { type: "근저당권설정",     creditor: "주식회사 국민은행", amount: 480_000_000, registeredAt: "2019-05-15" },
      { type: "근저당권설정",     creditor: "주식회사 우리은행",  amount: 120_000_000, registeredAt: "2021-03-20" },
      { type: "가압류",          creditor: "홍**(채권자)",     amount:  35_000_000, registeredAt: "2025-11-08" },
    ],
  }
}

// ─── 등기부등본 조회 ──────────────────────────────────────────────────────────
export async function fetchRegistryInfo(address: string): Promise<IrosRegistryItem> {
  const apiKey = process.env.IROS_API_KEY

  if (apiKey) {
    // TODO: 실제 IROS Open API 호출
    // POST https://www.iros.go.kr/efopen/openapi/...
    // Authorization: Bearer ${apiKey}
    throw new Error("IROS 실제 연동은 아직 구현되지 않았습니다. Mock 사용 권장.")
  }

  // Mock: 300ms 딜레이 후 가상 데이터 반환
  await new Promise(r => setTimeout(r, 300))
  return mockRegistry(address)
}

// ─── 담보 총액 계산 ───────────────────────────────────────────────────────────
export function calcTotalEncumbrances(item: IrosRegistryItem): number {
  return item.encumbrances
    .filter(e => !e.cancelledAt)
    .reduce((sum, e) => sum + e.amount, 0)
}

// ─── LTV 추정 ─────────────────────────────────────────────────────────────────
export function estimateLtv(encumbranceTotal: number, estimatedValue: number): number {
  if (estimatedValue <= 0) return 0
  return Math.min(1, encumbranceTotal / estimatedValue)
}
