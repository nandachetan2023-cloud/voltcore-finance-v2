'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, RotateCcw, AlertTriangle, FileText, Shield,
  Calendar, Building2, Award, Users, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';

interface Tenant { id: string; name: string; slug: string; }

interface DeletedItem {
  id: number;
  name: string;
  _type: 'leave-policy' | 'attendance-rule' | 'holiday' | 'employee' | 'department' | 'designation';
  updatedAt: string;
  // extra fields
  code?: string; leaveType?: string; ruleType?: string;
  date?: string; employeeCode?: string;
  Department?: { name: string };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'leave-policy':     { label: 'Leave Policy',     color: '#00d4ff', icon: FileText },
  'attendance-rule':  { label: 'Attendance Rule',  color: '#a78bfa', icon: Shield },
  'holiday':          { label: 'Holiday',           color: '#00e676', icon: Calendar },
  'employee':         { label: 'Employee',          color: '#f5a623', icon: Users },
  'department':       { label: 'Department',        color: '#ff9800', icon: Building2 },
  'designation':      { label: 'Designation',       color: '#e91e63', icon: Award },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[];

function itemDetails(item: DeletedItem): string {
  switch (item._type) {
    case 'leave-policy':    return `${item.code || ''} · ${item.leaveType || ''}`;
    case 'attendance-rule': return item.ruleType || '';
    case 'holiday':         return item.date ? new Date(item.date).toLocaleDateString('en-IN') : '';
    case 'employee':        return `${item.employeeCode || ''} · ${item.Department?.name || ''}`;
    default:                return (item as any).code || '';
  }
}

export default function TrashTab({ tenants }: { tenants: Tenant[] }) {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<string>('all');
  const [confirmItem, setConfirmItem] = useState<{ item: DeletedItem; action: 'restore' | 'delete' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async (tenantId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/trash?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.success) setItems(data.data);
      else toast.error(data.error);
    } catch { toast.error('Failed to load deleted items'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedTenant) fetchItems(selectedTenant);
    else setItems([]);
  }, [selectedTenant, fetchItems]);

  const handleAction = async () => {
    if (!confirmItem || !selectedTenant) return;
    setSubmitting(true);
    try {
      const { item, action } = confirmItem;
      const res = await fetch(`/api/superadmin/trash?tenantId=${selectedTenant}`, {
        method: action === 'restore' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item._type }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'restore' ? `${item.name} restored` : `${item.name} permanently deleted`);
        setConfirmItem(null);
        fetchItems(selectedTenant);
      } else {
        toast.error(data.error);
      }
    } finally { setSubmitting(false); }
  };

  const filtered = activeType === 'all' ? items : items.filter(i => i._type === activeType);
  const tenantName = tenants.find(t => t.id === selectedTenant)?.name || '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-[#e2e8f0]">Recycle Bin</h2>
          <p className="text-[11px] text-[#5a6878]">Manage soft-deleted records across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="bg-[#161c24] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60"
          >
            <option value="">Select tenant...</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {selectedTenant && (
            <button onClick={() => fetchItems(selectedTenant)} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {!selectedTenant ? (
        <div className="text-center py-16 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <Trash2 size={32} className="mx-auto text-[#5a6878] mb-3" />
          <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">Select a tenant</p>
          <p className="text-[11px] text-[#5a6878]">Choose a company to view and manage their deleted records</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#ff3d3d]/30 border-t-[#ff3d3d] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Type filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setActiveType('all')}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${activeType === 'all' ? 'bg-[#f5a623] text-black' : 'bg-[#161c24] text-[#8899aa] hover:text-[#e2e8f0] border border-[#252e3a]'}`}>
              All ({items.length})
            </button>
            {ALL_TYPES.map(type => {
              const count = items.filter(i => i._type === type).length;
              if (count === 0) return null;
              const cfg = TYPE_CONFIG[type];
              return (
                <button key={type} onClick={() => setActiveType(type)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors border ${activeType === type ? 'text-black border-transparent' : 'bg-[#161c24] text-[#8899aa] hover:text-[#e2e8f0] border-[#252e3a]'}`}
                  style={activeType === type ? { background: cfg.color, borderColor: cfg.color } : {}}>
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Items table */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-2">
              <Trash2 size={14} className="text-[#ff3d3d]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">{tenantName} — Deleted Items</span>
              <span className="ml-auto text-[11px] text-[#5a6878]">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Trash2 size={28} className="mx-auto text-[#5a6878] mb-2 opacity-40" />
                <p className="text-[12px] text-[#5a6878]">No deleted items</p>
              </div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#252e3a] bg-[#141920]">
                    {['Type', 'Name', 'Details', 'Deleted At', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#5a6878]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const cfg = TYPE_CONFIG[item._type] || TYPE_CONFIG['leave-policy'];
                    const Icon = cfg.icon;
                    return (
                      <tr key={`${item._type}-${item.id}`} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon size={13} style={{ color: cfg.color }} />
                            <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{item.name}</td>
                        <td className="px-4 py-3 text-[#8899aa] text-[11px]">{itemDetails(item)}</td>
                        <td className="px-4 py-3 text-[#8899aa] text-[11px]">
                          {new Date(item.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' '}
                          {new Date(item.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setConfirmItem({ item, action: 'restore' })}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 transition-colors"
                              title="Restore">
                              <RotateCcw size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmItem({ item, action: 'delete' })}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors"
                              title="Permanently Delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirmItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {confirmItem.action === 'restore'
                  ? <RotateCcw size={18} className="text-[#00e676]" />
                  : <AlertTriangle size={18} className="text-[#ff3d3d]" />}
                <span className="text-[14px] font-bold text-[#e2e8f0]">
                  {confirmItem.action === 'restore' ? 'Restore Item' : 'Permanently Delete'}
                </span>
              </div>
              <button onClick={() => setConfirmItem(null)} className="text-[#5a6878] hover:text-[#e2e8f0]">
                <X size={16} />
              </button>
            </div>

            <p className="text-[12px] text-[#8899aa] mb-3">
              {confirmItem.action === 'restore'
                ? <>Restore <span className="text-[#e2e8f0] font-semibold">{confirmItem.item.name}</span> back to the active list?</>
                : <>Permanently delete <span className="text-[#e2e8f0] font-semibold">{confirmItem.item.name}</span>? This cannot be undone.</>}
            </p>

            {confirmItem.action === 'delete' && (
              <div className="mb-3 p-2.5 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg text-[11px] text-[#ff3d3d]">
                ⚠️ This will permanently remove the record from the database.
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setConfirmItem(null)}
                className="flex-1 py-2 text-[12px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#f5a623] transition-colors">
                Cancel
              </button>
              <button onClick={handleAction} disabled={submitting}
                className={`flex-1 py-2 text-[12px] font-bold rounded-lg disabled:opacity-50 transition-colors ${
                  confirmItem.action === 'restore'
                    ? 'bg-[#00e676] text-black hover:bg-[#00c853]'
                    : 'bg-[#ff3d3d] text-white hover:bg-[#e63535]'
                }`}>
                {submitting ? '...' : confirmItem.action === 'restore' ? 'Restore' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
