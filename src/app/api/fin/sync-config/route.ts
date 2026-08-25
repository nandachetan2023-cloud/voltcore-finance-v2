import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const [configs, logs, dbMode] = await Promise.all([
      db.syncConfig.findMany({ orderBy: { module: 'asc' } }),
      db.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      db.companySettings.findUnique({ where: { key: 'db_mode' } }),
    ])

    const role = request.cookies.get('erp_user_role')?.value
    const mode = dbMode?.value || 'actual'

    return NextResponse.json({
      success: true,
      data: {
        configs,
        logs,
        dbMode: {
          current: role === 'demo' ? 'sample' : mode,
          label: role === 'demo' ? 'Sample Data' : 'Actual Data',
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, module, config, logId } = body

    if (action === 'upsert') {
      if (!config || !config.module) {
        return NextResponse.json({ success: false, error: 'Module and config data required' }, { status: 400 })
      }
      const updated = await db.syncConfig.upsert({
        where: { module: config.module },
        update: {
          enabled: config.enabled,
          autoSync: config.autoSync,
          syncInterval: config.syncInterval,
          endpoint: config.endpoint,
          authKey: config.authKey,
        },
        create: {
          module: config.module,
          enabled: config.enabled ?? true,
          autoSync: config.autoSync ?? false,
          syncInterval: config.syncInterval ?? 300,
          endpoint: config.endpoint ?? null,
          authKey: config.authKey ?? null,
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    if (action === 'toggle') {
      if (!module) return NextResponse.json({ success: false, error: 'Module required' }, { status: 400 })
      const existing = await db.syncConfig.findUnique({ where: { module } })
      if (!existing) return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 })
      const updated = await db.syncConfig.update({
        where: { module },
        data: { enabled: !existing.enabled },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    if (action === 'toggle-auto') {
      if (!module) return NextResponse.json({ success: false, error: 'Module required' }, { status: 400 })
      const existing = await db.syncConfig.findUnique({ where: { module } })
      if (!existing) return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 })
      const enabled = body.enabled ?? !existing.autoSync
      const updated = await db.syncConfig.update({
        where: { module },
        data: { autoSync: enabled },
      })
      return NextResponse.json({ success: true, data: { autoSync: updated.autoSync, module: updated.module } })
    }

    if (action === 'delete-log') {
      if (!logId) return NextResponse.json({ success: false, error: 'logId required' }, { status: 400 })
      await db.syncLog.delete({ where: { id: Number(logId) } })
      return NextResponse.json({ success: true })
    }

    if (action === 'clear-logs') {
      await db.syncLog.deleteMany({})
      return NextResponse.json({ success: true })
    }

    if (action === 'set-db-mode') {
      const { mode } = body
      if (!mode || !['sample', 'actual'].includes(mode)) {
        return NextResponse.json({ success: false, error: 'Mode must be "sample" or "actual"' }, { status: 400 })
      }
      await db.companySettings.upsert({
        where: { key: 'db_mode' },
        update: { value: mode, label: mode === 'sample' ? 'Sample Data' : 'Actual Data' },
        create: { key: 'db_mode', value: mode, label: mode === 'sample' ? 'Sample Data' : 'Actual Data', group: 'database', updatedAt: new Date() },
      })
      const res = NextResponse.json({ success: true, data: { mode } })
      res.cookies.set('erp_user_role', mode === 'sample' ? 'demo' : 'admin', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
      })
      return res
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
