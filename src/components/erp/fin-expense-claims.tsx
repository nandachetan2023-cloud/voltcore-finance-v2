'use client';
import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Pencil, Trash2, Loader2, Search, CheckCircle2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, DatalistField, CostingFields, useFormValidation, required } from './_form-controls';

interface Site { id: number; name: string; siteCode: string; }

const EC_COLUMNS: ExportColumn<ExpenseClaim>[] = [
  { header: 'Claim No', accessor: 'claimNo' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Site', accessor: (r: any) => r.site?.name || '' },
  { header: 'Type', accessor: (r: any) => r.siteType || 'Site' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'Cost Center', accessor: 'costCenter' },
  { header: 'Department', accessor: 'department' },
  { header: 'Project Manager', accessor: 'projectManager' },
  { header: 'Submitted By', accessor: 'submittedBy' },
  { header: 'Bill No', accessor: (r: any) => r.billNo || '' },
  { header: 'Total', accessor: 'totalAmount' },
  { header: 'GST', accessor: (r: any) => r.gstAmount || 0 },
  { header: 'TDS', accessor: (r: any) => r.tdsAmount || 0 },
  { header: 'Items', accessor: (r) => r.items?.length ?? 0 },
  { header: 'Status', accessor: 'status' },
  { header: 'Appr.', accessor: (r: any) => r.approvalStatus || 'Draft' },
  { header: 'Remarks', accessor: 'remarks' },
];

const EC_IMPORT_FIELDS: ImportField[] = [
  { key: 'claimNo', label: 'Claim No' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'expenseType', label: 'Expense Type', aliases: ['Type'] },
  { key: 'submittedBy', label: 'Submitted By' },
  { key: 'jobCode', label: 'Job Code' },
  { key: 'costCenter', label: 'Cost Center', required: true },
  { key: 'department', label: 'Department' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'billNo', label: 'Bill No' },
  { key: 'totalAmount', label: 'Total Amount', type: 'number', aliases: ['Total'] },
  { key: 'receivedAmount', label: 'Received Amount', type: 'number' },
  { key: 'gstAmount', label: 'GST Amount', type: 'number', aliases: ['GST'] },
  { key: 'tdsAmount', label: 'TDS Amount', type: 'number', aliases: ['TDS'] },
  { key: 'approvalStatus', label: 'Approval Status', aliases: ['Appr.'] },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'category', label: 'Category (Item)' },
  { key: 'description', label: 'Description (Item)' },
  { key: 'amount', label: 'Amount (Item)', type: 'number' },
  { key: 'itemDate', label: 'Item Date', type: 'date' },
];

const EC_SAMPLE_ROW = {
  claimNo: 'EC/2024-25/001',
  date: '2024-11-20',
  expenseType: 'Travel',
  submittedBy: 'Rajesh Kumar',
  jobCode: 'JOB-2026-001',
  costCenter: 'CC-SIT-001',
  department: 'Projects',
  projectManager: 'R. Sharma',
  billNo: 'BILL-001',
  totalAmount: 47500,
  receivedAmount: 0,
  gstAmount: 0,
  tdsAmount: 0,
  approvalStatus: 'Approved',
  status: 'Approved',
  remarks: 'Site visit expenses',
  category: 'Travel',
  description: 'Train fare + hotel',
  amount: 2800,
  itemDate: '2024-11-20',
};

interface ExpenseItem { id: number; category: string; description: string; amount: number; receiptUrl: string; }
interface PoOption { id: number; poNo: string; vendorName: string; }
interface ExpenseClaim {
  id: number; claimNo: string; siteId: number; siteType: string; jobCode?: string | null;
  poId?: number | null;
  costCenter?: string | null; department?: string | null; projectManager?: string | null;
  submittedBy: string; date: string; totalAmount: number;
  gstAmount: number; tdsAmount: number; billNo: string | null;
  status: string; approvalStatus: string; remarks: string;
  site?: { name: string } | null;
  items?: ExpenseItem[];
}
interface FormData {
  claimNo: string; date: string; siteId: number; siteType: string; jobCode: string;
  poId: number | null; costCenter: string; department: string; projectManager: string;
  submittedBy: string; status: string; approvalStatus: string;
  billNo: string; gstAmount: number; tdsAmount: number; remarks: string;
}

