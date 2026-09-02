import { superadminDb } from '@/lib/superadmin-db'

/**
 * Total-account cap enforcement.
 * The superadmin sets `Tenant.maxAccounts` (0 = unlimited). The tenant admin
 * may create at most that many accounts in TOTAL (across all roles).
 * Superadmin-created users (createdBySuperadmin = true) are exempt from the cap
 * and are not counted.
 */
export async function getAccountUsage(tenantId: string): Promise<{
  maxAccounts: number
  used: number
  remaining: number | null // null = unlimited
  unlimited: boolean
}> {
  const tenant = await superadminDb.tenant.findUnique({
    where: { id: tenantId },
    select: { maxAccounts: true },
  })
  const maxAccounts = tenant?.maxAccounts ?? 0
  const used = await superadminDb.tenantUser.count({
    where: { tenantId, createdBySuperadmin: false },
  })
  const unlimited = maxAccounts <= 0
  return {
    maxAccounts,
    used,
    remaining: unlimited ? null : Math.max(0, maxAccounts - used),
    unlimited,
  }
}

/**
 * Returns an error message string if creating `count` more accounts would
 * exceed the tenant's cap, otherwise null.
 */
export async function checkAccountLimit(tenantId: string, count = 1): Promise<string | null> {
  const { unlimited, maxAccounts, used, remaining } = await getAccountUsage(tenantId)
  if (unlimited) return null
  if ((remaining ?? 0) < count) {
    if (count === 1) {
      return `Account limit reached (${used}/${maxAccounts}). Contact your system administrator to increase the limit.`
    }
    return `Only ${remaining} account slot(s) remaining (limit: ${maxAccounts}). Cannot create ${count} accounts.`
  }
  return null
}
