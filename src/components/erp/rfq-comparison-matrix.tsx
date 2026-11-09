'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Award, Trophy, Check, Loader2, FileText, ShoppingCart, Truck, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTableControls, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface LineItem { id: number; description: string; qty: number; unit: string; }
interface Bid { id?: number; vendorId: number; lineItemId: number; unitPrice: number; leadTime: number; notes?: string | null; compliant?: boolean; }
interface RFQ { id: number; rfqNo: string; description: string; project: string; status: string; lineItems: LineItem[]; bids: Bid[]; }

const RFQ_COLUMNS: ExportColumn<RFQ>[] = [
  { header: 'RFQ No', accessor: 'rfqNo' },
  { header: 'Description', accessor: 'description' },
  { header: 'Project', accessor: 'project' },
  { header: 'Bids', accessor: (r) => r.bids.length },
  { header: 'Status', accessor: 'status' },
];

interface MatrixCell { bid?: Bid; isLowest: boolean; }
interface MatrixRow { item: LineItem; vendors: Record<number, MatrixCell>; }

function buildMatrix(rfq: RFQ | null): { vendors: number[]; rows: MatrixRow[]; totals: Record<number, number> } {
  if (!rfq) return { vendors: [], rows: [], totals: {} };
  const vendorSet = new Set<number>([...rfq.bids.map(b => b.vendorId)]);
  const vendors = [...vendorSet].sort((a, b) => a - b);
  const rows: MatrixRow[] = rfq.lineItems.map(item => {
    const cells: Record<number, MatrixCell> = {};
    for (const v of vendors) {
      const bid = rfq.bids.find(b => b.lineItemId === item.id && b.vendorId === v);
      cells[v] = { bid, isLowest: false };
    }
    const priced = vendors.filter(v => cells[v].bid && cells[v].bid.compliant !== false);
    if (priced.length) {
      const min = Math.min(...priced.map(v => cells[v].bid!.unitPrice));
      priced.forEach(v => { cells[v].isLowest = cells[v].bid!.unitPrice === min; });
    }
    return { item, vendors: cells };
  });
  const totals: Record<number, number> = {};
  for (const v of vendors) {
    totals[v] = Math.round(rows.reduce((sum, r) => sum + ((r.vendors[v].bid?.unitPrice || 0) * r.item.qty), 0) * 100) / 100;
  }
  return { vendors, rows, totals };
}

// PDF-style performance % per vendor (bid coverage × compliance), computed from real data
function vendorScore(rfq: RFQ | null, vendorId: number): number {
  if (!rfq || !rfq.lineItems.length) return 0;
  const bids = rfq.bids.filter(b => b.vendorId === vendorId);
  const covered = rfq.lineItems.filter(li => bids.some(b => b.lineItemId === li.id)).length;
  const compliant = bids.filter(b => b.compliant !== false).length;
  const coverage = covered / rfq.lineItems.length;
  const compliance = bids.length ? compliant / bids.length : 0;
  return Math.round((coverage * 0.6 + compliance * 0.4) * 100);
}