const EMPTY_FORM: FormData = {
  claimNo: '', date: new Date().toISOString().split('T')[0], siteId: 0,
  siteType: 'Site', jobCode: '', poId: null, costCenter: '', department: '', projectManager: '',
  submittedBy: '', status: 'Draft', approvalStatus: 'Draft',
  billNo: '', gstAmount: 0, tdsAmount: 0, remarks: '',
};

const STATUSES = ['Draft', 'Submitted', 'Approved', 'Paid', 'Rejected'];
const CATEGORIES = ['Material', 'Travel', 'Food', 'Accommodation', 'Transport', 'Office Supplies', 'Utilities', 'Other'];

function generateMockExpenseClaims(): ExpenseClaim[] {
  return [
    { id: 1, claimNo: 'EC/2024-25/001', siteId: 1, siteType: 'Site', submittedBy: 'Rajesh Kumar', date: '2024-11-20T00:00:00', totalAmount: 47500, gstAmount: 0, tdsAmount: 0, billNo: null, status: 'Approved', approvalStatus: 'Approved', remarks: 'Site visit expenses — November', site: { name: 'NTPC Rihand Dam Project' }, items: [{ id: 1, category: 'Travel', description: 'Delhi to Rihand train fare', amount: 2800, receiptUrl: '' }, { id: 2, category: 'Accommodation', description: 'Hotel stay — 3 nights', amount: 9000, receiptUrl: '' }, { id: 3, category: 'Food', description: 'Meals during site visit', amount: 3500, receiptUrl: '' }, { id: 4, category: 'Transport', description: 'Local cab hire', amount: 4200, receiptUrl: '' }] },
    { id: 2, claimNo: 'EC/2024-25/002', siteId: 2, siteType: 'Site', submittedBy: 'Ankit Verma', date: '2024-12-15T00:00:00', totalAmount: 23000, gstAmount: 0, tdsAmount: 0, billNo: null, status: 'Paid', approvalStatus: 'Approved', remarks: 'Project material procurement', site: { name: 'BALCO Aluminium Smelter' }, items: [{ id: 3, category: 'Material', description: 'PVC pipes and fittings', amount: 12000, receiptUrl: '' }, { id: 4, category: 'Office Supplies', description: 'Print cartridges and paper', amount: 3500, receiptUrl: '' }, { id: 5, category: 'Transport', description: 'Auto fare — material pickup', amount: 1500, receiptUrl: '' }] },
    { id: 3, claimNo: 'EC/2024-25/003', siteId: 3, siteType: 'Site', submittedBy: 'Suresh Mahto', date: '2025-01-10T00:00:00', totalAmount: 15800, gstAmount: 0, tdsAmount: 0, billNo: null, status: 'Submitted', approvalStatus: 'Pending', remarks: 'Client meeting travel', site: { name: 'Coal India Eastern Coalfield' }, items: [{ id: 6, category: 'Travel', description: 'Ranchi to Dhanbad bus', amount: 1200, receiptUrl: '' }, { id: 7, category: 'Food', description: 'Client lunch meeting', amount: 4500, receiptUrl: '' }, { id: 8, category: 'Accommodation', description: 'Overnight stay', amount: 3500, receiptUrl: '' }] },
    { id: 4, claimNo: 'EC/2024-25/004', siteId: 4, siteType: 'Site', submittedBy: 'Prakash Sahu', date: '2025-02-25T00:00:00', totalAmount: 68000, gstAmount: 0, tdsAmount: 0, billNo: null, status: 'Approved', approvalStatus: 'Approved', remarks: 'Emergency equipment repair', site: { name: 'Vedanta Jharsuguda Smelter' }, items: [{ id: 9, category: 'Material', description: 'Hydraulic hose and clamps', amount: 18000, receiptUrl: '' }, { id: 10, category: 'Transport', description: 'Crane rental — half day', amount: 25000, receiptUrl: '' }, { id: 11, category: 'Other', description: 'Overtime allowance — crew of 4', amount: 12000, receiptUrl: '' }] },
    { id: 5, claimNo: 'EC/2024-25/005', siteId: 5, siteType: 'Site', submittedBy: 'Deepak Mishra', date: '2025-03-18T00:00:00', totalAmount: 31500, gstAmount: 0, tdsAmount: 0, billNo: null, status: 'Rejected', approvalStatus: 'Rejected', remarks: 'Office renovation expenses', site: { name: 'Hindalco Mahan Aluminium' }, items: [{ id: 12, category: 'Office Supplies', description: 'Whiteboard and markers', amount: 5500, receiptUrl: '' }, { id: 13, category: 'Utilities', description: 'Electricity bill — March', amount: 12000, receiptUrl: '' }, { id: 14, category: 'Other', description: 'Carpenter charges', amount: 8000, receiptUrl: '' }] },
  ];
}

