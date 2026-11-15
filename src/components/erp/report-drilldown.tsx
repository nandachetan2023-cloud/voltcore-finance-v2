'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, BarChart3, Wallet, DollarSign, TrendingUp, RefreshCw, AlertCircle, AlertTriangle, X } from 'lucide-react';

interface LedgerRow { accountCode: string; name: string; type: string; group: string; parentAccount: string | null; balance: number; }

interface GroupNode { group: string; type: string; balance: number; accounts: number; }
interface AccountNode extends LedgerRow { children: AccountNode[]; leaf: boolean; }

const TYPE_COLOR: Record<string, string> = { Asset: '#00d4ff', Liability: '#f5a623', Equity: '#a78bfa', Income: '#00e676', Expense: '#ff3d3d' };

// Flat seeded CoA (parentAccount → child) as in the seed.
function buildAccounts(rows: LedgerRow[], types: string[]): { roots: AccountNode[]; cyclicOmitted: number } {
  const map: Record<string, AccountNode> = {};
  for (const r of rows) {
    if (!types.includes(r.type)) continue;
    const node: AccountNode = { ...r, children: [], leaf: true };
    const existing = map[r.accountCode];
    if (existing) {
      if (!existing.balance && node.balance) map[r.accountCode] = node;
      continue;
    }
    map[r.accountCode] = node;
  }
  const roots: AccountNode[] = [];
  for (const n of Object.values(map)) {
    const parent = n.parentAccount ? map[n.parentAccount] : null;
    if (parent) { parent.children.push(n); parent.leaf = false; }
    else roots.push(n);
  }
  roots.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  const reachable = new Set<AccountNode>();
  const mark = (n: AccountNode) => { if (reachable.has(n)) return; reachable.add(n); for (const c of n.children) mark(c); };
  roots.forEach(mark);
  return { roots, cyclicOmitted: Object.keys(map).length - reachable.size };
}

function accountBalance(n: AccountNode): number {
  return (n.balance || 0) + n.children.reduce((s, c) => s + accountBalance(c), 0);
}

function sumByType(rows: LedgerRow[], type: string): number {
  return rows.filter(r => r.type === type).reduce((s, r) => s + (r.balance || 0), 0);
}

function groupTally(rows: LedgerRow[], types: string[]): GroupNode[] {
  const map = new Map<string, GroupNode>();
  for (const r of rows) if (types.includes(r.type)) {
    const g = map.get(r.group) || { group: r.group, type: r.type, balance: 0, accounts: 0 };
    g.balance += r.balance || 0; g.accounts++;
    map.set(r.group, g);
  }
  return [...map.values()].sort((a, b) => b.balance - a.balance);
}

