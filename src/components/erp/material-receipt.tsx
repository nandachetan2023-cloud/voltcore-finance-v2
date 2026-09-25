'use client';

import { useState, useEffect } from 'react';
import { PackageCheck, Plus, RefreshCw, IndianRupee, Trash2, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput } from './_table-controls';

interface GRNLine {
  id: number;
  grnNo: string;
  grnDate: string;
  poRef: string;
  itemName: string;
  unit: string;
  qtyReceived: number;
  qtyPO: number;
  rate: number;
  value: number;
  jobCode: string | null;
  siteCode: string | null;
}

const emptyForm = { poRef: '', itemName: '', unit: 'MT', qtyReceived: '', rate: '', jobCode: '', siteCode: '' };

export default function MaterialReceipt() {
  const [rows, setRows] = useState<GRNLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/material-receipts').then(r => r.json());
      if (j.success && Array.isArray(j.data)) {
        setRows(j.data.map((r: any) => ({ ...r, grnDate: (r.grnDate || '').split('T')[0] })));
      } else { setRows([]); }
    } catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.grnNo} ${r.poRef} ${r.itemName} ${r.jobCode}`);

  const totalQty = rows.reduce((s, r) => s + (r.qtyReceived || 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.value || 0), 0);

  const del = async (id: number) => {
    if (!confirm('Delete this receipt line?')) return;
    try {
      const j = await fetch(`/api/fin/material-receipts?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const save = async () => {
    if (!form.poRef || !form.itemName || !form.qtyReceived) { toast.error('PO ref, item and qty are required'); return; }
    setSaving(true);
    const qty = Number(form.qtyReceived); const rate = Number(form.rate || 0);
    try {
      const j = await fetch('/api/fin/material-receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qtyReceived: qty, rate, value: qty * rate, grnDate: new Date().toISOString().split('T')[0] }),
      }).then(r => r.json());
      if (j.success) { toast.success('Material receipt posted'); await fetchData(); }
      else { toast.error(j.error || 'Failed to save'); }
    } catch { toast.error('Network error'); }
    finally { setFormOpen(false); setForm(emptyForm); setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><PackageCheck size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Material Receipt</h2>
            <p className="text-[11px] text-[#5a6878]">Goods receipt against purchase orders into stock</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e6]"><Plus size={13} /> New Receipt</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center"><Boxes size={18} className="text-[#00d4ff]" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Qty Received</div>
            <div className="text-[20px] font-bold text-[#e2e8f0] font-mono">{totalQty.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center"><IndianRupee size={18} className="text-[#f5a623]" /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Receipt Value</div>
            <div className="text-[20px] font-bold text-[#f5a623] font-mono">₹{totalValue.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ['poRef', 'PO Reference'], ['itemName', 'Item'], ['qtyReceived', 'Qty Received'],
            ] as [keyof typeof emptyForm, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">{label}</label>
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={label}
                  className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]">
                {['MT', 'Mtr', 'Kg', 'Nos', 'Ltr', 'SqFt'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Rate (₹)</label>
              <input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="Rate" className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Job Code</label>
              <input value={form.jobCode} onChange={(e) => setForm({ ...form, jobCode: e.target.value })} placeholder="Optional" className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8e6] disabled:opacity-50"><PackageCheck size={13} /> {saving ? 'Posting...' : 'Post Receipt'}</button>
            <button onClick={() => setFormOpen(false)} className="px-3 py-2 text-[12px] text-[#8899aa] hover:text-[#e2e8f0]">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['GRN No', 'Date', 'PO Ref', 'Item', 'Qty / PO', 'Rate', 'Value', 'Job', ''].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map((r) => (
                <tr key={r.id} className="hover:bg-[#1a2028] transition-colors">
                  <td className="px-3 py-3 text-[#e2e8f0] font-semibold">{r.grnNo}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.grnDate}</td>
                  <td className="px-3 py-3 text-[#00d4ff]">{r.poRef}</td>
                  <td className="px-3 py-3 text-[#e2e8f0]">{r.itemName}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.qtyReceived} / {r.qtyPO} {r.unit}</td>
                  <td className="px-3 py-3 text-[#8899aa]">₹{r.rate.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-[#f5a623] font-mono font-semibold">₹{r.value.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.jobCode || '—'}</td>
                  <td className="px-3 py-3"><button onClick={() => del(r.id)} className="text-[#ff3d3d]/70 hover:text-[#ff3d3d]"><Trash2 size={13} /></button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-[#5a6878]">No material receipts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
