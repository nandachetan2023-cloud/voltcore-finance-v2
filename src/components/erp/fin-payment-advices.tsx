'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FileText, Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronRight, Printer, ImagePlus, Trash, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Line {
  id?: number; billNo: string; invDate: string; month: string;
  invAmount: number; tdsAmount: number; amount: number;
  paidAmount: number; balanceAmount: number; remarks: string; voucherNo: string;
}
interface Party { id: number; name: string; code: string | null; pan: string | null; }
interface PoRef { id: number; poNo: string; totalAmount: number; }
interface Advice {
  id: number; adviceNo: string; partyId: number | null; party: Party | null;
  poId: number | null; po: PoRef | null; jobCode: string | null;
  totalAmount: number; paymentDate: string; paymentMode: string;
  referenceNo: string | null; notes: string | null;
  supplierName: string | null; vendorCode: string | null; panNo: string | null;
  bankName: string | null; accountNo: string | null; ifscCode: string | null;
  status: string; lines: Line[];
}
interface FormData {
  adviceNo: string; partyId: string; poId: string; jobCode: string;
  paymentDate: string; paymentMode: string;
  referenceNo: string; notes: string;
  supplierName: string; vendorCode: string; panNo: string;
  bankName: string; accountNo: string; ifscCode: string;
  lines: Line[];
}

const EMPTY_LINE: Line = { billNo: '', invDate: '', month: '', invAmount: 0, tdsAmount: 0, amount: 0, paidAmount: 0, balanceAmount: 0, remarks: '', voucherNo: '' };
const EMPTY: FormData = {
  adviceNo: '', partyId: '', poId: '', jobCode: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMode: 'NEFT', referenceNo: '', notes: '',
  supplierName: '', vendorCode: '', panNo: '', bankName: '', accountNo: '', ifscCode: '',
  lines: [{ ...EMPTY_LINE }],
};
const MODES = ['NEFT', 'RTGS', 'IMPS', 'Bank Transfer', 'Cheque', 'Cash', 'Online', 'ONLINE/CASH'];

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

function mockLine(billNo: string, invAmount: number, tdsAmount: number, remarks: string, month = ''): Line {
  const amount = invAmount - tdsAmount;
  return { billNo, invDate: '2025-01-15', month, invAmount, tdsAmount, amount, paidAmount: amount, balanceAmount: 0, remarks, voucherNo: '' };
}

function generateMockAdvices(): Advice[] {
  return [
    { id: 1, adviceNo: 'PA/2024-25/001', partyId: 1, party: { id: 1, name: 'Bharat Heavy Electricals Ltd', code: 'BHEL', pan: null }, totalAmount: 1500000, paymentDate: '2024-12-15T00:00:00', paymentMode: 'NEFT', referenceNo: 'UTR/NEFT/241215/001', notes: 'Payment for Nov 2024 billing', supplierName: 'Bharat Heavy Electricals Ltd', vendorCode: 'BHEL', panNo: 'AABCB1234F', bankName: 'SBI', accountNo: '12345678901', ifscCode: 'SBIN0001234', poId: null, po: null, jobCode: null, status: 'Approved', lines: [mockLine('BHEL/INV/001', 900000, 0, 'Phase 1 billing', 'Nov-24'), mockLine('BHEL/INV/002', 600000, 0, 'Material supply', 'Nov-24')] },
    { id: 2, adviceNo: 'PA/2024-25/002', partyId: 2, party: { id: 2, name: 'Tata Projects Ltd', code: 'TPL', pan: null }, totalAmount: 2200000, paymentDate: '2025-01-10T00:00:00', paymentMode: 'RTGS', referenceNo: 'UTR/RTGS/250110/002', notes: 'December 2024 progress billing', supplierName: 'Tata Projects Ltd', vendorCode: 'TPL', panNo: 'AAACT1234D', bankName: 'HDFC Bank', accountNo: '50200012345', ifscCode: 'HDFC0001234', poId: null, po: null, jobCode: null, status: 'Paid', lines: [mockLine('TPL/INV/101', 1200000, 0, 'Civil works', 'Dec-24'), mockLine('TPL/INV/102', 1000000, 0, 'Electrical works', 'Dec-24')] },
    { id: 3, adviceNo: 'PA/2024-25/003', partyId: 3, party: { id: 3, name: 'Larsen & Toubro Ltd', code: 'L&T', pan: null }, totalAmount: 3500000, paymentDate: '2025-02-20T00:00:00', paymentMode: 'Bank Transfer', referenceNo: 'TRF/250220/003', notes: 'January billing — Phase 2', supplierName: 'Larsen & Toubro Ltd', vendorCode: 'LNT', panNo: 'AAACL1234G', bankName: 'ICICI Bank', accountNo: '000601234567', ifscCode: 'ICIC0000006', poId: null, po: null, jobCode: null, status: 'Draft', lines: [mockLine('LT/INV/201', 2000000, 0, 'Structural steelwork', 'Jan-25'), mockLine('LT/INV/202', 1500000, 0, 'MEP works', 'Jan-25')] },
    { id: 4, adviceNo: 'PA/2024-25/004', partyId: 1, party: { id: 1, name: 'Bharat Heavy Electricals Ltd', code: 'BHEL', pan: null }, totalAmount: 800000, paymentDate: '2025-03-05T00:00:00', paymentMode: 'Cheque', referenceNo: 'CHQ/004567', notes: 'Advance payment for supply order', supplierName: 'Bharat Heavy Electricals Ltd', vendorCode: 'BHEL', panNo: 'AABCB1234F', bankName: 'SBI', accountNo: '12345678901', ifscCode: 'SBIN0001234', poId: null, po: null, jobCode: null, status: 'Approved', lines: [mockLine('BHEL/ADV/003', 800000, 0, 'Advance — Turbine spares', 'Mar-25')] },
    { id: 5, adviceNo: 'PA/2024-25/005', partyId: 2, party: { id: 2, name: 'Tata Projects Ltd', code: 'TPL', pan: null }, totalAmount: 1750000, paymentDate: '2025-04-12T00:00:00', paymentMode: 'IMPS', referenceNo: 'IMPS/250412/005', notes: 'February billing settlement', supplierName: 'Tata Projects Ltd', vendorCode: 'TPL', panNo: 'AAACT1234D', bankName: 'HDFC Bank', accountNo: '50200012345', ifscCode: 'HDFC0001234', poId: null, po: null, jobCode: null, status: 'Draft', lines: [mockLine('TPL/INV/103', 1000000, 0, 'Installation charges', 'Feb-25'), mockLine('TPL/INV/104', 750000, 0, 'Testing & commissioning', 'Feb-25')] },
  ];
}