export default function ReportDrilldown() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [isBs, setIsBs] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cycleDismissed, setCycleDismissed] = useState(false);
  const expandedInit = useRef(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger');
      const j = await res.json();
      if (j.success) { setRows(Array.isArray(j.data) ? j.data : []); setError(''); }
      else setError(j.error || 'Failed to load');
    } catch (e: any) { setError(e?.message || 'Network error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const types = isBs ? ['Asset', 'Liability', 'Equity'] : ['Income', 'Expense'];
  const { roots: accounts, cyclicOmitted } = useMemo(() => buildAccounts(rows, types), [rows, isBs]);
  const groups = useMemo(() => groupTally(rows, types), [rows, isBs]);
  useEffect(() => {
    if (expandedInit.current || groups.length === 0) return;
    setExpanded(new Set(groups.map(g => g.group)));
    expandedInit.current = true;
  }, [groups]);

  const totalAssets = isBs ? sumByType(rows, 'Asset') : 0;
  const totalLiabEq = isBs ? sumByType(rows, 'Liability') + sumByType(rows, 'Equity') : 0;
  const income = !isBs ? sumByType(rows, 'Income') : 0;
  const expense = !isBs ? sumByType(rows, 'Expense') : 0;
  const net = income - expense;

  const toggle = (g: string) => setExpanded(prev => { const s = new Set(prev); if (s.has(g)) s.delete(g); else s.add(g); return s; });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;
  if (error) return (
    <div className="p-6 text-center text-[#ff3d3d]">
      <AlertCircle size={32} className="mx-auto mb-2" />
      <p>{error}</p>
      <button className="vc-btn-primary mt-3" onClick={fetchData}>Retry</button>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><BarChart3 size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">P&L / Balance Sheet Drill-down</h2>
            <p className="text-[11px] text-[#5a6878]">Collapse groups to accounts; totals roll up through the hierarchy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <div className="flex bg-[#0d1117] border border-[#252e3a] rounded-lg overflow-hidden">
            <button onClick={() => setIsBs(true)} className={`px-3 py-1.5 text-[11px] font-bold ${isBs ? 'bg-[#00d4ff] text-black' : 'text-[#8899aa]'}`}>Balance Sheet</button>
            <button onClick={() => setIsBs(false)} className={`px-3 py-1.5 text-[11px] font-bold ${!isBs ? 'bg-[#00d4ff] text-black' : 'text-[#8899aa]'}`}>P&L</button>
          </div>
        </div>
      </div>

      {cyclicOmitted > 0 && !cycleDismissed && (
        <div className="mb-3 flex items-center gap-2 bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] rounded-lg px-3 py-2 text-[11px]">
          <AlertTriangle size={13} className="shrink-0" />
          <span className="flex-1">{cyclicOmitted} account{cyclicOmitted === 1 ? '' : 's'} omitted due to a circular parent reference.</span>
          <button onClick={() => setCycleDismissed(true)} className="text-[#f5a623]/70 hover:text-[#f5a623]" aria-label="Dismiss"><X size={13} /></button>
        </div>
      )}

      <div className={`grid gap-3 mb-4 ${isBs ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {isBs ? <>
          <Kpi icon={<Wallet size={14} />} label="Total Assets" value={totalAssets} color="#00d4ff" />
          <Kpi icon={<DollarSign size={14} />} label="Liabilities + Equity" value={totalLiabEq} color="#a78bfa" />
        </> : <>
          <Kpi icon={<TrendingUp size={14} />} label="Total Income" value={income} color="#00e676" />
          <Kpi icon={<TrendingUp size={14} />} label="Total Expense" value={expense} color="#ff3d3d" />
          <Kpi icon={<DollarSign size={14} />} label="Net P&L" value={net} color={net >= 0 ? '#00e676' : '#ff3d3d'} />
        </>}
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left px-4 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Account</th>
            <th className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Type</th>
            <th className="text-right px-4 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Balance</th>
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {groups.map(g => (
              <GroupSection key={g.group} group={g} accounts={accounts.filter(a => a.group === g.group)} expanded={expanded} onToggle={toggle} />
            ))}
            {groups.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-[#5a6878]">No accounts.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function GroupSection({ group, accounts, expanded, onToggle }: { group: GroupNode; accounts: AccountNode[]; expanded: Set<string>; onToggle: (g: string) => void; }) {
  const open = expanded.has(group.group);
  const color = TYPE_COLOR[group.type] || '#8899aa';
  return (
    <>
      <tr className="cursor-pointer bg-[#0a0d12]/60 hover:bg-[#141920]" onClick={() => onToggle(group.group)}>
        <td className="py-2.5 pl-4 pr-3">
          <div className="flex items-center gap-1.5">
            {open ? <ChevronDown size={13} className="text-[#5a6878]" /> : <ChevronRight size={13} className="text-[#5a6878]" />}
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="font-bold text-[#e2e8f0]">{group.group}</span>
            <span className="text-[9px] text-[#5a6878]">({group.accounts} accounts)</span>
          </div>
        </td>
        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${color}15`, color }}>{group.type}</span></td>
        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#e2e8f0]">₹{(group.balance || 0).toLocaleString('en-IN')}</td>
      </tr>
      {open && <>
        {accounts.map(a => <AccountNodeRow key={a.accountCode} node={a} depth={0} />)}
        {accounts.length === 0 && <tr><td colSpan={3} className="py-2 pl-10 text-[10px] text-[#5a6878]">No child accounts</td></tr>}
      </>}
    </>
  );
}

function AccountNodeRow({ node, depth }: { node: AccountNode; depth: number }) {
  const hasChildren = node.children.length > 0;
  const color = TYPE_COLOR[node.type] || '#8899aa';
  const bal = accountBalance(node);
  return (
    <>
      <tr className="hover:bg-[#141920]">
        <td className="py-2.5 pr-3" style={{ paddingLeft: 16 + depth * 22 }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? <span className="text-[#5a6878]"><ChevronRight size={12} /></span> : <span className="w-[12px]" />}
            <span className={`font-semibold ${node.leaf ? 'text-[#e2e8f0]' : 'text-[#8899aa]'}`}>{node.name}</span>
            <span className="text-[9px] text-[#5a6878] font-mono">{node.accountCode}</span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-[#5a6878]">{node.type}</td>
        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#e2e8f0]">₹{(bal || 0).toLocaleString('en-IN')}</td>
      </tr>
      {hasChildren && node.children.map(c => <AccountNodeRow key={c.accountCode} node={c} depth={depth + 1} />)}
    </>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>{icon}</div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">{label}</div>
        <div className="text-[17px] font-bold font-mono" style={{ color }}>₹{value.toLocaleString('en-IN')}</div>
      </div>
    </div>
  );
}