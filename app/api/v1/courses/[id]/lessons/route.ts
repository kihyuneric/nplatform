import { NextRequest, NextResponse } from "next/server"

const MOCK_LESSONS: Record<string, { id: string; title: string; order: number; duration: string }[]> = {
  "1": [
    { id: "1", title: "NPL이란 무엇인가", order: 1, duration: "45분" },
    { id: "2", title: "경매와 공매의 차이", order: 2, duration: "50분" },
    { id: "3", title: "채권 분석 방법", order: 3, duration: "60분" },
    { id: "4", title: "실사 체크리스트 활용", order: 4, duration: "55분" },
    { id: "5", title: "계약서 작성 및 양도 절차", order: 5, duration: "70분" },
  ],
  "2": [
    { id: "1", title: "경매 절차 개요", order: 1, duration: "60분" },
    { id: "2", title: "권리분석 실무", order: 2, duration: "90분" },
    { id: "3", title: "입찰가 산정 방법", order: 3, duration: "75분" },
    { id: "4", title: "명도 및 인수 절차", order: 4, duration: "80분" },
  ],
  "3": [
    { id: "1", title: "포트폴리오 구성 원칙", order: 1, duration: "90분" },
    { id: "2", title: "리스크 분산 전략", order: 2, duration: "100분" },
    { id: "3", title: "수익률 분석 기법", order: 3, duration: "110분" },
  ],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const lessons = MOCK_LESSONS[id] || []
  return NextResponse.json({ data: lessons, total: lessons.length })
}
