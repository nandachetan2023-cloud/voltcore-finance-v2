'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowDownCircle, Plus, Pencil, Trash2, Loader2, Send, Save, CircleDot, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useERPStore } from '@/store/erp-store';
import { useTableControls, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, DatalistField, CostingFields, useFormValidation, required } from './_form-controls';
import { FilterBar, type ListFilters } from './_list-filter-bar';
import { StatusBadge } from './_status-badge';

interface ARRecord {
  id: number; invoiceNo: string; client: string; clientCode: string | null;
  invoiceRef?: string | null; description: string | null; amount: number; tax: number; totalAmount: number;
  dueDate: string; receivedDate: string | null; status: string;
  receivedAmount: number; tdsAmount: number; deductionType: string | null; otherDeduction: number;
  siteId: number | null; partyId: number | null; jobCode: string | null;
  poNo: string | null; costCenter: string | null; department: string | null; projectManager: string | null;
  site?: { name: string; siteCode: string } | null;
}

interface LineItem { id: number; description: string; glAccount: string; quantity: number; unitPrice: number; }
interface SiteRef { id: number; name: string; siteCode: string; }
interface PartyRef { id: number; name: string; }
interface JobRef { id: number; jobCode: string; description: string | null; siteId: number | null; siteName: string; }

interface FormData {
  invoiceNo: string; client: string; clientCode: string; invoiceRef: string;
  description: string; invoiceDate: string; dueDate: string; totalAmount: number; status: string;
  receivedAmount: number; tdsAmount: number; deductionType: string; otherDeduction: number;
  siteId: string; partyId: string; jobCode: string;
  poNo: string; costCenter: string; department: string; projectManager: string;
}

const DEDUCTION_OPTIONS = ['Retention', 'Liquidated Damages', 'Advance Recovery', 'Discount', 'Freight', 'Other'];

