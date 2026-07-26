'use client';

import { useState, useEffect, useCallback } from 'react';
import { Receipt, Loader2, Plus, Pencil, Trash2, Upload, BookOpen, ShoppingCart, FileBarChart, ReceiptIndianRupee, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface TaxRecord { id: number; taxType: string; period: string; amount: number; dueDate: string; paidDate: string | null; paymentRef: string | null; status: string; remarks: string | null; }
interface FormData { taxType: string; period: string; amount: number; dueDate: string; status: string; remarks: string; }

const EMPTY_FORM: FormData = { taxType: 'GST', period: '', amount: 0, dueDate: '', status: 'Pending', remarks: '' };
const TAX_TYPES = ['GST', 'TDS', 'PF', 'ESI', 'Professional Tax', 'Advance Tax'];

const TAX_COLUMNS: ExportColumn<TaxRecord>[] = [
  { header: 'Tax Type', accessor: 'taxType' },
  { header: 'Period', accessor: 'period' },
  { header: 'Amount', accessor: 'amount' },
  { header: 'Due Date', accessor: (r) => r.dueDate?.split('T')[0] ?? '' },
  { header: 'Paid Date', accessor: (r) => r.paidDate?.split('T')[0] ?? '' },
  { header: 'Payment Ref', accessor: 'paymentRef' },
  { header: 'Status', accessor: 'status' },
  { header: 'Remarks', accessor: 'remarks' },
];

const TAX_IMPORT_FIELDS: ImportField[] = [
  { key: 'taxType', label: 'Tax Type', required: true },
  { key: 'period', label: 'Period', required: true },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'dueDate', label: 'Due Date', type: 'date' },
  { key: 'paidDate', label: 'Paid Date', type: 'date' },
  { key: 'paymentRef', label: 'Payment Ref' },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' },
];
const TAX_SAMPLE_ROW = { taxType: 'GST', period: '2026-01', amount: 774000, dueDate: '2026-02-20', paidDate: '', paymentRef: 'PMT-001', status: 'Pending', remarks: 'Monthly GST payment' };

function generateMockTaxation(): TaxRecord[] {
  return [
    { id: 1, taxType: 'GST', period: 'Nov 2024', amount: 1850000, dueDate: '2024-12-20T00:00:00', paidDate: '2024-12-18T00:00:00', paymentRef: 'GST-CHQ-001', status: 'Paid', remarks: 'Monthly GST return filed' },
    { id: 2, taxType: 'GST', period: 'Dec 2024', amount: 2100000, dueDate: '2025-01-20T00:00:00', paidDate: null, paymentRef: null, status: 'Pending', remarks: '' },
    { id: 3, taxType: 'TDS', period: 'Q3 FY24-25', amount: 950000, dueDate: '2025-01-15T00:00:00', paidDate: '2025-01-14T00:00:00', paymentRef: 'TDS-NEFT-003', status: 'Paid', remarks: 'TDS on contractor payments' },
    { id: 4, taxType: 'PF', period: 'Dec 2024', amount: 420000, dueDate: '2025-01-15T00:00:00', paidDate: '2025-01-12T00:00:00', paymentRef: 'PF-004', status: 'Paid', remarks: 'Employee PF contribution' },
    { id: 5, taxType: 'ESI', period: 'Dec 2024', amount: 180000, dueDate: '2025-01-15T00:00:00', paidDate: null, paymentRef: null, status: 'Overdue', remarks: 'ESI contribution pending' },
    { id: 6, taxType: 'Professional Tax', period: 'FY 2024-25', amount: 250000, dueDate: '2025-03-31T00:00:00', paidDate: null, paymentRef: null, status: 'Filed', remarks: 'Annual professional tax' },
    { id: 7, taxType: 'Advance Tax', period: 'Q3 FY24-25', amount: 3500000, dueDate: '2024-12-15T00:00:00', paidDate: '2024-12-14T00:00:00', paymentRef: 'ADV-TAX-007', status: 'Paid', remarks: 'Advance tax installment' },
  ];
}

const fmtINR = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

type RegisterType = 'gst-sales' | 'gst-purchase' | 'gstr3b' | 'tds-register' | 'tds-payable';

