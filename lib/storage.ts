import { createClient } from "@/lib/supabase/client"

const BUCKETS = {
  avatars: 'avatars',
  banners: 'banners',
  documents: 'documents',
  listings: 'listings',
}

export async function uploadFile(
  bucket: keyof typeof BUCKETS,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(BUCKETS[bucket])
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) return { url: null, error: error.message }

    const { data: urlData } = supabase.storage
      .from(BUCKETS[bucket])
      .getPublicUrl(data.path)

    return { url: urlData.publicUrl, error: null }
  } catch (e: any) {
    return { url: null, error: e.message || 'Upload failed' }
  }
}

export async function deleteFile(
  bucket: keyof typeof BUCKETS,
  path: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from(BUCKETS[bucket])
      .remove([path])
    return !error
  } catch {
    return false
  }
}

export function getPublicUrl(bucket: keyof typeof BUCKETS, path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKETS[bucket]).getPublicUrl(path)
  return data.publicUrl
}

// Generate unique file path
export function generateFilePath(userId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'jpg'
  const timestamp = Date.now().toString(36)
  return `${userId}/${timestamp}.${ext}`
}
