import { NextRequest } from 'next/server'
import { db, demoDb, getDbForUser } from '@/lib/db'
import { UserRole } from '@/lib/auth'

// Extract user role from request headers or token
export function getUserRoleFromRequest(request: NextRequest): UserRole {
  // In a real implementation, you would extract this from JWT token
  // For now, we'll use a header or default to admin
  const userRole = request.headers.get('x-user-role') as UserRole
  return userRole === 'demo' ? 'demo' : 'admin'
}

// Get database instance based on user role
export function getDbFromRequest(request: NextRequest) {
  const userRole = getUserRoleFromRequest(request)
  return getDbForUser(userRole)
}

// Middleware function to add database context to API routes
export function withDbRouter(handler: (request: NextRequest, db: any) => Promise<Response>) {
  return async (request: NextRequest) => {
    const database = getDbFromRequest(request)
    return handler(request, database)
  }
}