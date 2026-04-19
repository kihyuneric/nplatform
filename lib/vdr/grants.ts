/**
 * lib/vdr/grants.ts
 *
 * VDR 서명 URL grant 관련 순수 함수. 라우트·테스트에서 공유.
 */
import { createHash, randomBytes } from 'crypto'

export const VDR_GRANT_TTL_SECONDS = 5 * 60

export function issueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(16).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

/**
 * 결정론적 워터마크 지문: user_id + document_id + ISO timestamp 의 SHA-256 앞 32자.
 * 같은 유저/문서/시각이면 같은 값 → 누수 시 대조 가능.
 */
export function computeWatermarkFingerprint(userId: string, documentId: string, issuedAtIso: string): string {
  return createHash('sha256').update(`${userId}::${documentId}::${issuedAtIso}`).digest('hex').slice(0, 32)
}

export function grantExpiresAt(issuedAt: Date, ttlSeconds: number = VDR_GRANT_TTL_SECONDS): Date {
  return new Date(issuedAt.getTime() + ttlSeconds * 1000)
}

export function isGrantExpired(expiresAtIso: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(expiresAtIso).getTime()
}