const PA_COLUMNS: ExportColumn<Advice>[] = [
  { header: 'Advice No', accessor: 'adviceNo' },
  { header: 'Date', accessor: (r) => r.paymentDate?.split('T')[0] ?? '' },
  { header: 'Supplier Name', accessor: (r) => r.supplierName || r.party?.name || '' },
  { header: 'Vendor Code', accessor: (r) => r.vendorCode || r.party?.code || '' },
  { header: 'PAN No', accessor: 'panNo' },
  { header: 'Amount', accessor: 'totalAmount' },
  { header: 'Mode', accessor: 'paymentMode' },
  { header: 'Bank Name', accessor: 'bankName' },
  { header: 'Bank Account Number', accessor: 'accountNo' },
  { header: 'IFSC Code', accessor: 'ifscCode' },
  { header: 'Reference', accessor: 'referenceNo' },
  { header: 'Notes', accessor: 'notes' },
];

const PA_IMPORT_FIELDS: ImportField[] = [
  { key: 'adviceNo', label: 'Advice No', required: true },
  { key: 'paymentDate', label: 'Payment Date', required: true, type: 'date' },
  { key: 'paymentMode', label: 'Payment Mode', required: false },
  { key: 'referenceNo', label: 'Reference No', required: false },
  { key: 'supplierName', label: 'Supplier Name', required: true },
  { key: 'vendorCode', label: 'Vendor Code', required: false },
  { key: 'panNo', label: 'PAN No', required: false },
  { key: 'bankName', label: 'Bank Name', required: false },
  { key: 'accountNo', label: 'Bank Account Number', required: false },
  { key: 'ifscCode', label: 'IFSC Code', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'billNo', label: 'Bill No', required: false },
  { key: 'invDate', label: 'Invoice Date', required: false, type: 'date' },
  { key: 'month', label: 'Month', required: false },
  { key: 'invAmount', label: 'Invoice Amount', required: false, type: 'number' },
  { key: 'tdsAmount', label: 'TDS Amount', required: false, type: 'number' },
  { key: 'amount', label: 'Amount', required: false, type: 'number' },
  { key: 'paidAmount', label: 'Paid Amount', required: false, type: 'number' },
  { key: 'balanceAmount', label: 'Balance Amount', required: false, type: 'number' },
];

const PA_SAMPLE_ROW = {
  adviceNo: 'PA/2024-25/001',
  paymentDate: '2024-12-15',
  paymentMode: 'NEFT',
  referenceNo: 'UTR/NEFT/241215/001',
  supplierName: 'Bharat Heavy Electricals Ltd',
  vendorCode: 'BHEL',
  panNo: 'AABCB1234F',
  bankName: 'SBI',
  accountNo: '12345678901',
  ifscCode: 'SBIN0001234',
  notes: 'Payment for Nov 2024 billing',
  billNo: 'BHEL/INV/001',
  invDate: '2024-11-30',
  month: 'Nov-24',
};

