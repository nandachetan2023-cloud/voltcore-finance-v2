import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

// ── Singleton cache keyed by DB URL ─────────────────────────────
// One PrismaClient (and one connection pool) per distinct DB URL, reused across
// requests. Creating a PrismaClient per request opens a fresh pool every time
// and exhausts Postgres connections under load — always go through this cache.
// Persist on globalThis so Next.js dev HMR reloads REUSE clients instead of
// leaking a new connection pool on every hot reload.
const globalForPrisma = globalThis as unknown as { __prismaClientCache?: Map<string, PrismaClient> }
const clientCache: Map<string, PrismaClient> = globalForPrisma.__prismaClientCache ?? new Map()
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prismaClientCache = clientCache

// Bound each pool so many tenant clients can't exhaust Postgres connections.
// Tunable via DB_CONNECTION_LIMIT (default 5).
function withPoolParams(url: string): string {
  if (/[?&]connection_limit=/.test(url)) return url
  const limit = process.env.DB_CONNECTION_LIMIT || '5'
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}connection_limit=${limit}&pool_timeout=20`
}

export function getClientForUrl(url: string): PrismaClient {
  const cached = clientCache.get(url)
  if (cached) return cached
  const client = new PrismaClient({
    datasources: { db: { url: withPoolParams(url) } },
    log: process.env.NODE_ENV !== 'production' ? ['error'] : [],
  })
  clientCache.set(url, client)
  return client
}

// ── Fallback URL so module never breaks if .env is missed ────────
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erp_finance_dev?schema=public&sslmode=disable'
const DEMO_DB_URL = process.env.DEMO_DATABASE_URL || DB_URL

export const db = getClientForUrl(DB_URL)
export const demoDb = getClientForUrl(DEMO_DB_URL)

// ── Get DB from a request (reads erp_tenant_db cookie) ──────────
export function getDbForRequest(request: NextRequest): PrismaClient {
  const tenantDbUrl = request.cookies.get('erp_tenant_db')?.value
  if (tenantDbUrl) {
    return getClientForUrl(decodeURIComponent(tenantDbUrl))
  }
  // Fallback: legacy role cookie
  const role = request.cookies.get('erp_user_role')?.value
  return role === 'demo' ? demoDb : db
}

// ── Get DB by role string (used in biometric service) ───────────
export function getDbForUser(userType: 'admin' | 'demo' = 'admin'): PrismaClient {
  return userType === 'demo' ? demoDb : db
}
