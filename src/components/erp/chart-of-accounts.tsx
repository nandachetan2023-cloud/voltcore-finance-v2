'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Plus, Pencil, Trash2, X, RefreshCw, Search, ChevronRight, ChevronDown, GripVertical, Layers, Tag, Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface CoaNode {
  id: number; accountCode: string; name: string; group: string; type: string;
  parentId: number | null; sortOrder: number; taxApplicable: boolean; isActive: boolean;
  description: string | null;
}

interface TreeNode extends CoaNode {
  children: TreeNode[];
  depth: number;
}

const GROUP_COLORS: Record<string, string> = {
  Assets: '#00d4ff',
  Liabilities: '#f5a623',
  Capital: '#a78bfa',
  Income: '#00e676',
  'Direct Income': '#00e676',
  'Indirect Income': '#00e676',
  Expenses: '#ff3d3d',
  'Direct Expenses': '#ff3d3d',
  'Indirect Expenses': '#ff3d3d',
  Expense: '#ff3d3d',
};
const TYPE_ICON: Record<string, string> = {
  Asset: '🟦', Liability: '🟧', Equity: '🟪', Income: '🟩', Expense: '🟥',
};

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 transition-colors placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5';

// Build a nested tree from flat records (parentId + sortOrder)
function buildTree(records: CoaNode[]): TreeNode[] {
  const nodes: Record<number, TreeNode> = {};
  for (const r of records) nodes[r.id] = { ...r, children: [], depth: 0 };
  const roots: TreeNode[] = [];
  for (const n of Object.values(nodes)) {
    if (n.parentId && nodes[n.parentId]) {
      n.depth = nodes[n.parentId].depth + 1;
      nodes[n.parentId].children.push(n);
    } else {
      roots.push(n);
    }
  }
  const sort = (arr: TreeNode[]) => {
    arr.sort((a, b) => a.sortOrder - b.sortOrder || a.accountCode.localeCompare(b.accountCode));
    arr.forEach(c => sort(c.children));
  };
  sort(roots);
  return roots;
}

function flatten(roots: TreeNode[]): CoaNode[] {
  const out: CoaNode[] = [];
  const walk = (nodes: TreeNode[]) => nodes.forEach(n => { out.push(n); walk(n.children); });
  walk(roots);
  return out;
}

