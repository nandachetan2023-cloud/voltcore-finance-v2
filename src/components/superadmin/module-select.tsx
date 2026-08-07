'use client';

/**
 * Granular Module Access Selector
 * Shared between the admin Roles & Access module (OrgRole) and user-management (TenantUser).
 *
 * Value format: "all" | comma-separated keys
 * Keys can be group-level ("hrms") or sub-module level ("employees,attendance")
 * isModuleAllowed() in erp-store handles both.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp, ChevronRight, Layers, X } from 'lucide-react';

/* ── Full module tree with labels ─────────────────────────────── */
export const FULL_MODULE_TREE: {
  key: string;
  label: string;
  icon?: string;
  subModules: { key: string; label: string }[];
}[] = [
  {
    key: 'organization', label: 'Organization',
    subModules: [
      { key: 'departments',         label: 'Departments' },
      { key: 'designations',        label: 'Designations' },
      { key: 'holidays',            label: 'Holidays' },
      { key: 'leave-policies',      label: 'Leave Policies' },
      { key: 'attendance-rules',    label: 'Attendance Rules' },
      { key: 'checklist-templates', label: 'Checklist Templates' },
      { key: 'employee-documents',  label: 'Employee Documents' },
      { key: 'roles-access',        label: 'Roles & Access' },
    ],
  },
  {
    key: 'hrms', label: 'HRMS',
    subModules: [
      { key: 'employee-analytics', label: 'Employee Analytics' },
      { key: 'employees',          label: 'Employees' },
      { key: 'attendance',         label: 'Attendance' },
      { key: 'biometric',          label: 'Biometric Sync' },
      { key: 'leave',              label: 'Leave Management' },
      { key: 'tour-requests',      label: 'Tour Requests' },
      { key: 'shift',              label: 'Shift Roster' },
      { key: 'timesheet',          label: 'Timesheet' },
      { key: 'payroll',            label: 'Payroll' },
      { key: 'training',           label: 'Certificates' },
      { key: 'recruitment',        label: 'Recruitment' },
      { key: 'onboarding',         label: 'Onboarding' },
      { key: 'offboarding',        label: 'Offboarding' },
      { key: 'exit-management',    label: 'Exit Management' },
    ],
  },
  {
    key: 'procurement', label: 'Procurement',
    subModules: [
      { key: 'purchases', label: 'Purchase Orders' },
      { key: 'expenses',  label: 'Expenses' },
    ],
  },
  {
    key: 'finance', label: 'Finance',
    subModules: [
      { key: 'finance-dashboard',   label: 'Dashboard' },
      { key: 'ledger',              label: 'Ledger Management' },
      { key: 'accounts-payable',    label: 'Accounts Payable' },
      { key: 'accounts-receivable', label: 'Accounts Receivable' },
      { key: 'journal-entries',     label: 'Journal Entries' },
      { key: 'bank-cash',           label: 'Bank & Cash' },
      { key: 'taxation',            label: 'Taxation & Compliance' },
      { key: 'budget',              label: 'Budget & Forecasting' },
      { key: 'financial-reports',   label: 'Financial Reports' },
    ],
  },
  {
    key: 'projects', label: 'Projects',
    subModules: [
      { key: 'project-list', label: 'All Projects' },
      { key: 'sites',        label: 'Site Map' },
    ],
  },
  {
    key: 'assets', label: 'Assets',
    subModules: [
      { key: 'equipment',      label: 'Equipment' },
      { key: 'permits',        label: 'Work Permits' },
      { key: 'safety',         label: 'Safety & HSE' },
      { key: 'subcontractors', label: 'Subcontractors' },
    ],
  },
  {
    key: 'system', label: 'System',
    subModules: [
      { key: 'reports',         label: 'Reports' },
      { key: 'settings',        label: 'Settings' },
      { key: 'user-management', label: 'User Management' },
      { key: 'requests',        label: 'Employee Requests' },
      { key: 'notice-board',    label: 'Notice Board' },
    ],
  },
  {
    key: 'reports', label: 'Reports',
    subModules: [
      { key: 'report-manpower',   label: 'Manpower' },
      { key: 'report-attendance', label: 'Attendance' },
      { key: 'report-payroll',    label: 'Payroll' },
      { key: 'report-leave',      label: 'Leave' },
      { key: 'report-tour',       label: 'Tour Requests' },
      { key: 'report-late-fine',  label: 'Late & Fines' },
      { key: 'report-onboarding', label: 'Onboarding' },
      { key: 'report-turnover',   label: 'Turnover / Exit' },
      { key: 'report-training',   label: 'Training & Certs' },
      { key: 'report-notices',    label: 'Notice Read Rate' },
      { key: 'report-dispatch',   label: 'Payslip Dispatch' },
    ],
  },
  {
    key: 'self-service', label: 'My Portal',
    subModules: [
      { key: 'my-dashboard',  label: 'My Dashboard' },
      { key: 'my-attendance', label: 'My Attendance' },
      { key: 'my-leave',      label: 'Apply Leave' },
      { key: 'my-tours',      label: 'My Tours' },
      { key: 'my-requests',   label: 'My Requests' },
      { key: 'my-profile',    label: 'My Profile' },
      { key: 'my-notices',    label: 'My Notices' },
      { key: 'notifications', label: 'Notifications' },
      { key: 'my-payslips',   label: 'My Payslips' },
      { key: 'my-documents',  label: 'My Documents' },
      { key: 'my-shifts',     label: 'My Shifts' },
    ],
  },
];

