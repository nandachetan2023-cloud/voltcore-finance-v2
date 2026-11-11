'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Contractor master reader.
 *
 * Contractors Management (Master Setup → Contractors Management) owns every
 * contractor record. The rest of the app never creates or edits one — it
 * only *reads* the master to populate its dropdowns, so a vendor picked in a
 * purchase order is always a contractor that exists in the master with its
 * full details (code, GSTIN, contact, compliance, banking).
 *
 * This hook is the single read path for that data, so every dropdown in
 * every module shows the same list, in the same order, with the same
 * sublabels.
 */

export interface ContractorOption {
  id: number;
  name: string;
  vendorCode: string | null;
  vendorType: string | null;
  gstin: string | null;
  status: string | null;
  region: string | null;
  city: string | null;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
}

export function useContractors() {
  const [contractors, setContractors] = useState<ContractorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/fin/vendors');
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setContractors(json.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          vendorCode: c.vendorCode ?? null,
          vendorType: c.vendorType ?? null,
          gstin: c.gstin ?? null,
          status: c.status ?? null,
          region: c.region ?? null,
          city: c.city ?? null,
          contactPerson: c.contactPerson ?? null,
          phone: c.phone ?? null,
          address: c.address ?? null,
        })));
        setError(null);
      } else {
        setError(json?.error || 'Could not load contractors');
      }
    } catch {
      setError('Could not load contractors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const names = useMemo(() => contractors.map((c) => c.name), [contractors]);

  const byName = useMemo(() => {
    const map: Record<string, ContractorOption> = {};
    for (const c of contractors) map[c.name.toLowerCase()] = c;
    return map;
  }, [contractors]);

  /** Options for a `<select>` / SearchableSelect, with a master-derived sublabel. */
  const options = useMemo(
    () => contractors.map((c) => ({
      value: c.name,
      label: c.name,
      sublabel: [c.vendorCode, c.vendorType, c.city].filter(Boolean).join(' · ') || undefined,
    })),
    [contractors],
  );

  /**
   * Master names plus any value already used by existing records, so a
   * historic row (created before a contractor existed in the master) stays
   * selectable instead of silently disappearing from the dropdown.
   */
  const optionsWith = useCallback(
    (existing: string[]) => {
      const extra = existing.filter((v) => v && !names.includes(v));
      const extras = extra.map((v) => ({ value: v, label: v, sublabel: 'Not in contractor master' }));
      return [...options, ...extras];
    },
    [options, names],
  );

  return { contractors, names, byName, options, optionsWith, loading, error, reload: load };
}
