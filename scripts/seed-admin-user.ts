import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '../node_modules/@prisma/superadmin-client'

// tsx does not load .env on its own — read it so the connection strings below
// come from the same place the app gets them, never from this file.
function loadEnv() {
  try {
    for (const line of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (!m || process.env[m[1]]) continue
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}
loadEnv()

const SUPERADMIN_URL_RAW = process.env.SUPERADMIN_DATABASE_URL
const TENANT_URL_RAW = process.env.DATABASE_URL
if (!SUPERADMIN_URL_RAW || !TENANT_URL_RAW) {
  throw new Error('SUPERADMIN_DATABASE_URL and DATABASE_URL must be set (see .env).')
}
const SUPERADMIN_URL: string = SUPERADMIN_URL_RAW
const TENANT_URL: string = TENANT_URL_RAW

// Password: ADMIN_PASSWORD if provided, otherwise a random one printed once by
// this run. Never hardcode it here — a literal in the repo is a committed credential.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || `Adm-${randomBytes(18).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16)}`
const PASSWORD_GENERATED = !process.env.ADMIN_PASSWORD?.trim()

const prisma = new PrismaClient({
  datasources: { db: { url: SUPERADMIN_URL } }
})

async function main() {
  console.log('Setting up admin tenant and user...\n')

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'voltcore' },
    update: {},
    create: {
      name: 'VoltCore',
      slug: 'voltcore',
      dbUrl: TENANT_URL,
      status: 'active',
      maxAccounts: 0,
      enabledModules: 'all',
    },
  })
  console.log('✓ Tenant:', tenant.name, '(', tenant.slug, ')')

  // Create Admin OrgRole
  const adminRole = await prisma.orgRole.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      level: 99,
      maxUsers: 0,
      moduleAccess: 'all',
      departments: '',
      designations: '',
      branches: '',
      isActive: true,
    },
  })
  console.log('✓ OrgRole: Admin (level=99, moduleAccess=all)')

  // Create admin user
  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  const alreadyExisted = !!(await prisma.tenantUser.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@voltcore.in' } },
    select: { id: true },
  }))

  const adminUser = await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@voltcore.in' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin User',
      email: 'admin@voltcore.in',
      password: passwordHash,
      phone: '+91-9876543210',
      allowedModules: 'all',
      orgRoleId: adminRole.id,
      isActive: true,
      onboardingStatus: 'approved',
      createdBySuperadmin: true,
    },
  })
  console.log('✓ TenantUser: admin@voltcore.in')
  console.log('\n✅ Admin user created successfully!')
  console.log('   Email:    admin@voltcore.in')
  if (alreadyExisted) {
    // update: {} above deliberately leaves a live admin's password alone.
    console.log('   Password: unchanged (this admin already existed; reset it from the app if needed)')
  } else {
    console.log(`   Password: ${ADMIN_PASSWORD}${PASSWORD_GENERATED ? '   (generated for this run - save it now)' : ''}`)
  }
  console.log('   Tenant:   voltcore')
  console.log('   Role:     Admin (full access)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())