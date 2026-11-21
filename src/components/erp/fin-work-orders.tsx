'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Upload, Printer, Tag, FileText, CalendarDays, IndianRupee, ShieldCheck, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, FormSection, SearchableSelect, DatalistField, useFormValidation, required } from './_form-controls';
import { useCompanyProfile } from '@/hooks/use-company-profile';

interface Customer { id: number; name: string; code: string | null; }
interface Site { id: number; name: string; siteCode: string; customerId?: number | null; }
interface WorkOrder {
  id: number; workOrderNo: string; customerId: number; siteId: number; jobCode: string | null; costCenter: string | null;
  department: string | null; projectManager: string | null;
  date: string | null; descriptionOfWork: string | null;
  orderInitiationDate: string | null; orderCompletionDate: string | null;
  bgAmount: number | null; bgSource: string | null;
  totalAmount: number; unexecutedWorkAmount: number; amountBookedLastFY: number; amountBookedCurrentFY: number;
  amountToBeBookedByEndFY: number;
  billRaisedAmount: number; amountReceivedOutOfBill: number; workDoneNotBilled: number;
  delayExtensionLetter: string | null; reasonOfDelay: string | null; subcontractedTo: string | null;
  status: string;
  customer?: { id: number; name: string; code: string | null };
  site?: { id: number; name: string; siteCode: string };
}
interface FormData {
  workOrderNo: string; customerId: number; siteId: number; jobCode: string; costCenter: string; department: string; projectManager: string;
  date: string; descriptionOfWork: string;
  orderInitiationDate: string; orderCompletionDate: string;
  bgAmount: number; bgSource: string;
  totalAmount: number; unexecutedWorkAmount: number; amountBookedLastFY: number; amountBookedCurrentFY: number;
  amountToBeBookedByEndFY: number;
  billRaisedAmount: number; amountReceivedOutOfBill: number; workDoneNotBilled: number;
  delayExtensionLetter: string; reasonOfDelay: string; subcontractedTo: string; status: string;
}
const EMPTY: FormData = {
  workOrderNo: '', customerId: 0, siteId: 0, jobCode: '', costCenter: '', department: '', projectManager: '',
  date: '', descriptionOfWork: '',
  orderInitiationDate: '', orderCompletionDate: '',
  bgAmount: 0, bgSource: '', totalAmount: 0, unexecutedWorkAmount: 0, amountBookedLastFY: 0, amountBookedCurrentFY: 0,
  amountToBeBookedByEndFY: 0, billRaisedAmount: 0, amountReceivedOutOfBill: 0, workDoneNotBilled: 0,
  delayExtensionLetter: '', reasonOfDelay: '', subcontractedTo: '', status: 'Active',
};

const WO_COLUMNS: ExportColumn<WorkOrder>[] = [
  { header: 'WO No', accessor: 'workOrderNo' },
  { header: 'Customer', accessor: (r) => r.customer?.name || '' },
  { header: 'Site', accessor: (r) => r.site?.name || '' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'Cost Center', accessor: 'costCenter' },
  { header: 'Department', accessor: 'department' },
  { header: 'Project Manager', accessor: 'projectManager' },
  { header: 'Description of Work', accessor: 'descriptionOfWork' },
  { header: 'Init Date', accessor: (r) => r.orderInitiationDate?.split('T')[0] ?? '' },
  { header: 'Total Amount', accessor: 'totalAmount' },
  { header: 'Unexecuted', accessor: 'unexecutedWorkAmount' },
  { header: 'Bill Raised', accessor: 'billRaisedAmount' },
  { header: 'Received', accessor: 'amountReceivedOutOfBill' },
  { header: 'Status', accessor: 'status' },
];
const STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];
const STATUS_COLORS: Record<string, string> = { Active: '#00e676', Completed: '#00d4ff', 'On Hold': '#ffab40', Cancelled: '#5a6878' };
const statusColor = (s: string) => STATUS_COLORS[s] || '#5a6878';
const chipCls = 'inline-flex items-center bg-[#0f1318] border border-[#252e3a] rounded px-1.5 py-0.5 text-[10px] text-[#8899aa] font-mono whitespace-nowrap';

