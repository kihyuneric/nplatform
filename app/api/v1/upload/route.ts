import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"

const BUCKET = "listing-images"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Errors.unauthorized('로그인이 필요합니다.')
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return Errors.badRequest('파일이 없습니다.')
    }

    if (files.length > 10) {
      return Errors.badRequest('최대 10장까지 업로드할 수 있습니다.')
    }

    const uploadedUrls: string[] = []
    const errors: string[] = []

    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: JPG, PNG, WebP만 허용됩니다.`)
        continue
      }
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 5MB 이하만 허용됩니다.`)
        continue
      }

      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        errors.push(`${file.name}: 업로드 실패 (${uploadError.message})`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    return NextResponse.json({
      urls: uploadedUrls,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    logger.error("[upload] POST error:", { error: err })
    return Errors.internal('업로드 중 오류가 발생했습니다.')
  }
}
