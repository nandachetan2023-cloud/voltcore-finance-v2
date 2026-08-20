/**
 * Presentation helpers for rejection positions — the pure, client-safe half of
 * the rejection-position feature.
 *
 * Kept separate from rejection-position.ts on purpose: that module imports the
 * superadmin Prisma client, and a UI component importing it would pull server
 * code toward the browser bundle. Tree-shaking happens to remove it today, but
 * relying on that is fragile. These functions are pure string formatting and
 * are safe to import from anywhere.
 */

/**
 * Render a position as a clause that appends to a sentence, e.g.
 *   " at step 2 of 3 by Manager"  →  "...was rejected at step 2 of 3 by Manager."
 * Returns '' when nothing useful is known, so callers can interpolate blindly.
 */
export function formatRejectionPosition(
  step: number | null,
  roleName: string | null,
  totalSteps?: number | null,
): string {
  if (!step && !roleName) return ''
  const parts: string[] = []
  if (step) parts.push(totalSteps ? ` at step ${step} of ${totalSteps}` : ` at step ${step}`)
  if (roleName) parts.push(` by ${roleName}`)
  return parts.join('')
}

/**
 * Short label for a table cell or badge, e.g. "Step 2 of 3 · Manager".
 * Returns null when there is nothing to show, so the UI can fall back to a
 * plain "Rejected" for historical rows that predate this feature.
 */
export function rejectionPositionLabel(
  step: number | null | undefined,
  roleName: string | null | undefined,
): string | null {
  if (!step && !roleName) return null
  if (step && roleName) return `Step ${step} · ${roleName}`
  if (step) return `Step ${step}`
  return roleName ?? null
}
