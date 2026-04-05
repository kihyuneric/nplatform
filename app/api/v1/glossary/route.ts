import { NextRequest, NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/sanitize"

export const runtime = 'edge'

const MOCK_TERMS = [
  { id: "1", term: "부실채권(NPL)", english: "Non-Performing Loan", category: "채권", slug: "npl" },
  { id: "2", term: "경매", english: "Auction", category: "절차", slug: "auction" },
  { id: "3", term: "공매", english: "Public Sale", category: "절차", slug: "public-sale" },
  { id: "4", term: "담보", english: "Collateral", category: "채권", slug: "collateral" },
  { id: "5", term: "KAMCO", english: "Korea Asset Management Corporation", category: "기관", slug: "kamco" },
  { id: "6", term: "근저당권", english: "Mortgage", category: "법률", slug: "mortgage" },
  { id: "7", term: "배당표", english: "Distribution Schedule", category: "절차", slug: "distribution" },
  { id: "8", term: "감정평가", english: "Appraisal", category: "부동산", slug: "appraisal" },
  { id: "9", term: "채권양도", english: "Assignment of Claims", category: "법률", slug: "assignment" },
  { id: "10", term: "유치권", english: "Lien", category: "법률", slug: "lien" },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.toLowerCase()
  const category = searchParams.get("category")

  let filtered = MOCK_TERMS
  if (search) filtered = filtered.filter((t) => t.term.toLowerCase().includes(search) || t.english.toLowerCase().includes(search))
  if (category) filtered = filtered.filter((t) => t.category === category)

  return NextResponse.json({ data: filtered, total: filtered.length }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const newTerm = {
    id: String(Date.now()),
    term: sanitizeInput(body.term || ""),
    english: sanitizeInput(body.english || ""),
    category: body.category || "기타",
    slug: body.slug || body.term?.toLowerCase().replace(/\s+/g, "-") || "",
  }
  return NextResponse.json({ data: newTerm }, { status: 201 })
}
