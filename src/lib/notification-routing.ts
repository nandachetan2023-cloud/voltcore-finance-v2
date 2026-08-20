/**
 * Where a notification should navigate to when clicked.
 *
 * Shared by the header bell dropdown and the Notifications module so both
 * resolve the same destination — if they disagreed, the same notification
 * would open different screens depending on where you clicked it.
 */
import { isModuleAllowed } from '@/store/erp-store'

/** entityType → the admin/approver module and the employee self-service module. */
export const ENTITY_MODULE_MAP: Record<string, { admin: string; self: string }> = {
  leave: { admin: 'leave', self: 'my-leave' },
  tour: { admin: 'tour-requests', self: 'tour-requests' },
  request: { admin: 'requests', self: 'my-requests' },
  attendance: { admin: 'attendance', self: 'my-attendance' },
  payroll: { admin: 'payroll', self: 'my-payslips' },
  notice: { admin: 'notice-board', self: 'my-notices' },
  onboarding: { admin: 'onboarding-approvals', self: 'onboarding' },
}

/** Human label per entityType, for filter chips and badges. */
export const ENTITY_LABEL: Record<string, string> = {
  leave: 'Leave',
  tour: 'Tour',
  request: 'Request',
  attendance: 'Attendance',
  payroll: 'Payroll',
  notice: 'Notice',
  onboarding: 'Onboarding',
}

export interface RoutableNotification {
  title?: string
  message?: string
  link?: string
  entityType?: string | null
}

/**
 * An approval-shaped notification belongs in the APPROVER's queue even when the
 * recipient is not a full admin — a scoped approver receiving "needs your
 * approval" should land on the management view, not their own requests.
 *
 * Every module writes approver-bound notifications with the same vocabulary
 * ("Approval Required", "Approval Needed", "Escalated", "New Leave Request"…)
 * and requester-bound ones with the second person ("Your leave was rejected",
 * "Leave Approved ✓"), so the wording is the signal. This is deliberately not
 * limited to entityType 'request': leave and tour approvals are routed the same
 * way, and restricting it to one entity type sent approvers to their own
 * self-service page instead of the approval queue.
 */
export function isApprovalRequestNotification(notif: RoutableNotification): boolean {
  if (!notif.entityType || !ENTITY_MODULE_MAP[notif.entityType]) return false
  const title = (notif.title || '').toLowerCase()
  const text = `${title} ${notif.message || ''}`.toLowerCase()

  // Second-person phrasing means the recipient is the requester, not an
  // approver — checked first because "Your leave ... requires approval" would
  // otherwise match the approver patterns below.
  if (/\byour\b/.test(text) && !/requires your approval|needs your approval/.test(text)) {
    return false
  }

  return (
    text.includes('approval required') ||
    text.includes('approval needed') ||
    text.includes('needs your approval') ||
    text.includes('requires your approval') ||
    text.includes('no approver found') ||
    text.includes('escalated') ||
    // "New Leave Request", "New Tour Request", "New General Request",
    // "New Advance Payment" — all addressed to whoever must action it.
    title.startsWith('new ')
  )
}

/**
 * Resolve the module a notification should open, or null when the recipient
 * has access to neither candidate. An explicit `link` wins when allowed.
 */
export function resolveNotificationTarget(
  notif: RoutableNotification,
  userRole: string,
  allowedModules: string,
): string | null {
  if (notif.link && isModuleAllowed(notif.link, allowedModules)) return notif.link

  const mapping = ENTITY_MODULE_MAP[notif.entityType as string]
  if (!mapping) return null

  const preferAdmin = userRole === 'admin' || isApprovalRequestNotification(notif)
  const preferred = preferAdmin ? mapping.admin : mapping.self
  const fallback = preferAdmin ? mapping.self : mapping.admin

  if (isModuleAllowed(preferred, allowedModules)) return preferred
  if (isModuleAllowed(fallback, allowedModules)) return fallback
  return null
}

/** Accent colour per notification type. */
export const TYPE_COLOR: Record<string, string> = {
  info: '#00d4ff',
  success: '#00e676',
  warning: '#f5a623',
  error: '#ff3d3d',
}
