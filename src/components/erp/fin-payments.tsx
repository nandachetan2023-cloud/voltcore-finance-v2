'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Banknote, Wallet, Loader2, Send, CheckCircle2, AlertCircle,
  ArrowUpRight, Landmark, Clock, Plus, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, DatalistField, CostingFields, useFormValidation, required } from './_form-controls';
import { SortableTh } from './_table-controls';

interface Payable {
  id: number; billNo: string; vendor: string; vendorCode: string | null;
  description: string | null; totalAmount: number; dueDate: string; status: string;
  siteId?: number | null; jobCode?: string | null; poId?: number | null; costCenter?: string | null; department?: string | null; projectManager?: string | null;
  site?: { name: string; siteCode: string } | null;
}
interface BankAccount { id: number; accountName: string; bankName: string; accountNo: string; type: string; balance: number; status: string; }
interface Payment {
  id: number; date: string; amount: number; party: string | null; reference: string | null;
  description: string | null; balance: number; bankAccount?: { accountName: string; bankName: string };
  siteCode: string | null; jobCode: string | null; poNo: string | null; costCenter: string | null; department: string | null; projectManager: string | null;
}
interface Summary { totalOutstanding: number; totalBankBalance: number; paidThisMonth: number; payableCount: number; }
interface SiteRef { id: number; name: string; siteCode: string; }
interface PaymentForm {
  siteId: string; jobCode: string; poNo: string; costCenter: string; department: string; projectManager: string;
}

const PAYMENT_COLUMNS: ExportColumn<Payment>[] = [
  { header: 'Payment Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Party', accessor: 'party' },
  { header: 'Site Code', accessor: (r) => r.siteCode ?? '' },
  { header: 'Job Code', accessor: (r) => r.jobCode ?? '' },
  { header: 'PO No', accessor: (r) => r.poNo ?? '' },
  { header: 'Cost Center', accessor: (r) => r.costCenter ?? '' },
  { header: 'Department', accessor: (r) => r.department ?? '' },
  { header: 'Project Manager', accessor: (r) => r.projectManager ?? '' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Reference', accessor: 'reference' },
  { header: 'Description', accessor: 'description' },
  { header: 'Balance', accessor: 'balance' },
];

const METHODS = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash', 'Bank Transfer'];

const PAYMENT_IMPORT_FIELDS: ImportField[] = [
  { key: 'date', label: 'Payment Date', type: 'date', required: true },
  { key: 'bankAccountId', label: 'Bank Account ID', type: 'number', required: true },
  { key: 'party', label: 'Party' },
  { key: 'siteCode', label: 'Site Code', required: true },
  { key: 'jobCode', label: 'Job Code', required: true },
  { key: 'poNo', label: 'PO Number', required: true },
  { key: 'costCenter', label: 'Cost Center', required: true },
  { key: 'department', label: 'Department', required: true },
  { key: 'projectManager', label: 'Project Manager', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'reference', label: 'Reference' },
  { key: 'description', label: 'Description' },
  { key: 'balance', label: 'Balance', type: 'number' },
];
const PAYMENT_SAMPLE_ROW = { date: '2026-01-20', bankAccountId: 1, party: 'Siemens India Ltd', siteCode: 'SIT-001', jobCode: 'JOB-2026-001', poNo: 'PO-1001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', amount: 150000, reference: 'UTR123456', description: 'Invoice payment', balance: 5000000 };
const EMPTY_PAYMENT_FORM: PaymentForm = { siteId: '', jobCode: '', poNo: '', costCenter: '', department: '', projectManager: '' };
function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function fmtCr(n: number) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  return '₹' + (n ?? 0).toLocaleString('en-IN');
}

