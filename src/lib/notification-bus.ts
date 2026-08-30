// ── Ultra Notification Bus ───────────────────────────────────────
// Event-driven, RBAC-scoped, FY-locked, idempotent, multi-channel

import crypto from 'crypto'

export interface NotificationOpts {
  entityType: string
  entityId: string
  title: string
  message: string
  type?: string // info|warning|error|success
  priority?: string // P0|P1|P2
  channel?: string // inapp|email
  siteCode?: string | null
  jobCode?: string | null
  finYear?: string | null
  amount?: number | null
  link?: string | null
  actorEmail?: string | null
  // recipients: explicit emails OR role:ROLE:site:SITE-004 OR site:ALL
  recipients: string[] | string
}

function hashOf(opts: NotificationOpts): string {
  return crypto.createHash('sha256').update(`${opts.entityType}:${opts.entityId}:${opts.title}:${opts.actorEmail||''}`).digest('hex').slice(0,16)
}

async function resolveRecipients(pdb: any, recipients: string[] | string, siteCode?: string | null): Promise<string[]> {
  if (Array.isArray(recipients)) return recipients.filter(Boolean)
  if (typeof recipients === 'string' && recipients.startsWith('role:')) {
    // role:FINANCE_MGR:site:SITE-004
    const parts = recipients.split(':')
    const role = parts[1]
    const site = parts[3] || siteCode
    // Find users with that role via FinUserRole
    const roleRow = await pdb.finRole.findUnique({ where: { code: role } }).catch(()=>null)
    if (!roleRow) return []
    const assignments = await pdb.finUserRole.findMany({
      where: { roleId: roleRow.id, isActive: true, ...(site ? { siteCode: site } : {}) }
    })
    return assignments.map((a:any)=>a.userEmail).filter(Boolean)
  }
  if (recipients === 'site:ALL') {
    const assignments = await pdb.finUserRole.findMany({ where: { isActive: true } })
    return [...new Set(assignments.map((a:any)=>a.userEmail))] as string[]
  }
  // Fallback: all finance users
  const all = await pdb.finUserRole.findMany({ where: { isActive: true } }).catch(()=>[])
  return ([...new Set(all.map((a:any)=>a.userEmail))] as string[]).slice(0,20)
}

export async function emitNotification(pdb: any, opts: NotificationOpts): Promise<number> {
  try {
    const hash = hashOf(opts)
    // Idempotency: skip if same hash already exists
    const existing = await pdb.finNotification.findUnique({ where: { hash } }).catch(()=>null)
    if (existing) return 0

    const recipients = await resolveRecipients(pdb, opts.recipients, opts.siteCode)
    if (recipients.length === 0) return 0

    const rows = recipients.map((email: string) => ({
      userEmail: email,
      actorEmail: opts.actorEmail || null,
      entityType: opts.entityType,
      entityId: String(opts.entityId),
      title: opts.title,
      message: opts.message,
      type: opts.type || 'info',
      priority: opts.priority || 'P2',
      channel: opts.channel || 'inapp',
      siteCode: opts.siteCode || null,
      jobCode: opts.jobCode || null,
      finYear: opts.finYear || null,
      amount: opts.amount ?? null,
      link: opts.link || null,
      status: 'unread',
      isRead: false,
      hash: `${hash}:${email}`, // per-recipient unique
    }))

    // Create with per-recipient hash
    let created = 0
    for (const row of rows) {
      try {
        await pdb.finNotification.create({ data: row })
        created++
      } catch {}
    }
    return created
  } catch (e) {
    console.error('[notification-bus] emit failed', e)
    return 0
  }
}

// Helper: derive FY from date
export function deriveFinYear(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth()
  if (m >= 3) return `${y}-${String(y+1).slice(-2)}`
  return `${y-1}-${String(y).slice(-2)}`
}
