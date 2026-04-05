import { NextResponse } from "next/server"

export async function GET() {
  const data = {
    regions: [
      { sido: "서울특별시", count: 487, amount: 38240, avgDiscountRate: 19.4, avgWinningRate: 74.8, momChange: 12.3 },
      { sido: "경기도", count: 412, amount: 29870, avgDiscountRate: 21.7, avgWinningRate: 72.1, momChange: 9.8 },
      { sido: "부산광역시", count: 198, amount: 14320, avgDiscountRate: 24.3, avgWinningRate: 69.5, momChange: 5.2 },
      { sido: "인천광역시", count: 143, amount: 10450, avgDiscountRate: 22.8, avgWinningRate: 71.2, momChange: 7.6 },
      { sido: "대구광역시", count: 127, amount: 8930, avgDiscountRate: 23.5, avgWinningRate: 70.4, momChange: 3.1 },
      { sido: "대전광역시", count: 89, amount: 6120, avgDiscountRate: 23.1, avgWinningRate: 70.8, momChange: 4.7 },
      { sido: "광주광역시", count: 76, amount: 5240, avgDiscountRate: 24.7, avgWinningRate: 68.9, momChange: 2.4 },
      { sido: "울산광역시", count: 64, amount: 4580, avgDiscountRate: 25.2, avgWinningRate: 68.3, momChange: -1.2 },
      { sido: "세종특별자치시", count: 31, amount: 2870, avgDiscountRate: 20.8, avgWinningRate: 73.4, momChange: 8.9 },
      { sido: "강원특별자치도", count: 87, amount: 4930, avgDiscountRate: 27.4, avgWinningRate: 66.2, momChange: -2.8 },
      { sido: "충청북도", count: 73, amount: 4210, avgDiscountRate: 26.8, avgWinningRate: 67.1, momChange: 1.9 },
      { sido: "충청남도", count: 82, amount: 4870, avgDiscountRate: 26.2, avgWinningRate: 67.8, momChange: 3.5 },
      { sido: "전북특별자치도", count: 91, amount: 5130, avgDiscountRate: 27.9, avgWinningRate: 65.8, momChange: -0.4 },
      { sido: "전라남도", count: 78, amount: 4290, avgDiscountRate: 28.4, avgWinningRate: 65.1, momChange: -1.8 },
      { sido: "경상북도", count: 112, amount: 6840, avgDiscountRate: 26.1, avgWinningRate: 67.5, momChange: 2.6 },
      { sido: "경상남도", count: 134, amount: 8120, avgDiscountRate: 25.3, avgWinningRate: 68.7, momChange: 4.1 },
      { sido: "제주특별자치도", count: 42, amount: 3590, avgDiscountRate: 22.4, avgWinningRate: 71.6, momChange: 6.3 },
    ],
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json(data)
}
