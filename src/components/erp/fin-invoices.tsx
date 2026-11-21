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
  id: number; invoiceNo: string; siteId: number; partyId: number | null; poId?: number | null; workOrderId?: number | null; taxCodeId?: number | null; jobCode?: string | null;
  invoiceDate: string; eInvoiceDate?: string | null; dueDate: string; invoiceValue: number; gstValue: number;
  grandTotal: number; balanceAmount: number; status: string; description: string | null;
  trackingNo?: string | null; poNo?: string | null; month?: string | null; area?: string | null;
  client?: string | null; financialYear?: string | null;
  costCenter: string | null; department: string | null; projectManager: string | null;
  tdsDeduction?: number; kpiDeduction?: number; safetyDeduction?: number; otherDeduction?: number;
  afterTdsBalance?: number; receivedAmount?: number; remarks?: string | null;
  site?: { name: string; siteCode?: string | null; location?: string | null; state?: string | null } | null;
  party?: { name: string; gstin?: string | null; address?: string | null; state?: string | null } | null;
  workOrder?: { workOrderNo: string } | null;
  taxCode?: TaxCodeOption | null;
}
interface Site { id: number; name: string; siteCode: string; customerId?: number | null; }
interface Party { id: number; name: string; partyType?: string; }
interface WorkOrderOption { id: number; workOrderNo: string; customerId: number; siteId: number; jobCode: string; }
interface TaxCodeOption { id: number; code: string; description: string; cgstRate: number; sgstRate: number; igstRate: number; cessRate: number; status: string; }

interface LineItem { id: number; description: string; area: string; month: string; quantity: number; rate: number; }
interface FormData { invoiceNo: string; siteId: number; partyId: number | null; workOrderId: number | null; taxCodeId: number | null; jobCode: string; invoiceDate: string; dueDate: string; description: string; status: string; poNo: string; trackingNo: string; costCenter: string; department: string; projectManager: string; }
const EMPTY_FORM: FormData = { invoiceNo: '', siteId: 0, partyId: null, workOrderId: null, taxCodeId: null, jobCode: '', invoiceDate: '', dueDate: '', description: '', status: 'Unpaid', poNo: '', trackingNo: '', costCenter: '', department: '', projectManager: '' };

const INVOICE_COLUMNS: ExportColumn<Invoice>[] = [
  { header: 'Invoice No', accessor: 'invoiceNo' },
  { header: 'Tracking No', accessor: 'trackingNo' },
  { header: 'Customer Work Order', accessor: (r) => r.workOrder?.workOrderNo || '' },
  { header: 'Legacy PO Ref', accessor: 'poNo' },
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
  { key: 'workOrderNo', label: 'Customer Work Order No' },
  { key: 'poNo', label: 'Legacy PO Reference' },
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
  workOrderNo: 'WO/2026/0001',
  jobCode: 'JOB-2026-001',
  costCenter: 'CC-SIT-001',
  department: 'Projects',
  projectManager: 'R. Sharma',
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
  receivedAmount: 0,
  tdsDeduction: 37500,
  description: 'Civil works - Phase 1',
  remarks: '',
  status: 'Unpaid',
};

