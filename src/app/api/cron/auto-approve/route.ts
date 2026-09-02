/**
 * Punctual driver for the 24h leave auto-approval sweep.
 *
 * The sweep also runs opportunistically whenever the leave list is read, so
 * this endpoint is OPTIONAL — without it the feature still works, it just fires
 * on the next visit rather than on the hour. Wire it up when you want the timer
 * to fire even if nobody opens the app:
 *
 *   every 15 min, from crontab:
 *     curl -fsS -H "x-cron-key: $CRON_SECRET" \
 *       https://your-host/api/cron/auto-approve > /dev/null
 *
 * Unlike the request-driven sweep this has no tenant cookie to work from, so it
 * walks every tenant in the superadmin DB and sweeps each one in turn.
 *
 * Auth: requires CRON_SECRET to be set in the environment and echoed back in
 * the x-cron-key header. If CRON_SECRET is unset the route refuses to run at
 * all rather than defaulting to open — an unauthenticated endpoint that
 * approves leave would be a real problem.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getClientForUrl } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { runLeaveAutoApproval } from '@/lib/services/leave-auto-approval'

export const dynamic = 'force-dynamic'

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured on this server.' },
      { status: 503 }
    )
  }

  const provided = request.headers.get('x-cron-key')
  if (provided !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await superadminDb.tenant.findMany({
    select: { id: true, name: true, dbUrl: true },
  }).catch(() => [] as any[])

  const totals = { advanced: 0, escalated: 0, examined: 0 }
  const perTenant: any[] = []

  for (const tenant of tenants) {
    if (!tenant.dbUrl) continue
    try {
      const db = getClientForUrl(tenant.dbUrl)
      const r = await runLeaveAutoApproval(db, tenant.id)
      totals.advanced += r.advanced
      totals.escalated += r.escalated
      totals.examined += r.examined
      if (r.examined > 0) {
        perTenant.push({ tenant: tenant.name, ...r })
      }
    } catch (e: any) {
      // One unreachable tenant DB must not stop the rest.
      perTenant.push({ tenant: tenant.name, error: e?.message || 'sweep failed' })
    }
  }

  return NextResponse.json({ success: true, ...totals, tenants: perTenant })
}

export async function GET(request: NextRequest) { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }
