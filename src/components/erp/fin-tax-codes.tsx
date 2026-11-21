'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

interface TaxCode {
  id: number;
  code: string;
  description: string;
  hsnSac: string | null;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  inputAccountCode: string | null;
  outputAccountCode: string | null;
  status: string;
}

interface Account { accountCode: string; name: string; type: string; isActive: boolean; }
type TaxCodeForm = Omit<TaxCode, 'id' | 'status'>;

const EMPTY_FORM: TaxCodeForm = {
  code: '', description: '', hsnSac: '', cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0,
  inputAccountCode: '', outputAccountCode: '',
};
const inputClass = 'w-full rounded-lg border border-[#252e3a] bg-[#0a0d12] px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]';

export default function FinTaxCodes() {
  const [codes, setCodes] = useState<TaxCode[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<TaxCodeForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [taxResponse, accountResponse] = await Promise.all([fetch('/api/fin/tax-codes'), fetch('/api/coa')]);
      const [taxJson, accountJson] = await Promise.all([taxResponse.json(), accountResponse.json()]);
      if (!taxResponse.ok || !taxJson.success || !Array.isArray(taxJson.data)) {
        throw new Error(taxJson.error || 'Failed to load tax codes');
      }
      if (!accountResponse.ok || !accountJson.success || !Array.isArray(accountJson.data)) {
        throw new Error(accountJson.error || 'Failed to load chart of accounts');
      }
      setCodes(taxJson.data);
      setAccounts(accountJson.data.filter((account: Account) => account.isActive));
    } catch (error) {
      setCodes([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load GST configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    if (!form.code.trim() || !form.description.trim()) {
      toast.error('Code and description are required');
      return;
    }
    if (form.cgstRate > 0 !== form.sgstRate > 0) {
      toast.error('Enter both CGST and SGST rates, or leave both at zero');
      return;
    }
    if ((form.cgstRate > 0 || form.sgstRate > 0) && form.igstRate > 0) {
      toast.error('A tax code cannot combine intra-state and inter-state GST');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/fin/tax-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-actor-email': getCurrentUserEmail() },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to save tax code');
      setForm(EMPTY_FORM);
      toast.success('Tax code saved as draft; a different Finance approver must approve it');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tax code');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: number) => {
    try {
      const response = await fetch('/api/fin/tax-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-actor-email': getCurrentUserEmail() },
        body: JSON.stringify({ id, action: 'approve' }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to approve tax code');
      toast.success('Tax code approved');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve tax code');
    }
  };

  const inputAccounts = accounts.filter(account => account.type === 'Asset');
  const outputAccounts = accounts.filter(account => account.type === 'Liability');

  if (loading) return <div className="flex items-center justify-center h-56"><Loader2 className="animate-spin text-[#f5a623]" size={22} /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#ffab40]/30 bg-[#ffab40]/5 p-3 text-[11px] text-[#ffcf85]">
        Tax rates are not prefilled. Configure only CA/Finance-approved codes and ledger accounts. Draft codes cannot be used on invoices or included in GST reporting.
      </div>

      <div className="vc-panel p-4 space-y-3">
        <div className="text-[12px] font-semibold text-[#e2e8f0]">Create GST tax code</div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-[10px] text-[#8899aa]">Code<input className={inputClass} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} placeholder="e.g. GST-LOCAL" /></label>
          <label className="text-[10px] text-[#8899aa]">Description<input className={inputClass} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
          <label className="text-[10px] text-[#8899aa]">HSN / SAC<input className={inputClass} value={form.hsnSac || ''} onChange={event => setForm({ ...form, hsnSac: event.target.value })} /></label>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {([
            ['cgstRate', 'CGST %'], ['sgstRate', 'SGST %'], ['igstRate', 'IGST %'], ['cessRate', 'Cess %'],
          ] as const).map(([field, label]) => (
            <label key={field} className="text-[10px] text-[#8899aa]">{label}
              <input className={inputClass} type="number" min="0" max="100" step="0.01" value={form[field]} onChange={event => setForm({ ...form, [field]: Number(event.target.value) || 0 })} />
            </label>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-[10px] text-[#8899aa]">Input GST asset account
            <select className={inputClass} value={form.inputAccountCode || ''} onChange={event => setForm({ ...form, inputAccountCode: event.target.value })}>
              <option value="">Select an active asset account</option>
              {inputAccounts.map(account => <option key={account.accountCode} value={account.accountCode}>{account.accountCode} — {account.name}</option>)}
            </select>
          </label>
          <label className="text-[10px] text-[#8899aa]">Output GST liability account
            <select className={inputClass} value={form.outputAccountCode || ''} onChange={event => setForm({ ...form, outputAccountCode: event.target.value })}>
              <option value="">Select an active liability account</option>
              {outputAccounts.map(account => <option key={account.accountCode} value={account.accountCode}>{account.accountCode} — {account.name}</option>)}
            </select>
          </label>
        </div>
        <button onClick={save} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Save draft tax code
        </button>
      </div>

      <div className="vc-panel overflow-hidden">
        <div className="vc-panel-header"><span className="text-[12px] font-semibold text-[#e2e8f0]">Tax code register</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-[#0f1318] text-left text-[9px] uppercase text-[#5a6878]">
              {['Code', 'Description / HSN-SAC', 'CGST', 'SGST', 'IGST', 'Cess', 'Status', ''].map(label => <th key={label} className="px-3 py-2">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {codes.map(code => (
                <tr key={code.id}>
                  <td className="px-3 py-2 font-mono text-[#f5a623]">{code.code}</td>
                  <td className="px-3 py-2 text-[#e2e8f0]">{code.description}{code.hsnSac ? <span className="block text-[#5a6878]">HSN/SAC {code.hsnSac}</span> : null}</td>
                  {[code.cgstRate, code.sgstRate, code.igstRate, code.cessRate].map((rate, index) => <td key={index} className="px-3 py-2 text-[#8899aa]">{rate}%</td>)}
                  <td className="px-3 py-2 text-[#8899aa]">{code.status}</td>
                  <td className="px-3 py-2">{code.status === 'Draft' && (
                    <button onClick={() => approve(code.id)} className="flex items-center gap-1 rounded bg-[#00e676]/10 px-2 py-1 text-[#00e676]">
                      <CheckCircle2 size={12} /> Approve
                    </button>
                  )}</td>
                </tr>
              ))}
              {codes.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-[#5a6878]">No tax codes configured. GST posting and ITC reporting remain blocked.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