export default function FinInvoices() {
  const [records, setRecords] = useState<Invoice[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
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
      if (!r.ok || !rj.success || !Array.isArray(rj.data)) {
        throw new Error(rj.error || 'Failed to load invoices');
      }
      setRecords(rj.data);
    } catch (error) {
      setRecords([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load invoices');
    }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (!r.ok || !rj.success || !Array.isArray(rj.data)) {
        throw new Error(rj.error || 'Failed to load sites');
      }
      setSites(rj.data);
    } catch (error) {
      setSites([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load sites');
    }
    try {
      const r = await fetch('/api/fin/parties');
      const rj = await r.json();
      if (!r.ok || !rj.success || !Array.isArray(rj.data)) {
        throw new Error(rj.error || 'Failed to load parties');
      }
      setParties(rj.data.filter((party: Party) => party.partyType === 'Customer'));
    } catch (error) {
      setParties([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load parties');
    }
    try {
      const r = await fetch('/api/fin/tax-codes', { headers: { 'x-actor-email': getCurrentUserEmail() } });
      const rj = await r.json();
      if (!r.ok || !rj.success || !Array.isArray(rj.data)) throw new Error(rj.error || 'Failed to load GST tax codes');
      setTaxCodes(rj.data.filter((code: TaxCodeOption) => code.status === 'Approved'));
    } catch (error) {
      setTaxCodes([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load approved GST tax codes');
    }
    try {
      const r = await fetch('/api/fin/work-orders');
      const rj = await r.json();
      if (!r.ok || !rj.success || !Array.isArray(rj.data)) throw new Error(rj.error || 'Failed to load customer Work Orders');
      setWorkOrders(rj.data);
    } catch (error) {
      setWorkOrders([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load customer Work Orders');
    }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const onDataChanged = () => fetch_();
    window.addEventListener('finance:data-changed', onDataChanged);
    return () => window.removeEventListener('finance:data-changed', onDataChanged);
  }, [fetch_]);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<FormData>({
    invoiceNo: () => undefined, // generated by the server on save
    siteId: (v) => (!v) ? 'Site is required' : undefined,
    partyId: required('Client / Party'),
    invoiceDate: required('Invoice Date'),
    dueDate: required('Due Date'),
    jobCode: required('Job Code'),
    workOrderId: (value) => (!editTarget && !value) ? 'Customer Work Order is required' : undefined,
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const openCreate = () => { setEditTarget(null); setForm({ ...EMPTY_FORM, invoiceNo: '' }); setFormErrors({}); setLines([{ id: 1, description: '', area: '', month: '', quantity: 1, rate: 0 }]); setView('form'); };
  const openEdit = (r: Invoice) => { setEditTarget(r); setForm({ invoiceNo: r.invoiceNo, siteId: r.siteId, partyId: r.partyId, workOrderId: r.workOrderId ?? null, taxCodeId: r.taxCodeId ?? null, jobCode: r.jobCode || '', invoiceDate: r.invoiceDate?.split('T')[0] || '', dueDate: r.dueDate?.split('T')[0] || '', description: r.description || '', status: r.status, poNo: r.poNo || '', trackingNo: r.trackingNo || '', costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '' }); setFormErrors({}); setLines([{ id: 1, description: r.description || '', area: '', month: '', quantity: 1, rate: r.invoiceValue }]); setView('form'); };

  const addLine = () => { setLines([...lines, { id: Date.now(), description: '', area: '', month: '', quantity: 1, rate: 0 }]); };
  const removeLine = (i: number) => { if (lines.length <= 1) return; setLines(lines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => { const u = [...lines]; u[i] = { ...u[i], [field]: value }; setLines(u); };

  const invoiceValue = lines.reduce((s, l) => s + (l.quantity * l.rate), 0);
  const selectedTaxCode = taxCodes.find(code => code.id === form.taxCodeId);
  const taxAmount = (rate: number) => Math.round((invoiceValue * rate / 100 + Number.EPSILON) * 100) / 100;
  const taxBreakdown = selectedTaxCode ? {
    cgst: taxAmount(selectedTaxCode.cgstRate),
    sgst: taxAmount(selectedTaxCode.sgstRate),
    igst: taxAmount(selectedTaxCode.igstRate),
    cess: taxAmount(selectedTaxCode.cessRate),
  } : { cgst: 0, sgst: 0, igst: 0, cess: 0 };
  const gstValue = taxBreakdown.cgst + taxBreakdown.sgst + taxBreakdown.igst + taxBreakdown.cess;
  const grandTotal = invoiceValue + gstValue;

  const handleSubmit = async (status: string) => {
    if (!validateForm(form)) { toast.error('Please fix the highlighted fields'); return; }
    if (!lines.some(l => (l.quantity || 0) > 0)) { toast.error('At least one line item with quantity is required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const common = { invoiceNo: form.invoiceNo, siteId: form.siteId, partyId: form.partyId, workOrderId: form.workOrderId, taxCodeId: form.taxCodeId, jobCode: form.jobCode || null, invoiceDate: new Date(form.invoiceDate), dueDate: new Date(form.dueDate), invoiceValue, taxableValue: invoiceValue, gstValue, grandTotal, balanceAmount: grandTotal, description: form.description, status, trackingNo: form.trackingNo, costCenter: form.costCenter || null, department: form.department || null, projectManager: form.projectManager || null, lines: lines.filter(l => l.description || l.area || l.month || l.rate || l.quantity > 1).map(l => ({ description: l.description, area: l.area, month: l.month, quantity: l.quantity, rate: l.rate })), actor: getCurrentUserEmail() };
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
            <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">GST (configured code)</span>
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
                onChange={v => { setForm(p => ({ ...p, partyId: v ? Number(v) : null, workOrderId: null })); clearError('partyId'); clearError('workOrderId'); }}
                options={parties.map(p => ({ value: String(p.id), label: p.name }))}
                placeholder="Select client..."
              />
            </FormField>
            <FormField label="Site" required error={formErrors.siteId}>
              <SearchableSelect
                value={form.siteId ? String(form.siteId) : ''}
                onChange={v => { setForm(p => ({ ...p, siteId: v ? Number(v) : 0, workOrderId: null })); clearError('siteId'); clearError('workOrderId'); }}
                options={sites.filter(s => !form.partyId || !s.customerId || s.customerId === form.partyId).map(s => ({ value: String(s.id), label: s.name }))}
                placeholder="Select site..."
              />
            </FormField>
          </div>
          <FormField label="Approved GST Tax Code" hint="Rates and ledger treatment come from the approved Finance setup; blank means no GST is calculated.">
            <select value={form.taxCodeId ?? ''} onChange={e => setField('taxCodeId', e.target.value ? Number(e.target.value) : null)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
              <option value="">No GST tax code</option>
              {taxCodes.map(code => <option key={code.id} value={code.id}>{code.code} — {code.description} ({code.cgstRate + code.sgstRate + code.igstRate + code.cessRate}%)</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Invoice No" hint="Generated automatically when you save">
              <input value={form.invoiceNo} readOnly placeholder="Auto-generated on save" className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] opacity-60 placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Invoice Date" required error={formErrors.invoiceDate}>
              <input type="date" value={form.invoiceDate} onChange={e => setField('invoiceDate', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Due Date" required error={formErrors.dueDate}>
              <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none" />
            </FormField>
            <FormField label="Customer Work Order" required={!editTarget} error={formErrors.workOrderId}>
              <select value={form.workOrderId ?? ''} onChange={e => {
                const workOrder = workOrders.find(item => item.id === Number(e.target.value));
                setForm(p => ({
                  ...p,
                  workOrderId: workOrder?.id ?? null,
                  partyId: workOrder?.customerId ?? p.partyId,
                  siteId: workOrder?.siteId ?? p.siteId,
                  jobCode: workOrder?.jobCode ?? p.jobCode,
                }));
                clearError('workOrderId');
              }} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
                <option value="">{editTarget ? 'Legacy invoice — no customer Work Order' : 'Select customer Work Order'}</option>
                {workOrders.filter(order => (!form.partyId || order.customerId === form.partyId) && (!form.siteId || order.siteId === form.siteId)).map(order =>
                  <option key={order.id} value={order.id}>{order.workOrderNo} — {parties.find(p => p.id === order.customerId)?.name || 'Customer'}</option>
                )}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="Job Code" required error={formErrors.jobCode}>
              <input value={form.jobCode} readOnly className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] opacity-80" placeholder="Select a customer Work Order" />
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
            <div className="flex items-center gap-1.5"><CircleDot size={12} className={selectedTaxCode ? 'text-[#00e676]' : 'text-[#f5a623]'} />
              {selectedTaxCode ? `${selectedTaxCode.code}: CGST ${selectedTaxCode.cgstRate}% / SGST ${selectedTaxCode.sgstRate}% / IGST ${selectedTaxCode.igstRate}% / Cess ${selectedTaxCode.cessRate}%` : 'No approved GST code selected'}
            </div>
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
        <SortableTh label="Customer Work Order" sortKey="workOrder" accessor={(r: Invoice) => r.workOrder?.workOrderNo} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Legacy PO Ref" sortKey="poNo" accessor={(r: Invoice) => r.poNo} sort={tc.sort} toggleSort={tc.toggleSort} />
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
      </tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => <tr key={r.id} onClick={() => setViewInvoice(r)} className="hover:bg-[#141920] cursor-pointer"><td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.trackingNo || 'NA'}</td><td className="py-2.5 px-3 text-[#00d4ff] font-mono">{r.workOrder?.workOrderNo || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.poNo || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode || 'NA'}</td><td className="py-2.5 px-3 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.invoiceNo}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[180px] truncate">{r.party?.name || r.client || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[120px] truncate">{r.area || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] whitespace-nowrap">{r.month || '—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.invoiceDate?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.eInvoiceDate?.split('T')[0] || '—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">₹{(r.invoiceValue ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">₹{(r.gstValue ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3 text-[#00e676] font-mono text-right font-medium whitespace-nowrap">₹{(r.grandTotal ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><StatusBadge status={r.status} /></td><td className="py-2.5 px-3" onClick={e => e.stopPropagation()}><div className="flex gap-1"><button onClick={() => setViewInvoice(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="View / Print"><Printer size={13} /></button><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button><button onClick={() => handleDelete(r.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button></div></td></tr>)}{tc.pageItems.length === 0 && <tr><td colSpan={16} className="py-8 text-center text-[#5a6878]">No matching invoices</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      {viewInvoice && <InvoiceDocument invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Invoice{selected.size === 1 ? '' : 's'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete {selected.size} selected invoice{selected.size === 1 ? '' : 's'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
