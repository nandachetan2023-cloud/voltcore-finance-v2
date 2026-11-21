'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Plus, RefreshCw, IndianRupee, Banknote, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';
import { useTableControls, SearchInput } from './_table-controls';

interface Party { id: number; name: string; partyType: string; isActive: boolean }
interface Invoice {
  id: number;
  invoiceNo: string;
  partyId: number | null;
  grandTotal: number;
  balanceAmount: number;
  receivedAmount: number;
  tdsDeduction: number;
  status: string;
}
interface BankAccount { id: number; accountName: string; bankName: string; status: string }
interface ReceiptAllocation { id: number; invoiceId: number; amount: number; tdsAmount: number; invoice?: { invoiceNo: string } }
interface Receipt {
  id: number;
  receiptNo: string;
  receiptDate: string;
  partyName: string;
  invoiceRef: string | null;
  amount: number;
  mode: string;
  bankRef: string | null;
  jobCode: string | null;
  status: string;
  allocations: ReceiptAllocation[];
}

interface AllocationDraft { selected: boolean; amount: string; tdsAmount: string }
const emptyForm = { partyId: '', receiptDate: new Date().toISOString().slice(0, 10), mode: 'NEFT', bankAccountId: '', bankRef: '' };
const currency = (amount: number) => `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function invoiceOutstanding(invoice: Invoice) {
  if (invoice.status === 'Paid') return 0;
  if (invoice.balanceAmount > 0) return Math.round(invoice.balanceAmount * 100) / 100;
  return Math.max(0, Math.round((invoice.grandTotal - invoice.receivedAmount - invoice.tdsDeduction) * 100) / 100);
}

export default function ReceiptEntry() {
  const [rows, setRows] = useState<Receipt[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [allocationDrafts, setAllocationDrafts] = useState<Record<number, AllocationDraft>>({});
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-actor-email': getCurrentUserEmail() };
      const [receiptResponse, partyResponse, invoiceResponse, bankResponse] = await Promise.all([
        fetch('/api/fin/receipts', { headers }),
        fetch('/api/fin/parties'),
        fetch('/api/fin/invoices'),
        fetch('/api/bank-cash'),
      ]);
      const [receiptJson, partyJson, invoiceJson, bankJson] = await Promise.all([
        receiptResponse.json(), partyResponse.json(), invoiceResponse.json(), bankResponse.json(),
      ]);
      if (!receiptResponse.ok || !receiptJson.success) throw new Error(receiptJson.error || 'Could not load receipts');
      setRows((receiptJson.data || []).map((r: Receipt) => ({ ...r, receiptDate: (r.receiptDate || '').split('T')[0] })));
      setParties(partyJson.success ? (partyJson.data || []).filter((party: Party) => party.isActive && ['Customer', 'Other'].includes(party.partyType)) : []);
      setInvoices(invoiceJson.success ? invoiceJson.data || [] : []);
      setBankAccounts(bankJson.success ? (bankJson.data?.accounts || []).filter((account: BankAccount) => account.status === 'Active') : []);
    } catch (error) {
      setRows([]);
      toast.error(error instanceof Error ? error.message : 'Could not load receipt data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const tc = useTableControls(rows, (r) => `${r.receiptNo} ${r.partyName} ${r.invoiceRef || ''} ${r.bankRef || ''} ${r.jobCode || ''} ${r.status}`);
  const postedTotal = rows.filter((receipt) => receipt.status === 'Posted').reduce((sum, receipt) => sum + receipt.amount, 0);
  const availableInvoices = useMemo(() => invoices.filter((invoice) =>
    String(invoice.partyId) === form.partyId && invoiceOutstanding(invoice) > 0 && !['Draft', 'Rejected'].includes(invoice.status)
  ), [invoices, form.partyId]);
  const selectedAllocations = Object.entries(allocationDrafts)
    .filter(([, allocation]) => allocation.selected)
    .map(([invoiceId, allocation]) => ({
      invoiceId: Number(invoiceId),
      amount: Number(allocation.amount) || 0,
      tdsAmount: Number(allocation.tdsAmount) || 0,
    }));
  const allocatedCash = selectedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const allocatedTds = selectedAllocations.reduce((sum, allocation) => sum + allocation.tdsAmount, 0);

  const setAllocation = (invoiceId: number, patch: Partial<AllocationDraft>) => {
    setAllocationDrafts((current) => ({
      ...current,
      [invoiceId]: { ...current[invoiceId], selected: false, amount: '', tdsAmount: '', ...patch },
    }));
  };

  const save = async () => {
    if (!form.partyId || !selectedAllocations.length || allocatedCash <= 0) {
      toast.error('Select a customer, allocate cash to at least one invoice, and enter a positive cash amount');
      return;
    }
    if (form.mode !== 'Cash' && !form.bankAccountId) {
      toast.error('Select the bank account that received the funds');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/fin/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-actor-email': getCurrentUserEmail() },
        body: JSON.stringify({
          partyId: Number(form.partyId),
          receiptDate: form.receiptDate,
          amount: Math.round(allocatedCash * 100) / 100,
          mode: form.mode,
          bankAccountId: form.mode === 'Cash' ? null : Number(form.bankAccountId),
          bankRef: form.bankRef,
          allocations: selectedAllocations,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to save receipt');
      toast.success('Receipt saved as Draft. Finance approval is required to post it.');
      setFormOpen(false);
      setForm(emptyForm);
      setAllocationDrafts({});
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const post = async (id: number) => {
    if (!confirm('Post this receipt to the bank/cash, customer invoices, and General Ledger?')) return;
    setPostingId(id);
    try {
      const response = await fetch(`/api/fin/receipts/${id}`, {
        method: 'POST',
        headers: { 'x-actor-email': getCurrentUserEmail() },
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to post receipt');
      toast.success('Receipt posted to the General Ledger');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Network error');
    } finally {
      setPostingId(null);
    }
  };

  const del = async (receipt: Receipt) => {
    if (!confirm(`Delete draft receipt ${receipt.receiptNo}?`)) return;
    try {
      const response = await fetch(`/api/fin/receipts?id=${receipt.id}`, {
        method: 'DELETE',
        headers: { 'x-actor-email': getCurrentUserEmail() },
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to delete receipt');
      toast.success('Draft deleted');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Network error');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00e676]/30 border-t-[#00e676] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><ArrowUpCircle size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Receipt Entry</h2>
            <p className="text-[11px] text-[#5a6878]">Allocate customer cash and TDS to invoices; Finance posts drafts to the ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]" title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={() => setFormOpen(!formOpen)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c866]"><Plus size={13} /> New Receipt</button>
        </div>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#00e676]/10 flex items-center justify-center"><IndianRupee size={18} className="text-[#00e676]" /></div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Posted Cash Receipts</div>
          <div className="text-[20px] font-bold text-[#e2e8f0] font-mono">{currency(postedTotal)}</div>
        </div>
      </div>

      {formOpen && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-4 space-y-4">
          <div className="rounded-lg border border-[#252e3a] bg-[#0a0d12] p-3 text-[11px] text-[#aebbc9]">
            Save creates a Draft only. Invoice balances, bank balances, and the General Ledger change only after a Finance user posts it.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">
              Customer
              <select value={form.partyId} onChange={(e) => { setForm({ ...form, partyId: e.target.value }); setAllocationDrafts({}); }} className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] normal-case text-[#e2e8f0] outline-none focus:border-[#f5a623]">
                <option value="">Select customer</option>
                {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </label>
            <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">
              Receipt Date
              <input type="date" value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
            </label>
            <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">
              Mode
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]">
                {['NEFT', 'IMPS', 'RTGS', 'Cheque', 'UPI', 'Cash'].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            {form.mode === 'Cash' ? (
              <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">
                Cash account
                <div className="mt-1 px-3 py-2 text-[12px] normal-case text-[#e2e8f0] bg-[#0a0d12] border border-[#252e3a] rounded-lg">Configured Cash GL account</div>
              </div>
            ) : (
              <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">
                Receiving Bank
                <select value={form.bankAccountId} onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })} className="w-full mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] normal-case text-[#e2e8f0] outline-none focus:border-[#f5a623]">
                  <option value="">Select bank account</option>
                  {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountName} — {account.bankName}</option>)}
                </select>
              </label>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">
              Bank Reference
              <input value={form.bankRef} onChange={(e) => setForm({ ...form, bankRef: e.target.value })} placeholder="UTR / cheque / transaction reference" className="w-full sm:w-1/2 mt-1 px-3 py-2 bg-[#0a0d12] border border-[#252e3a] rounded-lg text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]" />
            </label>
          </div>

          <div className="border border-[#252e3a] rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-[#0a0d12] text-[10px] text-[#8899aa] uppercase tracking-wider font-semibold">Allocate to invoices</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-[#252e3a] text-[#8899aa]">
                  <th className="px-3 py-2 text-left">Select</th><th className="px-3 py-2 text-left">Invoice</th><th className="px-3 py-2 text-right">Outstanding</th><th className="px-3 py-2 text-right">Cash received</th><th className="px-3 py-2 text-right">TDS withheld</th>
                </tr></thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {availableInvoices.map((invoice) => {
                    const allocation = allocationDrafts[invoice.id] || { selected: false, amount: '', tdsAmount: '' };
                    return (
                      <tr key={invoice.id}>
                        <td className="px-3 py-2"><input type="checkbox" checked={allocation.selected} onChange={(e) => setAllocation(invoice.id, { selected: e.target.checked })} /></td>
                        <td className="px-3 py-2 text-[#e2e8f0]">{invoice.invoiceNo}</td>
                        <td className="px-3 py-2 text-right text-[#8899aa]">{currency(invoiceOutstanding(invoice))}</td>
                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={allocation.amount} onChange={(e) => setAllocation(invoice.id, { amount: e.target.value })} onFocus={() => !allocation.selected && setAllocation(invoice.id, { selected: true })} placeholder="0.00" className="w-32 ml-auto block px-2 py-1 bg-[#0a0d12] border border-[#252e3a] rounded text-right text-[#e2e8f0]" /></td>
                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={allocation.tdsAmount} onChange={(e) => setAllocation(invoice.id, { tdsAmount: e.target.value })} onFocus={() => !allocation.selected && setAllocation(invoice.id, { selected: true })} placeholder="0.00" className="w-32 ml-auto block px-2 py-1 bg-[#0a0d12] border border-[#252e3a] rounded text-right text-[#e2e8f0]" /></td>
                      </tr>
                    );
                  })}
                  {form.partyId && availableInvoices.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[#5a6878]">No outstanding issued invoices for this customer.</td></tr>}
                  {!form.partyId && <tr><td colSpan={5} className="px-3 py-6 text-center text-[#5a6878]">Select a customer to see outstanding invoices.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-[#8899aa]">
              Cash to post: <strong className="text-[#00e676]">{currency(allocatedCash)}</strong>
              <span className="mx-2">•</span>
              TDS receivable: <strong className="text-[#e2e8f0]">{currency(allocatedTds)}</strong>
              <span className="mx-2">•</span>
              Total invoice settlement: <strong className="text-[#e2e8f0]">{currency(allocatedCash + allocatedTds)}</strong>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-[#00e676] text-black text-[12px] font-bold rounded-lg hover:bg-[#00c866] disabled:opacity-50"><Banknote size={13} /> {saving ? 'Saving...' : 'Save as Draft'}</button>
              <button onClick={() => { setFormOpen(false); setForm(emptyForm); setAllocationDrafts({}); }} className="px-3 py-2 text-[12px] text-[#8899aa] hover:text-[#e2e8f0]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Receipt No', 'Date', 'Customer', 'Invoices', 'Mode', 'Bank Ref', 'Cash Amount', 'Status', 'Actions'].map((heading) => (
                <th key={heading} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{heading}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-[#1a2028] transition-colors">
                  <td className="px-3 py-3 text-[#e2e8f0] font-semibold">{receipt.receiptNo}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{receipt.receiptDate}</td>
                  <td className="px-3 py-3 text-[#e2e8f0]">{receipt.partyName}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{receipt.allocations?.map((allocation) => allocation.invoice?.invoiceNo).filter(Boolean).join(', ') || receipt.invoiceRef || '—'}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{receipt.mode}</td>
                  <td className="px-3 py-3 text-[#8899aa]">{receipt.bankRef || '—'}</td>
                  <td className="px-3 py-3 text-[#00e676] font-mono font-semibold">{currency(receipt.amount)}</td>
                  <td className="px-3 py-3"><span className={`px-2 py-1 rounded text-[9px] font-semibold ${receipt.status === 'Posted' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-[#f5a623]/10 text-[#f5a623]'}`}>{receipt.status}</span></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {receipt.status === 'Draft' && <button onClick={() => post(receipt.id)} disabled={postingId === receipt.id} title="Finance post" className="text-[#00e676] hover:text-white disabled:opacity-50"><CheckCircle2 size={14} /></button>}
                      {(receipt.status === 'Draft' || receipt.status === 'Rejected') && <button onClick={() => del(receipt)} title="Delete draft" className="text-[#ff3d3d]/70 hover:text-[#ff3d3d]"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-[#5a6878]">No receipts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
