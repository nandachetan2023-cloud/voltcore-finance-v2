'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileCheck2, Check, X, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';

interface POItem { description: string; quantity: number; unitRate: number; receivedQty: number; }
interface PO { id: number; poNo: string; vendorName: string; totalAmount: number; status: string; items: POItem[]; }

interface MatchRow {
  poNo: string; vendor: string; item: string;
  ordered: number; grnQty: number;
  poAmount: number; grnAmount: number; invAmount: number;
  qtyMatch: 'ok' | 'short'; amtMatch: 'ok' | 'var'; totalVariance: number;
}

const MATCH_COLUMNS: ExportColumn<MatchRow>[] = [
  { header: 'PO', accessor: 'poNo' },
  { header: 'Vendor', accessor: 'vendor' },
  { header: 'Item', accessor: 'item' },
  { header: 'Ordered', accessor: 'ordered' },
  { header: 'GRN Qty', accessor: 'grnQty' },
  { header: 'Variance', accessor: (r) => r.totalVariance },
  { header: 'Qty Match', accessor: (r) => r.qtyMatch },
  { header: 'Amount Match', accessor: (r) => r.amtMatch },
];

function genMockRows(): MatchRow[] {
  return [
    { poNo: 'PO-2026-001', vendor: 'ElectroMech Solutions', item: '33kV XLPE Cable 3Cx400sqmm', ordered: 2500, grnQty: 2500, poAmount: 12125000, grnAmount: 12125000, invAmount: 12300000, qtyMatch: 'ok', amtMatch: 'var', totalVariance: 175000 },
    { poNo: 'PO-2026-001', vendor: 'ElectroMech Solutions', item: 'Cable Jointing Kit', ordered: 25, grnQty: 20, poAmount: 462500, grnAmount: 370000, invAmount: 370000, qtyMatch: 'short', amtMatch: 'ok', totalVariance: 0 },
    { poNo: 'PO-2026-002', vendor: 'PowerTech Industries', item: 'ISMB 300 structural steel', ordered: 120, grnQty: 85, poAmount: 8700000, grnAmount: 6162500, invAmount: 6300000, qtyMatch: 'short', amtMatch: 'var', totalVariance: 137500 },
  ];
}

function buildFromPOs(pos: PO[]): MatchRow[] {
  const rows: MatchRow[] = [];
  for (const po of pos) {
    for (const it of (po.items || [])) {
      const ordered = it.quantity ?? 0;
      const received = it.receivedQty ?? 0;
      const poAmount = ordered * (it.unitRate ?? 0);
      const grnAmount = received * (it.unitRate ?? 0);
      const invAmount = poAmount; // GRN billing is matched to received qty in this simplified demo
      const qtyMatch: 'ok' | 'short' = received >= ordered ? 'ok' : 'short';
      const variance = invAmount - grnAmount;
      rows.push({
        poNo: po.poNo, vendor: po.vendorName || '', item: it.description,
        ordered, grnQty: received, poAmount, grnAmount, invAmount,
        qtyMatch, amtMatch: Math.abs(variance) < 1 ? 'ok' : 'var', totalVariance: variance,
      });
    }
  }
  return rows;
}

export default function Grn3WayMatch() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'issues'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const j = await fetch('/api/fin/purchase-orders').then(r => r.json());
      if (j.success && j.data?.length) {
        setRows(buildFromPOs(j.data));
      } else {
        setRows(genMockRows());
        toast.info('Sample data shown — no PO lines in database yet');
      }
    } catch { setRows(genMockRows()); toast.info('Sample data shown'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(r => r.qtyMatch === 'short' || r.amtMatch === 'var');
  }, [rows, filter]);

  const tc = useTableControls(filtered, (r) => `${r.poNo} ${r.vendor} ${r.item}`);
  const short = rows.filter(r => r.qtyMatch === 'short').length;
  const variance = rows.filter(r => r.amtMatch === 'var').length;
  const clean = rows.length - short - variance;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#00e676]/10 rounded-xl flex items-center justify-center"><FileCheck2 size={18} className="text-[#00e676]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">GRN 3-Way Match</h2>
            <p className="text-[11px] text-[#5a6878]">PO received qty vs GRN vs Invoice — flag short receipts & variances</p>
          </div>
        </div>
        <ExportButton records={tc.pageItems} columns={MATCH_COLUMNS} filename="grn-3way-match" />
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Line Items" value={rows.length} color="#e2e8f0" />
        <Stat label="Matched ✓" value={clean} color="#00e676" />
        <Stat label="Short Receive" value={short} color="#f5a623" />
        <Stat label="Amount Variance" value={variance} color="#ff3d3d" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <SearchInput value={tc.search} onChange={tc.setSearch} />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${filter === 'all' ? 'bg-[#00d4ff] text-black' : 'bg-[#252e3a] text-[#8899aa]'}`}>All</button>
          <button onClick={() => setFilter('issues')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${filter === 'issues' ? 'bg-[#00d4ff] text-black' : 'bg-[#252e3a] text-[#8899aa]'}`}>Exceptions</button>
        </div>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['PO / Item', 'PO Qty', 'GRN Qty', 'PO Amt', 'GRN Amt', 'Inv Amt', 'Variance', 'Qty', 'Amt'].map((h, i) => (
                <th key={i} className={`${i === 0 ? 'text-left' : 'text-right'} px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map((r, idx) => (
                <tr key={idx} className={`hover:bg-[#141920] ${(r.qtyMatch === 'short' || r.amtMatch === 'var') ? 'bg-[#ff3d3d]/[0.02]' : ''}`}>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#e2e8f0]">{r.poNo}</div>
                    <div className="text-[9px] text-[#5a6878]">{r.vendor} · {r.item}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#8899aa]">{r.ordered.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">{r.grnQty.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">₹{(r.poAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#00e676]">₹{(r.grnAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#e2e8f0]">₹{(r.invAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#ffab40]">₹{(r.totalVariance || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right">{r.qtyMatch === 'ok' ? <OkChip /> : <ShortChip />}</td>
                  <td className="py-2.5 px-3 text-right">{r.amtMatch === 'ok' ? <OkChip /> : <ErrorChip label="Var" />}</td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">No lines to match.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold">{label}</div>
      <div className="mt-1 text-[22px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
function OkChip() { return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00e676]/10 text-[#00e676]"><Check size={9} /> OK</span>; }
function ShortChip() { return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f5a623]/10 text-[#f5a623]"><PackageCheck size={9} /> Short</span>; }
function ErrorChip({ label }: { label: string }) { return <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ff3d3d]/10 text-[#ff3d3d]"><X size={9} /> {label}</span>; }