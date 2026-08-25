'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Wallet, Plus, Pencil, Trash2, Loader2, Upload, FileText, Receipt, CalendarDays, MapPin, Users, ListChecks, Send, CheckCircle2, XCircle, History } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { getCurrentUserEmail } from '@/lib/current-user';

interface PartyRef { id: number; name: string; code: string; }
interface SiteRef { id: number; name: string; code: string; siteCode?: string; responsiblePerson?: string | null; }
interface PoRef { id: number; poNo: string; totalAmount: number; }
interface ExpenseRef { id: number; claimNo: string; totalAmount: number; }
interface PettyCash {
  id: number; voucherNo: string; date: string; description: string; amount: number;
  type: string; category: string | null; partyId: number | null; siteId: number | null;
  poId: number | null; expenseClaimId: number | null; linkedType: string; jobCode: string | null;
  costCenter: string | null; department: string | null; projectManager: string | null;
  authorizedBy: string | null; paymentMode: string | null; balance: number;
  referenceNo: string | null; remarks: string | null; billAttachmentPath: string | null;
  approvalStatus: string; submittedBy: string | null; submittedAt: string | null;
  approvedBy: string | null; approvedAt: string | null; rejectionReason: string | null;
  party: PartyRef | null; site: SiteRef | null; po: PoRef | null; expenseClaim: ExpenseRef | null;
}
interface ApprovalLog { id: number; status: string; action: string; makerId: string | null; checkerId: string | null; comments: string | null; createdAt: string; }
interface FormData {
  voucherNo: string; date: string; description: string; amount: number; type: string;
  category: string; partyId: string; siteId: string; poId: string; expenseClaimId: string; jobCode: string;
  costCenter: string; department: string; projectManager: string;
  linkedType: string; authorizedBy: string; paymentMode: string; referenceNo: string; remarks: string;
  billAttachmentPath: string;
}
interface PoOption { id: number; poNo: string; vendorName: string; totalAmount: number; }
interface ExpenseOption { id: number; claimNo: string; expenseType: string; totalAmount: number; siteName: string; }
interface JobOption { id: number; jobCode: string; description: string | null; siteId: number | null; siteName: string; }

const EXPENSE_HEADS = ['Travel', 'Maintenance', 'Site Material', 'Food & Refreshment', 'Office Supplies', 'Fuel', 'Miscellaneous', 'Replenishment'];

const EMPTY: FormData = {
  voucherNo: '', date: new Date().toISOString().split('T')[0], description: '', amount: 0, type: 'Debit',
  category: '', partyId: '', siteId: '', poId: '', expenseClaimId: '', jobCode: '',
  costCenter: '', department: '', projectManager: '', linkedType: 'Direct',
  authorizedBy: '', paymentMode: 'Cash', referenceNo: '', remarks: '', billAttachmentPath: '',
};

const PETTY_CASH_COLUMNS: ExportColumn<PettyCash>[] = [
  { header: 'Voucher No', accessor: 'voucherNo' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Description', accessor: 'description' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Type', accessor: 'type' },
  { header: 'Linked Source', accessor: (r) => r.linkedType === 'PO' ? `PO: ${r.po?.poNo ?? ''}` : r.linkedType === 'ExpenseClaim' ? `Expense: ${r.expenseClaim?.claimNo ?? ''}` : 'Direct' },
  { header: 'Party', accessor: (r) => r.party?.name ?? '' },
  { header: 'Site', accessor: (r) => r.site?.name ?? '' },
  { header: 'Category', accessor: 'category' },
  { header: 'Authorized By / Received From', accessor: 'authorizedBy' },
  { header: 'Payment Mode', accessor: 'paymentMode' },
  { header: 'Balance', accessor: 'balance' },
  { header: 'Approval Status', accessor: 'approvalStatus' },
  { header: 'Approved By', accessor: (r) => r.approvedBy ?? '' },
];

const PETTY_CASH_IMPORT_FIELDS: ImportField[] = [
  { key: 'voucherNo', label: 'Voucher No', required: true },
  { key: 'date', label: 'Date', required: true, type: 'date' },
  { key: 'description', label: 'Description', required: true },
  { key: 'amount', label: 'Amount', required: true, type: 'number' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'authorizedBy', label: 'Authorized By / Received From' },
  { key: 'paymentMode', label: 'Payment Mode' },
  { key: 'balance', label: 'Balance', type: 'number' },
];

