'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Award, Trophy, Check, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
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
    // mark lowest compliant bid per line item
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

const VENDOR_NAMES: Record<number, string> = { 1: 'ElectroMech', 2: 'PowerTech', 3: 'CableWorks', 4: 'SteelCo', 5: 'CementMart', 6: 'PanelPro' };

export default function RfqComparisonMatrix() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const tc = useTableControls(rfqs, (r) => `${r.rfqNo} ${r.description} ${r.project}`);

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/procurement/rfqs').then(r => r.json());
      if (j.success && j.data?.length) {
        setRfqs(j.data.map((r: any) => ({
          id: r.id, rfqNo: r.rfqNo, description: r.description || '', project: r.project || '', status: r.status || '',
          lineItems: (r.lineItems || []).map((li: any) => ({ id: li.id, description: li.description, qty: li.qty, unit: li.unit })),
          bids: (r.bids || []).map((b: any) => ({ vendorId: b.vendorId, lineItemId: b.lineItemId, unitPrice: b.unitPrice, leadTime: b.leadTime, notes: b.notes, compliant: b.compliant })),
        })));
        setSelectedId(j.data[0]?.id ?? null);
      } else {
        setRfqs(generateMock());
        setSelectedId(1);
        toast.info('Sample data shown — no RFQs in database yet');
      }
    } catch { setRfqs(generateMock()); setSelectedId(1); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const selected = rfqs.find(r => r.id === selectedId) || null;
  const matrix = useMemo(() => buildMatrix(selected), [selected]);
  const totalLowest = matrix.vendors.length ? Math.min(...matrix.vendors.map(v => matrix.totals[v])) : 0;
  const winner = matrix.vendors.find(v => matrix.totals[v] === totalLowest) ?? null;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center"><BarChart3 size={18} className="text-[#a78bfa]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">RFQ Comparison Matrix</h2>
            <p className="text-[11px] text-[#5a6878]">Compare vendor bids line-by-line · lowest compliant bid highlighted</p>
          </div>
        </div>
        <div className="flex items-center gap-2"><ExportButton records={tc.pageItems} columns={RFQ_COLUMNS} filename="rfq-comparison" /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* RFQ selector */}
        <div className="lg:col-span-1 bg-[#161c24] border border-[#252e3a] rounded-xl p-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#5a6878] mb-2">Select RFQ</h4>
          <div className="space-y-1.5">
            {rfqs.map(r => (
              <button key={r.id} onClick={() => setSelectedId(r.id)} className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedId === r.id ? 'bg-[#a78bfa]/10 border-[#a78bfa]/40' : 'bg-[#0d1117] border-[#252e3a] hover:border-[#a78bfa]/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#e2e8f0]">{r.rfqNo}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#252e3a] text-[#8899aa]">{r.bids.length} bids</span>
                </div>
                <div className="text-[9px] text-[#5a6878] truncate mt-0.5">{r.description}</div>
                <div className="text-[9px] text-[#a78bfa] mt-0.5">{r.project} · {r.status}</div>
              </button>
            ))}
            {rfqs.length === 0 && <div className="text-[11px] text-[#5a6878] py-4 text-center">No RFQs</div>}
          </div>
        </div>

        {/* Matrix */}
        <div className="lg:col-span-3 bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          {!selected ? (
            <div className="p-10 text-center text-[#5a6878] text-[12px]">Select an RFQ to compare bids.</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#252e3a] flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#e2e8f0]">{selected.rfqNo} — {selected.description}</h3>
                  <p className="text-[10px] text-[#5a6878]">{selected.project} · {selected.lineItems.length} line items</p>
                </div>
                {winner && <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00e676] bg-[#00e676]/10 px-3 py-1.5 rounded-lg"><Trophy size={13} /> L1: {VENDOR_NAMES[winner] || `Vendor ${winner}`}</div>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                    <th className="text-left py-3 px-4 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">Line Item</th>
                    {matrix.vendors.map(v => (
                      <th key={v} className="text-right px-3 py-3 text-[10px] font-bold text-[#e2e8f0]">{VENDOR_NAMES[v] || `Vendor ${v}`}</th>
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
              {matrix.vendors.length === 0 && <div className="p-8 text-center text-[#5a6878] text-[11px]">No bids recorded for this RFQ yet.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function generateMock(): RFQ[] {
  const li = (id: number, description: string, qty: number, unit: string): LineItem => ({ id, description, qty, unit });
  const b = (vendorId: number, lineItemId: number, unitPrice: number, leadTime: number, compliant = true): Bid => ({ vendorId, lineItemId, unitPrice, leadTime, compliant });
  return [
    {
      id: 1, rfqNo: 'RFQ-2026-001', description: 'Supply of HT Cables 33kV for BALCO Switchyard', project: 'BALCO', status: 'Responses Received',
      lineItems: [li(1, '33kV XLPE Cable 3Cx400sqmm', 2500, 'Mtr'), li(2, '33kV XLPE Cable 3Cx240sqmm', 1800, 'Mtr'), li(3, 'Cable Jointing Kit 33kV 3C', 25, 'Set')],
      bids: [b(1, 1, 4850, 25), b(1, 2, 3250, 25), b(1, 3, 18500, 20), b(2, 1, 5200, 30), b(2, 2, 3500, 30), b(2, 3, 22000, 25), b(3, 1, 4750, 20), b(3, 2, 3100, 20), b(3, 3, 17500, 15)],
    },
    {
      id: 2, rfqNo: 'RFQ-2026-002', description: 'Structural Steel for NTPC Barh Turbine Building', project: 'NTPC', status: 'Responses Received',
      lineItems: [li(4, 'ISMB 300 x 140mm x 44.2kg/m', 120, 'MT'), li(5, 'ISMC 200 x 75mm x 22.1kg/m', 85, 'MT')],
      bids: [b(4, 4, 72500, 30), b(4, 5, 68500, 30), b(1, 4, 74000, 25), b(1, 5, 70000, 25), b(5, 4, 71000, 35), b(5, 5, 67500, 35)],
    },
  ];
}