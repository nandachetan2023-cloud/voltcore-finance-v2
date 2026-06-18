import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const PREFIX = 'enc:'

function getKey(): Buffer {
  const raw = process.env.BIOMETRIC_ENCRYPTION_KEY
  if (!raw) {
    console.warn('[Crypto] BIOMETRIC_ENCRYPTION_KEY not set — storing passwords in plaintext')
    return Buffer.alloc(0)
  }
  // Accept hex (64 chars = 32 bytes) or raw UTF-8 (hashed to 32 bytes)
  const hex = raw.length === 64 && /^[0-9a-f]{64}$/i.test(raw)
  if (hex) return Buffer.from(raw, 'hex')
  return crypto.createHash('sha256').update(raw).digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  if (key.length === 0) return plaintext // No key configured — store plaintext
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, encrypted, authTag])
  return PREFIX + payload.toString('base64')
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value // Plaintext — backward compat
  const key = getKey()
  if (key.length === 0) return value
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, IV_LENGTH)
  const authTag = raw.subarray(raw.length - TAG_LENGTH)
  const encrypted = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