const WO_IMPORT_FIELDS: ImportField[] = [
  { key: 'workOrderNo', label: 'WO No', required: true },
  { key: 'customerName', label: 'Customer Name', required: true },
  { key: 'siteCode', label: 'Site Code', required: true },
  { key: 'jobCode', label: 'Job Code', required: true },
  { key: 'costCenter', label: 'Cost Center', required: true },
  { key: 'department', label: 'Department', required: true },
  { key: 'projectManager', label: 'Project Manager', required: true },
  { key: 'descriptionOfWork', label: 'Description of Work' },
  { key: 'orderInitiationDate', label: 'Order Initiation Date', type: 'date' },
  { key: 'orderCompletionDate', label: 'Order Completion Date', type: 'date' },
  { key: 'totalAmount', label: 'Total Amount', type: 'number' },
  { key: 'unexecutedWorkAmount', label: 'Unexecuted Work Amount', type: 'number' },
  { key: 'billRaisedAmount', label: 'Bill Raised Amount', type: 'number' },
  { key: 'amountReceivedOutOfBill', label: 'Amount Received Out of Bill', type: 'number' },
  { key: 'workDoneNotBilled', label: 'Work Done Not Billed', type: 'number' },
  { key: 'bgAmount', label: 'BG Amount', type: 'number' },
  { key: 'bgSource', label: 'BG Source' },
  { key: 'amountBookedLastFY', label: 'Amount Booked Last FY', type: 'number' },
  { key: 'amountBookedCurrentFY', label: 'Amount Booked Current FY', type: 'number' },
  { key: 'amountToBeBookedByEndFY', label: 'Amount To Be Booked By End FY', type: 'number' },
  { key: 'status', label: 'Status' },
  { key: 'subcontractedTo', label: 'Subcontracted To' },
  { key: 'delayExtensionLetter', label: 'Delay/Extension Letter' },
  { key: 'reasonOfDelay', label: 'Reason of Delay' },
];
const WO_SAMPLE_ROW = {
  workOrderNo: 'WO/2026/001', customerName: 'NTPC Ltd', siteCode: 'SITE-001',
  jobCode: 'JOB-2026-001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma',
  descriptionOfWork: 'Overhauling of 500MW turbine generator set', orderInitiationDate: '2024-06-01',
  orderCompletionDate: '', totalAmount: 42000000, unexecutedWorkAmount: 18000000, billRaisedAmount: 24000000,
  amountReceivedOutOfBill: 20000000, workDoneNotBilled: 2000000, bgAmount: 5000000,
  bgSource: 'SBI Bank Guarantee', amountBookedLastFY: 12000000, amountBookedCurrentFY: 12000000,
  amountToBeBookedByEndFY: 0, status: 'Active', subcontractedTo: '',
  delayExtensionLetter: '', reasonOfDelay: '',
};

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN'); }

function numToWords(n: number): string {
  if (n === 0) return 'Zero';
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['','','Twenty ','Thirty ','Forty ','Fifty ','Sixty ','Seventy ','Eighty ','Ninety '];
  const units = ['','Thousand ','Lakh ','Crore '];
  let s = '', i = 0;
  if (n < 0) { s = 'Minus '; n = -n; }
  let x = Math.round(n);
  while (x > 0) {
    const part = x % (i === 0 ? 1000 : 100);
    if (part > 0) {
      let partStr = '';
      if (i === 0) {
        if (part >= 100) { partStr += a[Math.floor(part / 100)] + 'Hundred '; }
        const rem = part % 100;
        if (rem > 0) partStr += rem < 20 ? a[rem] : b[Math.floor(rem / 10)] + a[rem % 10];
      } else { partStr += part < 20 ? a[part] : b[Math.floor(part / 10)] + a[part % 10]; }
      s = partStr + units[i] + s;
    }
    x = i === 0 ? Math.floor(x / 1000) : Math.floor(x / 100);
    i++;
  }
  return s.trim() + ' Only';
}

