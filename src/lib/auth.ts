import { superadminDb } from '@/lib/superadmin-db'
import bcrypt from 'bcryptjs'
import { intersectAccess } from '@/lib/module-access'

export type UserRole = 'superadmin' | 'admin' | 'demo'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId: string
  tenantSlug: string
  tenantName: string
  dbUrl: string
  allowedModules: string
  orgRoleName?: string
  phone?: string
  employeeId?: number
  employeeCode?: string
  onboardingStatus?: string
}

// ── Authenticate against superadmin DB ──────────────────────────
export async function authenticateUser(loginId: string, password: string): Promise<{
  user: AuthUser | null
  error?: string
}> {
  // 1. Try tenant user lookup by employeeCode first
  try {
    const tenantUser = await superadminDb.tenantUser.findFirst({
      where: { employeeCode: loginId, isActive: true },
      include: { tenant: true },
    })

    if (tenantUser && tenantUser.tenant.status === 'active') {
      const valid = await bcrypt.compare(password, tenantUser.password)
      if (valid) {
        await superadminDb.tenantUser.update({
          where: { id: tenantUser.id },
          data: { lastActiveAt: new Date() },
        })

        let modules = tenantUser.allowedModules
        let orgRoleName: string | undefined
        if (tenantUser.orgRoleId) {
          const orgRole = await superadminDb.orgRole.findUnique({
            where: { id: tenantUser.orgRoleId },
            select: { moduleAccess: true, name: true },
          })
          if (orgRole) {
            modules = orgRole.moduleAccess
            orgRoleName = orgRole.name
          }
        }

        const tenantCap = (tenantUser.tenant as any).enabledModules || 'all'
        modules = intersectAccess(modules, tenantCap)

        const role: UserRole = (modules === 'all' || tenantUser.createdBySuperadmin) ? 'admin' : 'demo'

        return {
          user: {
            id: tenantUser.id,
            name: tenantUser.name,
            email: tenantUser.email,
            role,
            tenantId: tenantUser.tenantId,
            tenantSlug: tenantUser.tenant.slug,
            tenantName: tenantUser.tenant.name,
            dbUrl: tenantUser.tenant.dbUrl,
            allowedModules: modules,
            orgRoleName,
            phone: tenantUser.phone || undefined,
            employeeId: tenantUser.employeeId || undefined,
            employeeCode: tenantUser.employeeCode || undefined,
            onboardingStatus: (tenantUser as any).onboardingStatus || 'none',
          },
        }
      }
    }
  } catch (e) {
    console.error('Tenant auth error (by employeeCode):', e)
  }

  // 2. Fallback: try by email (catches superadmin and legacy tenant users)
  try {
    const sa = await superadminDb.superAdminUser.findUnique({
      where: { email: loginId },
    })
    if (sa && sa.isActive) {
      const valid = await bcrypt.compare(password, sa.password)
      if (valid) {
        return {
          user: {
            id: sa.id,
            name: sa.name,
            email: sa.email,
            role: 'superadmin',
            tenantId: '',
            tenantSlug: 'superadmin',
            tenantName: 'Super Admin',
            dbUrl: '',
            allowedModules: 'all',
          },
        }
      }
    }
  } catch (e) {
    console.error('SuperAdmin auth error:', e)
  }

  // 3. Legacy: try tenant user by email
  try {
    const tenantUser = await superadminDb.tenantUser.findFirst({
      where: { email: loginId, isActive: true },
      include: { tenant: true },
    })

    if (tenantUser && tenantUser.tenant.status === 'active') {
      const valid = await bcrypt.compare(password, tenantUser.password)
      if (valid) {
        await superadminDb.tenantUser.update({
          where: { id: tenantUser.id },
          data: { lastActiveAt: new Date() },
        })

        let modules = tenantUser.allowedModules
        let orgRoleName: string | undefined
        if (tenantUser.orgRoleId) {
          const orgRole = await superadminDb.orgRole.findUnique({
            where: { id: tenantUser.orgRoleId },
            select: { moduleAccess: true, name: true },
          })
          if (orgRole) {
            modules = orgRole.moduleAccess
            orgRoleName = orgRole.name
          }
        }

        const tenantCap = (tenantUser.tenant as any).enabledModules || 'all'
        modules = intersectAccess(modules, tenantCap)

        let employeeCode: string | undefined
        if (tenantUser.employeeId && tenantUser.tenant.dbUrl) {
          try {
            const { PrismaClient } = await import('@prisma/client')
            const tenantDb = new PrismaClient({ datasources: { db: { url: tenantUser.tenant.dbUrl } } })
            const emp = await tenantDb.employee.findUnique({
              where: { id: tenantUser.employeeId },
              select: { employeeCode: true },
            }).catch(() => null)
            await tenantDb.$disconnect()
            if (emp) employeeCode = emp.employeeCode
          } catch {}
        }

        const role: UserRole = (modules === 'all' || tenantUser.createdBySuperadmin) ? 'admin' : 'demo'

        return {
          user: {
            id: tenantUser.id,
            name: tenantUser.name,
            email: tenantUser.email,
            role,
            tenantId: tenantUser.tenantId,
            tenantSlug: tenantUser.tenant.slug,
            tenantName: tenantUser.tenant.name,
            dbUrl: tenantUser.tenant.dbUrl,
            allowedModules: modules,
            orgRoleName,
            phone: tenantUser.phone || undefined,
            employeeId: tenantUser.employeeId || undefined,
            employeeCode: employeeCode || tenantUser.employeeCode || undefined,
            onboardingStatus: (tenantUser as any).onboardingStatus || 'none',
          },
        }
      }
    }
  } catch (e) {
    console.error('Tenant auth error (by email):', e)
  }

  return { user: null, error: 'Invalid credentials' }
}

// ── Create a new tenant user ─────────────────────────────────────
export async function createTenantUser(data: {
  tenantId: string
  name: string
  email: string
  password: string
  phone?: string
  allowedModules?: string
  employeeCode?: string
}) {
  const hash = await bcrypt.hash(data.password, 12)
  return superadminDb.tenantUser.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      employeeCode: data.employeeCode || null,
      password: hash,
      phone: data.phone || '',
      allowedModules: data.allowedModules || 'all',
    },
  })
}
