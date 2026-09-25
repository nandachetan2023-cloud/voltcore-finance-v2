// ── Ultra Notification Bus ───────────────────────────────────────
// Event-driven, RBAC-scoped, FY-locked, idempotent, preference-aware.
//
// Recipients are a list of specs, resolved and de-duplicated together:
//   'someone@corp.com'           → that user
//   'role:FINANCE_MGR'           → every active holder of the role (all sites)
//   'role:FINANCE_MGR:site:S-04' → holders scoped to S-04 PLUS all-site holders
//                                   (FinUserRole.siteCode = null)
//   'site:ALL'                   → every active finance user
// The actor who triggered the event is never notified about their own action.

import crypto from 'crypto'

// The finance inbox owner is always the signed-in user (httpOnly cookie set at
// login). A header or query param is never trusted — that let anyone read any
// other user's inbox by changing an email in the request.
export function getInboxOwner(request: { cookies: { get(name: string): { value: string } | undefined } }): string {
  return (request.cookies.get('erp_user_email')?.value || '').trim().toLowerCase()
}

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
  // Module id to open when the notification is clicked (e.g. 'fin-invoices').
  link?: string | null
  actorEmail?: string | null
  recipients: string[] | string
  // Optional FinNotificationTemplate code. When a template row exists it
  // overrides title/message/priority, with {{var}} placeholders filled from vars
  // plus {{title}} and {{message}} (the defaults passed here).
  templateCode?: string
  vars?: Record<string, string | number | null | undefined>
  // Overrides the default idempotency key (entity + title + actor + minute).
  // Use it for events that must fire at most once per period, e.g. a daily
  // overdue reminder keyed on the date.
  dedupeKey?: string
}

function hashOf(opts: NotificationOpts): string {
  const key = opts.dedupeKey
    ?? `${opts.entityType}:${opts.entityId}:${opts.title}:${opts.actorEmail || ''}:${Math.floor(Date.now() / 60000)}`
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16)
}

function render(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? '') as string)
}

async function resolveOne(pdb: any, spec: string, siteCode?: string | null): Promise<string[]> {
  if (!spec) return []
  if (spec === 'site:ALL') {
    const rows = await pdb.finUserRole.findMany({ where: { isActive: true } }).catch(() => [])
    return rows.map((a: any) => a.userEmail)
  }
  // 'site:SITE-004' (anything but the literal 'site:ALL' above) — every
  // active finance user assigned to that site, plus all-site holders.
  // Used for admin broadcasts targeting "everyone at this site" regardless
  // of role, distinct from 'role:X:site:Y' which narrows to one role.
  if (spec.startsWith('site:')) {
    const site = spec.slice(5)
    const rows = await pdb.finUserRole.findMany({
      where: { isActive: true, OR: [{ siteCode: site }, { siteCode: null }] },
    }).catch(() => [])
    return rows.map((a: any) => a.userEmail)
  }
  if (spec.startsWith('role:')) {
    const parts = spec.split(':')
    const role = parts[1]
    const site = parts[3] || siteCode || null
    const roleRow = await pdb.finRole.findUnique({ where: { code: role } }).catch(() => null)
    if (!roleRow) return []
    const rows = await pdb.finUserRole.findMany({
      where: {
        roleId: roleRow.id,
        isActive: true,
        ...(site ? { OR: [{ siteCode: site }, { siteCode: null }] } : {}),
      },
    }).catch(() => [])
    return rows.map((a: any) => a.userEmail)
  }
  return spec.includes('@') ? [spec] : []
}

async function resolveRecipients(pdb: any, recipients: string[] | string, siteCode?: string | null): Promise<string[]> {
  const specs = Array.isArray(recipients) ? recipients : [recipients]
  const all = (await Promise.all(specs.map(s => resolveOne(pdb, s, siteCode)))).flat()
  return [...new Set(all.map(e => (e || '').trim().toLowerCase()).filter(Boolean))]
}

// Drop recipients who muted in-app finance notifications. P0 always gets through.
async function applyPreferences(pdb: any, emails: string[], priority: string): Promise<string[]> {
  if (priority === 'P0' || emails.length === 0) return emails
  const prefs = await pdb.finNotificationPreference.findMany({ where: { userEmail: { in: emails } } }).catch(() => [])
  const muted = new Set(
    prefs
      .filter((p: any) => p.digest === 'off' || (p.channels && (p.channels as any).inapp === false))
      .map((p: any) => p.userEmail),
  )
  return emails.filter(e => !muted.has(e))
}

export async function emitNotification(pdb: any, opts: NotificationOpts): Promise<number> {
  try {
    let { title, message } = opts
    let priority = opts.priority || 'P2'
    let channel = opts.channel || 'inapp'
    if (opts.templateCode) {
      const tpl = await pdb.finNotificationTemplate.findUnique({ where: { code: opts.templateCode } }).catch(() => null)
      if (tpl) {
        // {{title}} / {{message}} give templates the detailed default text to build on.
        const vars = { ...(opts.vars || {}), title: opts.title, message: opts.message }
        title = render(tpl.titleTpl, vars)
        message = render(tpl.messageTpl, vars)
        priority = tpl.priority || priority
        channel = tpl.channel || channel
      }
    }

    const actor = (opts.actorEmail || '').trim().toLowerCase()
    let recipients = (await resolveRecipients(pdb, opts.recipients, opts.siteCode)).filter(e => e !== actor)
    recipients = await applyPreferences(pdb, recipients, priority)
    if (recipients.length === 0) return 0

    const hash = hashOf({ ...opts, title })
    let created = 0
    for (const email of recipients) {
      try {
        await pdb.finNotification.create({
          data: {
            userEmail: email,
            actorEmail: opts.actorEmail || null,
            entityType: opts.entityType,
            entityId: String(opts.entityId),
            title,
            message,
            type: opts.type || 'info',
            priority,
            channel,
            siteCode: opts.siteCode || null,
            jobCode: opts.jobCode || null,
            finYear: opts.finYear || null,
            amount: opts.amount ?? null,
            link: opts.link || null,
            status: 'unread',
            isRead: false,
            hash: `${hash}:${email}`, // per-recipient unique → duplicates fail and are skipped
          },
        })
        created++
      } catch {}
    }
    return created
  } catch (e) {
    console.error('[notification-bus] emit failed', e)
    return 0
  }
}

// Fire-and-forget wrapper for API routes: a notification problem must never
// fail or slow down the business action that triggered it.
export function notifyFinance(pdb: any, opts: NotificationOpts): void {
  emitNotification(pdb, opts).catch(() => {})
}

// Standard audiences.
export const FIN_APPROVERS = (siteCode?: string | null) =>
  [`role:FINANCE_MGR${siteCode ? `:site:${siteCode}` : ''}`]
export const FIN_TEAM = (siteCode?: string | null) =>
  ['FINANCE_MGR', 'FIN_EXEC'].map(r => `role:${r}${siteCode ? `:site:${siteCode}` : ''}`)
export const SITE_APPROVERS = (siteCode?: string | null) =>
  ['SITE_MGR', 'FIN_EXEC', 'FINANCE_MGR'].map(r => `role:${r}${siteCode ? `:site:${siteCode}` : ''}`)

export const inr = (n: number | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN')}`

// Helper: derive FY from date
export function deriveFinYear(d?: Date | string | null): string {
  const dt = d ? new Date(d) : new Date()
  const y = dt.getFullYear()
  const m = dt.getMonth()
  if (m >= 3) return `${y}-${String(y+1).slice(-2)}`
  return `${y-1}-${String(y).slice(-2)}`
}
