import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'

// ── Finance RBAC helpers ────────────────────────────────────────────
// Enforce role-permission checks and Segregation-of-Duties against the
// FinUserRole / FinRolePermission / FinSodRule tables. Every decision is
// written to FinAccessAuditLog for compliance review.

export interface RbacDecision {
  allowed: boolean
  reason?: string
}

/** All roles a user holds (across sites). */
export async function getUserRoles(
  db: PrismaClient,
  email: string,
): Promise<Array<{ code: string; name: string; level: number; readOnly: boolean }>> {
  if (!email) return []
  const rows = await db.finUserRole.findMany({
    where: { userEmail: email, isActive: true },
    include: { role: { select: { code: true, name: true, level: true, readOnly: true } } },
  })
  const seen = new Set<string>()
  const out: Array<{ code: string; name: string; level: number; readOnly: boolean }> = []
  for (const r of rows) {
    if (!r.role || seen.has(r.role.code)) continue
    seen.add(r.role.code)
    out.push(r.role)
  }
  return out
}

/**
 * Can `email` perform `permissionCode` for a given entity?
 * A permission granted at an `all-sites` assignment satisfies any site. A
 * site-scope satisfied only when the user holds the permission at either the
 * same siteCode or an all-sites scope.
 */
export async function hasPermission(
  db: PrismaClient,
  email: string,
  permissionCode: string,
  siteCode?: string | null,
): Promise<RbacDecision> {
  if (!email) return { allowed: false, reason: 'Not authenticated' }
  const roles = await db.finUserRole.findMany({
    where: {
      userEmail: email,
      isActive: true,
      AND: [
        siteCode ? { OR: [{ siteCode }, { siteCode: null }] } : {},
      ],
    },
    include: { role: { select: { code: true, readOnly: true } } },
  })
  // Gather the distinct permission codes across the user's roles at this scope.
  const permRows = await db.finRolePermission.findMany({
    where: { permission: { code: permissionCode }, role: { isActive: true } },
    select: { roleId: true },
  })
  const permittedRoleIds = new Set(permRows.map((r) => r.roleId))
  const heldRoleIds = roles.filter((r) => permittedRoleIds.has(r.roleId))
  if (heldRoleIds.length === 0) {
    return { allowed: false, reason: `Missing permission ${permissionCode}` }
  }
  // Auditor / read-only roles only satisfy VIEW + EXPORT.
  const action = permissionCode.split('_').pop()
  const readOnlyRoles = heldRoleIds.filter((r) => r.role.readOnly)
  if (readOnlyRoles.length === heldRoleIds.length && action && !['VIEW', 'EXPORT'].includes(action)) {
    return { allowed: false, reason: 'Read-only role cannot perform this action' }
  }
  return { allowed: true }
}

/** Checkes whether granting `roleCode` would violate a SoD rule for `email`. */
export async function checkSodConflict(
  db: PrismaClient,
  email: string,
  newRoleCode: string,
): Promise<{ conflict: boolean; message?: string }> {
  if (!email) return { conflict: false }
  const held = await getUserRoles(db, email)
  if (held.length === 0) return { conflict: false }
  const heldCodes = new Set(held.map((r) => r.code))

  // Any active rule whose pair matches (newRole, heldRole) either orientation.
  const rules = await db.finSodRule.findMany({ where: { isActive: true } })
  for (const rule of rules) {
    const pair = [rule.roleACode, rule.roleBCode]
    const hasA = pair[0] === newRoleCode || heldCodes.has(pair[0])
    const hasB = pair[1] === newRoleCode || heldCodes.has(pair[1])
    if (hasA && hasB) {
      return { conflict: true, message: `SoD violation: cannot hold ${pair[0]} and ${pair[1]} together. ${rule.description || ''}`.trim() }
    }
  }
  return { conflict: false }
}

/** Pull the caller IP from request headers. */
export function getRequestIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || ''
}

/**
 * Upsert a FinUserRole row by its natural key (userEmail + roleId + siteCode).
 * The compound unique requires a non-null siteCode, so when siteCode is null
 * (all-sites scope) we emulate the upsert with findFirst → create/update.
 */
export async function upsertFinUserRole(
  db: PrismaClient,
  data: { userEmail: string; roleId: number; siteCode: string | null; userName?: string | null; isActive?: boolean },
): Promise<{ id: number }> {
  const where = { userEmail: data.userEmail, roleId: data.roleId }
  if (data.siteCode) {
    return db.finUserRole.upsert({
      where: { userEmail_roleId_siteCode: { ...where, siteCode: data.siteCode } },
      create: {
        userEmail: data.userEmail,
        roleId: data.roleId,
        siteCode: data.siteCode,
        userName: data.userName ?? null,
        isActive: data.isActive ?? true,
      },
      update: { userName: data.userName ?? undefined, isActive: data.isActive ?? undefined },
      select: { id: true },
    })
  }
  const existing = await db.finUserRole.findFirst({ where })
  if (existing) {
    const updated = await db.finUserRole.update({
      where: { id: existing.id },
      data: {
        ...(data.userName !== undefined ? { userName: data.userName ?? null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: { id: true },
    })
    return updated
  }
  return db.finUserRole.create({
    data: { userEmail: data.userEmail, roleId: data.roleId, siteCode: null, userName: data.userName ?? null, isActive: data.isActive ?? true },
    select: { id: true },
  })
}

/**
 * Authorize + audit. Throws nothing; returns {allowed, reason} and writes an
 * AudLog entry with `success` = allowed so denials are also recorded.
 */
export async function assertPermission(
  db: PrismaClient,
  email: string,
  permissionCode: string,
  ctx: { request?: NextRequest; module?: string; entityId?: string; siteCode?: string | null },
): Promise<RbacDecision> {
  const moduleName = ctx.module ?? (permissionCode.split('_')[0] || 'Unknown')
  const decision = await hasPermission(db, email, permissionCode, ctx.siteCode)
  await db.finAccessAuditLog.create({
    data: {
      userEmail: email || '(none)',
      module: moduleName,
      permissionCode,
      action: (permissionCode.split('_').pop() || 'ACCESS'),
      entityId: ctx.entityId ?? null,
      siteCode: ctx.siteCode ?? null,
      ip: ctx.request ? getRequestIp(ctx.request) : null,
      success: decision.allowed,
      deniedReason: decision.allowed ? null : decision.reason ?? null,
    },
  })
  return decision
}