/* ── Parse / serialize helpers ────────────────────────────────── */
function parseValue(val: string): Set<string> {
  if (!val || val === 'all') return new Set();
  return new Set(val.split(',').map(s => s.trim()).filter(Boolean));
}

function serializeValue(selected: Set<string>): string {
  if (selected.size === 0) return 'all';
  return [...selected].join(',');
}

/** Expand group keys to their sub-module keys for display */
function expandToSubModules(selected: Set<string>): Set<string> {
  const expanded = new Set<string>();
  for (const key of selected) {
    const group = FULL_MODULE_TREE.find(g => g.key === key);
    if (group) {
      // Group key selected — add all sub-modules
      group.subModules.forEach(s => expanded.add(s.key));
      if (group.subModules.length === 0) expanded.add(key); // leaf group
    } else {
      expanded.add(key);
    }
  }
  return expanded;
}

/* ── Component ────────────────────────────────────────────────── */
interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  /**
   * Optional tenant-wide cap. When set (and not 'all'), the selector only shows
   * modules within this cap — used so a tenant admin can never grant access
   * beyond what the superadmin enabled for the tenant.
   * Value format identical to `value`: "all" | comma-separated keys.
   */
  cap?: string;
}

/** Build the visible tree, filtered to the cap when one is set. */
function buildVisibleTree(cap?: string): typeof FULL_MODULE_TREE {
  if (!cap || cap === 'all') return FULL_MODULE_TREE;
  const allowed = new Set(cap.split(',').map(s => s.trim()).filter(Boolean));
  const result: typeof FULL_MODULE_TREE = [];
  for (const group of FULL_MODULE_TREE) {
    const groupAllowed = allowed.has(group.key);
    if (group.subModules.length === 0) {
      if (groupAllowed) result.push(group);
      continue;
    }
    const subs = group.subModules.filter(s => groupAllowed || allowed.has(s.key));
    if (subs.length > 0) result.push({ ...group, subModules: subs });
  }
  return result;
}

