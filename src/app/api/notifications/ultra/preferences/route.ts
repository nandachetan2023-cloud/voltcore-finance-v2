import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'
import { getInboxOwner } from '@/lib/notification-bus'

export const dynamic = 'force-dynamic'

const DIGESTS = ['realtime', 'hourly', 'daily', 'off']
const CHANNELS = ['inapp', 'email', 'whatsapp']
const DEFAULTS = { channels: { inapp: true, email: true, whatsapp: false }, digest: 'realtime', quietHours: null }

// GET: the signed-in user's finance notification preferences (defaults if unset)
export async function GET(request: NextRequest) {
  try {
    const me = getInboxOwner(request)
    if (!me) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const pdb = getDbForRequest(request)
    const row = await pdb.finNotificationPreference.findUnique({ where: { userEmail: me } })
    return NextResponse.json({
      success: true,
      data: row
        ? { channels: { ...DEFAULTS.channels, ...(row.channels as any) }, digest: row.digest, quietHours: row.quietHours }
        : DEFAULTS,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PUT: { channels?: {inapp,email,whatsapp}, digest?: realtime|hourly|daily|off, quietHours?: {from,to}|null }
export async function PUT(request: NextRequest) {
  try {
    const me = getInboxOwner(request)
    if (!me) return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const data: any = {}
    if (body.channels && typeof body.channels === 'object') {
      data.channels = Object.fromEntries(CHANNELS.map(c => [c, Boolean(body.channels[c] ?? (DEFAULTS.channels as any)[c])]))
    }
    if (body.digest !== undefined) {
      if (!DIGESTS.includes(body.digest)) return NextResponse.json({ success: false, error: `digest must be one of ${DIGESTS.join(', ')}` }, { status: 400 })
      data.digest = body.digest
    }
    if (body.quietHours !== undefined) data.quietHours = body.quietHours

    const row = await pdb.finNotificationPreference.upsert({
      where: { userEmail: me },
      update: data,
      create: { userEmail: me, channels: data.channels ?? DEFAULTS.channels, digest: data.digest ?? DEFAULTS.digest, quietHours: data.quietHours ?? undefined },
    })
    return NextResponse.json({ success: true, data: { channels: row.channels, digest: row.digest, quietHours: row.quietHours } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
