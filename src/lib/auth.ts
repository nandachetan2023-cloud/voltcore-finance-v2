import { superadminDb } from '@/lib/superadmin-db'
import bcrypt from 'bcryptjs'

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
  orgRoleName?: string   // the assigned OrgRole name e.g. "HR Manager"
  phone?: string
  employeeId?: number
  employeeCode?: string  // the employee's code e.g. "EMP001"
}

// ── Authenticate against superadmin DB ──────────────────────────
export async function authenticateUser(email: string, password: string): Promise<{
  user: AuthUser | null
  error?: string
}> {
  // 1. Check if it's the superadmin login
  try {
    const sa = await superadminDb.superAdminUser.findUnique({
      where: { email },
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

  // 2. Check tenant users
  try {
    const tenantUser = await superadminDb.tenantUser.findFirst({
      where: { email, isActive: true },
      include: {
        tenant: true,
        // Include the assigned OrgRole to get its moduleAccess
      },
    })

    if (tenantUser && tenantUser.tenant.status === 'active') {
      const valid = await bcrypt.compare(password, tenantUser.password)
      if (valid) {
        // Update last active
        await superadminDb.tenantUser.update({
          where: { id: tenantUser.id },
          data: { lastActiveAt: new Date() },
        })

        // Resolve allowedModules:
        // 1. If user has an orgRoleId, the role's moduleAccess is authoritative
        // 2. Otherwise fall back to the user's own allowedModules field
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

        // Fetch employee code if linked
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

        // Determine role:
        // - "all" modules = full admin
        // - specific modules but user was created by superadmin = admin with limited modules
        // - specific modules, regular tenant user = demo (restricted)
        // createdBySuperadmin flag means the superadmin explicitly granted this user admin-level role
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
            employeeCode,
          },
        }
      }
    }
  } catch (e) {
    console.error('Tenant auth error:', e)
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
}) {
  const hash = await bcrypt.hash(data.password, 12)
  return superadminDb.tenantUser.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      password: hash,
      phone: data.phone || '',
      allowedModules: data.allowedModules || 'all',
    },
  })
}
