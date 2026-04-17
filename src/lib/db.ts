import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

// ── Singleton cache keyed by DB URL ─────────────────────────────
const clientCache = new Map<string, PrismaClient>()

function getClientForUrl(url: string): PrismaClient {
  if (clientCache.has(url)) return clientCache.get(url)!
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV !== 'production' ? ['error'] : [],
  })
  clientCache.set(url, client)
  return client
}

// ── Named clients for backward compat ───────────────────────────
export const db = getClientForUrl(process.env.DATABASE_URL!)
export const demoDb = getClientForUrl(process.env.DEMO_DATABASE_URL!)

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
