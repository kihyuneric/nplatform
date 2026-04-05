// ─── AES-256 암호화/복호화 (Node.js crypto) ────────────
// 서버 사이드 전용 (API Routes에서 사용)

import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set")
  // 키가 hex 형식인 경우
  if (key.length === 64) return Buffer.from(key, "hex")
  // 키가 짧으면 SHA-256 해시
  const { createHash } = require("crypto")
  return createHash("sha256").update(key).digest()
}

/**
 * 평문을 AES-256-GCM으로 암호화
 * @returns "iv:encrypted:authTag" 형식의 Base64 문자열
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "base64")
  encrypted += cipher.final("base64")
  const authTag = cipher.getAuthTag()

  return `${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`
}

/**
 * "iv:encrypted:authTag" 형식의 문자열을 복호화
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const [ivB64, encB64, tagB64] = ciphertext.split(":")

  if (!ivB64 || !encB64 || !tagB64) throw new Error("Invalid ciphertext format")

  const iv = Buffer.from(ivB64, "base64")
  const encrypted = Buffer.from(encB64, "base64")
  const authTag = Buffer.from(tagB64, "base64")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString("utf8")
}

/**
 * 민감 필드 암호화 (null-safe)
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

/**
 * 민감 필드 복호화 (null-safe)
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return value // 이미 평문이거나 복호화 불가 시 원본 반환
  }
}
