import { PrismaClient } from '@prisma/superadmin-client'

const globalForSuperadmin = globalThis as unknown as {
  superadminDb: PrismaClient | undefined
}

export const superadminDb =
  globalForSuperadmin.superadminDb ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.SUPERADMIN_DATABASE_URL },
    },
    log: process.env.NODE_ENV !== 'production' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForSuperadmin.superadminDb = superadminDb
}
