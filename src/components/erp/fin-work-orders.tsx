'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Upload, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Site { id: number; name: string; }
interface WorkOrder {
  id: number; vendorName: string; vendorId: string; siteId: number; poNo: string; descriptionOfWork: string | null;
  orderInitiationDate: string | null; orderCompletionDate: string | null; bgAmount: number | null; bgSource: string | null;
  totalAmount: number; unexecutedWorkAmount: number; amountBookedLastFY: number; amountBookedCurrentFY: number; amountToBeBookedByEndFY: number;
  billRaisedAmount: number; amountReceivedOutOfBill: number; workDoneNotBilled: number;
  delayExtensionLetter: string | null; reasonOfDelay: string | null; subcontractedTo: string | null;
  status: string; site?: Site;
}
interface FormData {
  vendorName: string; vendorId: string; siteId: number; poNo: string; descriptionOfWork: string;
  orderInitiationDate: string; orderCompletionDate: string; bgAmount: number; bgSource: string;
  totalAmount: number; unexecutedWorkAmount: number; amountBookedLastFY: number; amountBookedCurrentFY: number; amountToBeBookedByEndFY: number;
  billRaisedAmount: number; amountReceivedOutOfBill: number; workDoneNotBilled: number;
  delayExtensionLetter: string; reasonOfDelay: string; subcontractedTo: string; status: string;
}
const EMPTY: FormData = {
  vendorName: '', vendorId: '', siteId: 0, poNo: '', descriptionOfWork: '', orderInitiationDate: '', orderCompletionDate: '',
  bgAmount: 0, bgSource: '', totalAmount: 0, unexecutedWorkAmount: 0, amountBookedLastFY: 0, amountBookedCurrentFY: 0,
  amountToBeBookedByEndFY: 0, billRaisedAmount: 0, amountReceivedOutOfBill: 0, workDoneNotBilled: 0,
  delayExtensionLetter: '', reasonOfDelay: '', subcontractedTo: '', status: 'Active',
};

const WO_COLUMNS: ExportColumn<WorkOrder>[] = [
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Vendor', accessor: 'vendorName' },
  { header: 'Site', accessor: (r) => r.site?.name || '' },
  { header: 'Description of Work', accessor: 'descriptionOfWork' },
  { header: 'Init Date', accessor: (r) => r.orderInitiationDate?.split('T')[0] ?? '' },
  { header: 'Total Amount', accessor: 'totalAmount' },
  { header: 'Unexecuted', accessor: 'unexecutedWorkAmount' },
  { header: 'Bill Raised', accessor: 'billRaisedAmount' },
  { header: 'Received', accessor: 'amountReceivedOutOfBill' },
  { header: 'Status', accessor: 'status' },
];
const STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];
const WO_IMPORT_FIELDS: ImportField[] = [
  { key: 'poNo', label: 'PO No', required: true },
  { key: 'vendorName', label: 'Vendor Name', required: true },
  { key: 'site', label: 'Site Name' },
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
  poNo: 'PO/NTPC/001', vendorName: 'NTPC Ltd', site: 'NTPC Rihand Dam Project',
  descriptionOfWork: 'Overhauling of 500MW turbine generator set', orderInitiationDate: '2024-06-01',
  orderCompletionDate: '', totalAmount: 42000000, unexecutedWorkAmount: 18000000, billRaisedAmount: 24000000,
  amountReceivedOutOfBill: 20000000, workDoneNotBilled: 2000000, bgAmount: 5000000,
  bgSource: 'SBI Bank Guarantee', amountBookedLastFY: 12000000, amountBookedCurrentFY: 12000000,
  amountToBeBookedByEndFY: 0, status: 'Active', subcontractedTo: '',
  delayExtensionLetter: '', reasonOfDelay: '',
};