export default function FinWorkOrders() {
  const companyProfile = useCompanyProfile();
  const [records, setRecords] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const { errors: formErrors, validate, clearError } = useFormValidation<FormData>({
    customerId: (v) => (!v) ? 'Select a customer' : undefined,
    siteId: (v) => (!v) ? 'Select a site' : undefined,
    jobCode: required('Job Code'),
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };

  const customerNames = useMemo(() => [...new Set(records.map(r => r.customer?.name).filter(Boolean))].sort() as string[], [records]);

  const filtered = useMemo(() => records.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (customerFilter === 'all' || r.customer?.name === customerFilter)
  ), [records, statusFilter, customerFilter]);

  const tc = useTableControls(filtered, (r) => `${r.workOrderNo} ${r.customer?.name ?? ''} ${r.descriptionOfWork ?? ''} ${r.status}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => {
    const next = new Set(s);
    pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id));
    return next;
  });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/work-orders');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords([]); }
    } catch { setRecords([]); toast.error('Failed to load work orders'); }
    try {
      const r = await fetch('/api/fin/parties');
      const rj = await r.json();
      if (rj.success && rj.data?.length) {
        setCustomers(rj.data.filter((p: any) => p.partyType === 'Customer'));
      }
    } catch { /* empty customers */ }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
    } catch { /* empty sites */ }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openNew = () => { setEditTarget(null); setForm({ ...EMPTY }); setFormOpen(true); };
  const openEdit = (r: WorkOrder) => {
    setEditTarget(r);
    setForm({
      workOrderNo: r.workOrderNo, customerId: r.customerId, siteId: r.siteId, jobCode: r.jobCode || '',
      costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '',
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      descriptionOfWork: r.descriptionOfWork || '',
      orderInitiationDate: r.orderInitiationDate ? new Date(r.orderInitiationDate).toISOString().split('T')[0] : '',
      orderCompletionDate: r.orderCompletionDate ? new Date(r.orderCompletionDate).toISOString().split('T')[0] : '',
      bgAmount: r.bgAmount || 0, bgSource: r.bgSource || '',
      totalAmount: r.totalAmount, unexecutedWorkAmount: r.unexecutedWorkAmount,
      amountBookedLastFY: r.amountBookedLastFY, amountBookedCurrentFY: r.amountBookedCurrentFY,
      amountToBeBookedByEndFY: r.amountToBeBookedByEndFY,
      billRaisedAmount: r.billRaisedAmount, amountReceivedOutOfBill: r.amountReceivedOutOfBill,
      workDoneNotBilled: r.workDoneNotBilled,
      delayExtensionLetter: r.delayExtensionLetter || '', reasonOfDelay: r.reasonOfDelay || '',
      subcontractedTo: r.subcontractedTo || '',
      status: r.status,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate(form)) { toast.error('Please fix the highlighted fields'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        actor: getCurrentUserEmail(),
        date: form.date ? new Date(form.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        orderInitiationDate: form.orderInitiationDate || null,
        orderCompletionDate: form.orderCompletionDate || null,
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/work-orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Work order updated' : 'Work order created'); setFormOpen(false); await fetch_(); }
      else toast.error(j.error || 'Failed to save work order');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/fin/work-orders?id=${deleteTarget.id}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error || 'Failed to delete');
    } catch { toast.error('Network error'); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = [...selected].join(',');
      const r = await fetch(`/api/fin/work-orders?ids=${ids}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} work order${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); }
      else toast.error(j.error || 'Bulk delete failed');
    } catch { toast.error('Network error'); }
    finally { setBulkDeleting(false); }
  };

  const totalAmount = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalBilled = records.reduce((s, r) => s + r.billRaisedAmount, 0);
  const totalUnexec = records.reduce((s, r) => s + r.unexecutedWorkAmount, 0);
  const totalReceived = records.reduce((s, r) => s + r.amountReceivedOutOfBill, 0);

  const handlePrint = (r: WorkOrder) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const fmtNum = (n: number) => '₹ ' + (n ?? 0).toLocaleString('en-IN');
    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const customerName = r.customer?.name || '—';
    const siteName = r.site?.name || '—';
    const companyName = companyProfile.name || 'VoltCore Engineering Pvt Ltd';
    const companyAddress = companyProfile.address || '123 Industrial Area, Korba, Chhattisgarh - 495677';
    const companyGstin = companyProfile.gstin || '';
    const companyPan = companyProfile.pan || '';
    const logoHtml = companyProfile.logoUrl ? `<img src="${companyProfile.logoUrl}" alt="Logo" class="brand-logo"/>` : `<div class="brand-mark">WO</div>`;
    const statNow = new Date();
    const financialRows = [
      ['Total Amount', r.totalAmount], ['Unexecuted Work Amount', r.unexecutedWorkAmount],
      ['Bill Raised', r.billRaisedAmount], ['Amount Received Out of Bill', r.amountReceivedOutOfBill],
      ['Work Done Not Billed', r.workDoneNotBilled],
      ['Amount Booked Last FY', r.amountBookedLastFY], ['Amount Booked Current FY', r.amountBookedCurrentFY],
      ['Amount To Be Booked By End FY', r.amountToBeBookedByEndFY],
    ].map(([label, val]) => `<tr><td class="lbl-cell">${label}</td><td class="val-cell">${fmtNum(val as number)}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Work Order - ${esc(r.workOrderNo)}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#e9ecef;color:#191c1e;padding:24px}
      .sheet{max-width:800px;margin:0 auto;background:#fff;padding:36px;box-shadow:0 0 20px rgba(0,0,0,0.12);position:relative}
      header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e8891a;padding-bottom:20px;margin-bottom:24px}
      .brand{display:flex;align-items:center;gap:12px}
      .brand-mark{width:40px;height:40px;border-radius:4px;background:#e8891a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
      .brand-logo{height:40px;max-width:120px;object-fit:contain}
      .brand-name{font-size:19px;font-weight:800;letter-spacing:.3px;color:#191c1e}
      .brand-sub{font-size:10px;color:#666;margin-top:2px;max-width:260px}
      .doc-title{text-align:right}
      .doc-title h2{font-size:17px;font-weight:700;color:#191c1e}
      .badge{display:inline-block;margin-top:6px;padding:2px 8px;font-size:9px;font-weight:700;letter-spacing:.5px;border:1px solid #dac2af;border-radius:3px;background:#f2f4f6;color:#544435}
      .doc-no{font-size:13px;font-weight:700;color:#e8891a;margin-top:8px}
      .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #dac2af;margin-bottom:24px;background:#f7f9fb}
      .meta-grid>div{padding:10px 14px;border-right:1px solid #dac2af}
      .meta-grid>div:last-child{border-right:none}
      .meta-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#544435;font-weight:600}
      .meta-val{font-size:13px;font-weight:700;color:#191c1e;margin-top:3px}
      .status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
      h3.section{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#191c1e;border-left:3px solid #e8891a;padding-left:10px;margin-bottom:10px}
      section{margin-bottom:24px}
      .pill-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .pill{background:#eceef0;border:1px solid #dac2af;padding:10px 12px}
      .pill-lbl{font-size:9px;color:#544435;text-transform:uppercase;letter-spacing:.4px}
      .pill-val{font-size:15px;font-weight:700;color:#191c1e;margin-top:3px}
      .task-box{border:1px solid #dac2af;padding:14px}
      .task-title{font-size:14px;font-weight:700;margin-bottom:6px}
      .task-desc{font-size:11px;line-height:1.6;color:#3a3a3a;text-align:justify}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
      table.kv{width:100%;border-collapse:collapse}
      table.kv td{padding:6px 0;font-size:11px;border-bottom:1px dotted #ccc}
      table.kv td:first-child{color:#544435}
      table.kv td:last-child{text-align:right;font-weight:700}
      table.fin{width:100%;border-collapse:collapse;border:1px solid #dac2af}
      table.fin td{padding:7px 12px;font-size:11px;border-bottom:1px solid #eceef0}
      table.fin tr:last-child td{border-bottom:none}
      td.lbl-cell{color:#544435}
      td.val-cell{text-align:right;font-weight:700;font-family:'Consolas',monospace}
      .amt-words{margin-top:10px;font-size:10px;font-style:italic;color:#544435}
      footer{margin-top:32px;padding-top:20px}
      .sign-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}
      .sign-line{border-top:1px solid #191c1e;padding-top:6px}
      .sign-role{font-size:10px;font-weight:700;text-transform:uppercase}
      .sign-sub{font-size:9px;color:#666;margin-top:1px}
      .doc-footer{margin-top:24px;padding-top:12px;border-top:1px solid #dac2af;display:flex;justify-content:space-between;font-size:9px;color:#666}
      .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.03;transform:rotate(-35deg);pointer-events:none;font-size:90px;font-weight:800;text-transform:uppercase;white-space:nowrap}
      @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;padding:16mm}@page{size:A4;margin:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
      .no-print{display:block}
      @media print{.no-print{display:none!important}}
    </style></head><body>
    <div class="sheet">
      <div class="watermark">${esc(r.status)}</div>
      <header>
        <div class="brand">
          ${logoHtml}
          <div>
            <div class="brand-name">${esc(companyName)}</div>
            <div class="brand-sub">${esc(companyAddress)}${companyGstin ? ` &middot; GSTIN ${esc(companyGstin)}` : ''}${companyPan ? ` &middot; PAN ${esc(companyPan)}` : ''}</div>
          </div>
        </div>
        <div class="doc-title">
          <h2>WORK ORDER</h2>
          <span class="badge">${r.status === 'Active' ? 'IN PROGRESS' : r.status.toUpperCase()}</span>
          <div class="doc-no">${esc(r.workOrderNo)}</div>
        </div>
      </header>

      <div class="meta-grid">
        <div><div class="meta-lbl">Customer</div><div class="meta-val">${esc(customerName)}</div></div>
        <div><div class="meta-lbl">Site Code</div><div class="meta-val">${esc(siteName)}</div></div>
        <div><div class="meta-lbl">Status</div><div class="meta-val"><span class="status-dot" style="background:${statusColor(r.status)}"></span>${esc(r.status)}</div></div>
      </div>

      <section>
        <h3 class="section">Project Classification</h3>
        <div class="pill-grid">
          <div class="pill"><div class="pill-lbl">Site Code</div><div class="pill-val">${esc(siteName)}</div></div>
          <div class="pill"><div class="pill-lbl">Job Code</div><div class="pill-val">${esc(r.jobCode || '—')}</div></div>
          <div class="pill"><div class="pill-lbl">Cost Center</div><div class="pill-val">${esc(r.costCenter || '—')}</div></div>
        </div>
      </section>

      <section>
        <h3 class="section">Task Specification</h3>
        <div class="task-box">
          <div class="task-title">${esc(customerName)}</div>
          <p class="task-desc">${esc(r.descriptionOfWork || 'No description provided.')}</p>
        </div>
      </section>

      <section class="two-col">
        <div>
          <h3 class="section">Allocation</h3>
          <table class="kv">
            <tr><td>Department</td><td>${esc(r.department || '—')}</td></tr>
            <tr><td>Project Manager</td><td>${esc(r.projectManager || '—')}</td></tr>
            ${r.subcontractedTo ? `<tr><td>Subcontracted To</td><td>${esc(r.subcontractedTo)}</td></tr>` : ''}
          </table>
        </div>
        <div>
          <h3 class="section">Bank Guarantee</h3>
          <table class="kv">
            <tr><td>BG Amount</td><td>${fmtNum(r.bgAmount || 0)}</td></tr>
            <tr><td>BG Source</td><td>${esc(r.bgSource || '—')}</td></tr>
          </table>
        </div>
      </section>

      ${r.reasonOfDelay || r.delayExtensionLetter ? `<section>
        <h3 class="section">Delay Notes</h3>
        <table class="kv">
          ${r.reasonOfDelay ? `<tr><td>Reason of Delay</td><td>${esc(r.reasonOfDelay)}</td></tr>` : ''}
          ${r.delayExtensionLetter ? `<tr><td>Extension Letter</td><td>${esc(r.delayExtensionLetter)}</td></tr>` : ''}
        </table>
      </section>` : ''}

      <section>
        <h3 class="section">Financial Summary</h3>
        <table class="fin">${financialRows}</table>
        <div class="amt-words">Amount in Words: Rupees ${numToWords(r.totalAmount || 0)}</div>
      </section>

      <footer>
        <div class="sign-grid">
          <div class="sign-line"><div class="sign-role">Prepared By</div><div class="sign-sub">Site Engineer</div></div>
          <div class="sign-line"><div class="sign-role">Checked By</div><div class="sign-sub">Project Manager</div></div>
          <div class="sign-line" style="border-top:2px solid #e8891a"><div class="sign-role" style="color:#e8891a">Authorized By</div><div class="sign-sub">Plant Director</div></div>
        </div>
        <div class="doc-footer">
          <span>Document: ${esc(r.workOrderNo)} &middot; This is a computer-generated document.</span>
          <span>Printed ${statNow.toLocaleDateString('en-IN')} ${statNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </footer>
    </div>
    <div style="text-align:center;margin:20px" class="no-print">
      <button onclick="window.print()" style="padding:8px 20px;background:#e8891a;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#fff">Print / Save PDF</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#252e3a;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#e2e8f0;margin-left:8px">Close</button>
    </div>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Work Orders"
        fields={WO_IMPORT_FIELDS}
        keyField="workOrderNo"
        existingKeys={new Set(records.map(r => r.workOrderNo))}
        commitEndpoint="/api/fin/work-orders/import"
        sampleRow={WO_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  const inputCls = 'vc-input';
  const lbl = 'text-[9px] uppercase tracking-1.5px text-[#5a6878] font-bold mb-1 block';

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Work Orders</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Contract Value</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalAmount/10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Bill Raised</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalBilled/10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Unexecuted</div><div className="text-[20px] font-bold text-[#ffab40]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalUnexec/10000000).toFixed(2)} Cr</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><ClipboardList size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Customer Work Orders</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search work orders..." /></div><div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={filtered} columns={WO_COLUMNS} filename="fin-work-orders" /></div><button onClick={openNew} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Work Order</button></div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[110px]"><option value="all">All Statuses</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <select value={customerFilter} onChange={e=>setCustomerFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[150px]"><option value="all">All Customers</option>{customerNames.map(c=><option key={c} value={c}>{c}</option>)}</select>
          {statusFilter !== 'all' && <button onClick={() => setStatusFilter('all')} className="text-[11px] text-[#f5a623] hover:underline">Clear status filter</button>}
          {customerFilter !== 'all' && <button onClick={() => setCustomerFilter('all')} className="text-[11px] text-[#f5a623] hover:underline">Clear customer filter</button>}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-[#8899aa]"><span className="font-mono text-[#e2e8f0] font-semibold">{selected.size}</span> selected</span>
              <button onClick={()=>setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button>
              <button onClick={()=>setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] !border-[#ff3d3d]/40 hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete Selected</button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]"><th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>{['WO No','Customer','Site','Job Code','Cost Center','Description of Work','Init Date','Total Amt','Unexecuted','Bill Raised','Received','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920] transition-colors" style={{ borderLeft: `3px solid ${statusColor(r.status)}` }}><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={()=>toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono font-semibold whitespace-nowrap">{r.workOrderNo}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[120px] truncate" title={r.customer?.name || ''}>{r.customer?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.site?.siteCode||'—'}</td><td className="py-2.5 px-3"><span className={chipCls}>{r.jobCode||'—'}</span></td><td className="py-2.5 px-3"><span className={chipCls}>{r.costCenter||'—'}</span></td><td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate">{r.descriptionOfWork||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.orderInitiationDate?.split('T')[0]||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">{fmt(r.totalAmount)}</td><td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">{fmt(r.unexecutedWorkAmount)}</td><td className="py-2.5 px-3 text-[#00d4ff] font-mono text-right whitespace-nowrap">{fmt(r.billRaisedAmount)}</td><td className="py-2.5 px-3 text-[#00e676] font-mono text-right whitespace-nowrap">{fmt(r.amountReceivedOutOfBill)}</td><td className="py-2.5 px-3"><span className="vc-badge" style={{ background: `${statusColor(r.status)}20`, color: statusColor(r.status) }}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>handlePrint(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10"><Printer size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0 && <tr><td colSpan={14} className="py-8 text-center text-[#5a6878]">No work orders found. Create a new work order or import data.</td></tr>}</tbody></table></div><PaginationBar {...tc} /></div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#f5a623]">{editTarget ? `Edit Work Order — ${editTarget.workOrderNo}` : 'Create New Work Order'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left rail — classification & status */}
          <div className="lg:col-span-5 space-y-4">
            <FormSection title="Classification" icon={Tag}>
              <FormField label="Customer" required error={formErrors.customerId}>
                <SearchableSelect value={form.customerId ? String(form.customerId) : ''} onChange={v=>{ setForm(p=>({...p,customerId:v ? Number(v) : 0,siteId:0,jobCode:''})); clearError('customerId'); }} options={customers.map(c=>({ value: String(c.id), label: c.name, sublabel: c.code || '' }))} placeholder="Select customer..."/>
              </FormField>
              <FormField label="Site" required error={formErrors.siteId}>
                <SearchableSelect value={form.siteId ? String(form.siteId) : ''} onChange={v=>{ setForm(p=>({...p,siteId:v ? Number(v) : 0,jobCode:''})); clearError('siteId'); }} options={sites.filter(s=>!form.customerId || s.customerId===form.customerId).map(s=>({ value: String(s.id), label: s.name, sublabel: s.siteCode }))} placeholder="Select site..."/>
              </FormField>
              <FormField label="Job Code" required error={formErrors.jobCode} hint="Flows this work order into Job-wise costing">
                <DatalistField id="wo-job-code" value={form.jobCode} onChange={v=>setField('jobCode', v)} options={[...new Set(records.filter(r=>!form.siteId || r.siteId===form.siteId).map(r=>r.jobCode).filter(Boolean) as string[])]} placeholder="JOB-2026-001" />
              </FormField>
              <FormField label="WO No" required error={formErrors.workOrderNo} hint="Auto-generated if left blank">
                <input value={form.workOrderNo} readOnly className={inputCls + ' opacity-60'} placeholder="Auto-generated on save"/>
              </FormField>
            </FormSection>

            <FormSection title="Status" icon={ShieldCheck}>
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#0f1318] rounded-lg border border-[#252e3a]">
                {STATUSES.map(s => (
                  <button key={s} type="button" onClick={()=>setField('status', s)}
                    className={`py-1.5 text-[10px] font-semibold rounded transition-colors ${form.status===s ? 'bg-[#f5a623] text-[#0a0d12]' : 'text-[#8899aa] hover:bg-[#1a2028]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </FormSection>
          </div>

          {/* Right canvas — details, timeline, financials */}
          <div className="lg:col-span-7 space-y-4">
            <FormSection title="General Details" icon={FileText}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Description of Work</label><input value={form.descriptionOfWork} onChange={e=>setField('descriptionOfWork', e.target.value)} className={inputCls} placeholder="Scope of work..."/></div>
                <FormField label="Cost Center" required error={formErrors.costCenter}><input value={form.costCenter} onChange={e=>setField('costCenter', e.target.value)} className={inputCls}/></FormField>
                <FormField label="Department" required error={formErrors.department}><input value={form.department} onChange={e=>setField('department', e.target.value)} className={inputCls}/></FormField>
                <FormField label="Project Manager" required error={formErrors.projectManager}><input value={form.projectManager} onChange={e=>setField('projectManager', e.target.value)} className={inputCls}/></FormField>
              </div>
            </FormSection>

            <FormSection title="Timeline" icon={CalendarDays}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Order Initiation Date</label><input type="date" value={form.orderInitiationDate} onChange={e=>setForm(p=>({...p,orderInitiationDate:e.target.value}))} className={inputCls}/></div>
                <div><label className={lbl}>Order Completion Date</label><input type="date" value={form.orderCompletionDate} onChange={e=>setForm(p=>({...p,orderCompletionDate:e.target.value}))} className={inputCls}/></div>
              </div>
            </FormSection>

            <FormSection title="Financials" icon={IndianRupee}>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Total Amount (₹)</label><input type="number" value={form.totalAmount||''} onChange={e=>setForm(p=>({...p,totalAmount:Number(e.target.value)}))} className={inputCls}/></div>
                <div><label className={lbl}>Unexecuted Work Amount</label><input type="number" value={form.unexecutedWorkAmount||''} onChange={e=>setForm(p=>({...p,unexecutedWorkAmount:Number(e.target.value)}))} className={inputCls}/></div>
                <div><label className={lbl}>Work Done Not Billed</label><input type="number" value={form.workDoneNotBilled||''} onChange={e=>setForm(p=>({...p,workDoneNotBilled:Number(e.target.value)}))} className={inputCls}/></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Amount Booked Last FY</label><input type="number" value={form.amountBookedLastFY||''} onChange={e=>setForm(p=>({...p,amountBookedLastFY:Number(e.target.value)}))} className={inputCls}/></div>
                <div><label className={lbl}>Amount Booked Current FY</label><input type="number" value={form.amountBookedCurrentFY||''} onChange={e=>setForm(p=>({...p,amountBookedCurrentFY:Number(e.target.value)}))} className={inputCls}/></div>
                <div><label className={lbl}>Amount To Be Booked End FY</label><input type="number" value={form.amountToBeBookedByEndFY||''} onChange={e=>setForm(p=>({...p,amountToBeBookedByEndFY:Number(e.target.value)}))} className={inputCls}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Bill Raised</label><input type="number" value={form.billRaisedAmount||''} onChange={e=>setForm(p=>({...p,billRaisedAmount:Number(e.target.value)}))} className={inputCls}/></div>
                <div><label className={lbl}>Amount Received Out of Bill</label><input type="number" value={form.amountReceivedOutOfBill||''} onChange={e=>setForm(p=>({...p,amountReceivedOutOfBill:Number(e.target.value)}))} className={inputCls}/></div>
              </div>
            </FormSection>

            <FormSection title="Bank Guarantee & Subcontract" icon={ShieldCheck} collapsible defaultOpen={false}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>BG Amount</label><input type="number" value={form.bgAmount||''} onChange={e=>setForm(p=>({...p,bgAmount:Number(e.target.value)}))} className={inputCls}/></div>
                <div><label className={lbl}>BG Source</label><input value={form.bgSource} onChange={e=>setField('bgSource', e.target.value)} className={inputCls}/></div>
              </div>
              <div><label className={lbl}>Subcontracted To</label><input value={form.subcontractedTo} onChange={e=>setField('subcontractedTo', e.target.value)} className={inputCls}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Delay/Extension Letter</label><input value={form.delayExtensionLetter} onChange={e=>setField('delayExtensionLetter', e.target.value)} className={inputCls}/></div>
                <div><label className={lbl}>Reason of Delay</label><input value={form.reasonOfDelay} onChange={e=>setField('reasonOfDelay', e.target.value)} className={inputCls}/></div>
              </div>
            </FormSection>
          </div>
        </div>
        <DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Work Order</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.workOrderNo}</strong>? This cannot be undone if invoices are linked.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Work Order{selected.size===1?'':'s'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete <strong className="text-[#f5a623]">{selected.size}</strong> selected work order{selected.size===1?'':'s'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg disabled:opacity-50">{bulkDeleting?'Deleting...':'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}