function generateMockPaymentData() {
  const payables: Payable[] = [
    { id: 1, billNo: 'BHEL/INV/001', vendor: 'Bharat Heavy Electricals Ltd', vendorCode: 'BHEL', description: 'Turbine spare parts supply', totalAmount: 1850000, dueDate: '2025-06-15T00:00:00', status: 'Overdue' },
    { id: 2, billNo: 'TPL/INV/101', vendor: 'Tata Projects Ltd', vendorCode: 'TPL', description: 'Civil construction — Phase 2', totalAmount: 2400000, dueDate: '2025-07-20T00:00:00', status: 'Pending' },
    { id: 3, billNo: 'LT/INV/201', vendor: 'Larsen & Toubro Ltd', vendorCode: 'L&T', description: 'Structural steel erection', totalAmount: 3200000, dueDate: '2025-08-01T00:00:00', status: 'Pending' },
    { id: 4, billNo: 'ADL/INV/031', vendor: 'Adani Defence Systems', vendorCode: 'ADS', description: 'Security system installation', totalAmount: 950000, dueDate: '2025-06-30T00:00:00', status: 'Partially Paid' },
    { id: 5, billNo: 'RI/INV/055', vendor: 'Reliance Infrastructure', vendorCode: 'RI', description: 'Electrical substation works', totalAmount: 1600000, dueDate: '2025-07-10T00:00:00', status: 'Pending' },
  ];
  const bankAccounts: BankAccount[] = [
    { id: 1, accountName: 'Operating Account', bankName: 'State Bank of India', accountNo: '38201234567', type: 'Current', balance: 12500000, status: 'Active' },
    { id: 2, accountName: 'Project Account — NTPC', bankName: 'HDFC Bank', accountNo: '50109876543', type: 'Current', balance: 8750000, status: 'Active' },
    { id: 3, accountName: 'Fixed Deposit', bankName: 'Punjab National Bank', accountNo: 'FD-2024-78901', type: 'FD', balance: 5000000, status: 'Active' },
  ];
  const recentPayments: Payment[] = [
    { id: 1, date: '2025-05-28T00:00:00', amount: 1200000, party: 'Tata Projects Ltd', reference: 'UTR/NEFT/250528/001', description: 'Payment for May billing', balance: 11300000, bankAccount: { accountName: 'Operating Account', bankName: 'State Bank of India' }, siteCode: 'SIT-001', jobCode: 'JOB-2026-001', poNo: 'PO-1001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma' },
    { id: 2, date: '2025-05-15T00:00:00', amount: 800000, party: 'Bharat Heavy Electricals Ltd', reference: 'UTR/RTGS/250515/002', description: 'Partial payment — BHEL invoice', balance: 12500000, bankAccount: { accountName: 'Project Account — NTPC', bankName: 'HDFC Bank' }, siteCode: 'SIT-001', jobCode: 'JOB-2026-002', poNo: 'PO-1002', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'A. Verma' },
    { id: 3, date: '2025-04-30T00:00:00', amount: 2500000, party: 'Larsen & Toubro Ltd', reference: 'CHQ/009876', description: 'April progress payment', balance: 13300000, bankAccount: { accountName: 'Operating Account', bankName: 'State Bank of India' }, siteCode: 'SIT-002', jobCode: 'JOB-2026-003', poNo: 'PO-1003', costCenter: 'CC-SIT-002', department: 'Projects', projectManager: 'S. Rao' },
  ];
  return {
    payables,
    bankAccounts,
    recentPayments,
    summary: {
      totalOutstanding: payables.reduce((s, p) => s + p.totalAmount, 0),
      totalBankBalance: bankAccounts.reduce((s, a) => s + a.balance, 0),
      paidThisMonth: recentPayments.reduce((s, p) => s + p.amount, 0),
      payableCount: payables.length,
    },
  };
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
  const [importOpen, setImportOpen] = useState(false);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [form, setForm] = useState<PaymentForm>(EMPTY_PAYMENT_FORM);

  // payment form
  const [bankAccountId, setBankAccountId] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('NEFT');
  const [reference, setReference] = useState('');
  const [party, setParty] = useState('');
  const [description, setDescription] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<PaymentForm>({
    siteId: required('Site Code'),
    jobCode: required('Job Code'),
    poNo: required('PO Number'),
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const tc = useTableControls(payables, (r) => `${r.billNo} ${r.vendor} ${r.vendorCode ?? ''} ${r.description ?? ''} ${r.status}`);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/fin/payments');
      const j = await res.json();
      if (j.success && j.data?.payables?.length) {
        setPayables(j.data.payables);
        setAccounts(j.data.bankAccounts);
        setRecent(j.data.recentPayments);
        setSummary(j.data.summary);
      } else {
        const mock = generateMockPaymentData();
        setPayables(mock.payables);
        setAccounts(mock.bankAccounts);
        setRecent(mock.recentPayments);
        setSummary(mock.summary);
        toast.info('Sample data — no server records found');
      }
    } catch {
      const mock = generateMockPaymentData();
      setPayables(mock.payables);
      setAccounts(mock.bankAccounts);
      setRecent(mock.recentPayments);
      setSummary(mock.summary);
      toast.info('Sample data — API unavailable');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const onDataChanged = () => fetch_();
    window.addEventListener('finance:data-changed', onDataChanged);
    return () => window.removeEventListener('finance:data-changed', onDataChanged);
  }, [fetch_]);
  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
  }, []);

  const resetForm = () => {
    setBankAccountId(accounts[0]?.id || 0);
    setMethod('NEFT'); setReference(''); setDescription(''); setPayDate(new Date().toISOString().split('T')[0]);
    setForm(EMPTY_PAYMENT_FORM); setFormErrors({});
  };

  const openPayBill = (b: Payable) => {
    setTarget(b);
    setParty(b.vendor);
    setAmount(b.totalAmount);
    setDescription(`Payment for bill ${b.billNo}`);
    setBankAccountId(accounts[0]?.id || 0);
    setMethod('NEFT'); setReference(''); setPayDate(new Date().toISOString().split('T')[0]);
    setForm({ siteId: b.siteId ? String(b.siteId) : '', jobCode: b.jobCode || '', poNo: '', costCenter: b.costCenter || '', department: b.department || '', projectManager: b.projectManager || '' });
    setFormErrors({});
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
    if (!validateForm(form)) { toast.error('Please fix the highlighted fields'); return; }
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
          siteId: form.siteId ? Number(form.siteId) : null,
          jobCode: form.jobCode || null,
          poNo: form.poNo || null,
          costCenter: form.costCenter || null,
          department: form.department || null,
          projectManager: form.projectManager || null,
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

  if (importOpen) {
    return (
      <ImportWizard
        title="Payments"
        fields={PAYMENT_IMPORT_FIELDS}
        keyField="date"
        existingKeys={new Set()}
        commitEndpoint="/api/fin/payments/import"
        sampleRow={PAYMENT_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
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
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              <SortableTh label="Bill No" sortKey="billNo" accessor={(r: Payable) => r.billNo} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Vendor" sortKey="vendor" accessor={(r: Payable) => r.vendor} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Amount" sortKey="totalAmount" accessor={(r: Payable) => r.totalAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
              <SortableTh label="Due Date" sortKey="dueDate" accessor={(r: Payable) => r.dueDate} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Job Code" sortKey="jobCode" accessor={(r: Payable) => r.jobCode} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Status" sortKey="status" accessor={(r: Payable) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
              <th className="py-2 px-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(b => (
                <tr key={b.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono">{b.billNo}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[160px] truncate">{b.vendor}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">{fmt(b.totalAmount)}</td>
                  <td className={`py-2.5 px-3 font-mono ${dueClass(b.dueDate)}`}>{b.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{b.jobCode || '—'}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${b.status === 'Overdue' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : b.status === 'Partially Paid' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{b.status}</span></td>
                  <td className="py-2.5 px-3"><button onClick={() => openPayBill(b)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00e676]/10 border border-[#00e676]/30 text-[#00e676] text-[10px] font-semibold hover:bg-[#00e676]/20"><Send size={11} /> Pay</button></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[#5a6878]">No outstanding bills 🎉</td></tr>}
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
            <div className="vc-panel-header"><Clock size={15} className="text-[#a78bfa]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Recent Payments</span><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
<ExportButton records={recent} columns={PAYMENT_COLUMNS} filename="fin-payments" /></div>
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
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="text-[#f5a623] flex items-center gap-2"><Send size={16} />{target ? `Pay Bill ${target.billNo}` : 'Make Payment'}</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1 -mr-1 min-h-0">
            {target && (
              <div className="p-3 rounded-lg bg-[#0a0d12] border border-[#252e3a]">
                <div className="flex items-center justify-between">
                  <div><div className="text-[11px] text-[#e2e8f0]">{target.vendor}</div><div className="text-[9px] text-[#5a6878]">Bill total: {fmt(target.totalAmount)}</div></div>
                  <span className={`vc-badge ${target.status === 'Overdue' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{target.status}</span>
                </div>
                {(target.site || target.jobCode) && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#252e3a]">
                    {target.site && <span className="text-[9px] font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 rounded">{target.site.siteCode}</span>}
                    {target.jobCode && <span className="text-[9px] font-mono text-[#a78bfa] bg-[#a78bfa]/10 px-2 py-0.5 rounded">{target.jobCode}</span>}
                  </div>
                )}
              </div>
            )}
            <div className={`grid gap-3 ${target ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Pay From Account *</label>
                <select value={bankAccountId} onChange={e => setBankAccountId(Number(e.target.value))} className="vc-input appearance-none">
                  <option value={0}>Select account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} ({a.type}) — {fmtCr(a.balance)}</option>)}
                </select>
                {selectedAccount && <div className="text-[10px] text-[#5a6878] mt-1">Available: <span className="text-[#00e676] font-mono">{fmt(selectedAccount.balance)}</span></div>}
              </div>
              {!target && <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Payee</label><input value={party} onChange={e => setParty(e.target.value)} className="vc-input" placeholder="Vendor / party name" /></div>}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={amount ?? ''} onChange={e => setAmount(Number(e.target.value))} className={`vc-input ${insufficient ? '!border-[#ff3d3d]' : ''}`} /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Date</label><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Method</label><select value={method} onChange={e => setMethod(e.target.value)} className="vc-input appearance-none">{METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reference / UTR</label><input value={reference} onChange={e => setReference(e.target.value)} className="vc-input" placeholder="UTR / cheque no" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Note</label><input value={description} onChange={e => setDescription(e.target.value)} className="vc-input" /></div>
            <div className="p-3 rounded-lg bg-[#0a0d12] border border-[#252e3a] space-y-3">
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#f5a623] font-bold">Costing Details</div>
              <FormField label="Site Code" required error={formErrors.siteId}>
                <SearchableSelect
                  value={form.siteId}
                  onChange={v => setField('siteId', v)}
                  options={sites.map(s => ({ value: String(s.id), label: s.name, sublabel: s.siteCode }))}
                  placeholder="— Select site —"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Job Code" required error={formErrors.jobCode}>
                  <DatalistField id="pmt-job-code" value={form.jobCode} onChange={v => setField('jobCode', v)} options={[...new Set(recent.map(r => r.jobCode).filter(Boolean) as string[])]} placeholder="JOB-2026-001" />
                </FormField>
                <FormField label="PO Number" required error={formErrors.poNo}>
                  <DatalistField id="pmt-po-no" value={form.poNo} onChange={v => setField('poNo', v)} options={[...new Set(recent.map(r => r.poNo).filter(Boolean) as string[])]} placeholder="PO-1001" />
                </FormField>
              </div>
              <CostingFields prefix="pmt" form={{ costCenter: form.costCenter, department: form.department, projectManager: form.projectManager }} setField={(k, v) => setField(k, v)} errors={formErrors} />
            </div>
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
