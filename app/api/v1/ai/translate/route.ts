import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import { aiTranslate } from "@/lib/ai-service"

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang } = await req.json()
    if (!text || !targetLang) {
      return Errors.badRequest('text and targetLang required')
    }
    const translated = await aiTranslate(text, targetLang)
    return NextResponse.json({ data: { original: text, translated, targetLang } })
  } catch (e) {
    return fromUnknown(e)
  }
}
