'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardCheck, Check, X as XIcon, ChevronRight, Clock, Send, Building2, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface FinRec {
  id: number; poNo: string; vendorName: string; description: string; jobCode: string;
  totalAmount: number; status: string; date: string; siteName: string;
}
interface FormRec { vendorName: string; description: string; jobCode: string; totalAmount: number; }

const PO_COLUMNS: ExportColumn<FinRec>[] = [
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Vendor', accessor: 'vendorName' },
  { header: 'Description', accessor: 'description' },
  { header: 'Job', accessor: 'jobCode' },
  { header: 'Total', accessor: (r) => r.totalAmount },
  { header: 'Status', accessor: 'status' },
];

const STEPS = ['Draft', 'Pending Approval', 'Approved', 'Converted to PO'];
const POOL_INDEX: Record<string, number> = { Draft: 0, 'Pending Approval': 1, Approved: 2, 'Converted to PO': 3, Converted: 3 };
const EMPTY: FormRec = { vendorName: '', description: '', jobCode: '', totalAmount: 0 };
const inpBox = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#00d4ff]/60 placeholder:text-[#5a6878]';

function generateMockPOs(): FinRec[] {
  return [
    { id: 1, poNo: 'PO-2026-021', vendorName: 'ElectroMech Solutions', description: '40 MT Structural Steel supply', jobCode: 'JOB-2026-001', totalAmount: 2940000, status: 'Pending Approval', date: '2026-07-01', siteName: 'BALCO' },
    { id: 2, poNo: 'PO-2026-022', vendorName: 'PowerTech Industries', description: '2 x 50 MVA Power Transformers', jobCode: 'JOB-2026-003', totalAmount: 8400000, status: 'Draft', date: '2026-07-12', siteName: 'Hindalco' },
    { id: 3, poNo: 'PO-2026-023', vendorName: 'CementMart', description: 'OPC 53 Cement 5000 MT', jobCode: 'JOB-2026-004', totalAmount: 31250000, status: 'Approved', date: '2026-06-20', siteName: 'Ballet' },
  ];
}