function fmt(n: number) { return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function FinPaymentAdvices() {
  const [records, setRecords] = useState<Advice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [poOptions, setPoOptions] = useState<PoRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Advice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Advice | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchDeleting, setBatchDeleting] = useState(false);
  const tc = useTableControls(records, (r) => `${r.adviceNo} ${r.supplierName ?? ''} ${r.party?.name ?? ''} ${r.paymentMode} ${r.referenceNo ?? ''} ${r.vendorCode ?? ''}`);

  const existingAdviceKeys = useMemo(() => new Set(records.map(r => r.adviceNo)), [records]);

  useEffect(() => {
    const saved = localStorage.getItem('pa_company_logo');
    if (saved) setLogo(saved);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Logo must be under 500 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      localStorage.setItem('pa_company_logo', dataUrl);
      toast.success('Logo saved');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeLogo = () => {
    setLogo(null);
    localStorage.removeItem('pa_company_logo');
    toast.success('Logo removed');
  };

  const fetch_ = useCallback(async (month?: string, status?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (status) params.set('status', status)
      const qs = params.toString()
      try {
        const r = await fetch(`/api/fin/payment-advices${qs ? '?' + qs : ''}`);
        const rj = await r.json();
        if (rj.success && rj.data?.length) { setRecords(rj.data); } else { setRecords(generateMockAdvices()); toast.info('Showing sample data — no server records found'); }
      } catch { setRecords(generateMockAdvices()); toast.info('Sample data — API unavailable'); }
      try {
        const r = await fetch('/api/fin/parties');
        const rj = await r.json();
        if (rj.success && rj.data?.length) setParties(rj.data);
        else setParties([{ id: 1, name: 'L&T Construction', code: null, pan: null }, { id: 2, name: 'Siemens India Ltd', code: null, pan: null }, { id: 3, name: 'Tata Projects', code: null, pan: null }]);
      } catch { setParties([{ id: 1, name: 'L&T Construction', code: null, pan: null }, { id: 2, name: 'Siemens India Ltd', code: null, pan: null }, { id: 3, name: 'Tata Projects', code: null, pan: null }]); }
      try {
        const r = await fetch('/api/fin/purchase-orders');
        const rj = await r.json();
        if (rj.success && rj.data?.length) setPoOptions(rj.data.map((p: any) => ({ id: p.id, poNo: p.poNo, totalAmount: p.totalAmount })));
      } catch { /* non-critical */ }
      setSelectedIds(new Set());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch_(monthFilter, statusFilter); }, [fetch_, monthFilter, statusFilter]);

  const openNew = () => { setEditTarget(null); setForm({ ...EMPTY, lines: [{ ...EMPTY_LINE }] }); setFormOpen(true); };
  const openEdit = (r: Advice) => {
    setEditTarget(r);
    setForm({
      adviceNo: r.adviceNo, partyId: r.partyId ? String(r.partyId) : '',
      poId: r.poId ? String(r.poId) : '', jobCode: r.jobCode || '',
      paymentDate: r.paymentDate?.split('T')[0] || '', paymentMode: r.paymentMode,
      referenceNo: r.referenceNo || '', notes: r.notes || '',
      supplierName: r.supplierName || r.party?.name || '',
      vendorCode: r.vendorCode || r.party?.code || '',
      panNo: r.panNo || '', bankName: r.bankName || '',
      accountNo: r.accountNo || '', ifscCode: r.ifscCode || '',
      lines: r.lines.length ? r.lines.map(l => ({
        id: l.id, billNo: l.billNo || '', invDate: l.invDate?.split('T')[0] || '', month: l.month || '',
        invAmount: l.invAmount || 0, tdsAmount: l.tdsAmount || 0, amount: l.amount || 0,
        paidAmount: l.paidAmount || 0, balanceAmount: l.balanceAmount || 0,
        remarks: l.remarks || '', voucherNo: l.voucherNo || '',
      })) : [{ ...EMPTY_LINE }],
    });
    setFormOpen(true);
  };

  const setLine = (i: number, patch: Partial<Line>) => {
    setForm(p => ({
      ...p, lines: p.lines.map((l, idx) => {
        if (idx !== i) return l;
        const updated = { ...l, ...patch };
        if ('invAmount' in patch || 'tdsAmount' in patch) {
          updated.amount = (Number(updated.invAmount) || 0) - (Number(updated.tdsAmount) || 0);
        }
        return updated;
      })
    }));
  };
  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }));
  const removeLine = (i: number) => setForm(p => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, idx) => idx !== i) : p.lines }));
  const formTotal = form.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!form.adviceNo) { toast.error('Advice No is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        adviceNo: form.adviceNo,
        partyId: form.partyId ? Number(form.partyId) : null,
        poId: form.poId ? Number(form.poId) : null,
        jobCode: form.jobCode || null,
        totalAmount: formTotal,
        paymentDate: new Date(form.paymentDate),
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo || null,
        notes: form.notes || null,
        supplierName: form.supplierName || null,
        vendorCode: form.vendorCode || null,
        panNo: form.panNo || null,
        bankName: form.bankName || null,
        accountNo: form.accountNo || null,
        ifscCode: form.ifscCode || null,
        lines: form.lines
          .filter(l => l.billNo || l.amount || l.remarks)
          .map(l => ({
            billNo: l.billNo || null, invDate: l.invDate || null, month: l.month || null,
            invAmount: Number(l.invAmount) || 0, tdsAmount: Number(l.tdsAmount) || 0,
            amount: Number(l.amount) || 0, paidAmount: Number(l.paidAmount) || 0,
            balanceAmount: Number(l.balanceAmount) || 0, remarks: l.remarks || null,
            voucherNo: l.voucherNo || null,
          })),
      };
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...payload } : payload;
      const res = await fetch('/api/fin/payment-advices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (j.success) { toast.success(editTarget ? 'Updated' : 'Created'); setFormOpen(false); await fetch_(); }
      else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/fin/payment-advices?id=${deleteTarget.id}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) { toast.success('Deleted'); setDeleteOpen(false); await fetch_(monthFilter, statusFilter); } else toast.error(j.error);
    } catch { toast.error('Network error'); }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} payment advice(s) and their line items?`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch(`/api/fin/payment-advices?ids=${[...selectedIds].join(',')}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) { toast.success(`Deleted ${j.deleted} record(s)`); await fetch_(monthFilter, statusFilter); }
      else toast.error(j.error);
    } catch { toast.error('Network error'); } finally { setBatchDeleting(false); }
  };

  const grandTotal = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalLines = records.reduce((s, r) => s + r.lines.length, 0);

  const handlePrint = (r: Advice) => {
    const fmtNum = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const supplierName = r.supplierName || r.party?.name || '';
    const vendorCode = r.vendorCode || r.party?.code || '';
    const totalInvAmount = r.lines.reduce((s, l) => s + (l.invAmount || 0), 0);
    const totalTds = r.lines.reduce((s, l) => s + (l.tdsAmount || 0), 0);
    const totalAmt = r.lines.reduce((s, l) => s + (l.amount || 0), 0);
    const totalPaid = r.lines.reduce((s, l) => s + (l.paidAmount || 0), 0);
    const totalBalance = r.lines.reduce((s, l) => s + (l.balanceAmount || 0), 0);
    const linesHtml = r.lines.map((l, i) =>
      `<tr><td class="c">${i + 1}</td><td>${l.invDate?.split('T')[0] || ''}</td><td>${l.month || ''}</td><td>${l.remarks || l.billNo || ''}</td><td class="r">${fmtNum(l.invAmount)}</td><td class="r">${fmtNum(l.tdsAmount)}</td><td class="r">${fmtNum(l.amount)}</td><td class="r">${fmtNum(l.paidAmount)}</td><td class="r">${fmtNum(l.balanceAmount)}</td></tr>`
    ).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${r.adviceNo}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Calibri','Segoe UI',Arial,sans-serif;padding:20px;color:#000;background:#fff;font-size:11px}
      .pa{max-width:10in;margin:0 auto;border:2px solid #000}
      .header{display:grid;grid-template-columns:110px 1fr 110px;align-items:center;padding:8px 14px;border-bottom:2px solid #1a1a1a;background:rgba(245,166,35,0.15);gap:10px}
      .header-logo{display:flex;align-items:center;justify-content:flex-start}
      .header-logo img{max-height:72px;max-width:105px;object-fit:contain}
      .header-text{text-align:center}
      .header h1{font-size:26px;font-weight:bold;letter-spacing:1px;margin:0}
      .header h2{font-size:20px;font-weight:bold;margin:4px 0 0;letter-spacing:2px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #1a1a1a}
      .info-grid .left,.info-grid .right{padding:8px 12px}
      .info-grid .left{border-right:1px solid #1a1a1a}
      .info-row{display:flex;margin:3px 0;font-size:11px}
      .info-row .lbl{font-weight:bold;min-width:145px}
      .info-row .lbl::after{content:':'}
      table.lines{width:100%;border-collapse:collapse}
      table.lines th,table.lines td{border:1px solid #1a1a1a;padding:5px 7px;font-size:10px}
      table.lines th{background:rgba(245,166,35,0.15);font-weight:bold;text-align:center;font-size:9px;text-transform:uppercase}
      table.lines td.c{text-align:center}
      table.lines td.r{text-align:right;font-family:monospace}
      tr.total-row td{font-weight:bold;background:#fafafa;border-top:2px solid #1a1a1a}
      .amt-words{padding:7px 12px;border-top:1px solid #1a1a1a;font-size:10px}
      .sign-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border-top:2px solid #1a1a1a;min-height:90px}
      .sign-box{border-right:1px solid #1a1a1a;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;font-size:10px}
      .sign-box:last-child{border-right:none}
      .sign-box .role{font-weight:bold;margin-top:40px;border-top:1px solid #555;padding-top:4px;width:80%;text-align:center}
      .footer-note{text-align:center;padding:5px;font-size:8px;color:#555;border-top:1px solid #1a1a1a}
      @media print{body{padding:0}@page{size:landscape;margin:0.3in}.pa{max-width:100%;border:2px solid #000}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
    </style></head><body>
    <div class="pa">
      <div class="header">
        <div class="header-logo">${logo ? `<img src="${logo}" alt="Logo" />` : ''}</div>
        <div class="header-text"><h1>UAPASANA ASSOCIATE</h1><h2>PAYMENT ADVICE</h2></div>
        <div></div>
      </div>
      <div class="info-grid">
        <div class="left">
          <div class="info-row"><span class="lbl">Supplier Name</span><span>${supplierName}</span></div>
          <div class="info-row"><span class="lbl">Vendor Code</span><span>${vendorCode}</span></div>
          <div class="info-row"><span class="lbl">PAN NO</span><span>${r.panNo || ''}</span></div>
        </div>
        <div class="right">
          <div class="info-row"><span class="lbl">Payment Advice No</span><span><b>${r.adviceNo}</b></span></div>
          <div class="info-row"><span class="lbl">Date</span><span>${r.paymentDate?.split('T')[0] || ''}</span></div>
          <div class="info-row"><span class="lbl">Payment Mode</span><span>${r.paymentMode}</span></div>
          ${r.bankName ? '<div class="info-row"><span class="lbl">Bank Name</span><span>' + r.bankName + '</span></div>' : ''}
          ${r.accountNo ? '<div class="info-row"><span class="lbl">Bank A/C No</span><span>' + r.accountNo + '</span></div>' : ''}
          ${r.ifscCode ? '<div class="info-row"><span class="lbl">IFSC Code</span><span>' + r.ifscCode + '</span></div>' : ''}
          ${r.referenceNo ? '<div class="info-row"><span class="lbl">Reference No</span><span>' + r.referenceNo + '</span></div>' : ''}
        </div>
      </div>
      <table class="lines">
        <thead><tr><th style="width:35px">SL NO</th><th>Date</th><th>Month</th><th>Description</th><th>Total Rent</th><th>TDS Amount</th><th>Total Amount</th><th>Paid Amount</th><th>Balance Amount</th></tr></thead>
        <tbody>
          ${linesHtml}
          <tr class="total-row"><td class="c" colspan="4">TOTAL</td><td class="r">${fmtNum(totalInvAmount)}</td><td class="r">${fmtNum(totalTds)}</td><td class="r">${fmtNum(totalAmt)}</td><td class="r">${fmtNum(totalPaid)}</td><td class="r">${fmtNum(totalBalance)}</td></tr>
        </tbody>
      </table>
      <div class="amt-words"><b>Amount in Words:</b> Rupees ${numToWords(totalAmt || r.totalAmount || 0)}</div>
      ${r.notes ? '<div class="amt-words"><b>Remarks:</b> ' + r.notes + '</div>' : ''}
      <div class="sign-grid">
        <div class="sign-box"><div class="role">Prepared By</div></div>
        <div class="sign-box"><div class="role">Checked By</div></div>
        <div class="sign-box"><div class="role">Authorized By</div></div>
        <div class="sign-box"><div class="role">Approved By</div></div>
      </div>
      <div class="footer-note">This is a computer-generated document. E. &amp; O. E.</div>
    </div>
    <div style="text-align:center;margin-top:20px;margin-bottom:20px" class="no-print">
      <button onclick="window.print()" style="padding:8px 20px;background:#f5a623;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#0a0d12">Print / Save PDF</button>
      <button onclick="window.close()" style="padding:8px 16px;background:#252e3a;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:#e2e8f0;margin-left:8px">Close</button>
    </div>
    <style>.no-print{display:block}@media print{.no-print{display:none!important}}</style>
    </body></html>`);
    win.document.close();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  if (importOpen) {
    return (
      <div className="p-6">
        <ImportWizard
          title="Payment Advices"
          fields={PA_IMPORT_FIELDS}
          keyField="adviceNo"
          existingKeys={existingAdviceKeys}
          commitEndpoint="/api/fin/payment-advices/import"
          sampleRow={PA_SAMPLE_ROW as unknown as Record<string, string | number>}
          onClose={() => setImportOpen(false)}
          onImported={fetch_}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Stat cards — same pattern as all other modules */}
      <div className="grid grid-cols-3 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Advices</div><div className="text-[20px] font-bold text-[#f5a623]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{records.length}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Line Items</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{totalLines}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Disbursed</div><div className="text-[20px] font-bold text-[#00e676]" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{fmt(grandTotal)}</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Payment Advices</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-1">{records.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search advices..." />
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="vc-input !py-1 !text-[11px] w-[150px]" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="vc-input !py-1 !text-[11px] w-[110px] appearance-none">
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {selectedIds.size > 0 && (
              <button onClick={handleBatchDelete} disabled={batchDeleting} className="vc-btn-ghost flex items-center gap-1.5 text-[11px] text-[#ff3d3d]">
                <Trash2 size={13} /> Delete ({selectedIds.size})
              </button>
            )}
            <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button>
            <ExportButton records={records} columns={PA_COLUMNS} filename="fin-payment-advices" />
            {/* Logo upload */}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {logo ? (
              <div className="flex items-center gap-1 border border-[#252e3a] rounded-lg px-2 py-1 bg-[#0f1318]">
                <img src={logo} alt="Logo" className="h-6 w-auto object-contain max-w-[56px]" />
                <button onClick={removeLogo} className="p-0.5 text-[#5a6878] hover:text-[#ff3d3d]" title="Remove logo"><Trash size={11} /></button>
              </div>
            ) : (
              <button onClick={() => logoInputRef.current?.click()} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><ImagePlus size={13} /> Logo</button>
            )}
            <button onClick={openNew} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Advice</button>
          </div>
        </div>

        <div className="overflow-x-auto"><div className="max-h-[520px] overflow-y-auto"><table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
            {['', '', 'Advice No', 'Date', 'Supplier / Party', 'Vendor Code', 'Mode', 'Reference No', 'Lines', 'Total Amount', ''].map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{i === 1 ? <input type="checkbox" checked={selectedIds.size === tc.pageItems.length && tc.pageItems.length > 0} onChange={e => { if (e.target.checked) setSelectedIds(new Set(tc.pageItems.map(x => x.id))); else setSelectedIds(new Set()); }} className="accent-[#f5a623]" /> : h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">{tc.pageItems.map(r => (
            <React.Fragment key={r.id}>
              <tr className="hover:bg-[#141920]">
                <td className="py-2.5 px-3 w-8"><button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-[#5a6878] hover:text-[#f5a623]">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button></td>
                <td className="py-2.5 px-3 w-8"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={e => { const next = new Set(selectedIds); if (e.target.checked) next.add(r.id); else next.delete(r.id); setSelectedIds(next); }} className="accent-[#f5a623]" /></td>
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{r.adviceNo}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{r.paymentDate?.split('T')[0]}</td>
                <td className="py-2.5 px-3 max-w-[180px]">
                  <div className="text-[#e2e8f0] font-medium truncate">{r.supplierName || r.party?.name || '—'}</div>
                  {r.panNo && <div className="text-[9px] text-[#5a6878] mt-0.5">PAN: {r.panNo}</div>}
                </td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.vendorCode || r.party?.code || '—'}</td>
                <td className="py-2.5 px-3"><span className="vc-badge bg-[#252e3a] text-[#8899aa]">{r.paymentMode}</span></td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono max-w-[140px] truncate">{r.referenceNo || '—'}</td>
                <td className="py-2.5 px-3 text-[#8899aa] text-center">{r.lines.length}</td>
                <td className="py-2.5 px-3"><span className={`vc-badge text-[9px] ${r.status === 'Paid' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Approved' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : r.status === 'Draft' ? 'bg-[#5a6878]/15 text-[#5a6878]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status || 'Draft'}</span></td>
                <td className="py-2.5 px-3 text-[#00e676] font-mono font-medium">{fmt(r.totalAmount)}</td>
                <td className="py-2.5 px-3"><div className="flex gap-1">
                  <button onClick={() => handlePrint(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="Print"><Printer size={13} /></button>
                  <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                  <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                </div></td>
              </tr>

              {expanded === r.id && (
                <tr className="bg-[#0d1117]">
                  <td colSpan={11} className="px-6 py-3">
                    {/* Supplier + bank strip */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1">Supplier Details</div>
                        <div className="text-[11px] font-semibold text-[#e2e8f0]">{r.supplierName || r.party?.name || '—'}</div>
                        <div className="flex gap-4 mt-1">
                          {r.vendorCode && <span className="text-[10px] text-[#5a6878]">Code: <span className="text-[#8899aa]">{r.vendorCode}</span></span>}
                          {r.panNo && <span className="text-[10px] text-[#5a6878]">PAN: <span className="text-[#8899aa] font-mono">{r.panNo}</span></span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1">Bank Details</div>
                        <div className="text-[11px] font-semibold text-[#e2e8f0]">{r.bankName || '—'}</div>
                        <div className="flex gap-4 mt-1">
                          {r.accountNo && <span className="text-[10px] text-[#5a6878]">A/C: <span className="text-[#8899aa] font-mono">{r.accountNo}</span></span>}
                          {r.ifscCode && <span className="text-[10px] text-[#5a6878]">IFSC: <span className="text-[#8899aa] font-mono">{r.ifscCode}</span></span>}
                        </div>
                      </div>
                    </div>
                    {/* Line items */}
                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-2">Line Items</div>
                    <table className="w-full text-[10px]">
                      <thead><tr className="text-[#5a6878]">
                        <th className="text-left py-1 pr-3 font-semibold">#</th>
                        <th className="text-left py-1 pr-3 font-semibold">Bill / Inv No</th>
                        <th className="text-left py-1 pr-3 font-semibold">Date</th>
                        <th className="text-left py-1 pr-3 font-semibold">Month</th>
                        <th className="text-left py-1 pr-3 font-semibold">Description</th>
                        <th className="text-right py-1 pr-3 font-semibold">Total Rent</th>
                        <th className="text-right py-1 pr-3 font-semibold">TDS</th>
                        <th className="text-right py-1 pr-3 font-semibold">Amount</th>
                        <th className="text-right py-1 pr-3 font-semibold">Paid</th>
                        <th className="text-right py-1 font-semibold">Balance</th>
                      </tr></thead>
                      <tbody>{r.lines.map((l, i) => (
                        <tr key={l.id ?? i} className="border-t border-[#1a2028]">
                          <td className="py-1.5 pr-3 text-[#5a6878]">{i + 1}</td>
                          <td className="py-1.5 pr-3 text-[#f5a623] font-mono">{l.billNo || '—'}</td>
                          <td className="py-1.5 pr-3 text-[#8899aa] font-mono">{l.invDate?.split('T')[0] || ''}</td>
                          <td className="py-1.5 pr-3 text-[#8899aa]">{l.month || ''}</td>
                          <td className="py-1.5 pr-3 text-[#8899aa]">{l.remarks || '—'}</td>
                          <td className="py-1.5 pr-3 text-right text-[#e2e8f0] font-mono">{fmt(l.invAmount)}</td>
                          <td className="py-1.5 pr-3 text-right text-[#ff3d3d] font-mono">{fmt(l.tdsAmount)}</td>
                          <td className="py-1.5 pr-3 text-right text-[#e2e8f0] font-mono">{fmt(l.amount)}</td>
                          <td className="py-1.5 pr-3 text-right text-[#00e676] font-mono">{fmt(l.paidAmount)}</td>
                          <td className="py-1.5 text-right text-[#f5a623] font-mono">{fmt(l.balanceAmount)}</td>
                        </tr>
                      ))}</tbody>
                      <tfoot><tr className="border-t border-[#252e3a]">
                        <td colSpan={5} className="py-1.5 pr-3 text-[9px] text-[#5a6878] font-bold uppercase">Total</td>
                        <td className="py-1.5 pr-3 text-right text-[#e2e8f0] font-mono font-semibold">{fmt(r.lines.reduce((s, l) => s + (l.invAmount || 0), 0))}</td>
                        <td className="py-1.5 pr-3 text-right text-[#ff3d3d] font-mono font-semibold">{fmt(r.lines.reduce((s, l) => s + (l.tdsAmount || 0), 0))}</td>
                        <td className="py-1.5 pr-3 text-right text-[#e2e8f0] font-mono font-semibold">{fmt(r.lines.reduce((s, l) => s + (l.amount || 0), 0))}</td>
                        <td className="py-1.5 pr-3 text-right text-[#00e676] font-mono font-semibold">{fmt(r.lines.reduce((s, l) => s + (l.paidAmount || 0), 0))}</td>
                        <td className="py-1.5 text-right text-[#f5a623] font-mono font-semibold">{fmt(r.lines.reduce((s, l) => s + (l.balanceAmount || 0), 0))}</td>
                      </tr></tfoot>
                    </table>
                    {r.notes && <div className="mt-2 text-[10px] text-[#5a6878]"><span className="font-semibold">Notes:</span> {r.notes}</div>}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {records.length === 0 && <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No payment advices yet</td></tr>}
          {records.length > 0 && tc.pageItems.length === 0 && <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No matching advices</td></tr>}
          </tbody>
        </table></div>
        <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Payment Advice' : 'New Payment Advice'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Payment info */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Advice No *</label><input value={form.adviceNo} onChange={e => setForm(p => ({ ...p, adviceNo: e.target.value }))} className="vc-input" placeholder="PA/2024-25/001" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Payment Date</label><input type="date" value={form.paymentDate} onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Payment Mode</label><select value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))} className="vc-input appearance-none">{MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            </div>
            {/* Supplier */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Supplier Name</label><input value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Vendor Code</label><input value={form.vendorCode} onChange={e => setForm(p => ({ ...p, vendorCode: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">PAN No</label><input value={form.panNo} onChange={e => setForm(p => ({ ...p, panNo: e.target.value }))} className="vc-input font-mono" /></div>
            </div>
            {/* Bank */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Bank Name</label><input value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Account No</label><input value={form.accountNo} onChange={e => setForm(p => ({ ...p, accountNo: e.target.value }))} className="vc-input font-mono" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">IFSC Code</label><input value={form.ifscCode} onChange={e => setForm(p => ({ ...p, ifscCode: e.target.value }))} className="vc-input font-mono" /></div>
            </div>
            {/* Ref + party */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Party (Linked)</label><select value={form.partyId} onChange={e => setForm(p => ({ ...p, partyId: e.target.value }))} className="vc-input appearance-none"><option value="">— None —</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Reference No (UTR / Cheque)</label><input value={form.referenceNo} onChange={e => setForm(p => ({ ...p, referenceNo: e.target.value }))} className="vc-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Job Code</label><input value={form.jobCode} onChange={e => setForm(p => ({ ...p, jobCode: e.target.value }))} placeholder="JOB-2026-001" className="vc-input" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Notes</label><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="vc-input" /></div>

            {/* Line items */}
            <div className="border border-[#252e3a] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#252e3a]">
                <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold">Line Items</span>
                <button onClick={addLine} className="text-[#00d4ff] text-[10px] font-semibold flex items-center gap-1 hover:underline"><Plus size={11} /> Add Line</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]" style={{ minWidth: '900px' }}>
                  <thead><tr className="bg-[#0f1318] text-[#5a6878]">
                    <th className="text-left py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Bill / Inv No</th>
                    <th className="text-left py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Month</th>
                    <th className="text-left py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Description</th>
                    <th className="text-right py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Total Rent</th>
                    <th className="text-right py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">TDS Amt</th>
                    <th className="text-right py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Total Amt*</th>
                    <th className="text-right py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Paid Amt</th>
                    <th className="text-right py-2 px-2 font-semibold text-[9px] uppercase tracking-wider">Balance</th>
                    <th className="py-2 px-2 w-7"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#1a2028]">
                    {form.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-2"><input value={l.billNo} onChange={e => setLine(i, { billNo: e.target.value })} className="vc-input !py-1.5 !text-[10px] w-[95px]" /></td>
                        <td className="py-1.5 px-2"><input type="date" value={l.invDate} onChange={e => setLine(i, { invDate: e.target.value })} className="vc-input !py-1.5 !text-[10px] w-[118px]" /></td>
                        <td className="py-1.5 px-2"><input value={l.month} onChange={e => setLine(i, { month: e.target.value })} className="vc-input !py-1.5 !text-[10px] w-[68px]" placeholder="Jan-25" /></td>
                        <td className="py-1.5 px-2"><input value={l.remarks} onChange={e => setLine(i, { remarks: e.target.value })} className="vc-input !py-1.5 !text-[10px] w-[130px]" /></td>
                        <td className="py-1.5 px-2"><input type="number" value={l.invAmount || ''} onChange={e => setLine(i, { invAmount: Number(e.target.value) })} className="vc-input !py-1.5 !text-[10px] text-right w-[88px]" /></td>
                        <td className="py-1.5 px-2"><input type="number" value={l.tdsAmount || ''} onChange={e => setLine(i, { tdsAmount: Number(e.target.value) })} className="vc-input !py-1.5 !text-[10px] text-right w-[78px]" /></td>
                        <td className="py-1.5 px-2"><div className="vc-input !py-1.5 !text-[10px] text-right w-[88px] bg-[#0f1318] text-[#00e676] font-mono cursor-default select-none">{(l.amount || 0).toLocaleString('en-IN')}</div></td>
                        <td className="py-1.5 px-2"><input type="number" value={l.paidAmount || ''} onChange={e => setLine(i, { paidAmount: Number(e.target.value) })} className="vc-input !py-1.5 !text-[10px] text-right w-[88px]" /></td>
                        <td className="py-1.5 px-2"><input type="number" value={l.balanceAmount || ''} onChange={e => setLine(i, { balanceAmount: Number(e.target.value) })} className="vc-input !py-1.5 !text-[10px] text-right w-[88px]" /></td>
                        <td className="py-1.5 px-2"><button onClick={() => removeLine(i)} disabled={form.lines.length <= 1} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-30"><X size={12} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t border-[#252e3a]">
                <span className="text-[9px] text-[#5a6878]">* Total Amt = Total Rent − TDS (auto-calculated)</span>
                <div className="flex items-center gap-2"><span className="text-[10px] text-[#5a6878]">Total:</span><span className="text-[13px] font-bold text-[#00e676] font-mono">{fmt(formTotal)}</span></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]"><AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Payment Advice</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.adviceNo}</strong> and its {deleteTarget?.lines.length} line item(s)? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
