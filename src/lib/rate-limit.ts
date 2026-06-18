// In-memory rate limiter for login attempts.
// Resets on server restart — acceptable tradeoff for simplicity.

interface Attempt {
  count: number
  lockedUntil: number
}

const store = new Map<string, Attempt>()

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes

function key(ip: string, loginId: string): string {
  return `${ip}::${loginId.toLowerCase()}`
}

export function checkRateLimit(ip: string, loginId: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const k = key(ip, loginId)
  const now = Date.now()
  const entry = store.get(k)

  if (entry) {
    if (entry.lockedUntil > now) {
      return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil }
    }
    // Lockout expired — reset
    if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
      store.delete(k)
      return { allowed: true, remaining: MAX_ATTEMPTS }
    }
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - (entry?.count || 0) }
}

export function recordAttempt(ip: string, loginId: string, success: boolean): void {
  const k = key(ip, loginId)
  const now = Date.now()

  if (success) {
    store.delete(k)
    return
  }

  const entry = store.get(k) || { count: 0, lockedUntil: 0 }
  entry.count += 1

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
    entry.count = 0
  }

  store.set(k, entry)
}
