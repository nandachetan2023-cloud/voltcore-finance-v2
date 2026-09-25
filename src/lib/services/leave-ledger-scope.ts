import { superadminDb } from '@/lib/superadmin-db'

/**
 * Which employees' leave ledger a caller may see.
 *
 *  - Full admin (role cookie 'admin', no org-role): everyone.
 *  - Anyone else, whatever their role or level: only their own ledger.
 */
export type LedgerScope =
  | { kind: 'all' }
  | { kind: 'some'; canSee: (employeeId: number) => boolean }

export async function resolveLedgerScope(
  tenantId: string | null,
  callerEmail: string | undefined,
  callerRole: string | undefined,
): Promise<LedgerScope> {
  // No tenant means no user record to consult — only an admin gets a view.
  if (!tenantId || !callerEmail) {
    return callerRole === 'admin' ? { kind: 'all' } : { kind: 'some', canSee: () => false }
  }

  const caller = await superadminDb.tenantUser.findFirst({
    where: { tenantId, email: callerEmail, isActive: true },
    select: { employeeId: true, orgRoleId: true },
  }).catch(() => null)

  if (callerRole === 'admin' && !caller?.orgRoleId) return { kind: 'all' }

  const selfId = caller?.employeeId ?? null
  return { kind: 'some', canSee: id => selfId !== null && id === selfId }
}
