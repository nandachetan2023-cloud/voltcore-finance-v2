/**
 * Daily driver for Finance overdue reminders (AP bills and AR invoices).
 *
 * The sweep also runs opportunistically (at most hourly) when a finance user
 * opens Notifications Ultra, so this endpoint is optional. Each bill/invoice
 * notifies at most once per day, so running it more often is harmless:
 *
 *   daily at 09:00, from crontab:
 *     curl -fsS -H "x-cron-key: $CRON_SECRET"  *       https://your-host/api/cron/fin-overdue > /dev/null
 *
 * Auth: requires CRON_SECRET, echoed in the x-cron-key header (same as
 * /api/cron/auto-approve). Walks every tenant in the superadmin DB.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getClientForUrl } from '@/lib/db'
import { superadminDb } from '@/lib/superadmin-db'
import { runFinOverdueAlerts } from '@/lib/services/fin-overdue-alerts'

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

  const totals = { ap: 0, ar: 0 }
  const perTenant: any[] = []

  for (const tenant of tenants) {
    if (!tenant.dbUrl) continue
    try {
      const db = getClientForUrl(tenant.dbUrl)
      const r = await runFinOverdueAlerts(db)
      totals.ap += r.ap
      totals.ar += r.ar
      if (r.ap + r.ar > 0) perTenant.push({ tenant: tenant.name, ...r })
    } catch (e: any) {
      // One unreachable tenant DB must not stop the rest.
      perTenant.push({ tenant: tenant.name, error: e?.message || 'sweep failed' })
    }
  }

  return NextResponse.json({ success: true, ...totals, tenants: perTenant })
}

export async function GET(request: NextRequest) { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }
