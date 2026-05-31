'use client';
import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Shared client-side search + pagination for the finance CRUD tables.
 * Pass the full records array and a function that turns a record into a
 * searchable string. Returns the current page slice plus paging state.
 */
export function useTableControls<T>(
  records: T[],
  toSearchText: (r: T) => string,
  initialPageSize = 10,
) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => toSearchText(r).toLowerCase().includes(q));
  }, [records, search, toSearchText]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Keep current page valid when filters/data change
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [search, pageSize]);

  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, total);

  return { search, setSearch, page, setPage, pageSize, setPageSize, filtered, pageItems, total, totalPages, from, to };
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