function generateMockPettyCash(): PettyCash[] {
  return [
    { id: 1, voucherNo: 'PV/2024-25/001', date: '2024-11-10T00:00:00', description: 'Office stationery purchase', amount: 12500, type: 'Debit', category: 'Office Supplies', partyId: null, siteId: null, poId: null, expenseClaimId: null, linkedType: 'Direct', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Rajesh Kumar', paymentMode: 'Cash', balance: 487500, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Approved', submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null, party: null, site: null, po: null, expenseClaim: null },
    { id: 2, voucherNo: 'PV/2024-25/002', date: '2024-12-05T00:00:00', description: 'Site visit travel - Delhi to Rihand', amount: 8500, type: 'Debit', category: 'Travel', partyId: null, siteId: null, poId: null, expenseClaimId: null, linkedType: 'Direct', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Ankit Verma', paymentMode: 'Cash', balance: 479000, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Approved', submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null, party: null, site: null, po: null, expenseClaim: null },
    { id: 3, voucherNo: 'PV/2024-25/003', date: '2025-01-15T00:00:00', description: 'Petty cash replenishment', amount: 50000, type: 'Credit', category: 'Replenishment', partyId: null, siteId: null, poId: null, expenseClaimId: null, linkedType: 'Direct', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Suresh Mahto', paymentMode: 'Bank Transfer', balance: 529000, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Approved', submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null, party: null, site: null, po: null, expenseClaim: null },
    { id: 4, voucherNo: 'PV/2024-25/004', date: '2025-02-20T00:00:00', description: 'Team lunch - client meeting', amount: 4200, type: 'Debit', category: 'Food', partyId: null, siteId: null, poId: null, expenseClaimId: null, linkedType: 'Direct', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Prakash Sahu', paymentMode: 'Cash', balance: 524800, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Approved', submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null, party: null, site: null, po: null, expenseClaim: null },
    { id: 5, voucherNo: 'PV/2024-25/005', date: '2025-03-10T00:00:00', description: 'Courier & postal charges', amount: 1800, type: 'Debit', category: 'Office Supplies', partyId: null, siteId: null, poId: null, expenseClaimId: null, linkedType: 'Direct', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Deepak Mishra', paymentMode: 'Cash', balance: 523000, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Pending', submittedBy: 'Deepak Mishra', submittedAt: '2025-03-10T09:00:00', approvedBy: null, approvedAt: null, rejectionReason: null, party: null, site: null, po: null, expenseClaim: null },
    { id: 6, voucherNo: 'PV/2024-25/006', date: '2025-04-01T00:00:00', description: 'Payment against PO: PO/2024-25/001 - Site material', amount: 150000, type: 'Debit', category: 'Purchase Order', partyId: null, siteId: null, poId: 1, expenseClaimId: null, linkedType: 'PO', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Amit Singh', paymentMode: 'Bank Transfer', balance: 522350, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Draft', submittedBy: null, submittedAt: null, approvedBy: null, approvedAt: null, rejectionReason: null, party: null, site: null, po: { id: 1, poNo: 'PO/2024-25/001', totalAmount: 150000 }, expenseClaim: null },
    { id: 7, voucherNo: 'PV/2024-25/007', date: '2025-04-15T00:00:00', description: 'Expense claim: EC/001 - Travel reimbursement', amount: 12300, type: 'Debit', category: 'Expense Claim', partyId: null, siteId: null, poId: null, expenseClaimId: 1, linkedType: 'ExpenseClaim', jobCode: null, costCenter: null, department: null, projectManager: null, authorizedBy: 'Manoj Rao', paymentMode: 'Cash', balance: 510050, referenceNo: null, remarks: null, billAttachmentPath: null, approvalStatus: 'Rejected', submittedBy: 'Manoj Rao', submittedAt: '2025-04-15T10:00:00', approvedBy: null, approvedAt: null, rejectionReason: 'Missing bill attachment — please re-upload the receipt.', party: null, site: null, po: null, expenseClaim: { id: 1, claimNo: 'EC/001', totalAmount: 12300 } },
  ];
}

type ReportView = 'vouchers' | 'daily' | 'site' | 'employee';
const REPORT_TABS: { id: ReportView; label: string; icon: typeof Wallet }[] = [
  { id: 'vouchers', label: 'Vouchers', icon: ListChecks },
  { id: 'daily', label: 'Daily Cash Report', icon: CalendarDays },
  { id: 'site', label: 'Summary by Site', icon: MapPin },
  { id: 'employee', label: 'Employee-wise Settlement', icon: Users },
];