const ic = "w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none";
const sc = ic + " appearance-none cursor-pointer";

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function genClaimNo() {
  const d = new Date();
  return 'EC/' + d.getFullYear().toString().slice(-2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0');
}

export default function FinExpenseClaims() {
  const [records, setRecords] = useState<ExpenseClaim[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseClaim | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<ExpenseItem[]>([{ id: 1, category: 'Material', description: '', amount: 0, receiptUrl: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseClaim | null>(null);
  const [formErr, setFormErr] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const tc = useTableControls(records, (r) => `${r.claimNo} ${r.site?.name ?? ''} ${r.submittedBy ?? ''} ${r.status} ${r.remarks ?? ''}`);
  const totalAmount = records.reduce((s, r) => s + r.totalAmount, 0);
  const pendingCount = records.filter(r => r.status === 'Draft' || r.status === 'Submitted').length;
  const approvedCount = records.filter(r => r.status === 'Approved').length;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (monthFilter) p.set('month', monthFilter);
    try {
      const r = await fetch('/api/fin/expense-claims?' + p);
      const rj = await r.json();
      if (rj.success) setRecords(rj.data ?? []);
      else setRecords(generateMockExpenseClaims());
    } catch { setRecords(generateMockExpenseClaims()); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]); }
    fetch('/api/fin/purchase-orders').then(r => r.json()).then(j => { if (j.success && j.data?.length) setPurchaseOrders(j.data); }).catch(() => {});
    setLoading(false);
  }, [monthFilter]);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const onDataChanged = () => fetch_();
    window.addEventListener('finance:data-changed', onDataChanged);
    return () => window.removeEventListener('finance:data-changed', onDataChanged);
  }, [fetch_]);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<FormData>({
    claimNo: required('Claim No'),
    submittedBy: required('Submitted By'),
    siteId: (v) => (!v) ? 'Site Code is required' : undefined,
    jobCode: required('Job Code'),
    poId: (v) => (!v) ? 'PO Number is required' : undefined,
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, claimNo: genClaimNo() });
    setLines([{ id: 1, category: 'Material', description: '', amount: 0, receiptUrl: '' }]);
    setFormErr('');
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (r: ExpenseClaim) => {
    setEditTarget(r);
    setForm({
      claimNo: r.claimNo, date: r.date?.split('T')[0] || '', siteId: r.siteId,
      siteType: r.siteType || 'Site', jobCode: r.jobCode || '',
      poId: r.poId ?? null,
      costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '',
      submittedBy: r.submittedBy || '', status: r.status, approvalStatus: r.approvalStatus || 'Draft',
      billNo: r.billNo || '', gstAmount: r.gstAmount || 0, tdsAmount: r.tdsAmount || 0,
      remarks: r.remarks || '',
    });
    setLines(r.items?.length ? r.items.map(item => ({ ...item })) : [{ id: 1, category: 'Material', description: '', amount: 0, receiptUrl: '' }]);
    setFormErr('');
    setFormErrors({});
    setFormOpen(true);
  };

  const addLine = () => setLines([...lines, { id: Date.now(), category: 'Material', description: '', amount: 0, receiptUrl: '' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof ExpenseItem, value: string | number) => {
    const u = [...lines];
    u[i] = { ...u[i], [field]: value };
    setLines(u);
  };

  const computedTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!validateForm(form)) { setFormErr('Please fix the highlighted fields'); return; }
    setFormErr('');
    setSubmitting(true);
    try {
      const payload = {
        claimNo: form.claimNo,
        date: form.date ? new Date(form.date) : null,
        siteId: form.siteId,
        siteType: form.siteType,
        jobCode: form.jobCode || null,
        poId: form.poId ? Number(form.poId) : null,
        costCenter: form.costCenter || null,
        department: form.department || null,
        projectManager: form.projectManager || null,
        submittedBy: form.submittedBy || null,
        billNo: form.billNo || null,
        gstAmount: form.gstAmount,
        tdsAmount: form.tdsAmount,
        status: form.status,
        approvalStatus: form.approvalStatus,
        remarks: form.remarks || null,
        totalAmount: computedTotal,
        items: lines.map(l => ({ category: l.category, description: l.description || null, amount: Number(l.amount) || 0, receiptUrl: l.receiptUrl || null })),
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/fin/expense-claims', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        alert(editTarget ? 'Expense claim updated' : 'Expense claim created');
        setFormOpen(false);
        await fetch_();
      } else setFormErr(json.error || 'Failed to save');
    } catch { setFormErr('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!window.confirm(`Delete ${deleteTarget.claimNo}?`)) return;
    try {
      const res = await fetch(`/api/fin/expense-claims?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { setDeleteOpen(false); await fetch_(); }
      else alert(json.error || 'Failed');
    } catch { alert('Network error'); }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected claim${selectedIds.size > 1 ? 's' : ''}?`)) return;
    try {
      const ids = Array.from(selectedIds).join(',');
      const res = await fetch(`/api/fin/expense-claims?ids=${ids}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { setSelectedIds(new Set()); await fetch_(); }
      else alert(json.error || 'Failed');
    } catch { alert('Network error'); }
  };

  const toggleSelect = (id: number) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedIds(p => p.size === tc.pageItems.length ? new Set() : new Set(tc.pageItems.map(r => r.id)));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Expense Claims"
        fields={EC_IMPORT_FIELDS}
        keyField="claimNo"
        existingKeys={new Set(records.map(r => r.claimNo))}
        commitEndpoint="/api/fin/expense-claims/import"
        sampleRow={EC_SAMPLE_ROW as unknown as Record<string, string | number>}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Claims</div>
          <div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Amount</div>
          <div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmt(totalAmount)}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div>
          <div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{pendingCount}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Approved</div>
          <div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{approvedCount}</div>
        </div>
      </div>

      {/* Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Expense Claims</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span>
          <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setSelectedIds(new Set()); }} className="vc-input py-1.5 text-[12px] w-28 ml-2" />
          <div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search claims..." /></div>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
          <ExportButton records={records} columns={EC_COLUMNS} filename="fin-expense-claims" />
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Claim</button>
          {selectedIds.size > 0 && (
            <button onClick={handleBatchDelete} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] text-[#ff3d3d]"><Trash2 size={13} /> Delete ({selectedIds.size})</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  <th className="py-2 px-3 w-8">
                    <input type="checkbox" checked={tc.pageItems.length > 0 && selectedIds.size === tc.pageItems.length} onChange={toggleSelectAll} className="accent-[#f5a623]" />
                  </th>
                  <SortableTh label="Claim No" sortKey="claimNo" accessor={(r: ExpenseClaim) => r.claimNo} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Date" sortKey="date" accessor={(r: ExpenseClaim) => r.date} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Site" sortKey="site" accessor={(r: any) => r.site?.name} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Type" sortKey="siteType" accessor={(r: ExpenseClaim) => r.siteType} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Submitted By" sortKey="submittedBy" accessor={(r: ExpenseClaim) => r.submittedBy} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Job Code" sortKey="jobCode" accessor={(r: ExpenseClaim) => r.jobCode} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Cost Center" sortKey="costCenter" accessor={(r: ExpenseClaim) => r.costCenter} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Bill No" sortKey="billNo" accessor={(r: ExpenseClaim) => r.billNo} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Total" sortKey="totalAmount" accessor={(r: ExpenseClaim) => r.totalAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
                  <SortableTh label="GST" sortKey="gstAmount" accessor={(r: ExpenseClaim) => r.gstAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
                  <SortableTh label="TDS" sortKey="tdsAmount" accessor={(r: ExpenseClaim) => r.tdsAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
                  <SortableTh label="Items" sortKey="items" accessor={(r: any) => r.items?.length ?? 0} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
                  <SortableTh label="Status" sortKey="status" accessor={(r: ExpenseClaim) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <SortableTh label="Appr." sortKey="approvalStatus" accessor={(r: ExpenseClaim) => r.approvalStatus} sort={tc.sort} toggleSort={tc.toggleSort} />
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {tc.pageItems.map(r => (
                  <tr key={r.id} className={'hover:bg-[#141920]' + (selectedIds.has(r.id) ? ' bg-[#f5a623]/5' : '')}>
                    <td className="py-2.5 px-3">
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} className="accent-[#f5a623]" />
                    </td>
                    <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.claimNo}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.date?.split('T')[0]}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[160px] truncate">{r.site?.name || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.siteType || 'Site'}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[140px] truncate">{r.submittedBy || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.costCenter || '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.billNo || '—'}</td>
                    <td className="py-2.5 px-3 text-[#00e676] font-mono font-medium whitespace-nowrap">{fmt(r.totalAmount)}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.gstAmount ? fmt(r.gstAmount) : '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.tdsAmount ? fmt(r.tdsAmount) : '—'}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.items?.length || 0}</td>
                    <td className="py-2.5 px-3">
                      <span className={`vc-badge ${r.status === 'Approved' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Paid' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : r.status === 'Rejected' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : r.status === 'Submitted' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#5a6878]/15 text-[#8899aa]'}`}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`vc-badge ${r.approvalStatus === 'Approved' ? 'bg-[#00e676]/15 text-[#00e676]' : r.approvalStatus === 'Rejected' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : r.approvalStatus === 'Pending' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#8899aa]/15 text-[#8899aa]'}`}>{r.approvalStatus || 'Draft'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                        <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={16} className="py-10 text-center text-[#5a6878]">No expense claims yet</td></tr>}
                {records.length > 0 && tc.pageItems.length === 0 && <tr><td colSpan={16} className="py-10 text-center text-[#5a6878]">No matching claims</td></tr>}
              </tbody>
            </table>
          </div>
          <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
        </div>
      </div>

      {/* ═══ Create/Edit Dialog ═══ */}
      <Dialog open={formOpen} onOpenChange={o => { if (!submitting) { setFormOpen(o); if (!o) setFormErr(''); } }}>
        <DialogContent className="bg-[#0f1318] border border-[#1a2028] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] !p-0 !gap-0 grid-rows-[auto_1fr_auto]">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-[#f5a623] text-base flex items-center gap-2">
              {editTarget ? <Pencil size={16} /> : <Plus size={16} />}
              {editTarget ? 'Edit' : 'New'} Expense Claim
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-4 py-4 min-h-0">
            {formErr && (
              <div className="mb-3 px-4 py-2 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 text-[#ff3d3d] text-[12px] flex items-center gap-2">
                <span>⚠</span> {formErr}
              </div>
            )}

            <div className="space-y-3 pb-1">
              {/* ── Line Items (top priority) ── */}
              <div className="bg-[#141920] rounded-xl border border-[#1a2028] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider">Line Items</span>
                  <button onClick={addLine} className="text-[11px] text-[#f5a623] hover:text-[#d48f1a] font-medium flex items-center gap-1"><Plus size={12} /> Add</button>
                </div>
                <div className="space-y-1.5">
                  {lines.map((line, i) => (
                    <div key={line.id} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#5a6878] w-5 text-center font-mono shrink-0">{i + 1}</span>
                      <select value={line.category ?? 'Material'} onChange={e => updateLine(i, 'category', e.target.value)} className={sc + ' text-[12px] shrink-0'} style={{ width: '150px' }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input value={line.description ?? ''} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className={ic + ' flex-1 text-[12px] min-w-0 max-w-[200px]'} />
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#5a6878]">₹</span>
                        <input type="number" value={line.amount ?? ''} onChange={e => updateLine(i, 'amount', e.target.value === '' ? 0 : (Number(e.target.value) || 0))} placeholder="0" className={ic + ' w-full text-[12px] text-right pl-6'} />
                      </div>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(i)} className="text-[#ff3d3d] hover:text-[#cc0000] p-1 rounded hover:bg-[#ff3d3d]/10 shrink-0"><Trash2 size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a2028]">
                  <span className="text-[10px] text-[#5a6878]">{lines.length} item{lines.length !== 1 ? 's' : ''}</span>
                  <span className="text-[14px] font-bold text-[#f5a623]">{fmt(computedTotal)}</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Claim No" required error={formErrors.claimNo}>
                  <input value={form.claimNo ?? ''} onChange={e => setField('claimNo', e.target.value)} placeholder="Auto-generated" className={ic} />
                </FormField>
                <FormField label="Date">
                  <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={ic} />
                </FormField>
                <FormField label="Site Code" required error={formErrors.siteId}>
                  <SearchableSelect value={form.siteId ? String(form.siteId) : ''} onChange={v => setField('siteId', v ? Number(v) : 0)} options={sites.map(s => ({ value: String(s.id), label: s.name, sublabel: s.siteCode }))} placeholder="Select site"/>
                </FormField>
                <FormField label="Submitted By" required error={formErrors.submittedBy}>
                  <input value={form.submittedBy} onChange={e => setField('submittedBy', e.target.value)} placeholder="Name" className={ic} />
                </FormField>
                <FormField label="Site Type">
                  <select value={form.siteType} onChange={e => setField('siteType', e.target.value)} className={sc}>
                    <option value="Site">Site</option>
                    <option value="HO">HO</option>
                  </select>
                </FormField>
                <FormField label="Job Code" required error={formErrors.jobCode}>
                  <DatalistField id="claim-job" value={form.jobCode} onChange={v => setField('jobCode', v)} options={[...new Set(records.map(r => r.jobCode).filter(Boolean) as string[])]} placeholder="e.g. JOB-001" />
                </FormField>
                <FormField label="PO Number" required error={formErrors.poId}>
                  <SearchableSelect value={form.poId ? String(form.poId) : ''} onChange={v => setField('poId', v ? Number(v) : null)} options={purchaseOrders.map(po => ({ value: String(po.id), label: po.poNo, sublabel: po.vendorName }))} placeholder="Select PO..." />
                </FormField>
                <FormField label="Bill/Voucher No">
                  <input value={form.billNo} onChange={e => setField('billNo', e.target.value)} placeholder="Bill ref" className={ic} />
                </FormField>
                <FormField label="GST Amount">
                  <input type="number" value={form.gstAmount ?? ''} onChange={e => setField('gstAmount', Number(e.target.value) || 0)} placeholder="0" className={ic} />
                </FormField>
                <FormField label="TDS Amount">
                  <input type="number" value={form.tdsAmount ?? ''} onChange={e => setField('tdsAmount', Number(e.target.value) || 0)} placeholder="0" className={ic} />
                </FormField>
                <FormField label="Status">
                  <select value={form.status ?? 'Draft'} onChange={e => setField('status', e.target.value)} className={sc}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Approval Status">
                  <select value={form.approvalStatus ?? 'Draft'} onChange={e => setField('approvalStatus', e.target.value)} className={sc}>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Paid">Paid</option>
                  </select>
                </FormField>
              </div>

              <CostingFields prefix="claim" form={{ costCenter: form.costCenter, department: form.department, projectManager: form.projectManager }} setField={(k, v) => setField(k, v)} errors={formErrors} />

              <FormField label="Remarks">
                <input value={form.remarks} onChange={e => setField('remarks', e.target.value)} placeholder="Optional notes" className={ic} />
              </FormField>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 px-4 pb-4 pt-3 border-t border-[#1a2028]">
            <button onClick={() => setFormOpen(false)} disabled={submitting} className="px-4 py-2 text-[12px] font-medium text-[#8899aa] hover:text-[#e2e8f0] bg-[#1a2028] rounded-lg hover:bg-[#252e3a] disabled:opacity-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 px-5 py-2 bg-[#f5a623] text-[#0a0d12] rounded-lg text-[12px] font-semibold hover:bg-[#d48f1a] disabled:opacity-50 transition-colors">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {!submitting && <CheckCircle2 size={14} />}
              {editTarget ? 'Update' : 'Create Claim'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Expense Claim</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.claimNo}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