const AR_COLUMNS: ExportColumn<ARRecord>[] = [
  { header: 'Invoice No', accessor: 'invoiceNo' },
  { header: 'Client', accessor: 'client' },
  { header: 'Client Code', accessor: 'clientCode' },
  { header: 'Invoice Ref', accessor: 'invoiceRef' },
  { header: 'Description', accessor: 'description' },
  { header: 'Site Code', accessor: (r) => r.site?.siteCode ?? '' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'PO Number', accessor: 'poNo' },
  { header: 'Cost Center', accessor: 'costCenter' },
  { header: 'Department', accessor: 'department' },
  { header: 'Project Manager', accessor: 'projectManager' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Tax', accessor: 'tax' },
  { header: 'Total Amount', accessor: 'totalAmount' },
  { header: 'Received Amount', accessor: 'receivedAmount' },
  { header: 'TDS Amount', accessor: 'tdsAmount' },
  { header: 'Deduction Type', accessor: 'deductionType' },
  { header: 'Other Deduction', accessor: 'otherDeduction' },
  { header: 'Due Date', accessor: (r) => r.dueDate?.split('T')[0] ?? '' },
  { header: 'Received Date', accessor: (r) => r.receivedDate?.split('T')[0] ?? '' },
  { header: 'Status', accessor: 'status' },
];

const AR_IMPORT_FIELDS: ImportField[] = [
  { key: 'invoiceNo', label: 'Invoice No', required: true },
  { key: 'client', label: 'Client', required: true },
  { key: 'clientCode', label: 'Client Code' },
  { key: 'invoiceRef', label: 'Invoice Ref' },
  { key: 'description', label: 'Description' },
  { key: 'siteCode', label: 'Site Code' },
  { key: 'jobCode', label: 'Job Code' },
  { key: 'poNo', label: 'PO Number' },
  { key: 'costCenter', label: 'Cost Center', required: true },
  { key: 'department', label: 'Department' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'tax', label: 'Tax', type: 'number' },
  { key: 'totalAmount', label: 'Total Amount', type: 'number' },
  { key: 'receivedAmount', label: 'Received Amount', type: 'number' },
  { key: 'tdsAmount', label: 'TDS Amount', type: 'number' },
  { key: 'deductionType', label: 'Deduction Type' },
  { key: 'otherDeduction', label: 'Other Deduction', type: 'number' },
  { key: 'dueDate', label: 'Due Date', required: true, type: 'date' },
  { key: 'status', label: 'Status' },
];
const AR_SAMPLE_ROW = { invoiceNo: 'AR/2024-25/001', client: 'NTPC Ltd', clientCode: 'NTPC-001', invoiceRef: 'REF-001', description: 'Electrical panel installation', siteCode: 'SIT-001', jobCode: 'JOB-2026-001', poNo: 'PO-1001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', amount: 4500000, tax: 810000, totalAmount: 5310000, receivedAmount: 6000000, tdsAmount: 100000, deductionType: 'Retention', otherDeduction: 50000, dueDate: '2025-02-15', status: 'Partially Received' };

const EMPTY_FORM: FormData = { invoiceNo: '', client: '', clientCode: '', invoiceRef: '', description: '', invoiceDate: '', dueDate: '', totalAmount: 0, status: 'Pending', receivedAmount: 0, tdsAmount: 0, deductionType: '', otherDeduction: 0, siteId: '', partyId: '', jobCode: '', poNo: '', costCenter: '', department: '', projectManager: '' };
const NEW_LINE = (): LineItem => ({ id: Date.now() + Math.random(), description: '', glAccount: '', quantity: 1, unitPrice: 0 });

function generateMockAR(): ARRecord[] {
  return [
    { id: 1, invoiceNo: 'AR/2024-25/001', client: 'NTPC Ltd', clientCode: 'NTPC-001', invoiceRef: 'REF-001', description: 'Electrical panel installation', amount: 4500000, tax: 810000, totalAmount: 5310000, dueDate: '2025-02-15T00:00:00', receivedDate: '2025-02-10T00:00:00', receivedAmount: 5310000, tdsAmount: 0, deductionType: null, otherDeduction: 0, siteId: null, partyId: null, jobCode: 'JOB-2026-001', poNo: 'PO-1001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', status: 'Received' },
    { id: 2, invoiceNo: 'AR/2024-25/002', client: 'BALCO', clientCode: 'BALCO-002', invoiceRef: 'REF-002', description: 'Cable tray supply & installation', amount: 2800000, tax: 504000, totalAmount: 3304000, dueDate: '2025-03-20T00:00:00', receivedDate: null, receivedAmount: 2000000, tdsAmount: 100000, deductionType: 'Retention', otherDeduction: 50000, siteId: null, partyId: null, jobCode: 'JOB-2026-002', poNo: 'PO-1002', costCenter: 'CC-SIT-002', department: 'Projects', projectManager: 'A. Verma', status: 'Partially Received' },
    { id: 3, invoiceNo: 'AR/2024-25/003', client: 'Coal India', clientCode: 'CIL-003', invoiceRef: 'REF-003', description: 'DG set annual maintenance', amount: 1200000, tax: 216000, totalAmount: 1416000, dueDate: '2025-01-10T00:00:00', receivedDate: null, receivedAmount: 0, tdsAmount: 0, deductionType: null, otherDeduction: 0, siteId: null, partyId: null, jobCode: 'JOB-2026-003', poNo: 'PO-1003', costCenter: 'CC-SIT-003', department: 'Operations', projectManager: 'P. Iyer', status: 'Overdue' },
    { id: 4, invoiceNo: 'AR/2024-25/004', client: 'Vedanta Ltd', clientCode: 'VED-004', invoiceRef: 'REF-004', description: 'Transformer oil filtration', amount: 3500000, tax: 630000, totalAmount: 4130000, dueDate: '2025-04-05T00:00:00', receivedDate: '2025-04-01T00:00:00', receivedAmount: 4130000, tdsAmount: 0, deductionType: null, otherDeduction: 0, siteId: null, partyId: null, jobCode: 'JOB-2026-004', poNo: 'PO-1004', costCenter: 'CC-SIT-004', department: 'Projects', projectManager: 'S. Rao', status: 'Received' },
    { id: 5, invoiceNo: 'AR/2024-25/005', client: 'Hindalco', clientCode: 'HIN-005', invoiceRef: 'REF-005', description: 'Substation commissioning', amount: 6200000, tax: 1116000, totalAmount: 7316000, dueDate: '2025-05-15T00:00:00', receivedDate: null, receivedAmount: 6000000, tdsAmount: 200000, deductionType: 'Liquidated Damages', otherDeduction: 150000, siteId: null, partyId: null, jobCode: 'JOB-2026-005', poNo: 'PO-1005', costCenter: 'CC-SIT-005', department: 'Projects', projectManager: 'M. Khan', status: 'Partially Received' },
  ];
}

export default function AccountsReceivable() {
  const [records, setRecords] = useState<ARRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<ARRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ARRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, description: '', glAccount: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filters, setFilters] = useState<ListFilters>({});
  const [reportTab, setReportTab] = useState<'invoices' | 'outstanding' | 'ageing'>('invoices');
  const [importOpen, setImportOpen] = useState(false);
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [parties, setParties] = useState<PartyRef[]>([]);
  const [jobs, setJobs] = useState<JobRef[]>([]);
  const { triggerCreate } = useERPStore();

  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
    fetch('/api/fin/parties').then(r => r.json()).then(j => { if (j.success) setParties(j.data); }).catch(() => {});
    fetch('/api/fin/jobs').then(r => r.json()).then(j => { if (j.success) setJobs(j.data.map((x: any) => ({ id: x.id, jobCode: x.jobCode, description: x.description ?? null, siteId: x.siteId ?? null, siteName: x.site?.name ?? '' }))); }).catch(() => {});
  }, []);

  const statuses = useMemo(() => [...new Set(records.map(r => r.status).filter(Boolean))], [records]);
  const setFilter = (key: keyof ListFilters, value: string) => setFilters((p) => ({ ...p, [key]: value }));
  const statusFiltered = useMemo(
    () => {
      let rows = statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter);
      if (filters.site) rows = rows.filter(r => `${r.site?.siteCode ?? ''} ${r.site?.name ?? ''}`.toLowerCase().includes(filters.site!.toLowerCase()));
      if (filters.jobCode) rows = rows.filter(r => (r.jobCode || '').toLowerCase().includes(filters.jobCode!.toLowerCase()));
      if (filters.poNo) rows = rows.filter(r => (r.poNo || '').toLowerCase().includes(filters.poNo!.toLowerCase()));
      if (filters.costCenter) rows = rows.filter(r => (r.costCenter || '').toLowerCase().includes(filters.costCenter!.toLowerCase()));
      if (filters.department) rows = rows.filter(r => (r.department || '').toLowerCase().includes(filters.department!.toLowerCase()));
      return rows;
    },
    [records, statusFilter, filters]
  );
  const tc = useTableControls(statusFiltered, (r) => `${r.invoiceNo} ${r.client} ${r.clientCode ?? ''} ${r.description ?? ''} ${r.status}`);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts-receivable');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockAR()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockAR()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<FormData>({
    invoiceNo: () => undefined, // generated by the server on save
    client: required('Client'),
    dueDate: required('Due Date'),
    siteId: required('Site Code'),
    jobCode: required('Job Code'),
    poNo: required('PO Number'),
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const pickJob = (code: string) => {
    const job = jobs.find(j => j.jobCode === code);
    setForm(p => ({ ...p, jobCode: code, siteId: job?.siteId ? String(job.siteId) : p.siteId }));
    if (code) clearError('jobCode');
  };

  const openCreate = useCallback(() => { setEditTarget(null); setForm({ ...EMPTY_FORM, invoiceNo: '' }); setFormErrors({}); setLines([{ id: 1, description: '', glAccount: '', quantity: 1, unitPrice: 0 }]); setView('form'); }, []);

  useEffect(() => { if (triggerCreate > 0) openCreate(); }, [triggerCreate, openCreate]);

  const openEdit = (r: ARRecord) => {
    setEditTarget(r);
    setForm({ invoiceNo: r.invoiceNo, client: r.client, clientCode: r.clientCode || '', invoiceRef: r.invoiceRef || '', description: r.description || '', invoiceDate: '', dueDate: r.dueDate?.split('T')[0] || '', totalAmount: r.totalAmount, status: r.status, receivedAmount: r.receivedAmount || 0, tdsAmount: r.tdsAmount || 0, deductionType: r.deductionType || '', otherDeduction: r.otherDeduction || 0, siteId: r.siteId ? String(r.siteId) : '', partyId: r.partyId ? String(r.partyId) : '', jobCode: r.jobCode || '', poNo: r.poNo || '', costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '' });
    setFormErrors({});
    setLines([{ id: 1, description: r.description || '', glAccount: '', quantity: 1, unitPrice: r.amount }]);
    setView('form');
  };

  const addLine = () => setLines(prev => [...prev, NEW_LINE()]);
  const removeLine = (i: number) => setLines(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => setLines(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: value }; return u; });
  const lineTotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);

  const subtotal = lineTotal || form.totalAmount || 0;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  const handleSubmit = async (status: string) => {
    if (!validateForm(form)) { toast.error('Please fix the highlighted fields'); return; }
    setSubmitting(true);
    const amount = subtotal;
    const tax = amount * 0.18;
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const payload = {
        invoiceNo: form.invoiceNo, client: form.client, clientCode: form.clientCode,
        invoiceRef: form.invoiceRef, description: form.description,
        amount, tax, totalAmount: amount + tax, dueDate: new Date(form.dueDate), status,
        receivedAmount: Number(form.receivedAmount) || 0,
        tdsAmount: Number(form.tdsAmount) || 0,
        deductionType: form.deductionType || null,
        otherDeduction: Number(form.otherDeduction) || 0,
        siteId: form.siteId ? Number(form.siteId) : null,
        partyId: form.partyId ? Number(form.partyId) : null,
        jobCode: form.jobCode || null,
        poNo: form.poNo || null,
        costCenter: form.costCenter || null,
        department: form.department || null,
        projectManager: form.projectManager || null,
        actor: getCurrentUserEmail(),
      };
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/accounts-receivable', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Invoice updated' : status === 'Pending' ? 'Saved as draft' : 'Invoice created'); setView('list'); await fetchData(); }
      else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/accounts-receivable?id=${deleteTarget.id}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } });
      const json = await res.json();
      if (json.success) { toast.success('Record deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const outstandingOf = (r: ARRecord) => Math.max(0, (r.totalAmount || 0) - (r.receivedAmount || 0) - (r.tdsAmount || 0) - (r.otherDeduction || 0));
  const today = new Date();
  const daysOverdue = (r: ARRecord) => { const d = new Date(r.dueDate); return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000)); };

  // Customer Outstanding report: group by client
  const customerOutstanding = useMemo(() => {
    const map = new Map<string, { client: string; clientCode: string | null; raised: number; received: number; deductions: number; outstanding: number; invoices: number }>();
    for (const r of records) {
      const key = r.client || 'Unassigned';
      const entry = map.get(key) || { client: r.client, clientCode: r.clientCode, raised: 0, received: 0, deductions: 0, outstanding: 0, invoices: 0 };
      entry.raised += r.totalAmount || 0;
      entry.received += r.receivedAmount || 0;
      entry.deductions += (r.tdsAmount || 0) + (r.otherDeduction || 0);
      entry.outstanding += outstandingOf(r);
      entry.invoices += 1;
      map.set(key, entry);
    }
    return [...map.values()];
  }, [records]);

  // Collection Ageing report: buckets 0-30 / 31-60 / 61-90 / 90+ by due date
  const ageingBuckets = useMemo(() => {
    const buckets = [
      { label: '0 - 30 Days', range: [0, 30] as const, color: '#00e676', rows: [] as { invoiceNo: string; client: string; dueDate: string; amount: number }[] },
      { label: '31 - 60 Days', range: [31, 60] as const, color: '#ffab40', rows: [] as { invoiceNo: string; client: string; dueDate: string; amount: number }[] },
      { label: '61 - 90 Days', range: [61, 90] as const, color: '#f5a623', rows: [] as { invoiceNo: string; client: string; dueDate: string; amount: number }[] },
      { label: '90+ Days', range: [91, Infinity] as const, color: '#ff3d3d', rows: [] as { invoiceNo: string; client: string; dueDate: string; amount: number }[] },
    ];
    for (const r of records) {
      const out = outstandingOf(r);
      if (out <= 0) continue;
      const days = daysOverdue(r);
      const b = buckets.find(b => days >= b.range[0] && days <= b.range[1]);
      if (b) b.rows.push({ invoiceNo: r.invoiceNo, client: r.client, dueDate: r.dueDate?.split('T')[0] ?? '', amount: out });
    }
    return buckets;
  }, [records]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Accounts Receivable"
        fields={AR_IMPORT_FIELDS}
        keyField="invoiceNo"
        existingKeys={new Set(records.map(r => r.invoiceNo))}
        commitEndpoint="/api/accounts-receivable/import"
        sampleRow={AR_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  // ═══════════════════════════════════════════════════════
  // FORM VIEW — invoice-style full page (new + edit)
  // ═══════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Accounts Receivable</button><span className="text-[#5a6878]">{' > '}</span><span className="text-[#e2e8f0]">{editTarget ? `Edit ${editTarget.invoiceNo}` : 'New Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{editTarget ? 'Edit AR Invoice' : 'Raise AR Invoice'}</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">{editTarget ? 'Update client invoice details and line allocations.' : 'Raise a receivable invoice against a client.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSubmit('Pending')} disabled={submitting} className="px-4 py-2 rounded-lg border border-[#f5a623] text-[#f5a623] text-[12px] font-semibold hover:bg-[#f5a623]/10 disabled:opacity-50 flex items-center gap-1.5"><Save size={13} /> Save Draft</button>
            <button onClick={() => handleSubmit(editTarget ? form.status : 'Pending')} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] disabled:opacity-50 flex items-center gap-1.5">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {editTarget ? 'Update Invoice' : 'Submit Invoice'}</button>
          </div>
        </div>

        {/* Invoice totals */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">&#8377;{(subtotal ?? 0).toLocaleString('en-IN')}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">GST (18%)</span><span className="text-[14px] font-bold text-[#ffab40] font-mono">&#8377;{(gst ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Grand Total</span><span className="text-[14px] font-bold text-[#00e676] font-mono">&#8377;{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
        </div>

        {/* Invoice Details */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Client (Linked)">
              <SearchableSelect
                value={form.partyId}
                onChange={v => { const party = parties.find(p => String(p.id) === v); setForm(p => ({ ...p, partyId: v, client: party?.name || p.client })); }}
                options={parties.map(p => ({ value: String(p.id), label: p.name }))}
                placeholder={form.client || 'Select client...'}
              />
            </FormField>
            <FormField label="Client Name" required error={formErrors.client} hint="Free-text fallback if not in the party master">
              <input value={form.client} onChange={e => setField('client', e.target.value)} placeholder="Client name" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Site Code" required error={formErrors.siteId}>
              <SearchableSelect
                value={form.siteId}
                onChange={v => setField('siteId', v)}
                options={sites.map(s => ({ value: String(s.id), label: s.name, sublabel: s.siteCode }))}
                placeholder="— Select site —"
              />
            </FormField>
            <FormField label="Job Code" required error={formErrors.jobCode} hint="Auto-fills the site">
              <SearchableSelect
                value={form.jobCode}
                onChange={pickJob}
                options={jobs.map(job => ({ value: job.jobCode, label: job.jobCode, sublabel: job.description || job.siteName || '' }))}
                placeholder="— Select job —"
              />
            </FormField>
            <FormField label="PO Number" required error={formErrors.poNo}>
              <DatalistField id="ar-po-no" value={form.poNo} onChange={v => setField('poNo', v)} options={[...new Set(records.map(r => r.poNo).filter(Boolean) as string[])]} placeholder="PO-1001" />
            </FormField>
            <FormField label="Client Code">
              <input value={form.clientCode} onChange={e => setField('clientCode', e.target.value)} placeholder="CL-0000" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Invoice No" hint="Generated automatically when you save">
              <input value={form.invoiceNo} readOnly placeholder="Auto-generated on save" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] opacity-60 placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Invoice Date">
              <input type="date" value={form.invoiceDate} onChange={e => setField('invoiceDate', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Due Date" required error={formErrors.dueDate}>
              <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Invoice Ref">
              <input value={form.invoiceRef} onChange={e => setField('invoiceRef', e.target.value)} placeholder="REF-XXXX" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Description" className="lg:col-span-3">
              <input value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Work description..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={e => setField('status', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"><option value="Pending">Pending</option><option value="Received">Received</option><option value="Partially Received">Partially Received</option><option value="Overdue">Overdue</option></select>
            </FormField>
          </div>
          <CostingFields prefix="ar" form={{ costCenter: form.costCenter, department: form.department, projectManager: form.projectManager }} setField={(k, v) => setField(k, v)} errors={formErrors} />
        </div>

        {/* Payment & Deductions */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Payment Collection & Deductions</h3>
            <div className="flex items-center gap-4 text-[11px] text-[#5a6878]">
              <span className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#00e676]" /> Received</span>
              <span className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#00d4ff]" /> TDS / Deduction</span>
              <span className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#ff3d3d]" /> Outstanding</span>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Received Amount" hint="Payments collected so far (₹)">
              <input type="number" value={form.receivedAmount || ''} onChange={e => setField('receivedAmount', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] font-mono focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="TDS Amount" hint="TDS deducted by client (₹)">
              <input type="number" value={form.tdsAmount || ''} onChange={e => setField('tdsAmount', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] font-mono focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Other Deduction Type" hint="Required if other deduction applied">
              <select value={form.deductionType} onChange={e => setField('deductionType', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"><option value="">— Select —</option>{DEDUCTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
            </FormField>
            <FormField label="Other Deduction Amount" hint="Deduction amount (₹)">
              <input type="number" value={form.otherDeduction || ''} onChange={e => setField('otherDeduction', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] font-mono focus:border-[#f5a623] focus:outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-3 text-center"><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold block mb-1">Invoice Raised</span><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">&#8377;{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-3 text-center"><span className="text-[9px] uppercase tracking-[1.5px] text-[#00e676] font-semibold block mb-1">Received</span><span className="text-[14px] font-bold text-[#00e676] font-mono">&#8377;{((Number(form.receivedAmount) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-3 text-center"><span className="text-[9px] uppercase tracking-[1.5px] text-[#00d4ff] font-semibold block mb-1">TDS + Deductions</span><span className="text-[14px] font-bold text-[#00d4ff] font-mono">&#8377;{((Number(form.tdsAmount) || 0) + (Number(form.otherDeduction) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-3 text-center"><span className="text-[9px] uppercase tracking-[1.5px] text-[#ff3d3d] font-semibold block mb-1">Outstanding</span><span className="text-[14px] font-bold text-[#ff3d3d] font-mono">&#8377;{Math.max(0, (grandTotal ?? 0) - (Number(form.receivedAmount) || 0) - (Number(form.tdsAmount) || 0) - (Number(form.otherDeduction) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a]">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Line Item Allocations</h3>
            <button onClick={addLine} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a] transition-colors"><Plus size={14} className="border border-[#f5a623] rounded-full" /> ADD LINE</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[40%]">Description</th>
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[23%]">GL Account</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[12%]">Qty</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Unit Price</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Amount</th>
            <th className="w-[5%]"></th>
          </tr></thead><tbody>
            {lines.map((line, i) => (
              <tr key={line.id} className="border-b border-[#1a2028] hover:bg-[#141920]">
                <td className="py-3 px-4"><input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Item description..." className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input value={line.glAccount} onChange={e => updateLine(i, 'glAccount', e.target.value)} placeholder="4100 - Service Revenue" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.quantity || ''} onChange={e => updateLine(i, 'quantity', Number(e.target.value) || 0)} className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.unitPrice || ''} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4 text-right text-[13px] text-[#8899aa] font-mono">&#8377;{((line.quantity ?? 0) * (line.unitPrice ?? 0)).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-center"><button onClick={() => removeLine(i)} className="p-1.5 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
              <td colSpan={4} className="py-3 px-4 text-right"><span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span></td>
              <td className="py-3 px-4 text-right"><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">&#8377;{(subtotal ?? 0).toLocaleString('en-IN')}</span></td>
              <td></td>
            </tr>
          </tbody></table></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Grand Total: <span className="text-[#f5a623]">&#8377;{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
          <div className="flex items-center gap-4 text-[11px] text-[#5a6878]">
            <div className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#00e676]" /> GST @18% applied</div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════
  const totalPending = records.filter(r => r.status === 'Pending' || r.status === 'Partially Received').reduce((s, r) => s + r.totalAmount, 0);
  const totalReceived = records.filter(r => r.status === 'Received').reduce((s, r) => s + r.totalAmount, 0);
  const totalOverdue = records.filter(r => r.status === 'Overdue').reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-4 p-6">
      <FilterBar
        filters={filters}
        setFilter={setFilter}
        options={{
          sites: sites.map(s => ({ value: s.siteCode, label: s.siteCode, sublabel: s.name })),
          jobs: jobs.map(j => ({ value: j.jobCode, label: j.jobCode, sublabel: j.siteName || j.description || '' })),
          poNos: records.filter(r => r.poNo).map(r => ({ value: r.poNo!, label: r.poNo! })),
          costCenters: [...new Set(records.map(r => r.costCenter).filter(Boolean))] as string[],
          departments: [...new Set(records.map(r => r.department).filter(Boolean))] as string[],
        }}
        search={tc.search}
        setSearch={tc.setSearch}
        searchPlaceholder="Search invoice, client..."
      />
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalPending / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Received</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalReceived / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalOverdue / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="flex items-center gap-1.5">
        {([
          { key: 'invoices', label: 'Invoices' },
          { key: 'outstanding', label: 'Customer Outstanding' },
          { key: 'ageing', label: 'Collection Ageing' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setReportTab(t.key)} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${reportTab === t.key ? 'bg-[#f5a623] text-[#0a0d12]' : 'bg-[#161c24] border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]'}`}>{t.label}</button>
        ))}
      </div>

      {reportTab === 'outstanding' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <FileText size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Customer Outstanding</span>
            <span className="text-[11px] text-[#5a6878] ml-1">Invoice Raised vs Received vs Balance</span>
            <ExportButton records={customerOutstanding} columns={[{ header: 'Client', accessor: 'client' }, { header: 'Client Code', accessor: 'clientCode' }, { header: 'Invoices', accessor: 'invoices' }, { header: 'Invoice Raised', accessor: 'raised' }, { header: 'Received', accessor: 'received' }, { header: 'TDS + Deductions', accessor: 'deductions' }, { header: 'Outstanding Balance', accessor: 'outstanding' }]} filename="customer-outstanding" />
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]">
            <thead><tr className="bg-[#0f1318] border-b border-[#252e3a]">
              {['Client', 'Code', 'Invoices', 'Invoice Raised', 'Received', 'TDS + Deductions', 'Outstanding Balance'].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {customerOutstanding.map((c, i) => (
                <tr key={i} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{c.client}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{c.clientCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{c.invoices}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(c.raised).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#00e676] font-mono">₹{(c.received).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#00d4ff] font-mono">₹{(c.deductions).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#ff3d3d] font-mono font-medium">₹{(c.outstanding).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {customerOutstanding.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[#5a6878]">No records found.</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      {reportTab === 'ageing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ageingBuckets.map(b => (
            <div key={b.label} className="vc-panel">
              <div className="vc-panel-header">
                <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                <span className="text-[12px] font-semibold text-[#e2e8f0]">{b.label}</span>
                <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{b.rows.length} Invoices</span>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-[11px]">
                <thead><tr className="bg-[#0f1318] border-b border-[#252e3a]">
                  {['Invoice No', 'Client', 'Due Date', 'Outstanding'].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {b.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{row.invoiceNo}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{row.client}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono">{row.dueDate}</td>
                      <td className="py-2.5 px-3 text-[#ff3d3d] font-mono font-medium">₹{(row.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {b.rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-[#5a6878]">No outstanding invoices in this bucket.</td></tr>}
                </tbody>
              </table></div>
            </div>
          ))}
        </div>
      )}

      {reportTab === 'invoices' && (
      <div className="vc-panel">
        <div className="vc-panel-header">
          <ArrowDownCircle size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Accounts Receivable</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Invoices</span>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
            <ExportButton records={records} columns={AR_COLUMNS} filename="accounts-receivable" />
          </div>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Invoice</button>
        </div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[130px]"><option value="all">All Status</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
          {(tc.search || statusFilter !== 'all') && <button onClick={() => { tc.setSearch(''); setStatusFilter('all'); }} className="text-[11px] text-[#f5a623] hover:underline">Clear</button>}
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              <SortableTh label="Invoice No" sortKey="invoiceNo" accessor={(r: ARRecord) => r.invoiceNo} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Client" sortKey="client" accessor={(r: ARRecord) => r.client} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Site" sortKey="site" accessor={(r: ARRecord) => r.site?.siteCode} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Job Code" sortKey="jobCode" accessor={(r: ARRecord) => r.jobCode} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="PO No" sortKey="poNo" accessor={(r: ARRecord) => r.poNo} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Cost Center" sortKey="costCenter" accessor={(r: ARRecord) => r.costCenter} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Dept" sortKey="department" accessor={(r: ARRecord) => r.department} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="PM" sortKey="projectManager" accessor={(r: ARRecord) => r.projectManager} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Amount" sortKey="amount" accessor={(r: ARRecord) => r.amount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
              <SortableTh label="Tax" sortKey="tax" accessor={(r: ARRecord) => r.tax} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
              <SortableTh label="Total" sortKey="totalAmount" accessor={(r: ARRecord) => r.totalAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
              <SortableTh label="Received" sortKey="receivedAmount" accessor={(r: ARRecord) => r.receivedAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
              <SortableTh label="Outstanding" sortKey="outstanding" accessor={(r: ARRecord) => outstandingOf(r)} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
              <SortableTh label="Due Date" sortKey="dueDate" accessor={(r: ARRecord) => r.dueDate} sort={tc.sort} toggleSort={tc.toggleSort} />
              <SortableTh label="Status" sortKey="status" accessor={(r: ARRecord) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
              <th className="py-2 px-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium">{r.invoiceNo}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.client}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.site?.siteCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.poNo || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.costCenter || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.department || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa]">{r.projectManager || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{(r.amount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">₹{(r.tax ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">₹{(r.totalAmount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#00e676] font-mono">₹{(r.receivedAmount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#ff3d3d] font-mono font-medium">₹{(outstandingOf(r)).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 px-3"><div className="flex items-center gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                    <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={16} className="py-10 text-center text-[#5a6878]">No records found.</td></tr>}
            </tbody>
          </table>
        </div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div>
      </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Invoice</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.invoiceNo}</strong> from {deleteTarget?.client}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
