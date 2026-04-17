import { superadminDb } from '@/lib/superadmin-db'
import bcrypt from 'bcryptjs'

export type UserRole = 'superadmin' | 'admin' | 'demo'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId: string        // superadmin DB tenant id
  tenantSlug: string      // e.g. "voltcore", "upasana"
  tenantName: string      // e.g. "Voltcore"
  dbUrl: string           // the tenant's postgres connection string
  allowedModules: string  // "all" or "organization,hrms"
  phone?: string
  employeeId?: number     // linked employee record in the tenant DB
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
      include: { tenant: true },
    })

    if (tenantUser && tenantUser.tenant.status === 'active') {
      const valid = await bcrypt.compare(password, tenantUser.password)
      if (valid) {
        // Update last active
        await superadminDb.tenantUser.update({
          where: { id: tenantUser.id },
          data: { lastActiveAt: new Date() },
        })

        const modules = tenantUser.allowedModules
        // Determine role: "all" = admin, anything else = demo
        const role: UserRole = modules === 'all' ? 'admin' : 'demo'

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
            phone: tenantUser.phone || undefined,
            employeeId: tenantUser.employeeId || undefined,
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
