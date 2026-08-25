'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   FormField — label + required marker + hint + inline error, wraps
   any input/select/textarea/custom control so every form gets the
   same spacing, typography and error presentation for free.
   ════════════════════════════════════════════════════════════════ */
export function FormField({ label, required, hint, error, children, className = '' }: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 flex items-center gap-1">
        {label}
        {required && <span className="text-[#ff3d3d]" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <div className="text-[10px] text-[#ff3d3d] mt-1">{error}</div>
      ) : hint ? (
        <div className="text-[10px] text-[#5a6878] mt-1">{hint}</div>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FormSection — a titled, optionally-collapsible group of fields.
   Use to break a long form into scannable chunks (e.g. "Party & Site",
   "Amounts", "Linking", "Attachments") instead of one undifferentiated
   wall of inputs.
   ════════════════════════════════════════════════════════════════ */
export function FormSection({ title, icon: Icon, children, defaultOpen = true, collapsible = false }: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#252e3a] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 bg-[#0f1318] text-left ${collapsible ? 'cursor-pointer hover:bg-[#141920]' : 'cursor-default'}`}
      >
        {Icon && <Icon size={13} className="text-[#f5a623] shrink-0" />}
        <span className="text-[10px] uppercase tracking-[1.5px] text-[#8899aa] font-bold flex-1">{title}</span>
        {collapsible && (
          <ChevronDown size={14} className={`text-[#5a6878] transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SearchableSelect — a type-to-filter combobox for master-data
   dropdowns (parties, sites, POs) that can grow past a handful of
   options. Plain <select> becomes unusable once there are 15+ parties;
   this keeps keyboard support (↑/↓/Enter/Esc) and click-outside close.
   ════════════════════════════════════════════════════════════════ */
export interface SearchableOption {
  value: string;
  label: string;
  /** Optional secondary line shown under the label (e.g. GSTIN, balance). */
  sublabel?: string;
}

export function SearchableSelect({
  value, onChange, options, placeholder = 'Select...', emptyText = 'No matches', clearable = true, disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyText?: string;
  clearable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => { if (open) { setActiveIdx(0); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);

  const commit = (opt: SearchableOption | null) => {
    onChange(opt?.value ?? '');
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIdx]) commit(filtered[activeIdx]); return; }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="vc-input flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-[#e2e8f0] truncate' : 'text-[#5a6878] truncate'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); commit(null); }}
              className="p-0.5 rounded hover:bg-[#252e3a] text-[#5a6878] hover:text-[#e2e8f0]"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={13} className={`text-[#5a6878] transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-[#161c24] border border-[#2e3a48] rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-[#252e3a]">
            <Search size={12} className="text-[#5a6878] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to filter..."
              className="flex-1 bg-transparent text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 && <div className="px-3 py-3 text-[11px] text-[#5a6878] text-center">{emptyText}</div>}
            {filtered.map((opt, i) => (
              <div
                key={`${opt.value}-${i}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => commit(opt)}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-[12px] cursor-pointer ${i === activeIdx ? 'bg-[#f5a623]/10 text-[#f5a623]' : 'text-[#e2e8f0] hover:bg-[#1a2028]'}`}
              >
                <div className="min-w-0">
                  <div className="truncate">{opt.label}</div>
                  {opt.sublabel && <div className="text-[10px] text-[#5a6878] truncate">{opt.sublabel}</div>}
                </div>
                {opt.value === value && <Check size={13} className="shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   useFormValidation — minimal required-field + custom-rule validator.
   Returns per-field errors plus a `validate()` you call on submit;
   errors clear as the user fixes each field.
   ════════════════════════════════════════════════════════════════ */
export type ValidationRules<T> = Partial<Record<keyof T, (value: any, form: T) => string | undefined>>;

export function useFormValidation<T extends Record<string, any>>(rules: ValidationRules<T>) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = (form: T): boolean => {
    const next: Partial<Record<keyof T, string>> = {};
    for (const key in rules) {
      const rule = rules[key];
      if (!rule) continue;
      const msg = rule(form[key], form);
      if (msg) next[key] = msg;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const clearError = (key: keyof T) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next: Partial<Record<keyof T, string>> = { ...prev };
      delete next[key];
      return next;
    });
  };

  return { errors, validate, clearError, setErrors };
}

export const required = (label: string) => (v: any) =>
  (v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))) ? `${label} is required` : undefined;

/* ════════════════════════════════════════════════════════════════
   DatalistField — a plain text input with autocomplete suggestions
   from existing values (cost centers, departments, project managers).
   The user can type a new value or pick an existing one — no master
   table required. `id` must be unique per field.
   ════════════════════════════════════════════════════════════════ */
export function DatalistField({
  id, value, onChange, options = [], placeholder = '', disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <input
        list={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <datalist id={id}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   RequiredDatalistFields — a ready-made 3-field grid (Cost Center /
   Department / Project Manager) that every finance transaction form
   uses to satisfy the compulsory costing dimensions. Options are
   derived from existing record values so suggestions grow over time.
   ════════════════════════════════════════════════════════════════ */
export function CostingFields({
  prefix, form, setField, errors = {},
}: {
  prefix: string;
  form: { costCenter: string; department: string; projectManager: string };
  setField: (key: 'costCenter' | 'department' | 'projectManager', value: string) => void;
  errors?: Partial<Record<'costCenter' | 'department' | 'projectManager', string | undefined>>;
}) {
  const costCenterOptions = useMemo(() => [...new Set(COST_CENTER_SUGGESTIONS)], []);
  const departmentOptions = useMemo(() => [...new Set(DEPARTMENT_SUGGESTIONS)], []);
  const projectManagerOptions = useMemo(() => [...new Set(PROJECT_MANAGER_SUGGESTIONS)], []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FormField label="Cost Center" required error={errors.costCenter} hint="Cost centre for this transaction">
        <DatalistField id={`${prefix}-cost-center`} value={form.costCenter} onChange={(v) => setField('costCenter', v)} options={costCenterOptions} placeholder="e.g. CC-SIT-001" />
      </FormField>
      <FormField label="Department" required error={errors.department} hint="Responsible department">
        <DatalistField id={`${prefix}-department`} value={form.department} onChange={(v) => setField('department', v)} options={departmentOptions} placeholder="e.g. Projects" />
      </FormField>
      <FormField label="Project Manager" required error={errors.projectManager} hint="Accountable project manager">
        <DatalistField id={`${prefix}-pm`} value={form.projectManager} onChange={(v) => setField('projectManager', v)} options={projectManagerOptions} placeholder="e.g. R. Sharma" />
      </FormField>
    </div>
  );
}

const COST_CENTER_SUGGESTIONS = ['CC-SIT-001', 'CC-SIT-002', 'CC-HO-001', 'CC-PROJ-001', 'CC-PROJ-002'];
const DEPARTMENT_SUGGESTIONS = ['Projects', 'Operations', 'Site Execution', 'Finance', 'Procurement', 'HR', 'IT'];
const PROJECT_MANAGER_SUGGESTIONS = ['R. Sharma', 'A. Verma', 'P. Iyer', 'S. Rao', 'M. Khan'];
