'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, Send, Save, CircleDot, Pencil, Printer, Upload, History } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';
import InvoiceDocument from './fin-invoice-document';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, DatalistField, CostingFields, useFormValidation, required } from './_form-controls';
import { SortableTh } from './_table-controls';
import { FilterBar, type ListFilters } from './_list-filter-bar';
import { StatusBadge } from './_status-badge';
import { WorkflowActions, AuditTab } from './_workflow-tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface Invoice {
  id: number; invoiceNo: string; siteId: number; partyId: number | null; poId?: number | null; jobCode?: string | null;
  invoiceDate: string; eInvoiceDate?: string | null; dueDate: string; invoiceValue: number; gstValue: number;
  grandTotal: number; balanceAmount: number; status: string; description: string | null;
  trackingNo?: string | null; poNo?: string | null; month?: string | null; area?: string | null;
  client?: string | null; financialYear?: string | null;
  costCenter: string | null; department: string | null; projectManager: string | null;
  tdsDeduction?: number; kpiDeduction?: number; safetyDeduction?: number; otherDeduction?: number;
  afterTdsBalance?: number; receivedAmount?: number; remarks?: string | null;
  site?: { name: string; siteCode?: string | null; location?: string | null; state?: string | null } | null;
  party?: { name: string; gstin?: string | null; address?: string | null; state?: string | null } | null;
}
interface Site { id: number; name: string; siteCode: string; }
interface Party { id: number; name: string; }
interface PoOption { id: number; poNo: string; vendorName: string; }

interface LineItem { id: number; description: string; area: string; month: string; quantity: number; rate: number; }
interface FormData { invoiceNo: string; siteId: number; partyId: number | null; poId: number | null; jobCode: string; invoiceDate: string; dueDate: string; description: string; status: string; poNo: string; trackingNo: string; costCenter: string; department: string; projectManager: string; }
const EMPTY_FORM: FormData = { invoiceNo: '', siteId: 0, partyId: null, poId: null, jobCode: '', invoiceDate: '', dueDate: '', description: '', status: 'Unpaid', poNo: '', trackingNo: '', costCenter: '', department: '', projectManager: '' };

const INVOICE_COLUMNS: ExportColumn<Invoice>[] = [
  { header: 'Invoice No', accessor: 'invoiceNo' },
  { header: 'Tracking No', accessor: 'trackingNo' },
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Client / Party Name', accessor: (r) => r.party?.name || r.client || '' },
  { header: 'Site Name', accessor: (r) => r.site?.name || '' },
  { header: 'Site Code', accessor: (r) => r.site?.siteCode ?? '—' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'Cost Center', accessor: 'costCenter' },
  { header: 'Department', accessor: 'department' },
  { header: 'Project Manager', accessor: 'projectManager' },
  { header: 'Area', accessor: 'area' },
  { header: 'Month', accessor: 'month' },
  { header: 'Invoice Date', accessor: (r) => r.invoiceDate?.split('T')[0] || '' },
  { header: 'E-Invoice Date', accessor: (r) => r.eInvoiceDate?.split('T')[0] || '' },
  { header: 'Due Date', accessor: (r) => r.dueDate?.split('T')[0] || '' },
  { header: 'Invoice Value', accessor: 'invoiceValue' },
  { header: 'GST Value', accessor: 'gstValue' },
  { header: 'Grand Total', accessor: 'grandTotal' },
  { header: 'Balance Amount', accessor: 'balanceAmount' },
  { header: 'Status', accessor: 'status' },
];

