import { NextResponse } from 'next/server'

/**
 * Route handlers for screens whose Prisma models were dropped in the Finance
 * schema rewrite (Equipment, Work Permits, Incidents, Subcontractors).
 *
 * Reads succeed with an empty list so the screen loads instead of failing
 * with a network error; writes return 501 with a message the screen shows in
 * its toast, so nothing looks saved when it isn't. Replace a route with a real
 * implementation once its model exists.
 */
const MESSAGE = 'Module not yet implemented in database schema'

export function notImplementedHandlers() {
  const write = () => NextResponse.json({ success: false, error: MESSAGE }, { status: 501 })
  return {
    GET: async () => NextResponse.json({ success: true, data: [], message: MESSAGE }),
    POST: async () => write(),
    PUT: async () => write(),
    DELETE: async () => write(),
  }
}
