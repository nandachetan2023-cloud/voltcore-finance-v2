'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, Pencil, Trash2, Loader2, Upload, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar, SortableTh } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { FormField, SearchableSelect, DatalistField, CostingFields, useFormValidation, required } from './_form-controls';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompanyProfile } from '@/hooks/use-company-profile';

interface PO {
  id: number; poNo: string; vendorName: string; siteId: number; jobCode: string | null; date: string; totalAmount: number; status: string; site?: { name: string }; descriptionOfWork: string | null; costCenter: string | null; department: string | null; projectManager: string | null;
  vendorAddress?: string | null; billTo?: string | null; termsConditions?: string | null; subtotal?: number | null; taxAmount?: number | null;
}
interface Site { id: number; name: string; }
interface FormData { poNo: string; vendorId: string; vendorName: string; siteId: number; jobCode: string; date: string; descriptionOfWork: string; totalAmount: number; status: string; costCenter: string; department: string; projectManager: string; }
const EMPTY: FormData = { poNo: '', vendorId: '', vendorName: '', siteId: 0, jobCode: '', date: '', descriptionOfWork: '', totalAmount: 0, status: 'Draft', costCenter: '', department: '', projectManager: '' };

function generateMockPOs(): PO[] {
  return [
    { id: 1, poNo: 'PO/2024-25/001', vendorName: 'Bharat Heavy Electricals Ltd', siteId: 1, jobCode: null, date: '2024-11-15T00:00:00', totalAmount: 18500000, status: 'Approved', site: { name: 'NTPC Rihand Dam Project' }, descriptionOfWork: 'Turbine maintenance and overhaul', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma' },
    { id: 2, poNo: 'PO/2024-25/002', vendorName: 'Tata Projects Ltd', siteId: 2, jobCode: null, date: '2024-12-01T00:00:00', totalAmount: 32000000, status: 'Approved', site: { name: 'BALCO Aluminium Smelter' }, descriptionOfWork: 'Expansion of potline capacity', costCenter: 'CC-SIT-002', department: 'Projects', projectManager: 'A. Verma' },
    { id: 3, poNo: 'PO/2024-25/003', vendorName: 'Larsen & Toubro Ltd', siteId: 3, jobCode: null, date: '2025-01-10T00:00:00', totalAmount: 45000000, status: 'Draft', site: { name: 'Coal India Eastern Coalfield' }, descriptionOfWork: 'Coal handling plant upgradation', costCenter: 'CC-SIT-003', department: 'Operations', projectManager: 'P. Iyer' },
    { id: 4, poNo: 'PO/2024-25/004', vendorName: 'Adani Defence Systems', siteId: 4, jobCode: null, date: '2025-02-20T00:00:00', totalAmount: 12500000, status: 'Approved', site: { name: 'Vedanta Jharsuguda Smelter' }, descriptionOfWork: 'Security infrastructure setup', costCenter: 'CC-SIT-004', department: 'Projects', projectManager: 'S. Rao' },
    { id: 5, poNo: 'PO/2024-25/005', vendorName: 'Reliance Infrastructure', siteId: 5, jobCode: null, date: '2025-03-05T00:00:00', totalAmount: 8750000, status: 'Pending', site: { name: 'Hindalco Mahan Aluminium' }, descriptionOfWork: 'Electrical substation commissioning', costCenter: 'CC-SIT-005', department: 'Projects', projectManager: 'M. Khan' },
    { id: 6, poNo: 'PO/2024-25/006', vendorName: 'UltraTech Cement Ltd', siteId: 6, jobCode: null, date: '2025-04-12T00:00:00', totalAmount: 22000000, status: 'Approved', site: { name: 'Tata Steel Bhamapah Project' }, descriptionOfWork: 'Cement plant civil works', costCenter: 'CC-SIT-006', department: 'Site Execution', projectManager: 'R. Sharma' },
  ];
}

const PO_COLUMNS: ExportColumn<PO>[] = [
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Vendor', accessor: 'vendorName' },
  { header: 'Site', accessor: (r: any) => r.site?.name || '' },
  { header: 'Site ID', accessor: (r: any) => r.site?.id ?? '' },
  { header: 'Job Code', accessor: 'jobCode' },
  { header: 'Cost Center', accessor: 'costCenter' },
  { header: 'Department', accessor: 'department' },
  { header: 'Project Manager', accessor: 'projectManager' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Description', accessor: 'descriptionOfWork' },
  { header: 'Amount', accessor: 'totalAmount' },
  { header: 'Status', accessor: 'status' },
];

const PO_IMPORT_FIELDS: ImportField[] = [
  { key: 'poNo', label: 'PO No', required: true },
  { key: 'vendorName', label: 'Vendor', required: true },
  { key: 'siteId', label: 'Site ID', type: 'number' },
  { key: 'jobCode', label: 'Job Code' },
  { key: 'costCenter', label: 'Cost Center' },
  { key: 'department', label: 'Department' },
  { key: 'projectManager', label: 'Project Manager' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'descriptionOfWork', label: 'Description' },
  { key: 'totalAmount', label: 'Amount', type: 'number' },
  { key: 'status', label: 'Status' },
];
const PO_SAMPLE_ROW = { poNo: 'PO-2026-001', vendorName: 'Siemens India Ltd', siteId: 1, jobCode: 'JOB-2026-001', costCenter: 'CC-SIT-001', department: 'Projects', projectManager: 'R. Sharma', date: '2026-01-05', descriptionOfWork: 'Circuit Breaker supply', totalAmount: 850000, status: 'Active' };

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

export default function FinPurchaseOrders() {
  const companyProfile = useCompanyProfile();
  const [records, setRecords] = useState<PO[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PO | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const filtered = records.filter(r => statusFilter === 'All' || r.status === statusFilter);
  const tc = useTableControls(filtered, (r) => `${r.poNo} ${r.vendorName} ${r.site?.name ?? ''} ${r.descriptionOfWork ?? ''} ${r.status}`);
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAllOnPage = () => setSelected(s => { const next = new Set(s); pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id)); return next; });
  const PO_STATUSES = ['All', ...new Set(records.map(r => r.status).filter(Boolean))];

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/purchase-orders');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords(generateMockPOs()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockPOs()); toast.info('Sample data — API unavailable'); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda' }, { id: 2, name: 'TPP NTPC Barh' }, { id: 3, name: 'HO Mumbai' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda' }, { id: 2, name: 'TPP NTPC Barh' }, { id: 3, name: 'HO Mumbai' }]); }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const onDataChanged = () => fetch_();
    window.addEventListener('finance:data-changed', onDataChanged);
    return () => window.removeEventListener('finance:data-changed', onDataChanged);
  }, [fetch_]);

  const { errors: formErrors, validate: validateForm, clearError, setErrors: setFormErrors } = useFormValidation<FormData>({
    poNo: () => undefined, // generated by the server on save
    vendorName: required('Vendor Name'),
    siteId: (v) => (!v) ? 'Site Code is required' : undefined,
    jobCode: required('Job Code'),
    date: required('Date'),
    costCenter: required('Cost Center'),
    department: required('Department'),
    projectManager: required('Project Manager'),
  });
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => { setForm(p => ({ ...p, [key]: value })); clearError(key); };


  const openEdit = (r: PO) => { setEditTarget(r); setForm({ poNo: r.poNo, vendorId: '', vendorName: r.vendorName, siteId: r.siteId, jobCode: r.jobCode || '', date: r.date?.split('T')[0] || '', descriptionOfWork: r.descriptionOfWork || '', totalAmount: r.totalAmount, status: r.status, costCenter: r.costCenter || '', department: r.department || '', projectManager: r.projectManager || '' }); setFormErrors({}); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!validateForm(form)) { toast.error('Please fix the highlighted fields'); return; }
    setSubmitting(true);
    try { const method = editTarget ? 'PUT' : 'POST'; const payload = { ...form, costCenter: form.costCenter || null, department: form.department || null, projectManager: form.projectManager || null, date: new Date(form.date) }; const body = editTarget ? { id: editTarget.id, ...payload } : payload; const r = await fetch('/api/fin/purchase-orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); } else toast.error(j.error || 'Failed'); } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { const r = await fetch(`/api/fin/purchase-orders?id=${deleteTarget.id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error); } catch { toast.error('Network error'); } };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      const ids = [...selected].join(',');
      const r = await fetch(`/api/fin/purchase-orders?ids=${ids}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} PO${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handlePrint = (r: PO) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtNum = (n: number) => '₹ ' + (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const companyName = companyProfile.name || 'VoltCore Engineering Pvt Ltd';
    const companyAddress = companyProfile.address || '123 Industrial Area, Korba, Chhattisgarh - 495677';
    const companyGstin = companyProfile.gstin || '';
    const companyPan = companyProfile.pan || '';
    const logoHtml = companyProfile.logoUrl ? `<img src="${companyProfile.logoUrl}" alt="Logo" class="brand-logo"/>` : `<div class="brand-mark">PO</div>`;

    const subtotal = r.subtotal || r.totalAmount || 0;
    const taxAmount = r.taxAmount || 0;
    const grandTotal = subtotal + taxAmount || r.totalAmount || 0;
    const hasTax = !!(r.subtotal || r.taxAmount);
    // FinPurchaseOrder stores a single lump taxAmount, not a CGST/SGST/IGST
    // split, and has no vendor state to compare against. Same intra-state
    // default used by fin-invoice-document.tsx: split evenly as CGST+SGST.
    const cgstAmt = taxAmount / 2;
    const sgstAmt = taxAmount / 2;
    const gstRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
    const halfRate = (gstRate / 2).toFixed(1);

    const terms = (r.termsConditions || 'Delivery as per agreed schedule from PO date.\nPayment terms: 30 days after receipt of goods/services and invoice.\nSubject to inspection at site; rejections to be replaced within 48 hours.\nAll disputes subject to local jurisdiction.')
      .split('\n').filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Purchase Order - ${esc(r.poNo)}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#e9ecef;color:#191c1e;padding:24px}
      .sheet{max-width:800px;margin:0 auto;background:#fff;padding:36px;box-shadow:0 0 20px rgba(0,0,0,0.12)}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
      .brand{display:flex;align-items:center;gap:12px}
      .brand-mark{width:40px;height:40px;border-radius:4px;background:#e8891a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
      .brand-logo{height:40px;max-width:120px;object-fit:contain}
      .brand-name{font-size:19px;font-weight:800;letter-spacing:.3px}
      .brand-sub{font-size:10px;color:#666;margin-top:2px;max-width:280px}
      .doc-title{text-align:right}
      .doc-title h1{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
      table.meta{margin-left:auto;border-collapse:collapse}
      table.meta td{padding:3px 0 3px 20px;font-size:11px;border-bottom:1px solid #eceef0;text-align:right}
      table.meta td:first-child{color:#544435;text-align:right;padding-left:0}
      table.meta td:last-child{font-weight:700}
      .addr-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
      .addr-box{padding:14px;background:#f7f9fb;border:1px solid #dac2af;border-radius:4px}
      .addr-box h3{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#544435;border-bottom:1px solid #dac2af;padding-bottom:6px;margin-bottom:8px}
      .addr-box .name{font-weight:700;font-size:13px;margin-bottom:2px}
      .addr-box p{font-size:11px;color:#333;line-height:1.5}
      table.items{width:100%;border-collapse:collapse;margin-bottom:20px}
      table.items thead tr{background:#eceef0;border-top:1px solid #877363;border-bottom:1px solid #877363}
      table.items th{padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.4px;text-align:left}
      table.items th.r{text-align:right}
      table.items td{padding:12px 10px;font-size:11px;border-bottom:1px solid #eceef0;vertical-align:top}
      table.items td.r{text-align:right;font-family:Consolas,monospace}
      table.items .item-desc{font-weight:700;font-size:12px;margin-bottom:3px}
      table.items .item-meta{font-size:9px;color:#777}
      .totals{display:flex;justify-content:flex-end;margin-bottom:28px}
      .totals-box{width:280px}
      .totals-row{display:flex;justify-content:space-between;font-size:11px;color:#544435;padding:3px 0}
      .totals-row.grand{border-top:2px solid #e8891a;margin-top:4px;padding-top:8px;font-size:16px;font-weight:700;color:#191c1e}
      .totals-words{text-align:right;font-size:9px;font-style:italic;color:#544435;margin-top:4px}
      .lower-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px}
      .lower-grid h3{font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #dac2af;padding-bottom:6px;margin-bottom:8px;width:fit-content}
      .lower-grid ul{padding-left:16px;font-size:10px;color:#544435;line-height:1.7}
      .sign-block{text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end}
      .sign-line{border-top:1px solid #191c1e;padding-top:6px;width:200px;text-align:right}
      .sign-role{font-size:10px;font-weight:700}
      .sign-sub{font-size:9px;color:#666}
      .doc-footer{margin-top:24px;padding-top:12px;border-top:1px solid #dac2af;display:flex;justify-content:space-between;font-size:9px;color:#666}
      @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;padding:16mm}@page{size:A4;margin:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
      .no-print{display:block}
      @media print{.no-print{display:none!important}}
    </style></head><body>
    <div class="sheet">
      <header>
        <div class="brand">
          ${logoHtml}
          <div>
            <div class="brand-name">${esc(companyName)}</div>
            <div class="brand-sub">${esc(companyAddress)}${companyGstin ? ` &middot; GSTIN ${esc(companyGstin)}` : ''}${companyPan ? ` &middot; PAN ${esc(companyPan)}` : ''}</div>
          </div>
        </div>
        <div class="doc-title">
          <h1>Purchase Order</h1>
          <table class="meta">
            <tr><td>PO Number:</td><td>${esc(r.poNo)}</td></tr>
            <tr><td>Date:</td><td>${fmtDate(r.date)}</td></tr>
            <tr><td>Site Code:</td><td>${esc(r.site?.name || '—')}</td></tr>
            <tr><td>Job Code:</td><td>${esc(r.jobCode || '—')}</td></tr>
          </table>
        </div>
      </header>

      <div class="addr-grid">
        <div class="addr-box">
          <h3>Supplier</h3>
          <div class="name">${esc(r.vendorName)}</div>
          <p>${r.vendorAddress ? esc(r.vendorAddress) : 'Address on file'}</p>
        </div>
        <div class="addr-box">
          <h3>Shipping &amp; Billing</h3>
          <div class="name">${esc(r.billTo || r.site?.name || 'Central Store')}</div>
          <p>Cost Center: ${esc(r.costCenter || '—')}</p>
          <p>Dept: ${esc(r.department || '—')}</p>
          <p>Project Manager: ${esc(r.projectManager || '—')}</p>
        </div>
      </div>

      <table class="items">
        <thead><tr><th style="width:32px">#</th><th>Description</th><th class="r" style="width:160px">Amount</th></tr></thead>
        <tbody>
          <tr>
            <td>01</td>
            <td>
              <div class="item-desc">${esc(r.descriptionOfWork || 'Goods / services as per agreement')}</div>
              <div class="item-meta">Job: ${esc(r.jobCode || '—')} &middot; PO: ${esc(r.poNo)}</div>
            </td>
            <td class="r">${fmtNum(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          ${hasTax ? `<div class="totals-row"><span>Subtotal:</span><span>${fmtNum(subtotal)}</span></div><div class="totals-row"><span>CGST (${halfRate}%):</span><span>${fmtNum(cgstAmt)}</span></div><div class="totals-row"><span>SGST (${halfRate}%):</span><span>${fmtNum(sgstAmt)}</span></div>` : ''}
          <div class="totals-row grand"><span>Grand Total:</span><span>${fmtNum(grandTotal)}</span></div>
          <div class="totals-words">Rupees ${numToWords(grandTotal)}</div>
        </div>
      </div>

      <div class="lower-grid">
        <div>
          <h3>Terms &amp; Conditions</h3>
          <ul>${terms}</ul>
        </div>
        <div class="sign-block">
          <div class="sign-line">
            <div class="sign-role">Authorized Signatory</div>
            <div class="sign-sub">${esc(companyName)}</div>
          </div>
        </div>
      </div>

      <div class="doc-footer">
        <span>Document: ${esc(r.poNo)} &middot; Status: ${esc(r.status)} &middot; This is a computer-generated document.</span>
        <span>Printed ${new Date().toLocaleDateString('en-IN')}</span>
      </div>
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
        title="Purchase Orders"
        fields={PO_IMPORT_FIELDS}
        keyField="poNo"
        existingKeys={new Set(records.map(r => r.poNo))}
        commitEndpoint="/api/fin/purchase-orders/import"
        sampleRow={PO_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel"><div className="vc-panel-header"><ShoppingCart size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Purchase Orders</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="ml-2 vc-input w-auto text-[11px] py-1"><option value="All">All Statuses</option>{PO_STATUSES.filter(s=>s!=='All').map(s=><option key={s} value={s}>{s}</option>)}</select><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search POs..." /></div>{selected.size>0&&<button onClick={()=>setBulkDeleteOpen(true)} className="vc-btn-danger flex items-center gap-1.5 ml-2 text-[11px]"><Trash2 size={13} /> Delete ({selected.size})</button>}<button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
          <ExportButton records={records} columns={PO_COLUMNS} filename="fin-purchase-orders" /><button onClick={() => { setEditTarget(null); setForm({ ...EMPTY, poNo: '' }); setFormErrors({}); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New PO</button></div>
        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
        <th className="w-8 px-2"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} className="border-[#2a3542] data-[state=checked]:bg-[#f5a623] data-[state=checked]:border-[#f5a623]" /></th>
        <SortableTh label="PO No" sortKey="poNo" accessor={(r: PO) => r.poNo} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Vendor" sortKey="vendorName" accessor={(r: PO) => r.vendorName} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Site" sortKey="site" accessor={(r: PO) => r.site?.name} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Job Code" sortKey="jobCode" accessor={(r: PO) => r.jobCode} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Date" sortKey="date" accessor={(r: PO) => r.date} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Description" sortKey="descriptionOfWork" accessor={(r: PO) => r.descriptionOfWork} sort={tc.sort} toggleSort={tc.toggleSort} />
        <SortableTh label="Amount" sortKey="totalAmount" accessor={(r: PO) => r.totalAmount} sort={tc.sort} toggleSort={tc.toggleSort} align="right" />
        <SortableTh label="Status" sortKey="status" accessor={(r: PO) => r.status} sort={tc.sort} toggleSort={tc.toggleSort} />
        <th className="py-2 px-3"></th>
      </tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className={`hover:bg-[#141920] ${selected.has(r.id)?'bg-[#f5a623]/5':''}`}><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={()=>toggleRow(r.id)} className="border-[#2a3542] data-[state=checked]:bg-[#f5a623] data-[state=checked]:border-[#f5a623]" /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.poNo}</td><td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendorName}</td><td className="py-2.5 px-3 text-[#8899aa]">{r.site?.name||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.jobCode||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate">{r.descriptionOfWork||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.totalAmount ?? 0).toLocaleString('en-IN')}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Approved'?'bg-[#00e676]/15 text-[#00e676]':r.status==='Draft'?'bg-[#5a6878]/15 text-[#5a6878]':'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>handlePrint(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10"><Printer size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No matching purchase orders</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg" onKeyDown={e => { if (e.key === 'Enter' && !(e.target as HTMLElement).matches('textarea, select')) { e.preventDefault(); handleSubmit(); } }}>
        <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit PO':'New Purchase Order'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="PO No" hint="Generated automatically when you save"><input value={form.poNo} readOnly className="vc-input opacity-60" placeholder="Auto-generated on save"/></FormField>
            <FormField label="Vendor Name" required error={formErrors.vendorName}><input value={form.vendorName} onChange={e=>setField('vendorName', e.target.value)} className="vc-input"/></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Site Code" required error={formErrors.siteId}>
              <SearchableSelect value={form.siteId ? String(form.siteId) : ''} onChange={v => setField('siteId', v ? Number(v) : 0)} options={sites.map(s=>({ value: String(s.id), label: s.name }))} placeholder="Select site..."/>
            </FormField>
            <FormField label="Date" required error={formErrors.date}><input type="date" value={form.date} onChange={e=>setField('date', e.target.value)} className="vc-input"/></FormField>
          </div>
          <FormField label="Description of Work"><input value={form.descriptionOfWork} onChange={e=>setField('descriptionOfWork', e.target.value)} className="vc-input"/></FormField>
          <FormField label="Job Code" required error={formErrors.jobCode} hint="Flows this PO into Job-wise costing"><DatalistField id="po-job-code" value={form.jobCode} onChange={v=>setField('jobCode', v)} options={[...new Set(records.map(r => r.jobCode).filter(Boolean) as string[])]} placeholder="JOB-2026-001" /></FormField>
          <CostingFields prefix="po" form={{ costCenter: form.costCenter, department: form.department, projectManager: form.projectManager }} setField={(k, v) => setField(k, v)} errors={formErrors} />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Amount (₹)"><input type="number" value={form.totalAmount||''} onChange={e=>setField('totalAmount', Number(e.target.value))} className="vc-input"/></FormField>
            <FormField label="Status"><select value={form.status} onChange={e=>setField('status', e.target.value)} className="vc-input appearance-none"><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="Closed">Closed</option></select></FormField>
          </div>
        </div>
        <DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete PO</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} PO{selected.size===1?'':'s'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete the selected purchase order{selected.size===1?'':'s'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost" onClick={()=>setSelected(new Set())}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete {selected.size}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
