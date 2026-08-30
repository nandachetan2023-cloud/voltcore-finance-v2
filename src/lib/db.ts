import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

// ── Singleton cache keyed by DB URL ─────────────────────────────
// Persist on globalThis so Next.js dev HMR reloads REUSE clients
// instead of leaking a new connection pool on every hot reload
// (which exhausts Postgres "too many clients").
const globalForPrisma = globalThis as unknown as { __prismaClientCache?: Map<string, PrismaClient> }
const clientCache: Map<string, PrismaClient> = globalForPrisma.__prismaClientCache ?? new Map()
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prismaClientCache = clientCache

function getClientForUrl(url: string): PrismaClient {
  if (clientCache.has(url)) return clientCache.get(url)!
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV !== 'production' ? ['error'] : [],
  })
  clientCache.set(url, client)
  return client
}

// ── DB URL must come from environment variables (Railway injects these) ──
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Configure it in your Railway service variables.')
}
const DB_URL = process.env.DATABASE_URL
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
