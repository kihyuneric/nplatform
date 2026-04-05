import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/sanitize"

const MOCK_COURSES = [
  {
    id: "1", title: "NPL 투자 기초", description: "부실채권 투자의 기본 개념부터 실전 전략까지 체계적으로 학습합니다.",
    difficulty: "초급", lessonCount: 5, estimatedHours: 5, status: "PUBLISHED", createdAt: "2026-03-01",
  },
  {
    id: "2", title: "부동산 경매 실전", description: "실전 부동산 경매에 필요한 핵심 노하우를 배웁니다.",
    difficulty: "중급", lessonCount: 4, estimatedHours: 8, status: "PUBLISHED", createdAt: "2026-03-05",
  },
  {
    id: "3", title: "채권 포트폴리오 관리", description: "다수의 NPL 채권을 효과적으로 관리하고 포트폴리오를 최적화하는 방법을 학습합니다.",
    difficulty: "고급", lessonCount: 3, estimatedHours: 10, status: "DRAFT", createdAt: "2026-03-10",
  },
]

export async function GET() {
  const response = NextResponse.json({ data: MOCK_COURSES, total: MOCK_COURSES.length })
  response.headers.set('Cache-Control', 'public, max-age=1800')
  return response
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body.title) body.title = sanitizeInput(body.title)
  if (body.description) body.description = sanitizeInput(body.description)
  const newCourse = {
    id: String(Date.now()),
    title: body.title || "",
    description: body.description || "",
    difficulty: body.difficulty || "초급",
    lessonCount: 0,
    estimatedHours: 0,
    status: "DRAFT",
    createdAt: new Date().toISOString().slice(0, 10),
  }
  return NextResponse.json({ data: newCourse }, { status: 201 })
}