export default function ModuleSelect({ value, onChange, placeholder = 'Select modules...', cap }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => buildVisibleTree(cap), [cap]);

  const isAll = !value || value === 'all';
  const selected = parseValue(value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  // Check states for a group
  const getGroupState = (group: typeof FULL_MODULE_TREE[0]): 'all' | 'some' | 'none' => {
    if (isAll) return 'all';
    if (group.subModules.length === 0) {
      return selected.has(group.key) ? 'all' : 'none';
    }
    const subKeys = group.subModules.map(s => s.key);
    const selectedSubs = subKeys.filter(k => selected.has(k));
    // Also check if the group key itself is selected (means all subs)
    if (selected.has(group.key)) return 'all';
    if (selectedSubs.length === subKeys.length) return 'all';
    if (selectedSubs.length > 0) return 'some';
    return 'none';
  };

  const toggleGroupAccess = (group: typeof FULL_MODULE_TREE[0]) => {
    const state = getGroupState(group);

    if (state === 'all') {
      // If currently "all modules", expand to all groups then deselect this one
      if (isAll) {
        const next = new Set<string>();
        tree.forEach(g => {
          if (g.key !== group.key) next.add(g.key);
        });
        onChange(serializeValue(next));
      } else {
        // Deselect: remove group key and all sub-module keys
        const next = new Set(selected);
        next.delete(group.key);
        group.subModules.forEach(s => next.delete(s.key));
        onChange(serializeValue(next));
      }
    } else {
      // Select all: use group key (shorthand for all subs)
      const next = new Set(selected);
      next.delete(group.key);
      group.subModules.forEach(s => next.delete(s.key));
      next.add(group.key);
      onChange(serializeValue(next));
    }
  };

  const toggleSubModule = (groupKey: string, subKey: string) => {
    const group = tree.find(g => g.key === groupKey)!;

    // If currently "all modules", expand to all groups first
    if (isAll) {
      const next = new Set<string>();
      tree.forEach(g => next.add(g.key));
      // Now expand the clicked group to sub-modules and toggle the sub
      next.delete(groupKey);
      group.subModules.forEach(s => {
        if (s.key !== subKey) next.add(s.key);
      });
      onChange(serializeValue(next));
      return;
    }

    const next = new Set(selected);

    // If group key is selected, expand it to individual sub-modules first
    if (next.has(groupKey)) {
      next.delete(groupKey);
      group.subModules.forEach(s => next.add(s.key));
    }

    if (next.has(subKey)) {
      next.delete(subKey);
    } else {
      next.add(subKey);
      // If all sub-modules are now selected, collapse to group key
      const allSelected = group.subModules.every(s => next.has(s.key));
      if (allSelected) {
        group.subModules.forEach(s => next.delete(s.key));
        next.add(groupKey);
      }
    }
    onChange(serializeValue(next));
  };

  const isSubSelected = (groupKey: string, subKey: string): boolean => {
    if (isAll) return true;
    return selected.has(subKey) || selected.has(groupKey);
  };

  // Count selected items for display
  const selectedCount = (() => {
    if (isAll) return 'All Modules';
    let count = 0;
    for (const group of tree) {
      if (selected.has(group.key)) {
        count += Math.max(1, group.subModules.length);
      } else {
        count += group.subModules.filter(s => selected.has(s.key)).length;
      }
    }
    return `${count} module${count !== 1 ? 's' : ''} selected`;
  })();

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-left hover:border-[#f5a623]/40 transition-colors min-h-[38px]">
        <Layers size={13} className="text-[#5a6878] shrink-0" />
        <span className={`flex-1 text-[12px] ${isAll ? 'text-[#f5a623] font-semibold' : 'text-[#e2e8f0]'}`}>
          {selectedCount}
        </span>
        {open ? <ChevronUp size={12} className="text-[#5a6878] shrink-0" /> : <ChevronDown size={12} className="text-[#5a6878] shrink-0" />}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#161c24] border border-[#252e3a] rounded-xl shadow-2xl shadow-black/50 max-h-[360px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#252e3a] bg-[#141920] shrink-0">
            <span className="text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider">{selectedCount}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onChange('all')}
                className="text-[10px] text-[#00d4ff] hover:text-[#00e676] font-semibold transition-colors">
                All
              </button>
              <span className="text-[#2e3a48]">|</span>
              <button onClick={() => onChange('')}
                className="text-[10px] text-[#5a6878] hover:text-[#ff3d3d] font-semibold transition-colors">
                Clear
              </button>
            </div>
          </div>

          {/* Groups */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tree.map(group => {
              const state = getGroupState(group);
              const isExpanded = expandedGroups.has(group.key);
              const hasSubModules = group.subModules.length > 0;

              return (
                <div key={group.key} className="bg-[#141920] rounded-lg overflow-hidden border border-[#1e252e]">
                  {/* Group header row */}
                  <div className="flex items-center gap-1">
                    {/* Checkbox */}
                    <button onClick={() => toggleGroupAccess(group)}
                      className="flex items-center gap-2 flex-1 px-3 py-[7px] hover:bg-[#1a2028] transition-colors text-left">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        state === 'all' ? 'bg-[#f5a623] border-[#f5a623]'
                        : state === 'some' ? 'bg-[#f5a623]/20 border-[#f5a623]/50'
                        : 'border-[#2e3a48]'
                      }`}>
                        {state === 'all' && <Check size={10} className="text-black" />}
                        {state === 'some' && <span className="w-2 h-2 bg-[#f5a623] rounded-sm" />}
                      </div>
                      <span className={`text-[11px] font-semibold flex-1 ${state !== 'none' ? 'text-[#e2e8f0]' : 'text-[#8899aa]'}`}>
                        {group.label}
                      </span>
                      {hasSubModules && (
                        <span className="text-[9px] text-[#5a6878]">
                          {state === 'all' ? group.subModules.length
                            : group.subModules.filter(s => isSubSelected(group.key, s.key)).length
                          }/{group.subModules.length}
                        </span>
                      )}
                    </button>
                    {/* Expand toggle */}
                    {hasSubModules && (
                      <button onClick={() => toggleGroup(group.key)}
                        className="px-2 py-[7px] text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                  </div>

                  {/* Sub-modules */}
                  {hasSubModules && isExpanded && (
                    <div className="px-2 pb-1.5 space-y-[2px] border-t border-[#1e252e] pt-1">
                      {group.subModules.map(sub => {
                        const subSel = isSubSelected(group.key, sub.key);
                        return (
                          <button key={sub.key} onClick={() => toggleSubModule(group.key, sub.key)}
                            className={`w-full flex items-center gap-2 px-3 py-[5px] rounded-md transition-colors ${subSel ? 'bg-[#f5a623]/8' : 'hover:bg-[#1a2028]'}`}>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${subSel ? 'bg-[#00e676] border-[#00e676]' : 'border-[#2e3a48]'}`}>
                              {subSel && <Check size={8} className="text-black" />}
                            </div>
                            <span className={`text-[11px] flex-1 text-left ${subSel ? 'text-[#e2e8f0] font-medium' : 'text-[#8899aa]'}`}>
                              {sub.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected summary */}
          {!isAll && selected.size > 0 && (
            <div className="px-3 py-2 border-t border-[#252e3a] bg-[#141920] shrink-0">
              <div className="flex flex-wrap gap-1 max-h-[48px] overflow-y-auto">
                {tree.flatMap(g => {
                  if (selected.has(g.key)) {
                    return [{ key: g.key, label: g.label, groupKey: g.key }];
                  }
                  return g.subModules
                    .filter(s => selected.has(s.key))
                    .map(s => ({ key: s.key, label: s.label, groupKey: g.key }));
                }).map(item => (
                  <span key={`${item.groupKey}-${item.key}`}
                    className="inline-flex items-center gap-1 text-[9px] bg-[#f5a623]/10 text-[#f5a623] px-2 py-[2px] rounded-md font-medium">
                    {item.label}
                    <button onClick={() => {
                      const next = new Set(selected);
                      next.delete(item.key);
                      onChange(serializeValue(next));
                    }} className="hover:text-[#ff3d3d] transition-colors">
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
