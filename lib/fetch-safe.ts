/**
 * Safe fetch wrapper with retry, timeout, and fallback
 */
export async function fetchSafe<T>(
  url: string,
  options?: RequestInit & {
    timeout?: number
    retries?: number
    fallback?: T
  }
): Promise<T> {
  const { timeout = 10000, retries = 2, fallback, ...fetchOpts } = options || {}

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)

      const res = await fetch(url, { ...fetchOpts, signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries) {
        if (fallback !== undefined) return fallback
        throw err
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  if (fallback !== undefined) return fallback
  throw new Error('All retries failed')
}
