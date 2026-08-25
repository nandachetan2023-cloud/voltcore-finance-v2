'use client';

import { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { SearchableSelect, type SearchableOption } from './_form-controls';
import { SearchInput } from './_table-controls';

/* ════════════════════════════════════════════════════════════════
   ListFilterBar — the standard 5-dimension filter strip required on
   every transaction LIST screen: Site Code, Job Code, PO Number,
   Cost Center and Department, plus the global keyword SearchInput.
   Drop the `filters` object + `setFilter` from `useListFilters` and
   the control becomes fully reusable.
   ════════════════════════════════════════════════════════════════ */

export interface ListFilters {
  site?: string;
  jobCode?: string;
  poNo?: string;
  costCenter?: string;
  department?: string;
}

export interface ListFilterOptions {
  sites?: SearchableOption[];
  jobs?: SearchableOption[];
  poNos?: SearchableOption[];
  costCenters?: string[];
  departments?: string[];
}

/**
 * Build the search-text for `useTableControls` from a record plus the
 * active dimension filters. Pass record accessors that already map to
 * the searchable string form (e.g. site name/siteCode, jobCode, poNo).
 */
export function buildSearchText(
  values: { site?: string; jobCode?: string; poNo?: string; costCenter?: string; department?: string },
  base: string,
): string {
  return [base, values.site, values.jobCode, values.poNo, values.costCenter, values.department]
    .filter(Boolean)
    .join(' ');
}

export function FilterBar({
  filters,
  setFilter,
  options,
  search,
  setSearch,
  searchPlaceholder = 'Search...',
}: {
  filters: ListFilters;
  setFilter: (key: keyof ListFilters, value: string) => void;
  options: ListFilterOptions;
  search: string;
  setSearch: (v: string) => void;
  searchPlaceholder?: string;
}) {
  const costCenterOptions = useMemo(() => (options.costCenters ?? []).map((c) => ({ value: c, label: c })), [options.costCenters]);
  const departmentOptions = useMemo(() => (options.departments ?? []).map((d) => ({ value: d, label: d })), [options.departments]);

  const hasActive = Boolean(filters.site || filters.jobCode || filters.poNo || filters.costCenter || filters.department || search);

  const clearAll = () => {
    setFilter('site', ''); setFilter('jobCode', ''); setFilter('poNo', '');
    setFilter('costCenter', ''); setFilter('department', ''); setSearch('');
  };

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 bg-[#0f1318] border border-[#252e3a] rounded-xl">
      <div className="flex items-center gap-1.5 text-[#5a6878] pr-1 self-center">
        <Filter size={13} />
        <span className="text-[9px] uppercase tracking-[1.5px] font-bold">Filters</span>
      </div>

      <FilterSelect label="Site Code" value={filters.site || ''} onChange={(v) => setFilter('site', v)} options={options.sites} placeholder="All sites" />
      <FilterSelect label="Job Code" value={filters.jobCode || ''} onChange={(v) => setFilter('jobCode', v)} options={options.jobs} placeholder="All jobs" />
      <FilterSelect label="PO Number" value={filters.poNo || ''} onChange={(v) => setFilter('poNo', v)} options={options.poNos} placeholder="All POs" />
      <FilterSelect label="Cost Center" value={filters.costCenter || ''} onChange={(v) => setFilter('costCenter', v)} options={costCenterOptions} placeholder="All cost centers" />
      <FilterSelect label="Department" value={filters.department || ''} onChange={(v) => setFilter('department', v)} options={departmentOptions} placeholder="All departments" />

      <div className="ml-auto flex items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} />
        {hasActive && (
          <button onClick={clearAll} className="flex items-center gap-1 text-[10px] font-semibold text-[#ff3d3d] hover:underline whitespace-nowrap">
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: SearchableOption[];
  placeholder?: string;
}) {
  const opts = options && options.length ? options : [];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[8px] uppercase tracking-[1.5px] text-[#5a6878] font-bold">{label}</span>
      <div className="w-[150px]">
        <SearchableSelect value={value} onChange={onChange} options={opts} placeholder={placeholder || label} />
      </div>
    </div>
  );
}