const REGISTER_TABS: { id: 'payments' | RegisterType; label: string; icon: typeof Receipt }[] = [
  { id: 'payments', label: 'Tax Payments', icon: Receipt },
  { id: 'gst-sales', label: 'GST Sales Register', icon: BookOpen },
  { id: 'gst-purchase', label: 'GST Purchase Register', icon: ShoppingCart },
  { id: 'gstr3b', label: 'GSTR-3B Summary', icon: FileBarChart },
  { id: 'tds-register', label: 'TDS Register', icon: ReceiptIndianRupee },
  { id: 'tds-payable', label: 'TDS Payable', icon: Wallet },
];

// ── GST & TDS Registers (read-only reports over live Fin data) ──────────
function GstTdsRegister({ type }: { type: RegisterType }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/fin/gst-tds-register?type=${type}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setData(j.success ? j.data : null); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  if (!data) return <div className="p-8 text-center text-[#5a6878] text-[12px]">No data available for this report.</div>;

  if (type === 'gst-sales' || type === 'gst-purchase') {
    const isSales = type === 'gst-sales';
    const rows: any[] = data.rows;
    return (
      <div className="vc-panel">
        <div className="vc-panel-header">
          {isSales ? <BookOpen size={15} className="text-[#f5a623]" /> : <ShoppingCart size={15} className="text-[#f5a623]" />}
          <span className="text-[12px] font-semibold text-[#e2e8f0]">{isSales ? 'GST Sales Register' : 'GST Purchase Register'}</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{rows.length} {isSales ? 'invoices' : 'purchase orders'}</span>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {(isSales
                ? ['Invoice', 'Date', 'Party', 'Site', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total']
                : ['PO No', 'Date', 'Vendor', 'Site', 'Taxable Value', 'GST (ITC)', 'Total', 'Status']
              ).map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {rows.map((r, i) => isSales ? (
                <tr key={i} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-medium font-mono">{r.invoiceNo}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.party}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.siteCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(r.taxableValue)}</td>
                  <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{fmtINR(r.cgst)}</td>
                  <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{fmtINR(r.sgst)}</td>
                  <td className="py-2.5 px-3 text-[#a78bfa] font-mono">{fmtINR(r.igst)}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-semibold">{fmtINR(r.total)}</td>
                </tr>
              ) : (
                <tr key={i} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-medium font-mono">{r.poNo}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendor}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.siteCode || '—'}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(r.taxableValue)}</td>
                  <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{fmtINR(r.gstItc)}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-semibold">{fmtINR(r.total)}</td>
                  <td className="py-2.5 px-3"><span className="vc-badge bg-[#252e3a] text-[#8899aa]">{r.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No records found</td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot><tr className="bg-[#0f1318] border-t-2 border-[#252e3a] font-semibold">
                <td className="py-2.5 px-3 text-[#e2e8f0]" colSpan={isSales ? 4 : 4}>Totals</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(data.totals.taxableValue)}</td>
                {isSales ? (
                  <>
                    <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{fmtINR(data.totals.cgst)}</td>
                    <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{fmtINR(data.totals.sgst)}</td>
                    <td className="py-2.5 px-3 text-[#a78bfa] font-mono">{fmtINR(data.totals.igst)}</td>
                  </>
                ) : (
                  <td className="py-2.5 px-3 text-[#00d4ff] font-mono">{fmtINR(data.totals.gstItc)}</td>
                )}
                <td className="py-2.5 px-3 text-[#f5a623] font-mono">{fmtINR(data.totals.total)}</td>
                {!isSales && <td />}
              </tr></tfoot>
            )}
          </table>
        </div></div>
      </div>
    );
  }

  if (type === 'gstr3b') {
    const d = data;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Outward Taxable Value</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(d.outwardTaxableValue)}</div><div className="text-[10px] text-[#5a6878] mt-1">{d.invoiceCount} invoices</div></div>
          <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">ITC Available</div><div className="text-[20px] font-bold text-[#a78bfa]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(d.itcAvailable)}</div><div className="text-[10px] text-[#5a6878] mt-1">{d.poCount} purchase orders</div></div>
          <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Net Payable</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(d.netPayable)}</div></div>
        </div>
        <div className="vc-panel">
          <div className="vc-panel-header"><FileBarChart size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">3.1 Outward Supplies &amp; Output Tax</span></div>
          <div className="vc-panel-body space-y-2">
            {[
              ['Taxable Value', fmtINR(d.outwardTaxableValue)],
              ['Output CGST', fmtINR(d.outputCgst)],
              ['Output SGST', fmtINR(d.outputSgst)],
              ['Output IGST', fmtINR(d.outputIgst)],
              ['Total Output Tax', fmtINR(d.outputTaxTotal)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-[#1a2028] last:border-0 text-[12px]">
                <span className="text-[#8899aa]">{label}</span><span className="text-[#e2e8f0] font-mono">{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="vc-panel">
          <div className="vc-panel-header"><FileBarChart size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">4. Eligible ITC &amp; Net Payable</span></div>
          <div className="vc-panel-body space-y-2">
            <div className="flex justify-between py-2 border-b border-[#1a2028] text-[12px]"><span className="text-[#8899aa]">ITC Available (Purchase GST)</span><span className="text-[#e2e8f0] font-mono">{fmtINR(d.itcAvailable)}</span></div>
            <div className="flex justify-between py-2 text-[13px] font-semibold"><span className="text-[#e2e8f0]">Net GST Payable</span><span className="text-[#f5a623] font-mono">{fmtINR(d.netPayable)}</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'tds-register') {
    const rows: any[] = data.rows;
    return (
      <div className="vc-panel">
        <div className="vc-panel-header">
          <ReceiptIndianRupee size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">TDS Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{rows.length} deductions</span>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Document', 'Date', 'Party', 'Section', 'Rate', 'Taxable Amount', 'TDS Amount', 'Paid', 'Status'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-medium font-mono">{r.documentId}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.party}</td>
                  <td className="py-2.5 px-3"><span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff] font-mono">{r.section}</span></td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.rate}%</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(r.taxableAmount)}</td>
                  <td className="py-2.5 px-3 text-[#ff3d3d] font-mono">{fmtINR(r.deductionAmount)}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{fmtINR(r.paidAmount)}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${r.status === 'Paid' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Reversed' ? 'bg-[#5a6878]/15 text-[#5a6878]' : 'bg-[#ffab40]/15 text-[#ffab40]'}`}>{r.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No TDS deductions found</td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot><tr className="bg-[#0f1318] border-t-2 border-[#252e3a] font-semibold">
                <td className="py-2.5 px-3 text-[#e2e8f0]" colSpan={5}>Totals</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(data.totals.taxable)}</td>
                <td className="py-2.5 px-3 text-[#ff3d3d] font-mono">{fmtINR(data.totals.deducted)}</td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{fmtINR(data.totals.paid)}</td>
                <td />
              </tr></tfoot>
            )}
          </table>
        </div></div>
      </div>
    );
  }

  // tds-payable
  const sections: any[] = data.sections;
  return (
    <div className="space-y-4">
      <div className="vc-stat-card relative overflow-hidden max-w-xs"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total TDS Payable</div><div className="text-[24px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtINR(data.totalPayable)}</div></div>
      <div className="vc-panel">
        <div className="vc-panel-header"><Wallet size={15} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Payable by Section</span>
          <a href="#" onClick={(e) => e.preventDefault()} className="ml-auto vc-btn-ghost text-[11px] flex items-center gap-1.5"><FileBarChart size={13} /> Form 26Q Export</a>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-[11px]">
          <thead><tr className="bg-[#0f1318]">{['Section', 'Deductions', 'Taxable Amount', 'TDS Payable'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {sections.map((s) => (
              <tr key={s.section} className="hover:bg-[#141920]">
                <td className="py-2.5 px-3"><span className="vc-badge bg-[#00d4ff]/15 text-[#00d4ff] font-mono">{s.section}</span></td>
                <td className="py-2.5 px-3 text-[#8899aa] font-mono">{s.count}</td>
                <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{fmtINR(s.taxable)}</td>
                <td className="py-2.5 px-3 text-[#f5a623] font-mono font-semibold">{fmtINR(s.deducted)}</td>
              </tr>
            ))}
            {sections.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-[#5a6878]">No TDS payable</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

export default function Taxation() {
  const [view, setView] = useState<'payments' | RegisterType>('payments');
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/taxation');
      const json = await res.json();
      if (json.success && json.data?.length) { setRecords(json.data); }
      else { setRecords(generateMockTaxation()); toast.info('Sample data — no server records found'); }
    } catch { setRecords(generateMockTaxation()); toast.info('Sample data — API unavailable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (r: TaxRecord) => {
    setEditTarget(r);
    setForm({ taxType: r.taxType, period: r.period, amount: r.amount, dueDate: r.dueDate?.split('T')[0] || '', status: r.status, remarks: r.remarks || '' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.taxType || !form.period || !form.dueDate) { toast.error('Tax type, period, and due date are required'); return; }
    setSubmitting(true);
    try {
      const method = editTarget ? 'PUT' : 'POST';
      const body = editTarget ? { id: editTarget.id, ...form, dueDate: new Date(form.dueDate) } : { ...form, dueDate: new Date(form.dueDate) };
      const res = await fetch('/api/taxation', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(editTarget ? 'Tax record updated' : 'Tax record created'); setFormOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Operation failed'); }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/taxation?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { toast.success('Tax record deleted'); setDeleteOpen(false); await fetchData(); }
      else { toast.error(json.error || 'Delete failed'); }
    } catch { toast.error('Network error'); }
  };

  const totalPending = records.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
  const totalFiled = records.filter(r => r.status === 'Filed').reduce((s, r) => s + r.amount, 0);

  const statusBadge = (s: string) => {
    if (s === 'Filed' || s === 'Paid') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Pending') return 'bg-[#ffab40]/15 text-[#ffab40]';
    if (s === 'Overdue') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  const TabBar = (
    <div className="flex items-center gap-1.5 flex-wrap border-b border-[#252e3a] pb-3">
      {REGISTER_TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setView(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${view === t.id ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#8899aa] border border-transparent hover:bg-[#141920] hover:text-[#e2e8f0]'}`}
        >
          <t.icon size={13} /> {t.label}
        </button>
      ))}
    </div>
  );

  if (view !== 'payments') {
    return (
      <div className="space-y-4 p-6">
        {TabBar}
        <GstTdsRegister type={view} />
      </div>
    );
  }

  if (loading) return <div className="space-y-4 p-6">{TabBar}<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div></div>;

  if (importOpen) {
    return (
      <ImportWizard
        title="Tax Records"
        fields={TAX_IMPORT_FIELDS}
        keyField="taxType"
        existingKeys={new Set(records.map(r => r.taxType + '-' + r.period))}
        commitEndpoint="/api/taxation/import"
        sampleRow={TAX_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      {TabBar}
      <div className="grid grid-cols-2 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ffab40]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Pending Tax Liability</div><div className="text-[20px] font-bold text-[#ffab40]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalPending / 100000).toFixed(2)} L</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Filed / Paid</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>₹{(totalFiled / 100000).toFixed(2)} L</div></div>
      </div>

      <div className="vc-panel">
        <div className="vc-panel-header">
          <Receipt size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Tax Records</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} Records</span>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={TAX_COLUMNS} filename="taxation" />
          <button onClick={() => { setEditTarget(null); setForm(EMPTY_FORM); setFormOpen(true); }} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Record</button>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Tax Type', 'Period', 'Amount', 'Due Date', 'Paid Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#f5a623] font-medium">{r.taxType}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{r.period}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(r.amount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.dueDate?.split('T')[0]}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.paidDate?.split('T')[0] || '—'}</td>
                  <td className="py-2.5 px-3"><span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="py-2.5 px-3"><div className="flex items-center gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                    <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#f5a623]">{editTarget ? 'Edit Tax Record' : 'New Tax Record'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Tax Type *</label><select value={form.taxType} onChange={e => setForm(p => ({ ...p, taxType: e.target.value }))} className="vc-input appearance-none">{TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Period *</label><input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="vc-input" placeholder="e.g. Jan 2025" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Amount (₹) *</label><input type="number" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} className="vc-input" /></div>
              <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Due Date *</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className="vc-input" /></div>
            </div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="vc-input appearance-none"><option value="Pending">Pending</option><option value="Filed">Filed</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option></select></div>
            <div><label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">Remarks</label><input value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="vc-input" /></div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="vc-btn-primary flex items-center gap-1.5 disabled:opacity-50">{submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Tax Record</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.taxType} — {deleteTarget?.period}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
