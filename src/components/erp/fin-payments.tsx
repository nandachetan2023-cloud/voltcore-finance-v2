'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Banknote, Wallet, Loader2, Send, CheckCircle2, AlertCircle,
  ArrowUpRight, Landmark, Clock, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';

interface Payable {
  id: number; billNo: string; vendor: string; vendorCode: string | null;
  description: string | null; totalAmount: number; dueDate: string; status: string;
}
interface BankAccount { id: number; accountName: string; bankName: string; accountNo: string; type: string; balance: number; status: string; }
interface Payment {
  id: number; date: string; amount: number; party: string | null; reference: string | null;
  description: string | null; balance: number; bankAccount?: { accountName: string; bankName: string };
}
interface Summary { totalOutstanding: number; totalBankBalance: number; paidThisMonth: number; payableCount: number; }

const METHODS = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash', 'Bank Transfer'];
function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function fmtCr(n: number) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  return '₹' + n.toLocaleString('en-IN');
}

export default function FinPayments() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [recent, setRecent] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalOutstanding: 0, totalBankBalance: 0, paidThisMonth: 0, payableCount: 0 });
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [target, setTarget] = useState<Payable | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // payment form
  const [bankAccountId, setBankAccountId] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('NEFT');
  const [reference, setReference] = useState('');
  const [party, setParty] = useState('');
  const [description, setDescription] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const tc = useTableControls(payables, (r) => `${r.billNo} ${r.vendor} ${r.vendorCode ?? ''} ${r.description ?? ''} ${r.status}`);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fin/payments');
      const j = await res.json();
      if (j.success) {
        setPayables(j.data.payables);
        setAccounts(j.data.bankAccounts);
        setRecent(j.data.recentPayments);
        setSummary(j.data.summary);
      } else toast.error(j.error || 'Failed to load');
    } catch { toast.error('Failed to fetch'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const resetForm = () => {
    setBankAccountId(accounts[0]?.id || 0);
    setMethod('NEFT'); setReference(''); setDescription(''); setPayDate(new Date().toISOString().split('T')[0]);
  };

  const openPayBill = (b: Payable) => {
    setTarget(b);
    setParty(b.vendor);
    setAmount(b.totalAmount);
    setDescription(`Payment for bill ${b.billNo}`);
    setBankAccountId(accounts[0]?.id || 0);
    setMethod('NEFT'); setReference(''); setPayDate(new Date().toISOString().split('T')[0]);
    setPayOpen(true);
  };
  const openNewPayment = () => {
    setTarget(null);
    setParty(''); setAmount(0); setDescription('');
    resetForm();
    setPayOpen(true);
  };

  const selectedAccount = accounts.find(a => a.id === bankAccountId);
  const insufficient = selectedAccount ? amount > selectedAccount.balance : false;

  const handlePay = async () => {
    if (!bankAccountId) { toast.error('Select a bank account'); return; }
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (insufficient) { toast.error('Insufficient balance in selected account'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/fin/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: target?.id, bankAccountId, amount, paymentMethod: method,
          reference: reference || null, party: party || null, description: description || null, date: payDate,
        }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success(`Paid ${fmt(amount)} from ${selectedAccount?.bankName}`);
        setPayOpen(false);
        await fetch_();
      } else toast.error(j.error || 'Payment failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const dueClass = (due: string) => {
    const d = new Date(due).getTime();
    if (d < Date.now()) return 'text-[#ff3d3d]';
    if (d < Date.now() + 7 * 86400000) return 'text-[#ffab40]';
    return 'text-[#8899aa]';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Outstanding</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{fmtCr(summary.totalOutstanding)}</div><div className="text-[10px] text-[#5a6878] mt-0.5">{summary.payableCount} bills</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Bank Balance</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{fmtCr(summary.totalBankBalance)}</div><div className="text-[10px] text-[#5a6878] mt-0.5">{accounts.length} accounts</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Paid This Month</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{fmtCr(summary.paidThisMonth)}</div></div>
        <div className="vc-stat-card relative overflow-hidden flex flex-col justify-center"><button onClick={openNewPayment} className="vc-btn-primary flex items-center justify-center gap-1.5 w-full"><Send size={14} /> Make Payment</button><div className="text-[10px] text-[#5a6878] mt-2 text-center">Pay vendor / ad-hoc</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Outstanding payables */}
        <div className="vc-panel">
          <div className="vc-panel-header"><Wallet size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Bills Awaiting Payment</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{payables.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search bills..." /></div></div>
          <div className="overflow-x-auto"><div className="max-h-[460px] overflow-y-auto"><table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Bill No', 'Vendor', 'Amount', 'Due Date', 'Status', ''].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(b => (
                <tr key={b.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono">{b.billNo}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[160px] truncate">{b.vendor}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">{fmt(b.totalAmount)}</td>
                  <td className={`py-2.5 px-3 font-mono ${dueClass(b.dueDate)}`}>{b.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${b.status === 'Overdue' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : b.status === 'Partially Paid' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{b.status}</span></td>
                  <td className="py-2.5 px-3"><button onClick={() => openPayBill(b)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00e676]/10 border border-[#00e676]/30 text-[#00e676] text-[10px] font-semibold hover:bg-[#00e676]/20"><Send size={11} /> Pay</button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">No outstanding bills 🎉</td></tr>}
            </tbody>
          </table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div>
        </div>

        {/* Right: bank accounts + recent payments */}
        <div className="space-y-4">
          <div className="vc-panel">
            <div className="vc-panel-header"><Landmark size={15} className="text-[#00d4ff]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Bank Accounts</span></div>
            <div className="p-3 space-y-2">
              {accounts.length === 0 && <div className="text-center text-[#5a6878] text-xs py-3">No active accounts</div>}
              {accounts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a0d12] border border-[#252e3a]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-[#00d4ff]/10 flex items-center justify-center shrink-0"><Landmark size={12} className="text-[#00d4ff]" /></div>
                    <div className="min-w-0"><div className="text-[11px] text-[#e2e8f0] truncate">{a.bankName}</div><div className="text-[9px] text-[#5a6878]">{a.type} • {a.accountNo}</div></div>
                  </div>
                  <span className="text-[12px] font-semibold text-[#00e676] font-mono shrink-0">{fmtCr(a.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vc-panel">
            <div className="vc-panel-header"><Clock size={15} className="text-[#a78bfa]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Recent Payments</span></div>
            <div className="p-3 max-h-[300px] overflow-y-auto space-y-2">
              {recent.length === 0 && <div className="text-center text-[#5a6878] text-xs py-3">No payments yet</div>}
              {recent.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0a0d12]">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#e2e8f0] truncate">{p.party || 'Payment'}</div>
                    <div className="text-[9px] text-[#5a6878]">{p.date?.split('T')[0]} • {p.bankAccount?.bankName || ''} {p.reference ? `• ${p.reference}` : ''}</div>
                  </div>
                  <span className="text-[12px] font-semibold text-[#ff3d3d] font-mono shrink-0">-{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623] flex items-center gap-2"><Send size={16} />{target ? `Pay Bill ${target.billNo}` : 'Make Payment'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {target && (
              <div className="p-3 rounded-lg bg-[#0a0d12] border border-[#252e3a] flex items-center justify-between">
                <div><div className="text-[11px] text-[#e2e8f0]">{target.vendor}</div><div className="text-[9px] text-[#5a6878]">Bill total: {fmt(target.totalAmount)}</div></div>
                <span className={`vc-badge ${target.status === 'Overdue' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{target.status}</span>
              </div>
            )}
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Pay From Account *</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(Number(e.target.value))} className="vc-input appearance-none">
                <option value={0}>Select account...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({a.type}) — {fmtCr(a.balance)}</option>)}
              </select>
              {selectedAccount && <div className="text-[10px] text-[#5a6878] mt-1">Available: <span className="text-[#00e676] font-mono">{fmt(selectedAccount.balance)}</span></div>}
            </div>
            {!target && <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Payee</label><input value={party} onChange={e => setParty(e.target.value)} className="vc-input" placeholder="Vendor / party name" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className={`vc-input ${insufficient ? '!border-[#ff3d3d]' : ''}`} /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date</label><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Method</label><select value={method} onChange={e => setMethod(e.target.value)} className="vc-input appearance-none">{METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reference / UTR</label><input value={reference} onChange={e => setReference(e.target.value)} className="vc-input" placeholder="UTR / cheque no" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Note</label><input value={description} onChange={e => setDescription(e.target.value)} className="vc-input" /></div>
            {insufficient && <div className="flex items-center gap-2 text-[11px] text-[#ff3d3d]"><AlertCircle size={13} /> Amount exceeds available balance.</div>}
          </div>
          <DialogFooter>
            <button onClick={() => setPayOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handlePay} disabled={submitting || insufficient} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}Confirm Payment</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