export default function ChartOfAccounts() {
  const [records, setRecords] = useState<CoaNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<CoaNode | null>(null);
  const [saving, setSaving] = useState(false);

  // drag state
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [dropAsChild, setDropAsChild] = useState(false);

  const emptyForm = { accountCode: '', name: '', group: 'Assets', type: 'Asset', parentId: '', taxApplicable: false, description: '' };
  const [form, setForm] = useState(emptyForm);

  const tree = useMemo(() => buildTree(records), [records]);
  const visible = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    const filtered = records.filter(r => r.accountCode.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    // show any ancestor of a match so the match is reachable in the tree
    const matchIds = new Set(filtered.map(r => r.id));
    filtered.forEach(r => { let p = r.parentId; let guard = 0; while (p != null && guard < 200) { matchIds.add(p); const parent = records.find(x => x.id === p); p = parent?.parentId ?? null; guard++; } });
    return buildTree(records.filter(r => matchIds.has(r.id)));
  }, [records, search, tree]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/coa').then(r => r.json());
      if (j.success) setRecords(j.data || []);
      else toast.error(j.error || 'Failed to load chart of accounts');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = (id: number) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const expandAll = () => setExpanded(new Set(records.filter(r => records.some(c => c.parentId === r.id)).map(r => r.id)));
  const collapseAll = () => setExpanded(new Set());

  const openNew = () => { setEdit(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (n: CoaNode) => {
    setEdit(n);
    setForm({ accountCode: n.accountCode, name: n.name, group: n.group, type: n.type, parentId: n.parentId ? String(n.parentId) : '', taxApplicable: n.taxApplicable, description: n.description || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.accountCode.trim() || !form.name.trim()) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      const url = '/api/coa';
      const method = edit ? 'PUT' : 'POST';
      const body: any = {
        ...(edit ? { id: edit.id } : {}),
        accountCode: form.accountCode.trim(),
        name: form.name,
        group: form.group,
        type: form.type,
        parentId: form.parentId ? Number(form.parentId) : null,
        taxApplicable: form.taxApplicable,
        description: form.description || null,
      };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (j.success) { toast.success(edit ? 'Account updated' : 'Account created'); setShowForm(false); await fetchData(); }
      else toast.error(j.error || 'Failed to save');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const del = async (n: CoaNode) => {
    const childCount = records.filter(r => r.parentId === n.id).length;
    if (!confirm(`Delete "${n.accountCode} ${n.name}"${childCount ? ` and its ${childCount} child account(s)` : ''}? This will also remove postings.`)) return;
    try {
      const res = await fetch(`/api/coa?id=${n.id}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) { toast.success('Account deleted'); await fetchData(); }
      else toast.error(j.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
  };

  // ── Drag & drop ──
  const onDragStart = (id: number) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setOverId(null); setDropAsChild(false); };

  const onDrop = async () => {
    if (dragId == null || overId == null || dragId === overId) { onDragEnd(); return; }
    // Determine target: dropping onto a leaf or onto the same row = make child? We use dropAsChild when hovering the right "child" zone.
    const targetParent = dropAsChild ? overId : records.find(r => r.id === overId)?.parentId ?? null;
    if (dragId === targetParent) { onDragEnd(); return; }
    setSaving(true);
    try {
      // new sortOrder = end of target list
      const siblings = records.filter(r => r.parentId === targetParent && r.id !== dragId);
      const sortOrder = siblings.length ? Math.max(...siblings.map(s => s.sortOrder)) + 1 : 0;
      const res = await fetch('/api/coa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dragId, parentId: targetParent, sortOrder }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success('Account moved');
        if (targetParent) setExpanded(prev => new Set(prev).add(targetParent));
        await fetchData();
      } else toast.error(j.error || 'Failed to move');
    } catch { toast.error('Network error'); }
    finally { onDragEnd(); setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><BookOpen size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Chart of Accounts</h2>
            <p className="text-[11px] text-[#5a6878]">Hierarchical tree · drag to reparent & reorder · {records.length} accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"><RefreshCw size={14} /></button>
          <button onClick={expandAll} className="px-2 py-1 text-[10px] text-[#8899aa] hover:text-[#e2e8f0] transition-colors">Expand</button>
          <button onClick={collapseAll} className="px-2 py-1 text-[10px] text-[#8899aa] hover:text-[#e2e8f0] transition-colors">Collapse</button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8d6] transition-colors"><Plus size={13} /> New Account</button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 p-3 bg-[#161c24] border border-[#252e3a] rounded-xl flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(GROUP_COLORS).filter(([g]) => records.some(r => r.group === g)).map(([g, c]) => (
          <span key={g} className="flex items-center gap-1.5 text-[10px] text-[#5a6878]">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />{g}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-[#5a6878]">Drag a row onto another row to make it a child, or onto the edge to reorder.</span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search account code / name..."
          className="pl-9 w-full max-w-xs bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#5a6878]" />
      </div>

      {/* Tree */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Account', 'Code', 'Type', 'Group', 'Status', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              <TreeRows
                nodes={visible}
                expanded={expanded}
                onToggle={toggle}
                dragId={dragId} overId={overId} dropAsChild={dropAsChild}
                onDragStart={onDragStart} onDragOver={setOverId} setDropAsChild={setDropAsChild} onDrop={onDrop}
                onEdit={openEdit} onDelete={del}
              />
              {visible.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">
                  {records.length === 0 ? 'No accounts yet. Click “New Account” to build your chart of accounts.' : 'No accounts match the search.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mt-4 bg-[#161c24] border border-[#00d4ff]/25 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[#e2e8f0]">{edit ? `Edit ${edit.accountCode}` : 'New Account'}</span>
            <button onClick={() => setShowForm(false)}><X size={15} className="text-[#5a6878]" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Account Code *</label>
              <input className={inp + (edit ? ' opacity-50' : '')} value={form.accountCode} disabled={!!edit}
                onChange={e => setForm(f => ({ ...f, accountCode: e.target.value.toUpperCase() }))} placeholder="e.g. 1101" />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Name *</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cash in Hand" />
            </div>
            <div>
              <label className={lbl}>Parent Account</label>
              <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))} className={inp + ' appearance-none'}>
                <option value="">— Root —</option>
                {records.filter(r => r.id !== edit?.id).map(r => (
                  <option key={r.id} value={r.id}>{r.accountCode} — {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Group</label>
              <select value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} className={inp + ' appearance-none'}>
                {Object.keys(GROUP_COLORS).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp + ' appearance-none'}>
                {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className={lbl}>Description</label>
              <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="sm:col-span-3">
              <label className="flex items-center gap-2 text-[11px] text-[#8899aa] cursor-pointer">
                <input type="checkbox" checked={form.taxApplicable} onChange={e => setForm(f => ({ ...f, taxApplicable: e.target.checked }))} className="accent-[#00d4ff]" />
                Tax applicable account
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg hover:border-[#00d4ff] transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00d4ff] text-black text-[11px] font-bold rounded-lg hover:bg-[#00b8d6] disabled:opacity-50 transition-colors">
              <Tag size={13} /> {saving ? 'Saving...' : edit ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeRows({ nodes, expanded, onToggle, dragId, overId, dropAsChild, onDragStart, onDragOver, setDropAsChild, onDrop, onEdit, onDelete }: {
  nodes: TreeNode[]; expanded: Set<number>; onToggle: (id: number) => void;
  dragId: number | null; overId: number | null; dropAsChild: boolean;
  onDragStart: (id: number) => void; onDragOver: (id: number) => void; setDropAsChild: (v: boolean) => void; onDrop: () => void;
  onEdit: (n: CoaNode) => void; onDelete: (n: CoaNode) => void | Promise<void>;
}) {
  return (
    <>
      {nodes.map(n => (
        <TreeNodeRow
          key={n.id}
          n={n}
          expanded={expanded}
          onToggle={onToggle}
          dragId={dragId}
          overId={overId}
          dropAsChild={dropAsChild}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          setDropAsChild={setDropAsChild}
          onDrop={onDrop}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function TreeNodeRow({ n, expanded, onToggle, dragId, overId, dropAsChild, onDragStart, onDragOver, setDropAsChild, onDrop, onEdit, onDelete }: {
  n: TreeNode; expanded: Set<number>; onToggle: (id: number) => void;
  dragId: number | null; overId: number | null; dropAsChild: boolean;
  onDragStart: (id: number) => void; onDragOver: (id: number) => void; setDropAsChild: (v: boolean) => void; onDrop: () => void;
  onEdit: (n: CoaNode) => void; onDelete: (n: CoaNode) => void | Promise<void>;
}) {
  const hasChildren = n.children.length > 0;
  const isOpen = expanded.has(n.id);
  const isOver = overId === n.id;
  const color = GROUP_COLORS[n.group] || '#8899aa';
  const isDragging = dragId === n.id;
  return (
    <>
      <tr
        draggable={!isDragging}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(n.id); }}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(n.id);
          const rect = e.currentTarget.getBoundingClientRect();
          setDropAsChild(e.clientY > rect.top + rect.height * 0.35 && e.clientY < rect.top + rect.height * 0.85);
        }}
        onDrop={(e) => { e.preventDefault(); onDrop(); }}
        onDragEnd={onDrop}
        className={`group hover:bg-[#141920] ${isDragging ? 'opacity-40' : ''} ${isOver ? (dropAsChild ? 'bg-[#00d4ff]/5' : 'bg-[#00d4ff]/10') : ''}`}
        style={{ borderLeft: isOver ? `2px solid ${color}` : '2px solid transparent' }}
      >
        <td className="py-2.5 pl-4 pr-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: n.depth * 22 }}>
            <GripVertical size={12} className="text-[#5a6878] opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
            {hasChildren ? (
              <button onClick={() => onToggle(n.id)} className="text-[#5a6878] hover:text-[#e2e8f0] shrink-0">
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : <span className="w-[13px] shrink-0" />}
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className={`font-semibold ${n.isActive ? 'text-[#e2e8f0]' : 'text-[#5a6878] line-through'}`}>{n.name}</span>
            {n.taxApplicable && <span className="px-1.5 py-[1px] rounded text-[8px] font-bold bg-[#f5a623]/15 text-[#f5a623] shrink-0">TAX</span>}
          </div>
        </td>
        <td className="py-2.5 px-4 font-mono text-[#8899aa]">{n.accountCode}</td>
        <td className="py-2.5 px-4 text-[#5a6878]">{TYPE_ICON[n.type] || ''} {n.type}</td>
        <td className="py-2.5 px-4">
          <span className="px-2 py-[2px] rounded-full text-[10px] font-semibold" style={{ background: `${color}15`, color }}>{n.group}</span>
        </td>
        <td className="py-2.5 px-4">{n.isActive ? <span className="text-[10px] text-[#00e676]">Active</span> : <span className="text-[10px] text-[#5a6878]">Inactive</span>}</td>
        <td className="py-2.5 px-4">
          <div className="flex gap-1">
            <button onClick={() => onEdit(n)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
            <button onClick={() => onDelete(n)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
          </div>
        </td>
      </tr>
      {hasChildren && isOpen && (
        <TreeRows
          nodes={n.children}
          expanded={expanded}
          onToggle={onToggle}
          dragId={dragId}
          overId={overId}
          dropAsChild={dropAsChild}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          setDropAsChild={setDropAsChild}
          onDrop={onDrop}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
