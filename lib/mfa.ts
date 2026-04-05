/**
 * MFA/2FA Implementation using TOTP
 * In production, use 'otpauth' or 'speakeasy' library
 * This is a simplified implementation for the platform structure
 */

// Generate a random base32 secret
export function generateMFASecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)]
  }
  return secret
}

// Generate QR code URL for authenticator apps
export function generateQRCodeUrl(secret: string, email: string): string {
  const issuer = 'NPLatform'
  const encoded = encodeURIComponent(`otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&digits=6&period=30`)
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200`
}

// Simple TOTP verification (mock - in production use crypto-based HOTP/TOTP)
export function verifyTOTP(secret: string, code: string): boolean {
  // In production: compute HMAC-SHA1 based TOTP
  // For now: accept any 6-digit code in development
  if (process.env.NODE_ENV === 'development') {
    return code.length === 6 && /^\d{6}$/.test(code)
  }
  // Production: implement actual TOTP verification
  return false
}

// Check if user requires MFA
export function requiresMFA(role: string): boolean {
  const MFA_REQUIRED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN']
  return MFA_REQUIRED_ROLES.includes(role)
}

// MFA status
export type MFAStatus = 'NOT_SET' | 'ENABLED' | 'DISABLED'

export interface MFASetupData {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                 Math.random().toString(36).substring(2, 6).toUpperCase()
    codes.push(code)
  }
  return codes
}

export function setupMFA(email: string): MFASetupData {
  const secret = generateMFASecret()
  return {
    secret,
    qrCodeUrl: generateQRCodeUrl(secret, email),
    backupCodes: generateBackupCodes(),
  }
}
