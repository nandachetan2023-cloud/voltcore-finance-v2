// Shared write helpers for the Contractor Register (FinSubcontract) API routes.
//
// Date-only strings from <input type="date"> (e.g. "2026-11-01") are NOT valid
// ISO-8601 DateTime for Prisma — it throws "premature end of input". Always
// normalize through toIsoDate() before create/update.

export const SC_INCLUDE = { milestones: true, retentionReleases: true, progressClaims: true }

export function toIsoDate(v: unknown): Date | null {
  if (!v) return null
  const t = new Date(String(v)).getTime()
  return Number.isNaN(t) ? null : new Date(t)
}

/** Strip DB ids from nested child rows (they get re-created) and normalize their date field. */
export function childRows(list: unknown, dateKey: string): any[] {
  if (!Array.isArray(list)) return []
  return list.map((row: Record<string, unknown>) => {
    const { id: _id, ...rest } = (row || {}) as Record<string, unknown>
    if (dateKey in rest) rest[dateKey] = toIsoDate(rest[dateKey]) ?? new Date()
    return rest
  })
}

/**
 * Split a request body into scalar data (dates normalized, id/children removed)
 * plus normalized child arrays. Returns null dates when the value is missing so
 * PUT can leave the column unchanged.
 */
export function normalizeSubcontractBody(body: Record<string, unknown>) {
  const { id: _id, milestones, retentionReleases, progressClaims, startDate, endDate, ...rest } = body || {}
  return {
    rest: rest as Record<string, unknown>,
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    milestones: Array.isArray(milestones) ? milestones : [],
    retentionReleases: Array.isArray(retentionReleases) ? retentionReleases : [],
    progressClaims: Array.isArray(progressClaims) ? progressClaims : [],
  }
}