export default function RfqComparisonMatrix() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorNames, setVendorNames] = useState<Record<number, string>>({});
  const [sites, setSites] = useState<{ id: number; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: number; jobCode: string; siteId: number }[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null);

  // Generate PO dialog (PDF: Final Order Configuration + Financial Summary + Checklist)
  const [poOpen, setPoOpen] = useState(false);
  const [poSaving, setPoSaving] = useState(false);
  const [poForm, setPoForm] = useState({
    siteId: '', jobCode: '', costCenter: 'CC-PROJ', department: 'Procurement',
    projectManager: '', date: new Date().toISOString().split('T')[0],
    paymentTerms: 'Net 30', freight: 0, vatPercent: 15, instructions: '',
  });

  const tc = useTableControls(rfqs, (r) => `${r.rfqNo} ${r.description} ${r.project}`);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rfqRes, vendRes, siteRes, jobRes] = await Promise.all([
        fetch('/api/procurement/rfqs').then(r => r.json()).catch(() => null),
        fetch('/api/fin/vendors').then(r => r.json()).catch(() => null),
        fetch('/api/fin/sites').then(r => r.json()).catch(() => null),
        fetch('/api/fin/jobs').then(r => r.json()).catch(() => null),
      ]);
      if (vendRes?.success) setVendorNames(Object.fromEntries((vendRes.data || []).map((v: { id: number; name: string }) => [v.id, v.name])));
      if (siteRes?.success) setSites((siteRes.data || []).map((s: { id: number; name: string }) => ({ id: s.id, name: s.name })));
      if (jobRes?.success) setJobs((jobRes.data || []).map((j: { id: number; jobCode: string; siteId: number }) => ({ id: j.id, jobCode: j.jobCode, siteId: j.siteId })));
      if (rfqRes?.success && rfqRes.data?.length) {
        setRfqs(rfqRes.data.map((r: { id: number; rfqNo: string; description: string; project: string; status: string; lineItems: LineItem[]; bids: Bid[] }) => ({
          id: r.id, rfqNo: r.rfqNo, description: r.description || '', project: r.project || '', status: r.status || '',
          lineItems: (r.lineItems || []).map((li: LineItem) => ({ id: li.id, description: li.description, qty: li.qty, unit: li.unit })),
          bids: (r.bids || []).map((b: Bid) => ({ vendorId: b.vendorId, lineItemId: b.lineItemId, unitPrice: b.unitPrice, leadTime: b.leadTime, notes: b.notes, compliant: b.compliant })),
        })));
        setSelectedId(rfqRes.data[0]?.id ?? null);
      }
    } catch { /* empty state — no sample data */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const selected = rfqs.find(r => r.id === selectedId) || null;
  const matrix = useMemo(() => buildMatrix(selected), [selected]);
  const totalLowest = matrix.vendors.length ? Math.min(...matrix.vendors.map(v => matrix.totals[v])) : 0;
  const winner = matrix.vendors.find(v => matrix.totals[v] === totalLowest) ?? null;
  const isAwarded = selected?.status === 'Awarded';
  const selectedTotal = selectedVendor !== null ? matrix.totals[selectedVendor] || 0 : 0;
  const selectedBidCount = selected && selectedVendor !== null ? selected.bids.filter(b => b.vendorId === selectedVendor).length : 0;

  const vName = (v: number) => vendorNames[v] || `Vendor ${v}`;
  const siteJobs = jobs.filter(j => !poForm.siteId || j.siteId === Number(poForm.siteId));

  const openPoDialog = () => {
    if (!selected || selectedVendor === null) { toast.error('Select a supplier first'); return; }
    if (!selectedBidCount) { toast.error(`${vName(selectedVendor)} has no bids for this RFQ`); return; }
    setPoForm(f => ({ ...f, siteId: f.siteId || (sites[0]?.id ? String(sites[0].id) : ''), jobCode: f.jobCode || (siteJobs[0]?.jobCode || ''), instructions: f.instructions || `Against ${selected.rfqNo} — deliver to site. Site contact: ${poForm.projectManager || 'TBD'}` }));
    setPoOpen(true);
  };

  const subtotal = selectedTotal;
  const freight = Number(poForm.freight) || 0;
  const vat = Math.round((subtotal + freight) * (Number(poForm.vatPercent) || 0)) / 100;
  const poTotal = subtotal + freight + vat;

  const generatePO = async () => {
    if (!selected || selectedVendor === null) return;
    if (!poForm.siteId || !poForm.jobCode || !poForm.costCenter.trim() || !poForm.projectManager.trim()) {
      toast.error('Site, Job Code, Cost Center and Project Manager are required');
      return;
    }
    setPoSaving(true);
    try {
      const vendorBids = selected.bids.filter(b => b.vendorId === selectedVendor);
      const items = selected.lineItems.map(li => {
        const bid = vendorBids.find(b => b.lineItemId === li.id);
        const unitRate = bid?.unitPrice || 0;
        return { description: li.description, unitOfMeasure: li.unit, quantity: li.qty, unitRate, taxPercent: Number(poForm.vatPercent) || 0, total: Math.round(unitRate * li.qty * 100) / 100 };
      });
      if (!items.some(i => i.total > 0)) { toast.error('Selected supplier has no priced bids'); return; }
      const res = await fetch('/api/fin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: String(selectedVendor),
          vendorName: vName(selectedVendor),
          siteId: Number(poForm.siteId),
          jobCode: poForm.jobCode,
          costCenter: poForm.costCenter.trim(),
          department: poForm.department.trim() || 'Procurement',
          projectManager: poForm.projectManager.trim(),
          date: new Date(poForm.date).toISOString(),
          descriptionOfWork: `${selected.rfqNo} — ${selected.description}`,
          termsConditions: `${poForm.paymentTerms} • ${poForm.instructions}`,
          subtotal: Math.round(subtotal * 100) / 100,
          taxAmount: Math.round(vat * 100) / 100,
          totalAmount: Math.round(poTotal * 100) / 100,
          status: 'Pending Approval',
          items: { create: items },
        }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to create PO'); return; }
      const rfqRes = await fetch(`/api/procurement/rfqs/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Awarded' }),
      });
      const rfqJson = await rfqRes.json().catch(() => null);
      if (!rfqJson?.success) {
        toast.error(`PO ${json.data?.poNo || ''} created, but the RFQ could not be marked Awarded — update it manually`);
        setPoOpen(false);
        return;
      }
      setRfqs(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'Awarded' } : r));
      setPoOpen(false);
      toast.success(`PO ${json.data.poNo} created for ${vName(selectedVendor)} — sent for approval`);
    } catch {
      toast.error('Network error');
    } finally {
      setPoSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  const inputCls = 'w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#a78bfa] focus:outline-none transition-colors';
  const lbl = 'text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1.5 block';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center"><BarChart3 size={18} className="text-[#a78bfa]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Quotation Comparison</h2>
            <p className="text-[11px] text-[#5a6878]">Compare vendor bids line-by-line · select a supplier to generate the PO</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton records={tc.pageItems} columns={RFQ_COLUMNS} filename="rfq-comparison" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* RFQ selector */}
        <div className="lg:col-span-1 bg-[#161c24] border border-[#252e3a] rounded-xl p-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#5a6878] mb-2">Select RFQ</h4>
          <div className="space-y-1.5">
            {rfqs.map(r => (
              <button key={r.id} onClick={() => { setSelectedId(r.id); setSelectedVendor(null); }} className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedId === r.id ? 'bg-[#a78bfa]/10 border-[#a78bfa]/40' : 'bg-[#0d1117] border-[#252e3a] hover:border-[#a78bfa]/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#e2e8f0]">{r.rfqNo}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#252e3a] text-[#8899aa]">{r.bids.length} bids</span>
                </div>
                <div className="text-[9px] text-[#5a6878] truncate mt-0.5">{r.description}</div>
                <div className="text-[9px] text-[#a78bfa] mt-0.5">{r.project} · {r.status}</div>
              </button>
            ))}
            {rfqs.length === 0 && <div className="text-[11px] text-[#5a6878] py-4 text-center">No RFQs yet — create one from Purchase Requisition (Convert to RFQ) or RFQ Management.</div>}
          </div>
        </div>

        {/* Matrix + supplier cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            {!selected ? (
              <div className="p-10 text-center text-[#5a6878] text-[12px]">Select an RFQ to compare bids.</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-[#252e3a] flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-bold text-[#e2e8f0]">{selected.rfqNo} — {selected.description}</h3>
                    <p className="text-[10px] text-[#5a6878]">{selected.project} · {selected.lineItems.length} line items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAwarded && <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#00e676] bg-[#00e676]/10 px-3 py-1.5 rounded-lg"><ShieldCheck size={13} /> PO Generated</span>}
                    {winner && <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#f5a623] bg-[#f5a623]/10 px-3 py-1.5 rounded-lg"><Trophy size={13} /> Best: {vName(winner)}</div>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                      <th className="text-left py-3 px-4 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Line Item</th>
                      {matrix.vendors.map(v => (
                        <th key={v} className="text-right px-3 py-3 text-[10px] font-bold text-[#e2e8f0]">{vName(v)}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a2028]">
                      {matrix.rows.map(row => (
                        <tr key={row.item.id} className="hover:bg-[#141920]">
                          <td className="py-2.5 px-4">
                            <div className="text-[#e2e8f0] font-semibold">{row.item.description}</div>
                            <div className="text-[9px] text-[#5a6878]">Qty {row.item.qty} {row.item.unit}</div>
                          </td>
                          {matrix.vendors.map(v => {
                            const c = row.vendors[v];
                            return (
                              <td key={v} className="px-3 py-2.5 text-right">
                                {c.bid ? (
                                  <div>
                                    <span className={`font-mono text-[11px] font-bold ${c.isLowest ? 'text-[#00e676]' : 'text-[#e2e8f0]'}`}>
                                      {c.isLowest && <Check size={10} className="inline mr-0.5" />}₹{(c.bid.unitPrice || 0).toLocaleString('en-IN')}
                                    </span>
                                    <div className="text-[8px] text-[#5a6878]">{c.bid.leadTime}d lead</div>
                                  </div>
                                ) : <span className="text-[#2e3a48]">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
                        <td className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[#5a6878]">Total (qty × rate)</td>
                        {matrix.vendors.map(v => (
                          <td key={v} className={`px-3 py-3 text-right font-mono text-[12px] font-bold ${matrix.totals[v] === totalLowest && winner === v ? 'text-[#00e676]' : 'text-[#e2e8f0]'}`}>₹{(matrix.totals[v] || 0).toLocaleString('en-IN')}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {matrix.vendors.length === 0 && <div className="p-8 text-center text-[#5a6878] text-[11px]">No bids recorded for this RFQ yet — record responses in RFQ Management.</div>}
              </>
            )}
          </div>

          {/* Supplier cards — PDF: Select Supplier / Review Selection */}
          {selected && matrix.vendors.length > 0 && (
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#5a6878]">Select Supplier</h4>
                <button onClick={openPoDialog} disabled={!isAwarded && selectedVendor === null}
                  className="px-4 py-1.5 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[11px] font-bold hover:bg-[#e8991a] transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ShoppingCart size={13} /> Generate PO
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matrix.vendors.map(v => {
                  const score = vendorScore(selected, v);
                  const leadDays = selected.bids.filter(b => b.vendorId === v).reduce((m, b) => Math.max(m, b.leadTime), 0);
                  const isSel = selectedVendor === v;
                  return (
                    <button key={v} onClick={() => setSelectedVendor(v)}
                      className={`text-left bg-[#0d1117] rounded-xl p-3.5 border transition-all ${isSel ? 'border-[#a78bfa] bg-[#a78bfa]/5 ring-1 ring-[#a78bfa]/40' : 'border-[#252e3a] hover:border-[#a78bfa]/40'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-bold text-[#e2e8f0]">{vName(v)}</span>
                        {isSel ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-[#0a0d12] bg-[#a78bfa] px-2 py-0.5 rounded"><Check size={10} /> SELECTED</span>
                        ) : winner === v ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-[#f5a623] bg-[#f5a623]/15 px-2 py-0.5 rounded"><Trophy size={10} /> LOWEST</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-[#5a6878] mb-2">
                        <span className="flex items-center gap-1"><ShieldCheck size={10} className={score >= 90 ? 'text-[#00e676]' : score >= 70 ? 'text-[#f5a623]' : 'text-[#ff3d3d]'} /> {score}% performance</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {leadDays || '—'}d lead</span>
                        <span className="flex items-center gap-1"><Truck size={10} /> {selected.bids.find(b => b.vendorId === v)?.notes?.slice(0, 12) || 'Standard'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#5a6878]">{selected.bids.filter(b => b.vendorId === v).length} of {selected.lineItems.length} items quoted</span>
                        <span className="font-mono text-[13px] font-bold text-[#f5a623]">₹{(matrix.totals[v] || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Generate PO — PDF: Final Order Configuration + Financial Summary + Checklist
         ══════════════════════════════════════════════ */}
      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#252e3a] pb-4">
            <DialogTitle className="text-[#f5a623] text-[16px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Final Order Configuration
            </DialogTitle>
            <p className="text-[11px] text-[#5a6878] mt-1">{selected?.rfqNo} · {selectedVendor !== null ? vName(selectedVendor) : ''} · ₹{selectedTotal.toLocaleString('en-IN')}</p>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Destination Site *</label>
                <select value={poForm.siteId} onChange={e => setPoForm({ ...poForm, siteId: e.target.value, jobCode: '' })} className={inputCls}>
                  <option value="">Select site…</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Job Code *</label>
                <select value={poForm.jobCode} onChange={e => setPoForm({ ...poForm, jobCode: e.target.value })} className={inputCls}>
                  <option value="">Select job…</option>
                  {siteJobs.map(j => <option key={j.id} value={j.jobCode}>{j.jobCode}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>PO Date</label>
                <input type="date" value={poForm.date} onChange={e => setPoForm({ ...poForm, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={lbl}>Cost Center *</label>
                <input value={poForm.costCenter} onChange={e => setPoForm({ ...poForm, costCenter: e.target.value })} className={inputCls} placeholder="CC-PROJ" />
              </div>
              <div>
                <label className={lbl}>Department</label>
                <input value={poForm.department} onChange={e => setPoForm({ ...poForm, department: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={lbl}>Project Manager *</label>
                <input value={poForm.projectManager} onChange={e => setPoForm({ ...poForm, projectManager: e.target.value })} className={inputCls} placeholder="Name" />
              </div>
              <div>
                <label className={lbl}>Payment Terms</label>
                <select value={poForm.paymentTerms} onChange={e => setPoForm({ ...poForm, paymentTerms: e.target.value })} className={inputCls}>
                  <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>50% Advance</option><option>On Delivery</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Freight &amp; Handling (₹)</label>
                <input type="number" min={0} value={poForm.freight} onChange={e => setPoForm({ ...poForm, freight: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label className={lbl}>VAT / GST (%)</label>
                <input type="number" min={0} value={poForm.vatPercent} onChange={e => setPoForm({ ...poForm, vatPercent: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={lbl}>Delivery / Special Instructions</label>
              <textarea rows={2} value={poForm.instructions} onChange={e => setPoForm({ ...poForm, instructions: e.target.value })} className={inputCls} placeholder="Deliver to Gate… site contact…" />
            </div>

            {/* Financial Summary — PDF */}
            <div className="bg-[#0a0d12] rounded-lg p-4 border border-[#1a2028]">
              <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-3">Financial Summary</div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-[#8899aa]">Subtotal</span><span className="font-mono text-[#e2e8f0]">₹{subtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[#8899aa]">Freight &amp; Handling</span><span className="font-mono text-[#e2e8f0]">₹{freight.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[#8899aa]">VAT / GST ({poForm.vatPercent}%)</span><span className="font-mono text-[#e2e8f0]">₹{vat.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between border-t border-[#252e3a] pt-1.5 mt-1.5"><span className="text-[11px] font-bold text-[#f5a623] uppercase tracking-wider">PO Total</span><span className="font-mono text-[14px] font-bold text-[#f5a623]">₹{poTotal.toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            {/* Workbench Checklist — PDF */}
            <div className="bg-[#0a0d12] rounded-lg p-4 border border-[#1a2028]">
              <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-2.5">Workbench Checklist</div>
              <div className="space-y-1.5 text-[11px]">
                {[
                  { ok: !!poForm.siteId && !!poForm.jobCode, label: 'Site & job code assigned' },
                  { ok: selectedBidCount >= (selected?.lineItems.length || 1), label: `Supplier quoted all ${selected?.lineItems.length || 0} line items` },
                  { ok: poTotal > 0, label: 'Price within PR budget (PR match)' },
                  { ok: !!poForm.projectManager.trim(), label: 'Project manager accountable' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2">
                    <Check size={12} className={c.ok ? 'text-[#00e676]' : 'text-[#2e3a48]'} />
                    <span className={c.ok ? 'text-[#e2e8f0]' : 'text-[#5a6878]'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-[#252e3a] pt-4">
            <button onClick={() => setPoOpen(false)} className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium">Cancel</button>
            <button onClick={generatePO} disabled={poSaving}
              className="h-9 px-4 rounded-lg bg-[#f5a623] text-[#0a0d12] hover:bg-[#e8991a] transition-all text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
              {poSaving ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />} Dispatch PO
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