// ── Daily Cash Report: opening balance, day's expense, closing balance ──
function DailyCashReport({ records }: { records: PettyCash[] }) {
  const rows = useMemo(() => {
    // records are typically loaded latest-first; work chronologically.
    const chrono = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const byDay = new Map<string, PettyCash[]>();
    chrono.forEach(r => {
      const day = r.date.split('T')[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(r);
    });
    let opening = 0;
    const out: { date: string; opening: number; cashIn: number; expense: number; closing: number }[] = [];
    for (const [date, items] of byDay) {
      const cashIn = items.filter(r => r.type === 'Credit').reduce((s, r) => s + r.amount, 0);
      const expense = items.filter(r => r.type === 'Debit').reduce((s, r) => s + r.amount, 0);
      const closing = items[items.length - 1].balance;
      out.push({ date, opening, cashIn, expense, closing });
      opening = closing;
    }
    return out.reverse(); // most recent day first
  }, [records]);

  return (
    <div className="vc-panel">
      <div className="vc-panel-header"><CalendarDays size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Daily Cash Report</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{rows.length} days</span></div>
      <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">{['Date', 'Opening', 'Cash In', 'Expense', 'Closing Balance'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {rows.map((r, ri) => (
              <tr key={`${r.date}-${ri}`} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{r.date}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{r.opening.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-[#00e676] font-mono">{r.cashIn > 0 ? `₹${r.cashIn.toLocaleString('en-IN')}` : '—'}</td>
                <td className="py-2.5 px-3 text-[#ff3d3d] font-mono">{r.expense > 0 ? `₹${r.expense.toLocaleString('en-IN')}` : '—'}</td>
                <td className="py-2.5 px-3 text-[#f5a623] font-mono font-semibold">₹{r.closing.toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[#5a6878]">No transactions found</td></tr>}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}

// ── Petty Cash Summary by Site: cash given vs expense vs balance ──
function SiteSummaryReport({ records }: { records: PettyCash[] }) {
  const rows = useMemo(() => {
    const bySite = new Map<string, { site: string; given: number; expense: number }>();
    records.forEach(r => {
      const key = r.site?.name || 'Unassigned / Head Office';
      const cur = bySite.get(key) || { site: key, given: 0, expense: 0 };
      if (r.type === 'Credit') cur.given += r.amount; else cur.expense += r.amount;
      bySite.set(key, cur);
    });
    return Array.from(bySite.values()).sort((a, b) => b.given - a.given);
  }, [records]);
  const totals = rows.reduce((a, r) => ({ given: a.given + r.given, expense: a.expense + r.expense }), { given: 0, expense: 0 });

  return (
    <div className="vc-panel">
      <div className="vc-panel-header"><MapPin size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Petty Cash Summary by Site</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{rows.length} sites</span></div>
      <div className="overflow-x-auto"><table className="w-full text-[11px]">
        <thead><tr className="bg-[#0f1318]">{['Site', 'Cash Given', 'Expense', 'Balance'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#1a2028]">
          {rows.map(r => (
            <tr key={r.site} className="hover:bg-[#141920]">
              <td className="py-2.5 px-3 text-[#e2e8f0]">{r.site}</td>
              <td className="py-2.5 px-3 text-[#00e676] font-mono">₹{r.given.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#ff3d3d] font-mono">₹{r.expense.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-3 text-[#f5a623] font-mono font-semibold">₹{(r.given - r.expense).toLocaleString('en-IN')}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-[#5a6878]">No transactions found</td></tr>}
        </tbody>
        {rows.length > 0 && (
          <tfoot><tr className="bg-[#0f1318] border-t-2 border-[#252e3a] font-semibold">
            <td className="py-2.5 px-3 text-[#e2e8f0]">Totals</td>
            <td className="py-2.5 px-3 text-[#00e676] font-mono">₹{totals.given.toLocaleString('en-IN')}</td>
            <td className="py-2.5 px-3 text-[#ff3d3d] font-mono">₹{totals.expense.toLocaleString('en-IN')}</td>
            <td className="py-2.5 px-3 text-[#f5a623] font-mono">₹{(totals.given - totals.expense).toLocaleString('en-IN')}</td>
          </tr></tfoot>
        )}
      </table></div>
    </div>
  );
}

// ── Employee-wise Settlement: advance received vs expense vs balance ──
function EmployeeSettlementReport({ records }: { records: PettyCash[] }) {
  const rows = useMemo(() => {
    const byEmp = new Map<string, { employee: string; advance: number; expense: number }>();
    records.forEach(r => {
      const key = r.authorizedBy || 'Unassigned';
      const cur = byEmp.get(key) || { employee: key, advance: 0, expense: 0 };
      if (r.type === 'Credit') cur.advance += r.amount; else cur.expense += r.amount;
      byEmp.set(key, cur);
    });
    return Array.from(byEmp.values()).sort((a, b) => b.advance - a.advance);
  }, [records]);

  return (
    <div className="vc-panel">
      <div className="vc-panel-header"><Users size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Employee-wise Settlement</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{rows.length} employees</span></div>
      <div className="overflow-x-auto"><table className="w-full text-[11px]">
        <thead><tr className="bg-[#0f1318]">{['Employee', 'Advance', 'Expense', 'Balance', 'Status'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#1a2028]">
          {rows.map(r => {
            const balance = r.advance - r.expense;
            const settled = balance <= 0;
            return (
              <tr key={r.employee} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 text-[#e2e8f0]">{r.employee}</td>
                <td className="py-2.5 px-3 text-[#00e676] font-mono">₹{r.advance.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{r.expense.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{Math.abs(balance).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3"><span className={`vc-badge ${settled ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{settled ? 'Settled' : 'Pending'}</span></td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[#5a6878]">No transactions found</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}

export default function FinPettyCash() {
  const [view, setView] = useState<ReportView>('vouchers');
  const [records, setRecords] = useState<PettyCash[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [syncPoOpen, setSyncPoOpen] = useState(false);
  const [syncExpenseOpen, setSyncExpenseOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PettyCash | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PettyCash | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const billFileInputRef = useRef<HTMLInputElement>(null);
  const handleBillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Bill photo must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(p => ({ ...p, billAttachmentPath: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [linkFilter, setLinkFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [rejectTarget, setRejectTarget] = useState<PettyCash | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<PettyCash | null>(null);
  const [historyLogs, setHistoryLogs] = useState<ApprovalLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [parties, setParties] = useState<PartyRef[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [poOptions, setPoOptions] = useState<PoOption[]>([]);
  const [expenseOptions, setExpenseOptions] = useState<ExpenseOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [syncTarget, setSyncTarget] = useState<string | null>(null);
  const [syncSubmitting, setSyncSubmitting] = useState(false);

  const categories = useMemo(() => [...new Set(records.map(r => r.category).filter((c): c is string => !!c))].sort(), [records]);
  const paymentModes = useMemo(() => [...new Set(records.map(r => r.paymentMode).filter((m): m is string => !!m))].sort(), [records]);
  const jobByCode = useMemo(() => new Map(jobOptions.map(j => [j.jobCode, j])), [jobOptions]);

  const filtered = useMemo(() => records.filter(r =>
    (typeFilter === 'all' || r.type === typeFilter) &&
    (categoryFilter === 'all' || r.category === categoryFilter) &&
    (modeFilter === 'all' || r.paymentMode === modeFilter) &&
    (linkFilter === 'all' || r.linkedType === linkFilter) &&
    (approvalFilter === 'all' || r.approvalStatus === approvalFilter)
  ), [records, typeFilter, categoryFilter, modeFilter, linkFilter, approvalFilter]);

  const tc = useTableControls(filtered, (r) => `${r.voucherNo} ${r.description} ${r.type} ${r.category ?? ''} ${r.authorizedBy ?? ''} ${r.paymentMode ?? ''} ${r.linkedType} ${r.party?.name ?? ''} ${r.site?.name ?? ''}`);

  const filtersActive = typeFilter !== 'all' || categoryFilter !== 'all' || modeFilter !== 'all' || linkFilter !== 'all' || approvalFilter !== 'all';
  const clearFilters = () => { setTypeFilter('all'); setCategoryFilter('all'); setModeFilter('all'); setLinkFilter('all'); setApprovalFilter('all'); };

  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleAllOnPage = () => setSelected(s => {
    const next = new Set(s);
    pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id));
    return next;
  });

  const fetchLookups = useCallback(async () => {
    try {
      const [pRes, sRes, poRes, exRes, jobRes] = await Promise.all([
        fetch('/api/fin/parties'),
        fetch('/api/fin/sites'),
        fetch('/api/fin/purchase-orders'),
        fetch('/api/fin/expense-claims'),
        fetch('/api/fin/jobs'),
      ]);
      const [pData, sData, poData, exData, jobData] = await Promise.all([pRes.json(), sRes.json(), poRes.json(), exRes.json(), jobRes.json()]);
      if (pData.success) setParties(pData.data ?? []);
      if (sData.success) setSites(sData.data ?? []);
      if (poData.success) setPoOptions(poData.data?.map((p: any) => ({ id: p.id, poNo: p.poNo, vendorName: p.vendorName, totalAmount: p.totalAmount })) ?? []);
      if (exData.success) setExpenseOptions(exData.data?.map((e: any) => ({ id: e.id, claimNo: e.claimNo, expenseType: e.expenseType, totalAmount: e.totalAmount, siteName: e.site?.name ?? '' })) ?? []);
      if (jobData.success) setJobOptions(jobData.data?.map((j: any) => ({ id: j.id, jobCode: j.jobCode, description: j.description ?? null, siteId: j.siteId ?? null, siteName: j.site?.name ?? '' })) ?? []);
    } catch { /* non-critical */ }
  }, []);

  const fetch_ = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/fin/petty-cash');
      const j = await r.json();
      if (j.success && j.data?.length) { setRecords(j.data); }
      else { setRecords(generateMockPettyCash()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockPettyCash()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(); fetchLookups(); }, [fetch_, fetchLookups]);

  const pickJob = (code: string) => {
    const job = jobOptions.find(j => j.jobCode === code);
    setForm(p => ({
      ...p,
      jobCode: code,
      siteId: job?.siteId ? String(job.siteId) : p.siteId,
    }));
  };

  const openEdit = (r: PettyCash) => {
    setEditTarget(r);
    setForm({
      voucherNo: r.voucherNo, date: r.date?.split('T')[0] || '', description: r.description,
      amount: r.amount, type: r.type, category: r.category || '',
      partyId: r.partyId?.toString() || '', siteId: r.siteId?.toString() || '',
      poId: r.poId?.toString() || '', expenseClaimId: r.expenseClaimId?.toString() || '',
      jobCode: r.jobCode || '', costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '',
      linkedType: r.linkedType || 'Direct',
      authorizedBy: r.authorizedBy || '', paymentMode: r.paymentMode || 'Cash',
      referenceNo: r.referenceNo || '', remarks: r.remarks || '', billAttachmentPath: r.billAttachmentPath || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.description || !form.amount || !form.jobCode) { toast.error('Description, amount and job code are required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body: any = editTarget ? { id: editTarget.id, ...form, date: new Date(form.date) } : { ...form, date: new Date(form.date) };
      body.amount = Number(body.amount);
      body.partyId = body.partyId ? Number(body.partyId) : null;
      body.siteId = body.siteId ? Number(body.siteId) : null;
      body.poId = body.poId ? Number(body.poId) : null;
      body.expenseClaimId = body.expenseClaimId ? Number(body.expenseClaimId) : null;
      body.type = body.type || 'Debit';
      body.paymentMode = body.paymentMode || 'Cash';
      body.authorizedBy = body.authorizedBy || getCurrentUserEmail() || '';
      body.actor = getCurrentUserEmail();
      delete body.party; delete body.site; delete body.po; delete body.expenseClaim;
      const r = await fetch('/api/fin/petty-cash', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/fin/petty-cash?id=${deleteTarget.id}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() || '' } });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const r = await fetch(`/api/fin/petty-cash?ids=${[...selected].join(',')}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() || '' } });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} voucher${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); }
      else toast.error(j.error || 'Bulk delete failed');
    } catch { toast.error('Network error'); }
    finally { setBulkDeleting(false); }
  };

  const handleSyncFromPo = async () => {
    if (!syncTarget) return;
    setSyncSubmitting(true);
    try {
      const r = await fetch('/api/fin/petty-cash/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId: Number(syncTarget) }),
      });
      const j = await r.json();
      if (j.success) { toast.success('Synced from PO'); setSyncPoOpen(false); setSyncTarget(null); await fetch_(); }
      else toast.error(j.error || 'Sync failed');
    } catch { toast.error('Network error'); }
    finally { setSyncSubmitting(false); }
  };

  const handleSyncFromExpense = async () => {
    if (!syncTarget) return;
    setSyncSubmitting(true);
    try {
      const r = await fetch('/api/fin/petty-cash/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseClaimId: Number(syncTarget) }),
      });
      const j = await r.json();
      if (j.success) { toast.success('Synced from Expense Claim'); setSyncExpenseOpen(false); setSyncTarget(null); await fetch_(); }
      else toast.error(j.error || 'Sync failed');
    } catch { toast.error('Network error'); }
    finally { setSyncSubmitting(false); }
  };

  const runApprovalAction = async (id: number, action: 'submit' | 'approve' | 'reject', comments?: string) => {
    setApprovalSubmitting(true);
    try {
      const r = await fetch('/api/fin/petty-cash/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, comments, actor: getCurrentUserEmail() }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(action === 'submit' ? 'Submitted for approval' : action === 'approve' ? 'Voucher approved' : 'Voucher rejected');
        setRejectTarget(null); setRejectReason('');
        await fetch_();
      } else toast.error(j.error || 'Action failed');
    } catch { toast.error('Network error'); }
    finally { setApprovalSubmitting(false); }
  };

  const openHistory = async (r: PettyCash) => {
    setHistoryTarget(r);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/fin/petty-cash/approve?id=${r.id}`);
      const j = await res.json();
      setHistoryLogs(j.success ? j.data : []);
    } catch { setHistoryLogs([]); }
    finally { setHistoryLoading(false); }
  };

  const approvalBadge = (s: string) => {
    if (s === 'Approved') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]';
    if (s === 'Rejected') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    return 'bg-[#5a6878]/15 text-[#5a6878]'; // Draft
  };

  const pendingApprovalCount = records.filter(r => r.approvalStatus === 'Pending').length;

  const totalDebit = records.filter(r => r.type === 'Debit').reduce((s, r) => s + r.amount, 0);
  const totalCredit = records.filter(r => r.type === 'Credit').reduce((s, r) => s + r.amount, 0);
  const poLinked = records.filter(r => r.linkedType === 'PO').reduce((s, r) => s + r.amount, 0);
  const expenseLinked = records.filter(r => r.linkedType === 'ExpenseClaim').reduce((s, r) => s + r.amount, 0);
  const latestBalance = records.length > 0 ? records[0].balance : 0;

  const TabBar = (
    <div className="flex items-center gap-1.5 flex-wrap border-b border-[#252e3a] pb-3">
      {REPORT_TABS.map(t => (
        <button key={t.id} onClick={() => setView(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${view === t.id ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#8899aa] border border-transparent hover:bg-[#141920] hover:text-[#e2e8f0]'}`}
        >
          <t.icon size={13} /> {t.label}
        </button>
      ))}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (view === 'daily') return <div className="space-y-4 p-6">{TabBar}<DailyCashReport records={records} /></div>;
  if (view === 'site') return <div className="space-y-4 p-6">{TabBar}<SiteSummaryReport records={records} /></div>;
  if (view === 'employee') return <div className="space-y-4 p-6">{TabBar}<EmployeeSettlementReport records={records} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Petty Cash"
        fields={PETTY_CASH_IMPORT_FIELDS}
        keyField="voucherNo"
        existingKeys={new Set(records.map(r => r.voucherNo))}
        commitEndpoint="/api/fin/petty-cash/import"
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      {TabBar}
      <div className="grid grid-cols-6 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Balance</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(latestBalance ?? 0).toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Cash In</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalCredit ?? 0).toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Cash Out</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalDebit ?? 0).toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">PO Payments</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(poLinked ?? 0).toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a855f7]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Expense Claims</div><div className="text-[20px] font-bold text-[#a855f7]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(expenseLinked ?? 0).toLocaleString('en-IN')}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending Approval</div><div className="text-[20px] font-bold text-[#ffab40]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{pendingApprovalCount}</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><Wallet size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Petty Cash Vouchers</span><div className="ml-auto"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search vouchers..." /></div><div className="flex items-center gap-2 ml-2">
        <button onClick={() => { setSyncTarget(null); setSyncPoOpen(true); }} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><FileText size={13} /> Sync PO</button>
        <button onClick={() => { setSyncTarget(null); setSyncExpenseOpen(true); }} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Receipt size={13} /> Sync Expense</button>
        <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
        <ExportButton records={records} columns={PETTY_CASH_COLUMNS} filename="fin-petty-cash" />
      </div><button onClick={() => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Voucher</button></div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[110px]"><option value="all">All Types</option><option value="Debit">Debit</option><option value="Credit">Credit</option></select>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select value={modeFilter} onChange={e=>setModeFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[140px]"><option value="all">All Payment Modes</option>{paymentModes.map(m=><option key={m} value={m}>{m}</option>)}</select>
          <select value={linkFilter} onChange={e=>setLinkFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Sources</option><option value="Direct">Direct</option><option value="PO">Linked to PO</option><option value="ExpenseClaim">Linked to Expense</option></select>
          <select value={approvalFilter} onChange={e=>setApprovalFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Approval Status</option><option value="Draft">Draft</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select>
          {filtersActive && <button onClick={clearFilters} className="text-[11px] text-[#f5a623] hover:underline">Clear filters</button>}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-[#8899aa]"><span className="font-mono text-[#e2e8f0] font-semibold">{selected.size}</span> selected</span>
              <button onClick={()=>setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button>
              <button onClick={()=>setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] !border-[#ff3d3d]/40 hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete Selected</button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]"><th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>{['Voucher','Date','Description','Type','Source','Party','Site','Job','Amount','Authorized By','Payment Mode','Approval',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={()=>toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.voucherNo}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[180px] truncate" title={r.description}>{r.description}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.type==='Credit'?'bg-[#00e676]/15 text-[#00e676]':'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{r.type}</span></td><td className="py-2.5 px-3">{r.linkedType==='PO'?<span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff] flex items-center gap-1"><FileText size={11}/>{r.po?.poNo||'PO'}</span>:r.linkedType==='ExpenseClaim'?<span className="vc-badge bg-[#a855f7]/15 text-[#a855f7] flex items-center gap-1"><Receipt size={11}/>{r.expenseClaim?.claimNo||'Exp'}</span>:<span className="text-[#5a6878]">—</span>}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[100px] truncate" title={r.party?.name??''}>{r.party?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[100px] truncate" title={r.site?.name??''}>{r.site?.name||'—'}</td><td className="py-2.5 px-3 max-w-[140px]">{r.jobCode?<><span className="block font-mono text-[#e2e8f0] truncate">{r.jobCode}</span>{jobByCode.get(r.jobCode)?.description?<span className="block text-[10px] text-[#5a6878] truncate">{jobByCode.get(r.jobCode)?.description}</span>:null}</>:<span className="text-[#5a6878]">—</span>}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">₹{(r.amount ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.authorizedBy||'—'}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.paymentMode||'—'}</td><td className="py-2.5 px-3"><button onClick={()=>openHistory(r)} className={`vc-badge ${approvalBadge(r.approvalStatus)} cursor-pointer`} title="View approval history"><History size={10} className="mr-1"/>{r.approvalStatus}</button></td><td className="py-2.5 px-3"><div className="flex gap-1">{(r.approvalStatus==='Draft'||r.approvalStatus==='Rejected')&&<button onClick={()=>runApprovalAction(r.id,'submit')} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10 disabled:opacity-50" title="Submit for approval"><Send size={13}/></button>}{r.approvalStatus==='Pending'&&<><button onClick={()=>runApprovalAction(r.id,'approve')} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 disabled:opacity-50" title="Approve"><CheckCircle2 size={13}/></button><button onClick={()=>{setRejectTarget(r);setRejectReason('');}} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-50" title="Reject"><XCircle size={13}/></button></>}<button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={14} className="py-8 text-center text-[#5a6878]">No matching vouchers</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Voucher':'Request Petty Cash'}</DialogTitle></DialogHeader><div className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
        <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">What was this for? *</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="vc-input" placeholder="e.g. Site fuel purchase"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={form.amount||''} onChange={e=>setForm(p=>({...p,amount:Number(e.target.value)}))} className="vc-input"/></div>
          <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Expense Head</label><select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="vc-input appearance-none"><option value="">— Select —</option>{EXPENSE_HEADS.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Job Code *</label>
          <select value={form.jobCode} onChange={e=>pickJob(e.target.value)} className="vc-input appearance-none"><option value="">— Select Job —</option>{jobOptions.map(job=><option key={job.id} value={job.jobCode}>{job.jobCode} - {job.description || 'Untitled'}</option>)}</select>
          {form.siteId && <p className="text-[10px] text-[#5a6878] mt-1">Site, cost center &amp; approver auto-set from this job — {sites.find(s=>String(s.id)===form.siteId)?.name || ''}</p>}
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Remarks</label>
          <input value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} className="vc-input" placeholder="Optional"/>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Bill Photo</label>
          {form.billAttachmentPath ? (
            <div className="flex items-center gap-3">
              <img src={form.billAttachmentPath} alt="Bill" className="h-16 w-16 object-cover rounded-lg border border-[#252e3a]" />
              <div className="flex flex-col gap-1">
                <button type="button" onClick={()=>billFileInputRef.current?.click()} className="text-[11px] text-[#00d4ff] hover:underline text-left">Replace</button>
                <button type="button" onClick={()=>setForm(p=>({...p,billAttachmentPath:''}))} className="text-[11px] text-[#ff3d3d] hover:underline text-left">Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={()=>billFileInputRef.current?.click()} className="vc-btn-ghost text-[11px] flex items-center gap-1.5"><Upload size={12}/> Upload bill photo</button>
          )}
          <input ref={billFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBillFile} />
        </div>
      </div><DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost text-[11px]">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary text-[11px] disabled:opacity-50">{submitting?'Saving...':editTarget?'Save':'Submit Request'}</button></DialogFooter></DialogContent></Dialog>

      <Dialog open={syncPoOpen} onOpenChange={setSyncPoOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#f5a623] flex items-center gap-2"><FileText size={16}/> Sync from Purchase Order</DialogTitle></DialogHeader><div className="space-y-3">
        <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Select Purchase Order</label><select value={syncTarget||''} onChange={e=>setSyncTarget(e.target.value||null)} className="vc-input appearance-none"><option value="">— Select PO —</option>{poOptions.map(po=><option key={po.id} value={po.id}>{po.poNo} - {po.vendorName} (₹{po.totalAmount.toLocaleString('en-IN')})</option>)}</select></div>
      </div><DialogFooter><button onClick={()=>{setSyncPoOpen(false);setSyncTarget(null);}} className="vc-btn-ghost text-[11px]">Cancel</button><button onClick={handleSyncFromPo} disabled={!syncTarget||syncSubmitting} className="vc-btn-primary text-[11px] disabled:opacity-50">{syncSubmitting?'Syncing...':'Create Petty Cash Voucher'}</button></DialogFooter></DialogContent></Dialog>

      <Dialog open={syncExpenseOpen} onOpenChange={setSyncExpenseOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#f5a623] flex items-center gap-2"><Receipt size={16}/> Sync from Expense Claim</DialogTitle></DialogHeader><div className="space-y-3">
        <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Select Expense Claim</label><select value={syncTarget||''} onChange={e=>setSyncTarget(e.target.value||null)} className="vc-input appearance-none"><option value="">— Select Expense Claim —</option>{expenseOptions.map(ex=><option key={ex.id} value={ex.id}>{ex.claimNo} - {ex.expenseType} (₹{ex.totalAmount.toLocaleString('en-IN')}) - {ex.siteName}</option>)}</select></div>
      </div><DialogFooter><button onClick={()=>{setSyncExpenseOpen(false);setSyncTarget(null);}} className="vc-btn-ghost text-[11px]">Cancel</button><button onClick={handleSyncFromExpense} disabled={!syncTarget||syncSubmitting} className="vc-btn-primary text-[11px] disabled:opacity-50">{syncSubmitting?'Syncing...':'Create Petty Cash Voucher'}</button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o)=>{ if(!o){ setRejectTarget(null); setRejectReason(''); } }}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#ff3d3d] flex items-center gap-2"><XCircle size={16}/> Reject Voucher {rejectTarget?.voucherNo}</DialogTitle></DialogHeader><div className="space-y-3">
        <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reason for Rejection *</label><textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} className="vc-input min-h-[80px]" placeholder="Explain what needs to be fixed before resubmission..."/></div>
      </div><DialogFooter><button onClick={()=>{setRejectTarget(null);setRejectReason('');}} className="vc-btn-ghost text-[11px]">Cancel</button><button onClick={()=>rejectTarget&&runApprovalAction(rejectTarget.id,'reject',rejectReason)} disabled={!rejectReason.trim()||approvalSubmitting} className="dark-btn bg-[#ff3d3d] hover:bg-[#cc2020] text-white text-[11px] disabled:opacity-50">{approvalSubmitting?'Rejecting...':'Reject Voucher'}</button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!historyTarget} onOpenChange={(o)=>{ if(!o) setHistoryTarget(null); }}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md"><DialogHeader><DialogTitle className="text-[#f5a623] flex items-center gap-2"><History size={16}/> Approval History — {historyTarget?.voucherNo}</DialogTitle></DialogHeader><div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {historyLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#f5a623]" size={20}/></div> : historyLogs.length === 0 ? <div className="text-center py-6 text-[11px] text-[#5a6878]">No approval activity yet — this voucher is still a draft.</div> : historyLogs.map(log => (
          <div key={log.id} className="border border-[#252e3a] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className={`vc-badge ${approvalBadge(log.status)}`}>{log.action}</span>
              <span className="text-[10px] text-[#5a6878] font-mono">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
            </div>
            {(log.makerId || log.checkerId) && <div className="text-[11px] text-[#8899aa] mt-1.5">By {log.makerId || log.checkerId}</div>}
            {log.comments && <div className="text-[11px] text-[#e2e8f0] mt-1 italic">"{log.comments}"</div>}
          </div>
        ))}
      </div><DialogFooter><button onClick={()=>setHistoryTarget(null)} className="vc-btn-ghost text-[11px]">Close</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Voucher</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.voucherNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Voucher{selected.size===1?'':'s'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete <strong className="text-[#f5a623]">{selected.size}</strong> selected voucher{selected.size===1?'':'s'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg disabled:opacity-50">{bulkDeleting?'Deleting...':'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