export default function PoApprovalStepper() {
  const [records, setRecords] = useState<FinRec[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormRec>(EMPTY);

  const tc = useTableControls(records, (r) => `${r.poNo} ${r.vendorName} ${r.description} ${r.jobCode}`);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/purchase-orders').then(r => r.json());
      if (j.success && j.data?.length) {
        setRecords(j.data.map((po: any) => ({
          id: po.id, poNo: po.poNo, vendorName: po.vendorName || '', description: po.descriptionOfWork || '', jobCode: po.jobCode || '', totalAmount: po.totalAmount || 0, status: po.status || 'Draft', date: po.date, siteName: po.site?.name || '',
        })));
      } else {
        setRecords(generateMockPOs());
        toast.info('Sample data shown — no POs in database yet');
      }
    } catch { setRecords(generateMockPOs()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (records.length && (selectedId == null || !records.some(r => r.id === selectedId))) setSelectedId(records[0].id); }, [records, selectedId]);

  const selected = records.find(r => r.id === selectedId) || null;
  const stepIdx = selected ? (POOL_INDEX[selected.status] ?? 0) : 0;

  const advance = async (targetIdx: number) => {
    if (!selected) return;
    setSaving(true);
    try {
      const target = STEPS[targetIdx];
      const res = await fetch('/api/fin/purchase-orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, status: target }) });
      const j = await res.json();
      if (j.success) { toast.success(`PO advanced to ${target}`); await fetchData(); }
      else toast.error(j.error || 'Failed to advance');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const create = async () => {
    if (!form.vendorName || !form.description) { toast.error('Vendor and description required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fin/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poNo: `PO-${Date.now()}`, vendorName: form.vendorName, descriptionOfWork: form.description, jobCode: form.jobCode || 'JOB-2026-001', siteId: 1, costCenter: 'CC-A', department: 'Procurement', projectManager: 'R. Sharma', status: 'Pending Approval', date: new Date().toISOString().split('T')[0], totalAmount: Number(form.totalAmount) || 0 }) });
      const j = await res.json();
      if (j.success) { toast.success('PO created'); setFormOpen(false); setForm(EMPTY); await fetchData(); }
      else toast.error(j.error || 'Failed to create');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center"><ClipboardCheck size={18} className="text-[#00d4ff]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">PO Approval Stepper</h2>
            <p className="text-[11px] text-[#5a6878]">Walk a purchase order through Draft → Pending Approval → Approved → Converted</p>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b8d6]"><Send size={13} /> New PO</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PO list */}
        <div className="lg:col-span-1 bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="p-3 border-b border-[#252e3a]"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-[#1a2028]">
            {tc.pageItems.map(r => {
              const idx = POOL_INDEX[r.status] ?? 0;
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)} className={`w-full text-left px-3 py-3 transition-colors ${selectedId === r.id ? 'bg-[#00d4ff]/10' : 'hover:bg-[#141920]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#e2e8f0]">{r.poNo}</span>
                    <span className="text-[9px] text-[#5a6878]">{new Date(r.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[10px] text-[#8899aa] truncate mt-0.5">{r.description}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-[#5a6878]">{r.vendorName}</span>
                    <StepDots idx={idx} />
                  </div>
                </button>
              );
            })}
            {tc.pageItems.length === 0 && <div className="py-8 text-center text-[#5a6878] text-[11px]">No purchase orders</div>}
          </div>
          <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
        </div>

        {/* Stepper */}
        <div className="lg:col-span-2 bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <Building2 size={36} className="text-[#2e3a48]" />
              <p className="mt-3 text-[#5a6878] text-[12px]">Select a purchase order to view and advance its approval.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[14px] font-bold text-[#e2e8f0]">{selected.poNo}</h3>
                  <p className="text-[11px] text-[#5a6878]">{selected.description} · {selected.siteName} · {selected.jobCode}</p>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">Total</div>
                  <div className="text-[18px] font-bold text-[#00d4ff] font-mono">₹ {(selected.totalAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="relative mb-6">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-[#252e3a]" />
                <div className="absolute top-4 left-4 h-0.5" style={{ height: 2, width: stepIdx === 0 ? 0 : `${(stepIdx / (STEPS.length - 1)) * 100}%`, background: '#00d4ff', transition: 'width .3s' }} />
                <div className="relative flex justify-between">
                  {STEPS.map((s, i) => {
                    const done = i < stepIdx; const current = i === stepIdx;
                    return (
                      <div key={s} className="flex flex-col items-center w-[22%]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'bg-[#00e676] border-[#00e676] text-black' : current ? 'bg-[#00d4ff] border-[#00d4ff] text-black' : 'bg-[#141920] border-[#252e3a] text-[#5a6878]'}`}>
                          {done ? <Check size={14} /> : current ? <Clock size={14} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </div>
                        <span className={`mt-1.5 text-[9px] text-center font-semibold ${current ? 'text-[#e2e8f0]' : done ? 'text-[#00e676]' : 'text-[#5a6878]'}`}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {stepIdx > 0 && (
                  <button onClick={() => advance(stepIdx - 1)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-[#252e3a] text-[#8899aa] text-[12px] font-bold rounded-lg hover:text-[#e2e8f0] disabled:opacity-50"><ArrowLeft size={13} /> Revert to {STEPS[stepIdx - 1]}</button>
                )}
                {stepIdx < STEPS.length - 1 ? (
                  <button onClick={() => advance(stepIdx + 1)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black text-[12px] font-bold rounded-lg hover:bg-[#00b6d6] disabled:opacity-50">{saving ? 'Advancing…' : `Advance to ${STEPS[stepIdx + 1]}`} <ChevronRight size={13} /></button>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-[#00e676]/15 text-[#00e676] text-[12px] font-bold rounded-lg"><Check size={13} /> PO Converted</span>
                )}
                <div className="ml-auto"><ExportButton records={tc.pageItems} columns={PO_COLUMNS} filename="po-approval" /></div>
              </div>
            </>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161c24] border border-[#00d4ff]/25 rounded-xl p-4 max-w-md w-full">
            <h4 className="text-[13px] font-bold text-[#e2e8f0] mb-3">New Purchase Order</h4>
            <div className="space-y-3">
              <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Vendor</label><input className={inpBox} value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} /></div>
              <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Description</label><input className={inpBox} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Job</label><input className={inpBox} value={form.jobCode} onChange={e => setForm(f => ({ ...f, jobCode: e.target.value }))} /></div>
                <div><label className="block text-[10px] font-semibold text-[#5a6878] uppercase mb-1">Amount</label><input type="number" className={inpBox} value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: Number(e.target.value) }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFormOpen(false)} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
              <button onClick={create} disabled={saving} className="px-4 py-1.5 bg-[#00d4ff] text-black text-[11px] font-bold rounded-lg disabled:opacity-50">{saving ? 'Creating…' : 'Create PO'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDots({ idx }: { idx: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[0, 1, 2, 3].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= idx ? 'bg-[#00d4ff]' : 'bg-[#2e3a48]'}`} />)}
    </span>
  );
}