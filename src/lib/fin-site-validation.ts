type SiteDateValidation =
  | { ok: true; startDate: Date; endDate: Date }
  | { ok: false; error: string };

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function validateSiteDates(startValue: unknown, endValue: unknown): SiteDateValidation {
  const startDate = parseDate(startValue);
  if (!startDate) return { ok: false, error: 'A valid start date is required' };

  const endDate = parseDate(endValue);
  if (!endDate) return { ok: false, error: 'A valid end date is required' };
  if (endDate < startDate) return { ok: false, error: 'End date must be on or after the start date' };

  return { ok: true, startDate, endDate };
}