const INVOICE_IMPORT_FIELDS: ImportField[] = [
  { key: 'invoiceNo', label: 'Invoice No', required: true },
  { key: 'trackingNo', label: 'Tracking No' },
  { key: 'poNo', label: 'PO No' },
  { key: 'jobCode', label: 'Job Code' },
  { key: 'costCenter', label: 'Cost Center' },
  { key: 'department', label: 'Department' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'client', label: 'Client / Party Name', required: true },
  { key: 'siteName', label: 'Site Name' },
  { key: 'area', label: 'Area' },
  { key: 'month', label: 'Month' },
  { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
  { key: 'eInvoiceDate', label: 'E-Invoice Date', type: 'date' },
  { key: 'invoiceValue', label: 'Invoice Value', type: 'number' },
  { key: 'gstValue', label: 'GST Value', type: 'number' },
  { key: 'grandTotal', label: 'Grand Total', type: 'number' },
  { key: 'balanceAmount', label: 'Balance Amount', type: 'number' },
  { key: 'description', label: 'Description' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'status', label: 'Status' },
  { key: 'tdsDeduction', label: 'TDS Deduction', type: 'number' },
  { key: 'receivedAmount', label: 'Received Amount', type: 'number' },
];

const INVOICE_SAMPLE_ROW: Record<string, string | number> = {
  invoiceNo: 'INV/2025-26/001',
  trackingNo: 'TRK/25-26/001',
  poNo: 'PO/2025-26/001',
  client: 'NTPC Ltd',
  siteName: 'NTPC Rihand Dam Project',
  area: 'Block A',
  month: 'Jan 2026',
  invoiceDate: '2026-01-15',
  dueDate: '2026-04-15',
  eInvoiceDate: '2026-01-16',
  invoiceValue: 2500000,
  gstValue: 450000,
  grandTotal: 2950000,
  balanceAmount: 2950000,
  description: 'Civil works - Phase 1',
  status: 'Unpaid',
};

function generateMockInvoices(): Invoice[] {
  return [
    { id: 1, invoiceNo: 'INV/2024-25/001', siteId: 1, partyId: 1, invoiceDate: '2024-11-20T00:00:00', dueDate: '2025-02-20T00:00:00', invoiceValue: 2500000, gstValue: 450000, grandTotal: 2950000, balanceAmount: 2950000, status: 'Unpaid', description: 'Civil works - Phase 1', trackingNo: 'TRK/24-25/001', poNo: 'PO/2024-25/001', jobCode: 'JOB-2026-001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', month: 'Nov 2024', area: 'Block A', client: 'NTPC Ltd', site: { name: 'NTPC Rihand Dam Project' }, party: { name: 'Bharat Heavy Electricals Ltd' } },
    { id: 2, invoiceNo: 'INV/2024-25/002', siteId: 2, partyId: 2, invoiceDate: '2024-12-10T00:00:00', dueDate: '2025-03-10T00:00:00', invoiceValue: 1800000, gstValue: 324000, grandTotal: 2124000, balanceAmount: 1062000, status: 'Partially Paid', description: 'Electrical panel installation', trackingNo: 'TRK/24-25/002', poNo: 'PO/2024-25/002', jobCode: 'JOB-2026-002', costCenter: 'CC-SIT-002', department: 'Projects', projectManager: 'A. Verma', month: 'Dec 2024', area: 'Main Plant', client: 'BALCO', site: { name: 'BALCO Aluminium Smelter' }, party: { name: 'Tata Projects Ltd' } },
    { id: 3, invoiceNo: 'INV/2024-25/003', siteId: 3, partyId: 1, invoiceDate: '2025-01-05T00:00:00', dueDate: '2025-04-05T00:00:00', invoiceValue: 3200000, gstValue: 576000, grandTotal: 3776000, balanceAmount: 0, status: 'Paid', description: 'Coal conveyor belt system', trackingNo: 'TRK/24-25/003', poNo: 'PO/2024-25/003', jobCode: 'JOB-2026-003', costCenter: 'CC-SIT-003', department: 'Operations', projectManager: 'P. Iyer', month: 'Jan 2025', area: 'Stockyard', client: 'Coal India Ltd', site: { name: 'Coal India Eastern Coalfield' }, party: { name: 'Bharat Heavy Electricals Ltd' } },
    { id: 4, invoiceNo: 'INV/2024-25/004', siteId: 4, partyId: 3, invoiceDate: '2025-02-15T00:00:00', dueDate: '2025-05-15T00:00:00', invoiceValue: 4500000, gstValue: 810000, grandTotal: 5310000, balanceAmount: 5310000, status: 'Unpaid', description: 'Smelter expansion works', trackingNo: 'TRK/24-25/004', poNo: 'PO/2024-25/004', jobCode: 'JOB-2026-004', costCenter: 'CC-SIT-004', department: 'Projects', projectManager: 'S. Rao', month: 'Feb 2025', area: 'Potline Area', client: 'Vedanta Ltd', site: { name: 'Vedanta Jharsuguda Smelter' }, party: { name: 'Larsen & Toubro Ltd' } },
    { id: 5, invoiceNo: 'INV/2024-25/005', siteId: 5, partyId: 2, invoiceDate: '2025-03-20T00:00:00', dueDate: '2025-06-20T00:00:00', invoiceValue: 1250000, gstValue: 225000, grandTotal: 1475000, balanceAmount: 1475000, status: 'Unpaid', description: 'Commissioning & testing', trackingNo: 'TRK/24-25/005', poNo: 'PO/2024-25/005', jobCode: 'JOB-2026-005', costCenter: 'CC-SIT-005', department: 'Site Execution', projectManager: 'M. Khan', month: 'Mar 2025', area: 'Substation', client: 'Hindalco Industries', site: { name: 'Hindalco Mahan Aluminium' }, party: { name: 'Tata Projects Ltd' } },
  ];
}

export default function FinInvoices() {
  const [records, setRecords] = useState<Invoice[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [lines, setLines] = useState<LineItem[]>([{ id: 1, description: '', area: '', month: '', quantity: 1, rate: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [filters, setFilters] = useState<ListFilters>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const setFilter = (key: keyof ListFilters, value: string) => setFilters((p) => ({ ...p, [key]: value }));

  const filtered = records.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (filters.site && !`${r.site?.name ?? ''} ${r.site?.siteCode ?? ''}`.toLowerCase().includes(filters.site.toLowerCase())) return false;
    if (filters.jobCode && !(r.jobCode || '').toLowerCase().includes(filters.jobCode.toLowerCase())) return false;
    if (filters.poNo && !(r.poNo || '').toLowerCase().includes(filters.poNo.toLowerCase())) return false;
    if (filters.costCenter && !(r.costCenter || '').toLowerCase().includes(filters.costCenter.toLowerCase())) return false;
    if (filters.department && !(r.department || '').toLowerCase().includes(filters.department.toLowerCase())) return false;
    return true;
  });
  const tc = useTableControls(filtered, (r) => `${r.invoiceNo} ${r.trackingNo ?? ''} ${r.poNo ?? ''} ${r.party?.name ?? ''} ${r.client ?? ''} ${r.area ?? ''} ${r.month ?? ''} ${r.status}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => { const next = new Set(s); pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id)); return next; });
  const INVOICE_STATUSES = ['All', ...new Set(records.map(r => r.status).filter(Boolean))];

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/invoices');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords(generateMockInvoices()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockInvoices()); toast.info('Sample data — API unavailable'); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]); }
    try {
      const r = await fetch('/api/fin/parties');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setParties(rj.data);
      else setParties([{ id: 1, name: 'L&T Construction' }, { id: 2, name: 'Siemens India Ltd' }, { id: 3, name: 'Tata Projects' }]);
    } catch { setParties([{ id: 1, name: 'L&T Construction' }, { id: 2, name: 'Siemens India Ltd' }, { id: 3, name: 'Tata Projects' }]); }
    try {
      const r = await fetch('/api/fin/purchase-orders');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setPurchaseOrders(rj.data);
    } catch { /* PO list is optional — form still works with free-text PO No */ }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const onDataChanged = () => fetch_();
    window.addEventListener('finance:data-changed', onDataChanged);
    return () => window.removeEventListener('finance:data-changed', onDataChanged);
  }, [fetch_]);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<FormData>({
    invoiceNo: required('Invoice No'),
    siteId: (v) => (!v) ? 'Site is required' : undefined,
    partyId: required('Client / Party'),
    invoiceDate: required('Invoice Date'),
    dueDate: required('Due Date'),
    jobCode: required('Job Code'),
    poNo: required('PO Number'),
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const generateInvoiceNo = () => {
    const year = new Date().getFullYear();
    const existing = new Set(records.map(r => r.invoiceNo));
    let seq = records.length + 1;
    let candidate = `INV-${year}-${String(seq).padStart(3, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `INV-${year}-${String(seq).padStart(3, '0')}`; }
    return candidate;
  };
  const openCreate = () => { setEditTarget(null); setForm({ ...EMPTY_FORM, invoiceNo: generateInvoiceNo() }); setFormErrors({}); setLines([{ id: 1, description: '', area: '', month: '', quantity: 1, rate: 0 }]); setView('form'); };
  const openEdit = (r: Invoice) => { setEditTarget(r); setForm({ invoiceNo: r.invoiceNo, siteId: r.siteId, partyId: r.partyId, poId: r.poId ?? null, jobCode: r.jobCode || '', invoiceDate: r.invoiceDate?.split('T')[0] || '', dueDate: r.dueDate?.split('T')[0] || '', description: r.description || '', status: r.status, poNo: r.poNo || '', trackingNo: r.trackingNo || '', costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '' }); setFormErrors({}); setLines([{ id: 1, description: r.description || '', area: '', month: '', quantity: 1, rate: r.invoiceValue }]); setView('form'); };

  const addLine = () => { setLines([...lines, { id: Date.now(), description: '', area: '', month: '', quantity: 1, rate: 0 }]); };
  const removeLine = (i: number) => { if (lines.length <= 1) return; setLines(lines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => { const u = [...lines]; u[i] = { ...u[i], [field]: value }; setLines(u); };

  const invoiceValue = lines.reduce((s, l) => s + (l.quantity * l.rate), 0);
  const gstValue = invoiceValue * 0.18;
  const grandTotal = invoiceValue + gstValue;

  const handleSubmit = async (status: string) => {
    if (!validateForm(form)) { toast.error('Please fix the highlighted fields'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const common = { invoiceNo: form.invoiceNo, siteId: form.siteId, partyId: form.partyId, poId: form.poId, jobCode: form.jobCode || null, invoiceDate: new Date(form.invoiceDate), dueDate: new Date(form.dueDate), invoiceValue, gstValue, grandTotal, balanceAmount: grandTotal, description: form.description, status, poNo: form.poNo, trackingNo: form.trackingNo, costCenter: form.costCenter || null, department: form.department || null, projectManager: form.projectManager || null, actor: getCurrentUserEmail() };
      const body = editTarget ? { id: editTarget.id, ...common } : common;
      const res = await fetch('/api/fin/invoices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(status === 'Unpaid' ? 'Invoice saved' : 'Invoice submitted'); setView('list'); await fetch_(); }
      else toast.error(json.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => { try { const r = await fetch(`/api/fin/invoices?id=${id}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } }); const j = await r.json(); if (j.success) { toast.success('Deleted'); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      const ids = [...selected].join(',');
      const r = await fetch(`/api/fin/invoices?ids=${ids}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} invoice${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  // ═══════════════════════════════════════════════════════
  // FORM VIEW
  // ═══════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-[#f5a623] mb-1"><button onClick={() => setView('list')} className="hover:underline">Site Invoices</button><span className="text-[#5a6878]"> › </span><span className="text-[#e2e8f0]">{editTarget ? 'Edit' : 'New Invoice'}</span></div>
            <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Create Site Invoice</h2>
            <p className="text-[11px] text-[#5a6878] mt-0.5">Raise invoice against client for site work completed.</p>
          </div>
          <WorkflowActions
            onSave={() => handleSubmit('Unpaid')}
            onSubmit={() => handleSubmit('Unpaid')}
            saving={submitting}
            submitting={submitting}
            saveLabel="Save Draft"
            submitLabel="Submit Invoice"
          />
        </div>

        {/* Status Badges */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Invoice Value</span>
            <span className="text-[14px] font-bold text-[#e2e8f0] font-mono">₹{(invoiceValue ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">GST (18%)</span>
            <span className="text-[14px] font-bold text-[#ffab40] font-mono">₹{(gstValue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Grand Total</span>
            <span className="text-[14px] font-bold text-[#00e676] font-mono">₹{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Client / Party" required error={formErrors.partyId}>
              <SearchableSelect
                value={form.partyId ? String(form.partyId) : ''}
                onChange={v => setField('partyId', v ? Number(v) : null)}
                options={parties.map(p => ({ value: String(p.id), label: p.name }))}
                placeholder="Select client..."
              />
            </FormField>
            <FormField label="Site" required error={formErrors.siteId}>
              <SearchableSelect
                value={form.siteId ? String(form.siteId) : ''}
                onChange={v => setField('siteId', v ? Number(v) : 0)}
                options={sites.map(s => ({ value: String(s.id), label: s.name }))}
                placeholder="Select site..."
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Invoice No" required error={formErrors.invoiceNo}>
              <input value={form.invoiceNo} readOnly placeholder="Auto-generated" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] opacity-60 placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Invoice Date" required error={formErrors.invoiceDate}>
              <input type="date" value={form.invoiceDate} onChange={e => setField('invoiceDate', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Due Date" required error={formErrors.dueDate}>
              <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="PO Number" required error={formErrors.poNo}>
              <DatalistField id="fin-inv-po-no" value={form.poNo} onChange={v => setField('poNo', v)} options={[...new Set([...purchaseOrders.map(po => po.poNo), ...records.map(r => r.poNo).filter(Boolean) as string[]])]} placeholder="PO-1001" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Job Code" required error={formErrors.jobCode}>
              <DatalistField id="fin-inv-job-code" value={form.jobCode} onChange={v => setField('jobCode', v)} options={[...new Set(records.map(r => r.jobCode).filter(Boolean) as string[])]} placeholder="JOB-2026-001" />
            </FormField>
          </div>
          <div><label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Description</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Work description..." className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
          <CostingFields prefix="fin-inv" form={{ costCenter: form.costCenter, department: form.department, projectManager: form.projectManager }} setField={(k, v) => setField(k, v)} errors={formErrors} />
        </div>

        {/* Line Items */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a]">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">Work Items / Line Allocations</h3>
            <button onClick={addLine} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a] transition-colors"><Plus size={14} className="border border-[#f5a623] rounded-full" /> ADD LINE</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[35%]">Description</th>
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[18%]">Area</th>
            <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Month</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[12%]">Qty</th>
            <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[15%]">Rate (₹)</th>
            <th className="w-[5%]"></th>
          </tr></thead><tbody>
            {lines.map((line, i) => (
              <tr key={line.id} className="border-b border-[#1a2028] hover:bg-[#141920]">
                <td className="py-3 px-4"><input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Work item..." className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input value={line.area} onChange={e => updateLine(i, 'area', e.target.value)} placeholder="Area name" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input value={line.month} onChange={e => updateLine(i, 'month', e.target.value)} placeholder="Jan 2025" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.quantity ?? ''} onChange={e => updateLine(i, 'quantity', Number(e.target.value) || 0)} className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4"><input type="number" value={line.rate ?? ''} onChange={e => updateLine(i, 'rate', Number(e.target.value) || 0)} placeholder="0.00" className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                <td className="py-3 px-4 text-center"><button onClick={() => removeLine(i)} className="p-1.5 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
              <td colSpan={4} className="py-3 px-4 text-right"><span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Subtotal</span></td>
              <td className="py-3 px-4 text-right"><span className="text-[14px] font-bold text-[#e2e8f0] font-mono">₹{(invoiceValue ?? 0).toLocaleString('en-IN')}</span></td>
              <td></td>
            </tr>
          </tbody></table></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Grand Total: <span className="text-[#f5a623]">₹{(grandTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></span>
          <div className="flex items-center gap-4 text-[11px] text-[#5a6878]">
            <div className="flex items-center gap-1.5"><CircleDot size={12} className="text-[#00e676]" /> GST @18% applied</div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="vc-panel">
          <div className="vc-panel-header"><History size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Audit Trail</span></div>
          <div className="p-3">
            <AuditTab
              currentStatus={editTarget?.status || 'Draft'}
              entries={[
                ...(editTarget ? [{ id: 1, date: editTarget.invoiceDate, action: 'Invoice created', by: editTarget.client || '—' }] : []),
                { id: 2, date: new Date().toISOString(), action: 'Form opened', note: 'Record is being edited / created by the current user.' },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (importOpen) {
    return (
      <ImportWizard
        title="Site Invoices"
        fields={INVOICE_IMPORT_FIELDS}
        keyField="invoiceNo"
        existingKeys={new Set(records.map(r => r.invoiceNo))}
        commitEndpoint="/api/fin/invoices/import"
        sampleRow={INVOICE_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  // ═══════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════
  const totalValue = records.reduce((s, r) => s + r.grandTotal, 0);
  const totalBalance = records.reduce((s, r) => s + r.balanceAmount, 0);

  return (
    <div className="space-y-4 p-6">
      <FilterBar
        filters={filters}
        setFilter={setFilter}
        options={{
          sites: sites.map(s => ({ value: s.siteCode || String(s.id), label: `${s.siteCode || s.name}`, sublabel: s.name })),
          jobs: [...new Set(records.map(r => r.jobCode).filter(Boolean))].map(j => ({ value: j as string, label: j as string })),
          poNos: [...new Set(records.map(r => r.poNo).filter(Boolean))].map(p => ({ value: p as string, label: p as string })),
          costCenters: [...new Set(records.map(r => r.costCenter).filter(Boolean))] as string[],
          departments: [...new Set(records.map(r => r.department).filter(Boolean))] as string[],
        }}
        search={tc.search}
        setSearch={tc.setSearch}
        searchPlaceholder="Search invoices..."
      />
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Invoiced</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalValue / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Outstanding</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalBalance / 10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Invoices</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><FileText size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Site Invoices</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="vc-input !w-auto !py-1 !px-2 ml-2 text-[11px] appearance-none">{INVOICE_STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}</select><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search invoices..." /></div>{selected.size > 0 && <div className="flex items-center gap-2 ml-2"><span className="text-[10px] text-[#8899aa]">{selected.size} selected</span><button onClick={() => setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button><button onClick={() => setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete</button></div>}<div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={INVOICE_COLUMNS} filename="fin-invoices" /></div><button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Invoice</button></div>
        <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
        <th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>
        <SortableTh label="Tracking No." sortKey="trackingNo" accessor={(r: Invoice) => r.trackingNo} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="PO No." sortKey="poNo" accessor={(r: Invoice) => r.poNo} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Job Code" sortKey="jobCode" accessor={(r: Invoice) => r.jobCode} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Bill No." sortKey="invoiceNo" accessor={(r: Invoice) => r.invoiceNo} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Client" sortKey="client" accessor={(r: Invoice) => r.party?.name || r.client} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Area" sortKey="area" accessor={(r: Invoice) => r.area} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Month" sortKey="month" accessor={(r: Invoice) => r.month} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Bill Date" sortKey="invoiceDate" accessor={(r: Invoice) => r.invoiceDate} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="E-Inv Date" sortKey="eInvoiceDate" accessor={(r: Invoice) => r.eInvoiceDate} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Invoice Value" sortKey="invoiceValue" accessor={(r: Invoice) => r.invoiceValue} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
        <SortableTh label="GST Value" sortKey="gstValue" accessor={(r: Invoice) => r.gstValue} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
        <SortableTh label="Total Inv Value" sortKey="grandTotal" accessor={(r: Invoice) => r.grandTotal} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
        <SortableTh label="Status" sortKey="status" accessor={(r: Invoice) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
        <th className="py-2 px-3"></th>
      </tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => <tr key={r.id} onClick={() => setViewInvoice(r)} className="hover:bg-[#141920] cursor-pointer"><td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.trackingNo || 'NA'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.poNo || 'NA'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || 'NA'}</td><td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.invoiceNo}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[180px] truncate">{r.party?.name || r.client || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[120px] truncate">{r.area || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] whitespace-nowrap">{r.month || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.invoiceDate?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.eInvoiceDate?.split('T')[0] || '—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">₹{(r.invoiceValue ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">₹{(r.gstValue ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#00e676] font-mono text-right font-medium whitespace-nowrap">₹{(r.grandTotal ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><StatusBadge status={r.status} /></td><td className="py-2.5 px-3" onClick={e => e.stopPropagation()}><div className="flex gap-1"><button onClick={() => setViewInvoice(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="View / Print"><Printer size={13} /></button><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button></div></td></tr>)}{tc.pageItems.length === 0 && <tr><td colSpan={15} className="py-8 text-center text-[#5a6878]">No matching invoices</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      {viewInvoice && <InvoiceDocument invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Invoice{selected.size === 1 ? '' : 's'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete {selected.size} selected invoice{selected.size === 1 ? '' : 's'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
