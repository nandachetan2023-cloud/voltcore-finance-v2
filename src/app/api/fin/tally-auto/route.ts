import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { deriveFinYear } from '@/lib/tally-xml'

export const dynamic = 'force-dynamic'

// GET: Scheduled auto-sync (cron) or manual trigger ?trigger=scheduled
export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true'
    const trigger = searchParams.get('trigger') || 'scheduled'

    let cfg: any = await pdb.syncConfig.findUnique({ where: { module: 'tally-export' } })
    // Auto-create default config if missing (so dryRun works without setup)
    if (!cfg) {
      cfg = await pdb.syncConfig.create({
        data: { module: 'tally-export', enabled: true, autoSync: false, syncInterval: 3600, endpoint: process.env.TALLY_HOST || 'localhost:9000' }
      }).catch(()=> null) as any
      if (!cfg) cfg = { enabled: true, autoSync: false } as any
    }
    if (!cfg!.enabled) return NextResponse.json({ success: false, error: 'Tally auto-sync disabled in SyncConfig' }, { status: 400 })
    // if trigger is scheduled, respect autoSync flag (but allow dryRun to bypass)
    if (trigger === 'scheduled' && !cfg!.autoSync && !dryRun) {
      return NextResponse.json({ success: false, error: 'Scheduled autoSync is off. Toggle autoSync in SyncConfig.' }, { status: 400 })
    }

    // Determine companyName and finYear from config or defaults
    const companyName = (cfg as any).companyName || process.env.TALLY_COMPANY || 'VoltCore'
    const finYear = deriveFinYear(new Date())

    // Find last sync for this company+fy
    const lastSync = await pdb.finTallySync.findFirst({
      where: { companyName, finYear, direction: 'Export', status: 'Completed' },
      orderBy: { syncedAt: 'desc' },
    })
    const since = lastSync?.syncedAt || new Date(new Date().getFullYear(), 0, 1)

    // Forward to tally-export POST internally
    const baseUrl = request.nextUrl.origin
    const exportRes = await fetch(`${baseUrl}/api/fin/tally-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-actor-email': request.headers.get('x-actor-email') || 'system@auto' },
      body: JSON.stringify({
        companyName,
        finYear,
        since: since.toISOString(),
        actions: ['invoices', 'payments', 'journal'],
        dryRun,
        trigger,
        actor: request.headers.get('x-actor-email') || 'system@auto',
      }),
    })
    const exportJson = await exportRes.json()

    return NextResponse.json({ success: true, data: { companyName, finYear, since, dryRun, trigger, export: exportJson } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST: same as GET but allows body {companyName, finYear, dryRun}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(()=> ({}))
  const url = new URL(request.url)
  if (body.companyName) url.searchParams.set('companyName', body.companyName)
  if (body.finYear) url.searchParams.set('finYear', body.finYear)
  if (body.dryRun) url.searchParams.set('dryRun', '1')
  if (body.trigger) url.searchParams.set('trigger', body.trigger)
  const req2 = new NextRequest(url.toString(), { headers: request.headers })
  return GET(req2)
}
