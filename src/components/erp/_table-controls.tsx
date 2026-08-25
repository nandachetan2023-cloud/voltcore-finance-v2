'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export const PAGE_SIZES = [10, 25, 50, 100];

export interface SortState<T> {
  key: string | null;
  dir: 'asc' | 'desc';
  accessor?: (r: T) => unknown;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls last regardless of direction
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const as = typeof a === 'string' ? a.toLowerCase() : String(a);
  const bs = typeof b === 'string' ? b.toLowerCase() : String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

/**
 * Shared client-side search + sort + pagination for the finance CRUD tables.
 * Pass the full records array and a function that turns a record into a
 * searchable string. Returns the current page slice plus paging/sort state.
 * Click any column via `toggleSort(key, accessor)` (see `SortableTh` below)
 * to sort by it — click again to reverse, a third click clears the sort.
 */
export function useTableControls<T>(
  records: T[],
  toSearchText: (r: T) => string,
  initialPageSize = 10,
) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<SortState<T>>({ key: null, dir: 'asc' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => toSearchText(r).toLowerCase().includes(q));
  }, [records, search, toSearchText]);

  const sorted = useMemo(() => {
    if (!sort.key || !sort.accessor) return filtered;
    const acc = sort.accessor;
    const copy = [...filtered].sort((a, b) => compareValues(acc(a), acc(b)));
    return sort.dir === 'desc' ? copy.reverse() : copy;
  }, [filtered, sort]);

  const toggleSort = useCallback((key: string, accessor: (r: T) => unknown) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc', accessor };
      if (prev.dir === 'asc') return { key, dir: 'desc', accessor };
      return { key: null, dir: 'asc' }; // third click clears
    });
  }, []);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Keep current page valid when filters/data change
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [search, pageSize]);

  const start = (page - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, total);

  return { search, setSearch, page, setPage, pageSize, setPageSize, filtered, pageItems, total, totalPages, from, to, sort, toggleSort };
}

/**
 * Drop-in replacement for a plain `<th>` — click to sort by `accessor`,
 * click again to reverse, a third click clears. Pass the `sort`/`toggleSort`
 * pair returned by `useTableControls`.
 */
export function SortableTh<T>({ label, sortKey, accessor, sort, toggleSort, className = '', align = 'left' }: {
  label: string;
  sortKey: string;
  accessor: (r: T) => unknown;
  sort: SortState<T>;
  toggleSort: (key: string, accessor: (r: T) => unknown) => void;
  className?: string;
  align?: 'left' | 'right';
}) {
  const active = sort.key === sortKey;
  return (
    <th
      onClick={() => toggleSort(sortKey, accessor)}
      className={`py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap cursor-pointer select-none hover:text-[#f5a623] transition-colors ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        {active ? (sort.dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronsUpDown size={10} className="opacity-30" />}
      </span>
    </th>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#0f1318] border border-[#252e3a] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-[200px]"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] text-[12px]">×</button>
      )}
    </div>
  );
}

export function PaginationBar({ page, totalPages, pageSize, setPage, setPageSize, from, to, total }: {
  page: number; totalPages: number; pageSize: number;
  setPage: (n: number) => void; setPageSize: (n: number) => void;
  from: number; to: number; total: number;
}) {
  const btn = 'p-1.5 rounded text-[#8899aa] hover:text-[#f5a623] hover:bg-[#252e3a] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8899aa]';
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[#252e3a] text-[11px] text-[#8899aa] flex-wrap">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="bg-[#0f1318] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"
        >
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono">{from}–{to} of {total}</span>
        <div className="flex items-center gap-0.5">
          <button className={btn} onClick={() => setPage(1)} disabled={page <= 1} title="First"><ChevronsLeft size={14} /></button>
          <button className={btn} onClick={() => setPage(page - 1)} disabled={page <= 1} title="Previous"><ChevronLeft size={14} /></button>
          <span className="px-2 font-mono text-[#e2e8f0]">{page} / {totalPages}</span>
          <button className={btn} onClick={() => setPage(page + 1)} disabled={page >= totalPages} title="Next"><ChevronRight size={14} /></button>
          <button className={btn} onClick={() => setPage(totalPages)} disabled={page >= totalPages} title="Last"><ChevronsRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}
