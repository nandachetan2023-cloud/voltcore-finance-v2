type DailyCostRateResult = { ok: true; value: number | null } | { ok: false };

export function parseDailyCostRate(value: unknown): DailyCostRateResult {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === undefined || normalized === null || normalized === '') {
    return { ok: true, value: null };
  }
  if (typeof normalized !== 'number' && typeof normalized !== 'string') return { ok: false };

  const rate = Number(normalized);
  if (!Number.isFinite(rate) || rate < 0) return { ok: false };
  return { ok: true, value: rate };
}
