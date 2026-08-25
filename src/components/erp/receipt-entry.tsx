'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, Plus, RefreshCw, IndianRupee, Banknote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput } from './_table-controls';

interface Receipt {
  id: number;
  receiptNo: string;
  receiptDate: string;
  partyName: string;
  invoiceRef: string;
  amount: number;
  mode: string;
  bankRef: string;
  jobCode: string | null;
  siteCode: string | null;
}

const emptyForm = { partyName: '', invoiceRef: '', amount: '', mode: 'NEFT', bankRef: '', jobCode: '', siteCode: '' };

export default function ReceiptEntry() {
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/receipts').then(r => r.json());
      if (j.success && Array.isArray(j.data)) {
        setRows(j.data.map((r: any) => ({ ...r, receiptDate: (r.receiptDate || '').split('T')[0] })));
      } else { setRows([]); }
    } catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.receiptNo} ${r.partyName} ${r.invoiceRef} ${r.bankRef} ${r.jobCode}`);

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const del = async (id: number) => {
    if (!confirm('Delete this receipt?')) return;
    try {
      const j = await fetch(`/api/fin/receipts?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (j.success) { toast.success('Deleted'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const save = async () => {
    if (!form.partyName || !form.amount) { toast.error('Party and amount are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), receiptDate: new Date().toISOString().split('T')[0] };
      const j = await fetch('/api/fin/receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      }).then(r => r.json());
      if (j.success) { toast.success('Receipt recorded'); setFormOpen(false); setForm(emptyForm); await fetchData(); }
      else { toast.error(j.error || 'Failed to save'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00e676]/30 border-t-[#00e676] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><ArrowUpCircle size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Receipt Entry</h2>
            <p className="text-[11px] text-[#5a6878]">Record money received against customer invoices</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c866]"><Plus size={13} /> New Receipt</button>
        </div>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#00e676]/10 flex items-center justify-center"><IndianRupee size={18} className="text-[#00e676]" /></div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total Receipts</div>
          <div className="text-[20px] font-bold text-[#e2e8f0] font-mono">₹{total.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {formOpen && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ['partyName', 'Party / Customer'], ['invoiceRef', 'Invoice Ref'], ['amount', 'Amount (₹)'],
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
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Mode</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]">
                {['NEFT', 'IMPS', 'RTGS', 'Cheque', 'UPI', 'Cash'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Bank / Ref</label>
              <input value={form.bankRef} onChange={(e) => setForm({ ...form, bankRef: e.target.value })} placeholder="Bank ref" className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Job Code</label>
              <input value={form.jobCode} onChange={(e) => setForm({ ...form, jobCode: e.target.value })} placeholder="Optional" className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c866] disabled:opacity-50"><Banknote size={13} /> {saving ? 'Saving...' : 'Save Receipt'}</button>
            <button onClick={() => setFormOpen(false)} className="px-3 py-2 text-[12px] text-[#8899aa] hover:text-[#e2e8f0]">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Receipt No', 'Date', 'Party', 'Invoice', 'Mode', 'Bank Ref', 'Amount', 'Job', ''].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map((r) => (
                <tr key={r.id} className="hover:bg-[#1a2028] transition-colors">
                  <td className="px-3 py-3 text-[#e2e8f0] font-semibold">{r.receiptNo}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.receiptDate}</td>
                  <td className="px-3 py-3 text-[#e2e8f0]">{r.partyName}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.invoiceRef}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.mode}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.bankRef}</td>
                  <td className="px-3 py-3 text-[#00e676] font-mono font-semibold">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{r.jobCode || '—'}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => del(r.id)} className="text-[#ff3d3d]/70 hover:text-[#ff3d3d]"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-[#5a6878]">No receipts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
