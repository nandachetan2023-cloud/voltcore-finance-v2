'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { FileText, Plus, Pencil, Trash2, Search, X, Calendar, Package, CheckCircle, Circle, Printer, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { useCompanyProfile } from '@/hooks/use-company-profile';

interface LineItem {
  id: number;
  itemDesc: string;
  qtyOrdered: number;
  qtyReceived: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface PORecord {
  id: number;
  poNo: string;
  vendor: string;
  project: string;
  projectShort: string;
  totalValue: number;
  deliveryAddress: string;
  requiredDate: string;
  actualDeliveryDate: string;
  lineItems: LineItem[];
  status: 'Open' | 'Partially Received' | 'Completed' | 'Overdue';
  poIssueDate: string;
  grnDate: string | null;
  invoiceMatchDate: string | null;
  poIssued: boolean;
  grnCompleted: boolean;
  invoiceMatched: boolean;
}

const VENDORS = ['SteelMech India Pvt Ltd', 'PowerCables Ltd', 'Transformers & Co', 'Elecon Engineering', 'Kirloskar Brothers', 'Siemens India', 'BHEL', 'ABB India'];
const PROJECTS = ['BALCO', 'NTPC', 'Hindalco', 'Coal India', 'JSW'];
const STATUSES: PORecord['status'][] = ['Open', 'Partially Received', 'Completed', 'Overdue'];

const STATUS_STYLES: Record<PORecord['status'], string> = {
  'Open': 'bg-[#00d4ff]/15 text-[#00d4ff]',
  'Partially Received': 'bg-[#f5a623]/15 text-[#f5a623]',
  'Completed': 'bg-[#00e676]/15 text-[#00e676]',
  'Overdue': 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

const now = new Date();
const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysDiff = (d: Date) => Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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

function formatCurrency(amount: number): string {
  return '₹' + (amount ?? 0).toLocaleString('en-IN');
}

function fmtCr(amount: number): string {
  if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
  return '₹' + (amount ?? 0).toLocaleString('en-IN');
}

function isOverdue(dateStr: string): boolean {
  return daysDiff(new Date(dateStr)) < 0;
}

function overdueDays(dateStr: string): number {
  return Math.abs(daysDiff(new Date(dateStr)));
}

function deliveryStatus(item: LineItem): { label: string; color: string; dot: string } {
  if (item.qtyReceived >= item.qtyOrdered) return { label: 'Full', color: 'text-[#00e676]', dot: 'bg-[#00e676]' };
  if (item.qtyReceived > 0) return { label: 'Partial', color: 'text-[#f5a623]', dot: 'bg-[#f5a623]' };
  return { label: 'Pending', color: 'text-[#5a6878]', dot: 'bg-[#5a6878]' };
}

function grnStatus(po: PORecord): { label: string; color: string; dot: string } {
  if (po.status === 'Completed') return { label: 'Full', color: 'text-[#00e676]', dot: 'bg-[#00e676]' };
  if (po.status === 'Partially Received') return { label: 'Partial', color: 'text-[#f5a623]', dot: 'bg-[#f5a623]' };
  if (po.status === 'Overdue') return { label: overdueDays(po.requiredDate) + 'd overdue', color: 'text-[#ff3d3d]', dot: 'bg-[#ff3d3d]' };
  return { label: '—', color: 'text-[#5a6878]', dot: 'bg-[#5a6878]' };
}

const DELIVERY_STATUS_OPTIONS: Array<{ label: string; desc: string }> = [
  { label: 'Pending', desc: 'No items received' },
  { label: 'Partial', desc: 'Partial receipt' },
  { label: 'Full', desc: 'All items received' },
  { label: 'Overdue', desc: 'Past due date' },
];

export default function ProcurementPORegister() {
  const profile = useCompanyProfile();
  const [records, setRecords] = useState<PORecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PORecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PORecord | null>(null);
  const [projectFilter, setProjectFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
const [grnEditItemId, setGrnEditItemId] = useState<number | null>(null);
const [grnEditQty, setGrnEditQty] = useState(0);
const [formOpen, setFormOpen] = useState(false);
const [formTarget, setFormTarget] = useState<PORecord | null>(null);
const [formVendor, setFormVendor] = useState(VENDORS[0]);
const [formProject, setFormProject] = useState(PROJECTS[0]);
const [formAddress, setFormAddress] = useState('');
const [formReqDate, setFormReqDate] = useState('');
const [formItems, setFormItems] = useState<(Omit<LineItem, 'id'> & { id: number })[]>([]);
const [nextFormItemId, setNextFormItemId] = useState(1);

  const loadPOs = useCallback(async () => {
    try {
      const r = await fetch('/api/fin/po-register');
      const j = await r.json();
      if (j.success) setRecords(j.data);
    } catch {
      toast.error('Failed to load POs');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPOs(); }, [loadPOs]);

  const persistPO = (method: 'POST' | 'PUT', payload: Record<string, unknown>) => {
    fetch('/api/fin/po-register', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json())
      .then(j => { if (!j.success) toast.error(j.error || 'Failed'); })
      .catch(() => toast.error('Network error'));
  };

  const filtered = useMemo(() => {
    let arr = [...records];
    if (projectFilter !== 'All') arr = arr.filter(r => r.projectShort === projectFilter);
    if (vendorFilter !== 'All') arr = arr.filter(r => r.vendor === vendorFilter);
    if (statusFilter !== 'All') arr = arr.filter(r => r.status === statusFilter);
    if (overdueOnly) arr = arr.filter(r => isOverdue(r.requiredDate) && r.status !== 'Completed');
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      arr = arr.filter(r => r.poNo.toLowerCase().includes(q));
    }
    return arr;
  }, [records, projectFilter, vendorFilter, statusFilter, overdueOnly, searchText]);

  const tc = useTableControls(filtered, (r) => r.poNo);

  const openDetail = (r: PORecord) => {
    setDetailTarget(r);
    setGrnEditItemId(null);
    setDetailOpen(true);
  };

  const handlePrint = (r: PORecord) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const num = (n: number) => (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtNum = (n: number) => '₹ ' + num(n);
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const companyName = profile.name || 'VoltCore Engineering Pvt Ltd';
    const companyAddress = profile.address || '123 Industrial Area, Korba, Chhattisgarh - 495677';
    const companyGstin = profile.gstin || '';
    const companyPan = profile.pan || '';
    const logoHtml = profile.logoUrl ? `<img src="${profile.logoUrl}" alt="Logo" class="brand-logo"/>` : `<div class="brand-mark"><span class="material-symbols-outlined">factory</span></div>`;

    const subtotal = (r.lineItems || []).reduce((s, it) => s + (it.total || 0), 0);
    const cgst = Math.round(subtotal * 0.09 * 100) / 100;
    const sgst = Math.round(subtotal * 0.09 * 100) / 100;
    const grandTotal = subtotal + cgst + sgst;

    const itemRows = (r.lineItems || []).map((it, i) => `
      <tr style="border-bottom:1px solid #eceef0">
        <td style="padding:12px;font-size:12px;vertical-align:top">${String(i + 1).padStart(2, '0')}</td>
        <td style="padding:12px;font-size:12px;vertical-align:top">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">${esc(it.itemDesc) || '—'}</div>
          <div style="font-size:11px;color:#877363">HSN: ${esc(it.unit) || '—'}</div>
        </td>
        <td style="padding:12px;font-size:12px;text-align:right;vertical-align:top;font-variant-numeric:tabular-nums">${num(it.qtyOrdered)}</td>
        <td style="padding:12px;font-size:12px;text-align:left;vertical-align:top">${esc(it.unit) || '—'}</td>
        <td style="padding:12px;font-size:12px;text-align:right;vertical-align:top;font-variant-numeric:tabular-nums">${num(it.unitPrice)}</td>
        <td style="padding:12px;font-size:12px;text-align:right;vertical-align:top;font-variant-numeric:tabular-nums">${num(it.total)}</td>
      </tr>`).join('');

    const terms = profile.terms.length ? profile.terms : [
      'Delivery must be completed within 15 days of PO date.',
      'Payment terms: 30 days after receipt of goods and invoice.',
      'Subject to inspection at site. Rejections to be replaced in 48 hours.',
      'All disputes subject to Korba jurisdiction.',
    ];
    const signatoryLabel = profile.signatoryLabel;
    const tagline = profile.tagline || 'HEAVY FABRICATION & ENGINEERING';

    const html = `<!DOCTYPE html><html class="light" lang="en"><head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Purchase Order Preview</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
    <style>
      .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
      .a4-container{width:210mm;min-height:297mm;padding:15mm;margin:20px auto;box-shadow:0 4px 12px rgba(0,0,0,.08);background:white;border:1px solid #e2e8f0}
      @media print{body{background:white}.no-print{display:none!important}.a4-container{margin:0;box-shadow:none;border:none}}
    </style>
    </head>
    <body style="font-family:'Inter',sans-serif;background:#f7f9fb;color:#191c1e;-webkit-font-smoothing:antialiased">
    <div class="a4-container">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14mm">
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            ${profile.logoUrl
              ? `<img src="${profile.logoUrl}" alt="Logo" style="height:40px;max-width:120px;object-fit:contain"/>`
              : `<div style="width:40px;height:40px;background:#ffb300;color:#2d1600;display:flex;align-items:center;justify-content:center;border-radius:4px"><span class="material-symbols-outlined" style="font-size:22px">factory</span></div>`}
            <div>
              <div style="font-size:24px;font-weight:600;color:#ffb300;letter-spacing:-.01em;line-height:1.1">${esc(companyName)}</div>
              <div style="font-size:11px;font-weight:500;letter-spacing:.5px;text-transform:uppercase;color:#544435">${esc(tagline)}</div>
            </div>
          </div>
          <div style="font-size:13px;line-height:1.6;color:#544435">
            ${esc(companyAddress)}${companyGstin ? `<br>GSTIN: ${esc(companyGstin)}` : ''}${companyPan ? `<br>PAN: ${esc(companyPan)}` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <h1 style="font-size:20px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;color:#191c1e">Purchase Order</h1>
          <table style="margin-left:auto;border-collapse:collapse">
            <tr style="border-bottom:1px solid #e0e3e5"><td style="padding:4px 24px 4px 0;font-size:12px;color:#544435;text-align:right">PO Number:</td><td style="padding:4px 0;font-size:12px;font-weight:700;text-align:right">${esc(r.poNo)}</td></tr>
            <tr style="border-bottom:1px solid #e0e3e5"><td style="padding:4px 24px 4px 0;font-size:12px;color:#544435;text-align:right">Date:</td><td style="padding:4px 0;font-size:12px;text-align:right">${fmtDate(r.poIssueDate)}</td></tr>
            <tr style="border-bottom:1px solid #e0e3e5"><td style="padding:4px 24px 4px 0;font-size:12px;color:#544435;text-align:right">Site Code:</td><td style="padding:4px 0;font-size:12px;text-align:right">${esc(r.projectShort)}</td></tr>
            <tr><td style="padding:4px 24px 4px 0;font-size:12px;color:#544435;text-align:right">Job Code:</td><td style="padding:4px 0;font-size:12px;text-align:right">${esc(r.project)}</td></tr>
          </table>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-bottom:12mm">
        <div style="padding:16px;background:#eceef0;border:1px solid #dac2af;border-radius:4px">
          <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#544435;border-bottom:1px solid #dac2af;padding-bottom:6px;margin:0 0 10px">Supplier</h3>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${esc(r.vendor)}</div>
          <p style="font-size:12px;color:#333;line-height:1.5;margin:0">Address on file</p>
        </div>
        <div style="padding:16px;background:#eceef0;border:1px solid #dac2af;border-radius:4px">
          <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#544435;border-bottom:1px solid #dac2af;padding-bottom:6px;margin:0 0 10px">Shipping &amp; Billing</h3>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${esc(r.project)}</div>
          <p style="font-size:12px;color:#333;line-height:1.5;margin:0">${esc(r.deliveryAddress)}</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:12mm">
        <thead>
          <tr style="background:#e6e8ea;border-top:1px solid #877363;border-bottom:1px solid #877363">
            <th style="padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:left;width:32px">#</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:left">Description / HSN</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:right;width:70px">Qty</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:left;width:60px">UOM</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:right;width:110px">Rate (₹)</th>
            <th style="padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;text-align:right;width:120px">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-bottom:16mm">
        <div style="width:320px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#544435;padding:4px 0"><span>Subtotal:</span><span>${fmtNum(subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#544435;padding:4px 0"><span>CGST (9%):</span><span>${fmtNum(cgst)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#544435;padding:4px 0;border-bottom:1px solid #e0e3e5"><span>SGST (9%):</span><span>${fmtNum(sgst)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:600;color:#ffb300;padding:10px 0 0;margin-top:6px"><span>Grand Total:</span><span>${fmtNum(grandTotal)}</span></div>
          <p style="text-align:right;font-size:11px;font-style:italic;color:#544435;margin:6px 0 0">Rupees ${numToWords(grandTotal)}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:auto">
        <div>
          <h3 style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #dac2af;padding-bottom:6px;margin:0 0 8px;width:fit-content">Terms &amp; Conditions</h3>
          <ol style="padding-left:18px;font-size:11px;color:#544435;line-height:1.8;margin:0">${terms.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end">
          <div style="height:48px"></div>
          <div style="font-weight:600;font-size:12px">${esc(companyName)}</div>
          <div style="font-size:11px;color:#544435">${esc(signatoryLabel)}</div>
          <div style="font-size:11px;color:#877363">Document: ${esc(r.poNo)}</div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin:20px" class="no-print">
      <button onclick="window.print()" style="padding:8px 20px;background:#ffb300;color:#2d1600;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">Print / Save PDF</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#e0e3e5;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#191c1e;margin-left:8px">Close</button>
    </div>
    </body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
    fetch(`/api/fin/po-register?id=${deleteTarget.id}`, { method: 'DELETE' }).then(r => r.json()).then(j => { if (!j.success) toast.error(j.error || 'Failed'); }).catch(() => toast.error('Network error'));
    toast.success(`PO ${deleteTarget.poNo} deleted`);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleGrnUpdate = () => {
    if (!detailTarget || grnEditItemId === null) return;
    const updated = { ...detailTarget };
    updated.lineItems = updated.lineItems.map(it =>
      it.id === grnEditItemId ? { ...it, qtyReceived: Math.min(grnEditQty, it.qtyOrdered) } : it
    );
    const totalOrd = updated.lineItems.reduce((s, it) => s + it.qtyOrdered, 0);
    const totalRec = updated.lineItems.reduce((s, it) => s + it.qtyReceived, 0);
    if (totalRec >= totalOrd) {
      updated.status = 'Completed';
      updated.grnCompleted = true;
      updated.grnDate = new Date().toISOString().split('T')[0];
    } else if (totalRec > 0) {
      updated.status = 'Partially Received';
      updated.grnCompleted = true;
      updated.grnDate = updated.grnDate || new Date().toISOString().split('T')[0];
    }
    updated.actualDeliveryDate = totalRec > 0 ? new Date().toISOString().split('T')[0] : updated.actualDeliveryDate;
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setDetailTarget(updated);
    persistPO('PUT', {
      id: updated.id, status: updated.status, grnCompleted: updated.grnCompleted,
      grnDate: updated.grnDate || null, actualDeliveryDate: updated.actualDeliveryDate || null,
      lineItems: updated.lineItems,
    });
    setGrnEditItemId(null);
    toast.success('GRN quantity updated');
  };

  const handleActualDeliveryEdit = (val: string) => {
    if (!detailTarget) return;
    const updated = { ...detailTarget, actualDeliveryDate: val };
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setDetailTarget(updated);
    persistPO('PUT', { id: updated.id, actualDeliveryDate: val || null });
  };

  const openCreate = () => {
    setFormTarget(null);
    setFormVendor(VENDORS[0]);
    setFormProject(PROJECTS[0]);
    setFormAddress('Site Location, Korba, Chhattisgarh');
    setFormReqDate(addDays(now, 30).toISOString().split('T')[0]);
    setFormItems([
      { id: 1, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 },
      { id: 2, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 },
      { id: 3, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 },
    ]);
    setNextFormItemId(4);
    setFormOpen(true);
  };

  const openEdit = (r: PORecord) => {
    setFormTarget(r);
    setFormVendor(r.vendor);
    setFormProject(r.projectShort);
    setFormAddress(r.deliveryAddress);
    setFormReqDate(r.requiredDate);
    setFormItems(r.lineItems.map(it => ({ ...it })));
    setNextFormItemId(Math.max(...r.lineItems.map(it => it.id), 0) + 1);
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    if (!formVendor || !formReqDate) { toast.error('Vendor and Required Date are required'); return; }
    const validItems = formItems.filter(it => it.itemDesc && it.qtyOrdered > 0);
    if (validItems.length === 0) { toast.error('Add at least one line item with a description and quantity'); return; }
    const newId = formTarget ? formTarget.id : Math.max(...records.map(r => r.id)) + 1;
    const poNo = formTarget ? formTarget.poNo : 'PO-2026-' + String(newId).padStart(3, '0');
    const address = formAddress || 'Site Location, Korba, Chhattisgarh';
    const reqDate = formReqDate || toDateStr(addDays(now, 30));
    const projectFull = PROJECTS.find(p => p.startsWith(formProject)) || formProject;
    const items = validItems.map(it => ({ ...it, total: it.qtyOrdered * it.unitPrice }));
    const total = items.reduce((s, it) => s + it.total, 0);
    const poDate = toDateStr(new Date());
    const record: PORecord = {
      id: newId, poNo, vendor: formVendor, project: projectFull, projectShort: formProject,
      totalValue: total, deliveryAddress: address, requiredDate: reqDate, actualDeliveryDate: '',
      lineItems: items, status: 'Open', poIssueDate: poDate, grnDate: null, invoiceMatchDate: null,
      poIssued: true, grnCompleted: false, invoiceMatched: false,
    };
    if (formTarget) {
      const merged = { ...record, status: formTarget!.status, grnCompleted: formTarget!.grnCompleted, invoiceMatched: formTarget!.invoiceMatched };
      setRecords(prev => prev.map(r => r.id === newId ? merged : r));
      persistPO('PUT', { id: newId, ...record, status: merged.status, grnCompleted: merged.grnCompleted, invoiceMatched: merged.invoiceMatched });
      toast.success(`PO ${poNo} updated`);
    } else {
      setRecords(prev => [...prev, record]);
      persistPO('POST', { ...record });
      toast.success(`PO ${poNo} created`);
    }
    setFormOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Purchase Order Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span>
          <div className="ml-2">
            <SearchInput value={searchText} onChange={setSearchText} placeholder="Search PO#..." />
          </div>
          <button onClick={openCreate} className="ml-2 px-3 py-1.5 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[11px] font-semibold hover:bg-[#e8991a] flex items-center gap-1.5"><Plus size={13} /> New PO</button>
        </div>
        <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-[#252e3a]">
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
            <option value="All">All Projects</option>
            {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
            <option value="All">All Vendors</option>
            {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
            <option value="All">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[11px] text-[#8899aa] cursor-pointer select-none ml-1">
            <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} className="accent-[#ff3d3d] w-3 h-3" />
            Overdue Deliveries Only
          </label>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['PO#', 'Vendor', 'Project', 'Total Value', 'Delivery Address', 'Required Date', 'Line Items', 'GRN Status', '3-Way Match', 'Status', 'Actions'].map(h =>
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {tc.pageItems.map(r => {
                  const grn = grnStatus(r);
                  return (
                    <tr key={r.id} className="hover:bg-[#141920]">
                      <td className="py-2.5 px-3">
                        <button onClick={() => openDetail(r)} className="text-[#f5a623] font-mono hover:underline text-left">{r.poNo}</button>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendor}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.projectShort}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{formatCurrency(r.totalValue)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[140px] truncate">{r.deliveryAddress}</td>
                      <td className={`py-2.5 px-3 font-mono ${isOverdue(r.requiredDate) && r.status !== 'Completed' ? 'text-[#ff3d3d]' : 'text-[#8899aa]'}`}>{r.requiredDate}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.lineItems.length} items</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${grn.dot}`} />
                          <span className={grn.color}>{grn.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${r.poIssued ? 'bg-[#00e676] text-[#0f1318]' : 'bg-[#252e3a] text-[#5a6878]'}`} style={{ fontSize: 7 }}>{r.poIssued ? '✓' : '○'}</span>
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${r.grnCompleted ? 'bg-[#00e676] text-[#0f1318]' : 'bg-[#252e3a] text-[#5a6878]'}`} style={{ fontSize: 7 }}>{r.grnCompleted ? '✓' : '○'}</span>
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${r.invoiceMatched ? 'bg-[#00e676] text-[#0f1318]' : 'bg-[#252e3a] text-[#5a6878]'}`} style={{ fontSize: 7 }}>{r.invoiceMatched ? '✓' : '○'}</span>
                          {r.poIssued && r.grnCompleted && r.invoiceMatched && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#00e676]/15 text-[#00e676]">Ready to Pay</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1">
                          <button onClick={() => handlePrint(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10"><Printer size={13} /></button>
                          <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                          <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tc.pageItems.length === 0 && (
                  <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No purchase orders match the current filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {detailTarget && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">PO No</label>
                    <div className="text-[#e2e8f0] font-mono">{detailTarget.poNo}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Vendor</label>
                    <div className="text-[#e2e8f0]">{detailTarget.vendor}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project</label>
                    <div className="text-[#e2e8f0]">{detailTarget.project}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Status</label>
                    <span className="vc-badge">{detailTarget.status}</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Total Value</label>
                    <div className="text-[#e2e8f0] font-mono">₹{detailTarget.totalValue.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Required Date</label>
                    <div className="text-[#e2e8f0]">{detailTarget.requiredDate}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Delivery Address</label>
                  <div className="text-[#e2e8f0]">{detailTarget.deliveryAddress}</div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setDetailOpen(false)} className="vc-btn-ghost">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-white text-[#1a1a1a] sm:max-w-[800px] max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
          <DialogHeader className="sr-only"><DialogTitle>{formTarget ? 'Edit' : 'New'} Purchase Order</DialogTitle><DialogDescription>Purchase order form</DialogDescription></DialogHeader>
          <div className="bg-white">
            {/* Company Letterhead */}
            <div className="text-center border-b-2 border-[#1a1a1a] pb-3 mb-4">
              <div className="text-[18px] font-bold">VOLTCORE ENGINEERING PVT LTD</div>
              <div className="text-[10px] text-[#555]">Registered Office: 123 Industrial Area, Korba, Chhattisgarh - 495677</div>
              <div className="text-[10px] text-[#555]">GST: 22ABCDE1234F1Z5 | PAN: ABCDE1234F</div>
            </div>

            {/* PO Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[16px] font-bold">PURCHASE ORDER</div>
                <div className="text-[10px] text-[#555]">PO No: <input value={formTarget ? formTarget.poNo : 'PO-2026-XXX'} className="font-bold text-[#1a1a1a] bg-transparent border-b border-dashed border-[#999] outline-none w-[130px] text-[10px]" readOnly /></div>
                <div className="text-[10px] text-[#555]">Date: <span className="font-bold text-[#1a1a1a]">{toDateStr(new Date())}</span></div>
              </div>
              <div className="text-right text-[10px] w-[240px]">
                <div className="font-bold text-[12px] mb-1">Vendor:</div>
                <input value={formVendor} onChange={e => setFormVendor(e.target.value)} list="form-vendors" className="w-full bg-transparent border-b border-dashed border-[#999] outline-none text-[11px] font-bold text-[#1a1a1a] text-right" />
                <datalist id="form-vendors">{VENDORS.map(v => <option key={v} value={v} />)}</datalist>
                <input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#555] text-right mt-0.5" placeholder="Delivery Address" />
              </div>
            </div>

            {/* Project & Delivery Info */}
            <div className="mb-4 text-[10px] space-y-1">
              <div className="flex items-center gap-2"><span className="font-bold">Project:</span>
                <select value={formProject} onChange={e => setFormProject(e.target.value)} className="bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#1a1a1a] appearance-none">
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2"><span className="font-bold">Delivery Address:</span>
                <input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="flex-1 bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#1a1a1a]" placeholder="Site Location, Korba, Chhattisgarh" />
              </div>
              <div className="flex items-center gap-2"><span className="font-bold">Required Date:</span>
                <input type="date" value={formReqDate} onChange={e => setFormReqDate(e.target.value)} className="bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#1a1a1a]" />
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-[10px] border-collapse mb-3">
              <thead>
                <tr className="bg-[#f0f0f0]">
                  <th className="border border-[#ccc] px-2 py-1 text-left font-bold w-6">#</th>
                  <th className="border border-[#ccc] px-2 py-1 text-left font-bold">Item Description</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[60px]">Qty</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[55px]">Unit</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[90px]">Unit Price (₹)</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[90px]">Total (₹)</th>
                  <th className="border border-[#ccc] px-2 py-1 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {formItems.map((it, i) => {
                  const lineTotal = it.qtyOrdered * it.unitPrice;
                  return (
                    <tr key={it.id}>
                      <td className="border border-[#ccc] px-2 py-1 text-[#555] text-center">{i + 1}</td>
                      <td className="border border-[#ccc] px-2 py-1">
                        <input value={it.itemDesc} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], itemDesc: e.target.value }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px]" placeholder="Description of item/service" />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right">
                        <input type="number" value={it.qtyOrdered || ''} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], qtyOrdered: Math.max(0, Number(e.target.value)) }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px] text-right font-mono" min={0} />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right">
                        <input value={it.unit} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], unit: e.target.value }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px] text-right" />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right">
                        <input type="number" value={it.unitPrice || ''} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], unitPrice: Math.max(0, Number(e.target.value)) }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px] text-right font-mono" min={0} />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right font-mono font-bold">{(lineTotal ?? 0).toLocaleString('en-IN')}</td>
                      <td className="border border-[#ccc] px-2 py-1 text-center">
                        {formItems.length > 1 && <button onClick={() => setFormItems(prev => prev.filter((_, idx) => idx !== i))} className="text-[#ff3d3d] text-[11px] hover:underline">✕</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#f8f8f8]">
                  <td colSpan={7} className="border border-[#ccc] px-2 py-1">
                    <button onClick={() => { setFormItems(prev => [...prev, { id: nextFormItemId, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 }]); setNextFormItemId(n => n + 1); }} className="text-[10px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={11} /> Add Row</button>
                  </td>
                </tr>
                <tr className="bg-[#f8f8f8]">
                  <td colSpan={5} className="border border-[#ccc] px-2 py-1 text-right font-bold text-[11px]">Grand Total</td>
                  <td className="border border-[#ccc] px-2 py-1 text-right font-bold font-mono text-[11px]">{formItems.reduce((s, it) => s + it.qtyOrdered * it.unitPrice, 0).toLocaleString('en-IN')}</td>
                  <td className="border border-[#ccc] px-2 py-1"></td>
                </tr>
              </tfoot>
            </table>

            {/* Terms & Conditions */}
            <div className="mb-3 text-[10px]">
              <div className="font-bold mb-1">Terms & Conditions:</div>
              <ol className="list-decimal pl-4 text-[#555] space-y-0.5">
                <li>Delivery must be completed by the required date specified above.</li>
                <li>Inspection at site before acceptance. Rejected materials to be replaced at vendor cost.</li>
                <li>Payment within 30 days of complete delivery & acceptance.</li>
                <li>Liquidated damages @ 0.5% per week subject to max 5% of PO value for delayed delivery.</li>
                <li>GST & other taxes as applicable will be paid extra.</li>
                <li>This PO is subject to Korba jurisdiction.</li>
              </ol>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 mt-4 text-[10px]">
              <div>
                <div className="border-t border-[#1a1a1a] pt-1 mt-8">Authorised Signatory</div>
                <div className="text-[#555]">For Voltcore Engineering Pvt Ltd</div>
              </div>
              <div>
                <div className="border-t border-[#1a1a1a] pt-1 mt-8">Accepted By</div>
                <input value={formVendor} readOnly className="bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#555] w-full" placeholder="Vendor name" />
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center text-[8px] text-[#999] mt-4 border-t border-[#ddd] pt-2">This is a computer-generated document. No signature is required.</div>
          </div>
          <DialogFooter className="gap-2 pt-3 border-t border-[#ddd]">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-[#ccc] text-[#555] text-[12px] font-semibold hover:bg-[#f5f5f5]">Cancel</button>
            <button onClick={handleFormSubmit} className="px-4 py-2 rounded-lg bg-[#f5a623] text-white text-[12px] font-semibold hover:bg-[#e8991a] flex items-center gap-1.5"><FileText size={13} /> {formTarget ? 'Update' : 'Create'} Purchase Order</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong> for <strong className="text-[#e2e8f0]">{deleteTarget?.vendor}</strong>? This action cannot be undone.
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
