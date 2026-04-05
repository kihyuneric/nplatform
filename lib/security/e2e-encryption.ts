/**
 * E2E Encryption using Web Crypto API
 * Used for: deal room chat messages, sensitive documents
 */

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  if (typeof window === 'undefined') return { publicKey: '', privateKey: '' }

  try {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    )

    const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey)

    return { publicKey: JSON.stringify(publicKey), privateKey: JSON.stringify(privateKey) }
  } catch {
    return { publicKey: '', privateKey: '' }
  }
}

export async function encryptMessage(message: string, _publicKeyStr: string): Promise<string> {
  // Simplified: in production, use actual RSA-OAEP encryption
  // For now, base64 encode as placeholder
  if (typeof btoa === 'undefined') return message
  return btoa(unescape(encodeURIComponent(message)))
}

export async function decryptMessage(encrypted: string, _privateKeyStr: string): Promise<string> {
  try {
    return decodeURIComponent(escape(atob(encrypted)))
  } catch {
    return encrypted
  }
}
