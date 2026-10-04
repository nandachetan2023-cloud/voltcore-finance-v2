import { NextResponse } from 'next/server'

/** Shared helpers for the Assets & Operations routes (equipment, permits, incidents, subcontractors). */

export const ok = (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status })

export const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status })

/** Log the real error, return a generic one — the screens toast `error` as-is. */
export function serverError(label: string, e: unknown, message: string) {
  console.error(`[api ${label}]`, e)
  return fail(message, 500)
}

/** Ids travel as strings to the UI; the tables use integer keys. */
export function parseId(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** '' / null / undefined → null; 'YYYY-MM-DD' or ISO → Date; anything unparseable → undefined. */
export function toDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === '') return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? undefined : d
}

/** 'YYYY-MM-DD' for date-only columns. */
export const ymd = (d: Date | null): string | null => (d ? d.toISOString().split('T')[0] : null)

export const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Trimmed string, or null when empty — for optional text columns. */
export const optStr = (v: unknown): string | null => str(v) || null

/**
 * Create a row with a server-generated code (EQ-001, PTW-002, …). The next
 * number comes from the latest row, and a unique-constraint clash from a
 * concurrent request just bumps the number and retries.
 */
export async function createWithCode<T>(
  prefix: string,
  latestCode: () => Promise<string | null>,
  create: (code: string) => Promise<T>,
): Promise<T> {
  const attempts = 5
  for (let i = 0; i < attempts; i++) {
    const last = await latestCode()
    const n = last ? parseInt(last.replace(/\D/g, ''), 10) || 0 : 0
    const code = `${prefix}-${String(n + 1 + i).padStart(3, '0')}`
    try {
      return await create(code)
    } catch (e: any) {
      if (e?.code === 'P2002' && i < attempts - 1) continue
      throw e
    }
  }
  throw new Error(`Could not allocate a ${prefix} code`)
}
