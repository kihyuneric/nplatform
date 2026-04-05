import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get(CSRF_COOKIE)?.value
  if (!token) {
    token = generateCsrfToken()
  }
  return token
}

export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)

  if (!cookieToken || !headerToken) return false
  return cookieToken === headerToken
}