function generateMockWorkOrders(): WorkOrder[] {
  return [
    { id: 1, vendorName: 'NTPC Ltd', vendorId: 'V001', siteId: 1, poNo: 'PO/NTPC/001', descriptionOfWork: 'Overhauling of 500MW turbine generator set', orderInitiationDate: '2024-06-01T00:00:00', orderCompletionDate: null, bgAmount: 5000000, bgSource: 'SBI Bank Guarantee', totalAmount: 42000000, unexecutedWorkAmount: 18000000, amountBookedLastFY: 12000000, amountBookedCurrentFY: 12000000, amountToBeBookedByEndFY: 0, billRaisedAmount: 24000000, amountReceivedOutOfBill: 20000000, workDoneNotBilled: 2000000, delayExtensionLetter: null, reasonOfDelay: null, subcontractedTo: 'Bharat Heavy Electricals', status: 'Active', site: { id: 1, name: 'NTPC Rihand Dam Project' } },
    { id: 2, vendorName: 'BALCO', vendorId: 'V002', siteId: 2, poNo: 'PO/BALCO/002', descriptionOfWork: 'Erection of 320kA potline structure', orderInitiationDate: '2024-08-15T00:00:00', orderCompletionDate: null, bgAmount: 3000000, bgSource: 'HDFC Bank Guarantee', totalAmount: 28000000, unexecutedWorkAmount: 12000000, amountBookedLastFY: 8000000, amountBookedCurrentFY: 8000000, amountToBeBookedByEndFY: 0, billRaisedAmount: 16000000, amountReceivedOutOfBill: 14000000, workDoneNotBilled: 1500000, delayExtensionLetter: null, reasonOfDelay: 'Monsoon delay — 3 weeks', subcontractedTo: 'Tata Projects Ltd', status: 'Active', site: { id: 2, name: 'BALCO Aluminium Smelter' } },
    { id: 3, vendorName: 'Coal India Ltd', vendorId: 'V003', siteId: 3, poNo: 'PO/CIL/003', descriptionOfWork: 'Coal crusher & conveyor system installation', orderInitiationDate: '2024-04-01T00:00:00', orderCompletionDate: '2025-03-31T00:00:00', bgAmount: 2000000, bgSource: 'UCO Bank FD', totalAmount: 15000000, unexecutedWorkAmount: 0, amountBookedLastFY: 9000000, amountBookedCurrentFY: 6000000, amountToBeBookedByEndFY: 0, billRaisedAmount: 14500000, amountReceivedOutOfBill: 14500000, workDoneNotBilled: 0, delayExtensionLetter: null, reasonOfDelay: null, subcontractedTo: null, status: 'Completed', site: { id: 3, name: 'Coal India Eastern Coalfield' } },
    { id: 4, vendorName: 'Vedanta Ltd', vendorId: 'V004', siteId: 4, poNo: 'PO/VED/004', descriptionOfWork: 'Flue gas desulphurization plant civil works', orderInitiationDate: '2025-01-10T00:00:00', orderCompletionDate: null, bgAmount: 8000000, bgSource: 'PNB Bank Guarantee', totalAmount: 55000000, unexecutedWorkAmount: 45000000, amountBookedLastFY: 0, amountBookedCurrentFY: 5000000, amountToBeBookedByEndFY: 5000000, billRaisedAmount: 5000000, amountReceivedOutOfBill: 0, workDoneNotBilled: 3000000, delayExtensionLetter: 'Extension granted up to Jun 2026', reasonOfDelay: null, subcontractedTo: 'Larsen & Toubro Ltd', status: 'Active', site: { id: 4, name: 'Vedanta Jharsuguda Smelter' } },
    { id: 5, vendorName: 'Hindalco Industries', vendorId: 'V005', siteId: 5, poNo: 'PO/HIN/005', descriptionOfWork: 'Captive power plant grid synchronization', orderInitiationDate: '2024-09-01T00:00:00', orderCompletionDate: null, bgAmount: 1500000, bgSource: 'Axis Bank Guarantee', totalAmount: 18000000, unexecutedWorkAmount: 7000000, amountBookedLastFY: 5000000, amountBookedCurrentFY: 6000000, amountToBeBookedByEndFY: 0, billRaisedAmount: 11000000, amountReceivedOutOfBill: 9000000, workDoneNotBilled: 800000, delayExtensionLetter: null, reasonOfDelay: 'Equipment delivery delayed by vendor', subcontractedTo: null, status: 'Active', site: { id: 5, name: 'Hindalco Mahan Aluminium' } },
  ];
}

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
  const [records, setRecords] = useState<WorkOrder[]>([]);
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
  const [partyFilter, setPartyFilter] = useState('all');

  const vendorNames = useMemo(() => [...new Set(records.map(r => r.vendorName).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => records.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (partyFilter === 'all' || r.vendorName === partyFilter)
  ), [records, statusFilter, partyFilter]);

  const tc = useTableControls(filtered, (r) => `${r.poNo} ${r.vendorName ?? ''} ${r.descriptionOfWork ?? ''} ${r.status}`);

  const filtersActive = statusFilter !== 'all' || partyFilter !== 'all';
  const clearFilters = () => { setStatusFilter('all'); setPartyFilter('all'); };
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleRow = (id: number) => setSelected(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const pageIds = tc.pageItems.map(r => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const toggleAllOnPage = () => setSelected(s => {
    const next = new Set(s);
    pageIds.forEach(id => allPageSelected ? next.delete(id) : next.add(id));
    return next;
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fin/purchase-orders');
      const rj = await r.json();
      if (rj.success && rj.data?.length) { setRecords(rj.data); }
      else { setRecords(generateMockWorkOrders()); toast.info('Using sample data'); }
    } catch { setRecords(generateMockWorkOrders()); toast.info('Using sample data'); }
    try {
      const r = await fetch('/api/fin/sites');
      const rj = await r.json();
      if (rj.success && rj.data?.length) setSites(rj.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda' }, { id: 2, name: 'TPP NTPC Barh' }, { id: 3, name: 'HO Mumbai' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda' }, { id: 2, name: 'TPP NTPC Barh' }, { id: 3, name: 'HO Mumbai' }]); }
    setLoading(false);
  }, []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const openNew = () => { setEditTarget(null); setForm(EMPTY); setFormOpen(true); };
  const openEdit = (r: WorkOrder) => {
    setEditTarget(r);
    setForm({
      vendorName: r.vendorName, vendorId: r.vendorId, siteId: r.siteId, poNo: r.poNo, descriptionOfWork: r.descriptionOfWork || '',
      orderInitiationDate: r.orderInitiationDate?.split('T')[0] || '', orderCompletionDate: r.orderCompletionDate?.split('T')[0] || '',
      bgAmount: r.bgAmount || 0, bgSource: r.bgSource || '', totalAmount: r.totalAmount, unexecutedWorkAmount: r.unexecutedWorkAmount,
      amountBookedLastFY: r.amountBookedLastFY, amountBookedCurrentFY: r.amountBookedCurrentFY, amountToBeBookedByEndFY: r.amountToBeBookedByEndFY,
      billRaisedAmount: r.billRaisedAmount, amountReceivedOutOfBill: r.amountReceivedOutOfBill, workDoneNotBilled: r.workDoneNotBilled,
      delayExtensionLetter: r.delayExtensionLetter || '', reasonOfDelay: r.reasonOfDelay || '', subcontractedTo: r.subcontractedTo || '',
      status: r.status,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.vendorName || !form.poNo) { toast.error('Vendor and PO No are required'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        orderInitiationDate: form.orderInitiationDate ? new Date(form.orderInitiationDate) : null,
        orderCompletionDate: form.orderCompletionDate ? new Date(form.orderCompletionDate) : null,
        bgSource: form.bgSource || null, delayExtensionLetter: form.delayExtensionLetter || null,
        reasonOfDelay: form.reasonOfDelay || null, subcontractedTo: form.subcontractedTo || null,
        descriptionOfWork: form.descriptionOfWork || null,
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const r = await fetch('/api/fin/purchase-orders', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`/api/fin/purchase-orders?id=${deleteTarget.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const r = await fetch(`/api/fin/purchase-orders?ids=${[...selected].join(',')}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success) { toast.success(`Deleted ${j.deleted ?? selected.size} order${selected.size === 1 ? '' : 's'}`); setSelected(new Set()); setBulkDeleteOpen(false); await fetch_(); }
      else toast.error(j.error || 'Bulk delete failed');
    } catch { toast.error('Network error'); }
    finally { setBulkDeleting(false); }
  };

  const totalOrder = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalBilled = records.reduce((s, r) => s + r.billRaisedAmount, 0);
  const totalUnexec = records.reduce((s, r) => s + r.unexecutedWorkAmount, 0);

  const handlePrint = (r: WorkOrder) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const fmtNum = (n: number) => '₹ ' + (n ?? 0).toLocaleString('en-IN');
    const fmtDate = (d: string | null) => d ? d.split('T')[0] : '—';
    const linesHtml = `
      <tr><td class="c">1</td><td>${r.poNo}</td><td>${r.vendorName}</td><td>${r.descriptionOfWork || '—'}</td><td class="r">${fmtNum(r.totalAmount)}</td></tr>
      <tr class="total-row"><td class="c" colspan="4">TOTAL</td><td class="r">${fmtNum(r.totalAmount)}</td></tr>`;
    const siteName = r.site?.name || '—';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PO - ${r.poNo}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:20px}
      .po{max-width:800px;margin:0 auto;border:2px solid #000}
      .header{display:grid;grid-template-columns:auto 1fr;padding:12px 16px;background:#f5a623;color:#0a0d12}
      .header-text h1{font-size:18px;font-weight:bold;letter-spacing:1px}
      .header-text h2{font-size:14px;font-weight:normal;margin-top:2px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #000}
      .info-grid>div{padding:8px 12px}
      .info-grid>div:first-child{border-right:1px solid #000}
      .info-row{display:flex;margin:2px 0;font-size:10px}
      .info-row .lbl{font-weight:bold;min-width:130px}
      .info-row .lbl::after{content:':'}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #000;padding:5px 7px;font-size:10px}
      th{background:#f5a623;color:#0a0d12;font-size:9px;text-transform:uppercase;text-align:center}
      td.r{text-align:right;font-family:monospace}
      td.c{text-align:center}
      tr.total-row td{font-weight:bold;border-top:2px solid #000}
      .amt-words{padding:7px 12px;border-top:1px solid #000;font-size:10px}
      .sign-grid{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:2px solid #000;min-height:80px}
      .sign-box{border-right:1px solid #000;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;font-size:9px}
      .sign-box:last-child{border-right:none}
      .sign-box .role{font-weight:bold;margin-top:30px;border-top:1px solid #555;padding-top:4px;width:75%}
      .footer-note{text-align:center;padding:5px;font-size:8px;color:#555;border-top:1px solid #000}
      @media print{body{padding:0}@page{size:landscape;margin:0.3in}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
    </style></head><body>
    <div class="po">
      <div class="header"><div></div><div class="header-text"><h1>PURCHASE ORDER</h1><h2>${r.poNo}</h2></div></div>
      <div class="info-grid">
        <div>
          <div class="info-row"><span class="lbl">Vendor</span><span>${r.vendorName}</span></div>
          <div class="info-row"><span class="lbl">Site</span><span>${siteName}</span></div>
          <div class="info-row"><span class="lbl">Description</span><span>${r.descriptionOfWork || '—'}</span></div>
        </div>
        <div>
          <div class="info-row"><span class="lbl">PO No</span><span><b>${r.poNo}</b></span></div>
          <div class="info-row"><span class="lbl">Initiation Date</span><span>${fmtDate(r.orderInitiationDate)}</span></div>
          <div class="info-row"><span class="lbl">Status</span><span>${r.status}</span></div>
        </div>
      </div>
      <table><thead><tr><th style="width:35px">#</th><th>PO No</th><th>Vendor</th><th>Description of Work</th><th>Total Amount</th></tr></thead><tbody>${linesHtml}</tbody></table>
      <div class="amt-words"><b>Amount in Words:</b> Rupees ${numToWords(r.totalAmount || 0)}</div>
      <div class="sign-grid">
        <div class="sign-box"><div class="role">Prepared By</div></div>
        <div class="sign-box"><div class="role">Checked By</div></div>
        <div class="sign-box"><div class="role">Authorized By</div></div>
      </div>
      <div class="footer-note">This is a computer-generated document. E. &amp; O. E.</div>
    </div>
    <div style="text-align:center;margin:20px" class="no-print">
      <button onclick="window.print()" style="padding:8px 20px;background:#f5a623;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#0a0d12">Print / Save PDF</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#252e3a;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#e2e8f0;margin-left:8px">Close</button>
    </div>
    <style>.no-print{display:block}@media print{.no-print{display:none!important}}</style>
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
        keyField="poNo"
        existingKeys={new Set(records.map(r => r.poNo))}
        commitEndpoint="/api/fin/purchase-orders/import"
        sampleRow={WO_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetch_}
      />
    );
  }

  const inputCls = 'vc-input';
  const lbl = 'text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block';

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Work Orders</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Order Value</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalOrder/10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Bill Raised</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalBilled/10000000).toFixed(2)} Cr</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Unexecuted</div><div className="text-[20px] font-bold text-[#ffab40]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>₹{(totalUnexec/10000000).toFixed(2)} Cr</div></div>
      </div>

      <div className="vc-panel"><div className="vc-panel-header"><ClipboardList size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Work Orders (Orders in Hand)</span><span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span><div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search work orders..." /></div><div className="flex items-center gap-2 ml-2"><button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={WO_COLUMNS} filename="fin-work-orders" /></div><button onClick={openNew} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Work Order</button></div>
        <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[110px]"><option value="all">All Statuses</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
          <select value={partyFilter} onChange={e=>setPartyFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none min-w-[150px]"><option value="all">All Vendors</option>{vendorNames.map(p=><option key={p} value={p}>{p}</option>)}</select>
          {filtersActive && <button onClick={clearFilters} className="text-[11px] text-[#f5a623] hover:underline">Clear filters</button>}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-[#8899aa]"><span className="font-mono text-[#e2e8f0] font-semibold">{selected.size}</span> selected</span>
              <button onClick={()=>setSelected(new Set())} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Clear</button>
              <button onClick={()=>setBulkDeleteOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] !text-[#ff3d3d] !border-[#ff3d3d]/40 hover:!bg-[#ff3d3d]/10"><Trash2 size={13} /> Delete Selected</button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto"><table className="w-full text-[11px]"><thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]"><th className="py-2 px-3 w-8"><Checkbox checked={allPageSelected} onCheckedChange={toggleAllOnPage} /></th>{['PO No','Vendor','Description of Work','Init Date','Total Amt','Unexecuted','Bill Raised','Received','Status',''].map(h=><th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r=><tr key={r.id} className="hover:bg-[#141920]"><td className="py-2.5 px-3"><Checkbox checked={selected.has(r.id)} onCheckedChange={()=>toggleRow(r.id)} /></td><td className="py-2.5 px-3 text-[#f5a623] font-mono whitespace-nowrap">{r.poNo}</td><td className="py-2.5 px-3 text-[#e2e8f0] max-w-[150px] truncate">{r.vendorName||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate">{r.descriptionOfWork||'—'}</td><td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.orderInitiationDate?.split('T')[0]||'—'}</td><td className="py-2.5 px-3 text-[#e2e8f0] font-mono text-right whitespace-nowrap">{fmt(r.totalAmount)}</td><td className="py-2.5 px-3 text-[#ffab40] font-mono text-right whitespace-nowrap">{fmt(r.unexecutedWorkAmount)}</td><td className="py-2.5 px-3 text-[#00d4ff] font-mono text-right whitespace-nowrap">{fmt(r.billRaisedAmount)}</td><td className="py-2.5 px-3 text-[#00e676] font-mono text-right whitespace-nowrap">{fmt(r.amountReceivedOutOfBill)}</td><td className="py-2.5 px-3"><span className={`vc-badge ${r.status==='Active'?'bg-[#00e676]/15 text-[#00e676]':r.status==='Completed'?'bg-[#00d4ff]/15 text-[#00d4ff]':r.status==='On Hold'?'bg-[#ffab40]/15 text-[#ffab40]':'bg-[#5a6878]/15 text-[#5a6878]'}`}>{r.status}</span></td><td className="py-2.5 px-3"><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13}/></button><button onClick={()=>handlePrint(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10"><Printer size={13}/></button><button onClick={()=>{setDeleteTarget(r);setDeleteOpen(true);}} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13}/></button></div></td></tr>)}{tc.pageItems.length===0&&<tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No matching work orders</td></tr>}</tbody></table></div><PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} /></div></div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget?'Edit Purchase Order':'New Purchase Order'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Vendor Name *</label><input value={form.vendorName} onChange={e=>setForm(p=>({...p,vendorName:e.target.value}))} className={inputCls}/></div>
            <div><label className={lbl}>PO No *</label><input value={form.poNo} onChange={e=>setForm(p=>({...p,poNo:e.target.value}))} className={inputCls}/></div>
          </div>
          <div><label className={lbl}>Description of Work</label><input value={form.descriptionOfWork} onChange={e=>setForm(p=>({...p,descriptionOfWork:e.target.value}))} className={inputCls}/></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Site</label><select value={form.siteId} onChange={e=>setForm(p=>({...p,siteId:Number(e.target.value)}))} className={`${inputCls} appearance-none`}><option value={0}>— None —</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className={lbl}>Order Initiation Date</label><input type="date" value={form.orderInitiationDate} onChange={e=>setForm(p=>({...p,orderInitiationDate:e.target.value}))} className={inputCls}/></div>
            <div><label className={lbl}>Order Completion Date</label><input type="date" value={form.orderCompletionDate} onChange={e=>setForm(p=>({...p,orderCompletionDate:e.target.value}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Total Amount (₹)</label><input type="number" value={form.totalAmount||''} onChange={e=>setForm(p=>({...p,totalAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Unexecuted Work Amount</label><input type="number" value={form.unexecutedWorkAmount||''} onChange={e=>setForm(p=>({...p,unexecutedWorkAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Vendor ID</label><input value={form.vendorId} onChange={e=>setForm(p=>({...p,vendorId:e.target.value}))} className={inputCls} placeholder="V001"/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Amount Booked Last FY</label><input type="number" value={form.amountBookedLastFY||''} onChange={e=>setForm(p=>({...p,amountBookedLastFY:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Amount Booked Current FY</label><input type="number" value={form.amountBookedCurrentFY||''} onChange={e=>setForm(p=>({...p,amountBookedCurrentFY:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Amount To Be Booked End FY</label><input type="number" value={form.amountToBeBookedByEndFY||''} onChange={e=>setForm(p=>({...p,amountToBeBookedByEndFY:Number(e.target.value)}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Bill Raised</label><input type="number" value={form.billRaisedAmount||''} onChange={e=>setForm(p=>({...p,billRaisedAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Amount Received Out of Bill</label><input type="number" value={form.amountReceivedOutOfBill||''} onChange={e=>setForm(p=>({...p,amountReceivedOutOfBill:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>Work Done Not Billed</label><input type="number" value={form.workDoneNotBilled||''} onChange={e=>setForm(p=>({...p,workDoneNotBilled:Number(e.target.value)}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>BG Amount</label><input type="number" value={form.bgAmount||''} onChange={e=>setForm(p=>({...p,bgAmount:Number(e.target.value)}))} className={inputCls}/></div>
            <div><label className={lbl}>BG Source</label><input value={form.bgSource} onChange={e=>setForm(p=>({...p,bgSource:e.target.value}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className={`${inputCls} appearance-none`}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={lbl}>Subcontracted To</label><input value={form.subcontractedTo} onChange={e=>setForm(p=>({...p,subcontractedTo:e.target.value}))} className={inputCls}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Delay/Extension Letter</label><input value={form.delayExtensionLetter} onChange={e=>setForm(p=>({...p,delayExtensionLetter:e.target.value}))} className={inputCls}/></div>
            <div><label className={lbl}>Reason of Delay</label><input value={form.reasonOfDelay} onChange={e=>setForm(p=>({...p,reasonOfDelay:e.target.value}))} className={inputCls}/></div>
          </div>
        </div>
        <DialogFooter><button onClick={()=>setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}{editTarget?'Update':'Create'}</button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Work Order</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}><AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete {selected.size} Work Order{selected.size===1?'':'s'}</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">This will permanently delete <strong className="text-[#f5a623]">{selected.size}</strong> selected work order{selected.size===1?'':'s'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg disabled:opacity-50">{bulkDeleting?'Deleting...':'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
