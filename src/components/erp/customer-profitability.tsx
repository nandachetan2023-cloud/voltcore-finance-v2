'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, RefreshCw, BarChart3, PieChart as PieIcon, Loader2, AlertCircle } from 'lucide-react';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import { BarChart, DonutChart } from './finance-charts';

interface CustPnl { customerId: number; customer: string; revenue: number; cost: number; profit: number; margin: number; invoices: number; }

const COLUMNS: ExportColumn<CustPnl>[] = [
  { header: 'Customer', accessor: 'customer' },
  { header: 'Revenue', accessor: 'revenue' },
  { header: 'Cost', accessor: 'cost' },
  { header: 'Profit', accessor: 'profit' },
  { header: 'Margin %', accessor: 'margin' },
  { header: 'Invoices', accessor: 'invoices' },
];

function fmtCr(n: number): string {
  const v = n ?? 0;
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(2) + ' L';
  return '₹' + v.toLocaleString('en-IN');
}

export default function CustomerProfitability() {
  const [data, setData] = useState<CustPnl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance-dashboard');
      const json = await res.json();
      if (json.success) { setData(json.data.customerPnl || []); setError(''); }
      else setError(json.error || 'Failed to load');
    } catch (e: any) { setError(e?.message || 'Network error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const tc = useTableControls(data, (r) => `${r.customer} ${r.revenue}`);

  const totalRevenue = data.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalCost = data.reduce((s, r) => s + (r.cost || 0), 0);
  const totalProfit = data.reduce((s, r) => s + (r.profit || 0), 0);
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const barData = data.slice(0, 8).map((r, i) => ({ name: r.customer.length > 14 ? r.customer.slice(0, 14) + '…' : r.customer, value: r.profit, color: ['#00d4ff', '#a78bfa', '#00e676', '#f5a623'][i % 4] }));
  const donutData = data.slice(0, 6).map((r, i) => ({ name: r.customer, value: r.profit, color: ['#00d4ff', '#a78bfa', '#00e676', '#f5a623', '#ff3d3d', '#e8891a'][i % 6] })).filter(d => d.value > 0);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#a78bfa]" size={24} /></div>;
  if (error) return (
    <div className="p-6 text-center text-[#ff3d3d]">
      <AlertCircle size={32} className="mx-auto mb-2" />
      <p>{error}</p>
      <button className="vc-btn-primary mt-3" onClick={load}>Retry</button>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center"><Users size={18} className="text-[#a78bfa]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Customer-wise Profitability</h2>
            <p className="text-[11px] text-[#5a6878]">Revenue, cost, profit & margin per customer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
          <ExportButton records={tc.pageItems} columns={COLUMNS} filename="customer-profitability" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total Revenue</div>
          <div className="mt-1 text-[20px] font-bold text-[#00d4ff] font-mono">{fmtCr(totalRevenue)}</div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total Cost</div>
          <div className="mt-1 text-[20px] font-bold text-[#f5a623] font-mono">{fmtCr(totalCost)}</div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Total Profit</div>
          <div className={`mt-1 text-[20px] font-bold font-mono ${totalProfit >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{fmtCr(totalProfit)}</div>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#5a6878] font-semibold">Overall Margin</div>
          <div className={`mt-1 text-[20px] font-bold font-mono ${overallMargin >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{overallMargin.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><BarChart3 size={15} className="text-[#a78bfa]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Profit by Customer</span></div>
          {barData.length === 0 ? <div className="h-[180px] flex items-center justify-center text-[#5a6878] text-xs">No data</div> : <div className="h-[200px]"><BarChart data={barData} /></div>}
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><PieIcon size={15} className="text-[#00e676]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Profit Share by Customer</span></div>
          {donutData.length === 0 ? <div className="h-[180px] flex items-center justify-center text-[#5a6878] text-xs">No data</div> : <DonutChart data={donutData} total={donutTotal} />}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3"><SearchInput value={tc.search} onChange={tc.setSearch} /></div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">
              {['Customer', 'Revenue', 'Cost', 'Profit', 'Margin', 'Invoices'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[#8899aa] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => (
                <tr key={r.customerId} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 font-semibold text-[#e2e8f0]">{r.customer}</td>
                  <td className="py-2.5 px-3 font-mono text-[#00d4ff]">{fmtCr(r.revenue)}</td>
                  <td className="py-2.5 px-3 font-mono text-[#f5a623]">{fmtCr(r.cost)}</td>
                  <td className={`py-2.5 px-3 font-mono font-bold ${r.profit >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{fmtCr(r.profit)}</td>
                  <td className={`py-2.5 px-3 font-mono ${r.margin >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>{r.margin}%</td>
                  <td className="py-2.5 px-3 font-mono text-[#8899aa]">{r.invoices}</td>
                </tr>
              ))}
              {tc.pageItems.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">No customer data.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-[#252e3a]"><PaginationBar {...tc} /></div>
      </div>
    </div>
  );
}
