'use client';

import { Search, X } from 'lucide-react';

/**
 * Reusable live-search box, styled to match the Employees / Attendance modules.
 * Controlled: pass `value` + `onChange`. Renders a clear (X) button when non-empty.
 *
 *   const [q, setQ] = useState('');
 *   <SearchInput value={q} onChange={setQ} placeholder="Search runs..." />
 *   const filtered = useMemo(() => rows.filter(r => matchesSearch(q, [r.name, r.code])), [rows, q]);
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-lg px-3 py-[6px] flex-1 min-w-[200px] max-w-[360px] ${className}`}>
      <Search size={14} className="text-[#5a6878] shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none text-[#e2e8f0] outline-none text-[12px] w-full placeholder:text-[#5a6878]"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-[#5a6878] hover:text-[#e2e8f0]" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * True if every whitespace-separated term in `query` is found (case-insensitive)
 * somewhere across the provided `fields`. Empty/blank query always matches.
 * Multi-term so "ramesh ua00" matches a row whose name has "ramesh" and code "UA001".
 */
export function matchesSearch(query: string, fields: Array<string | number | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.map((f) => (f == null ? '' : String(f))).join('  ').toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}
