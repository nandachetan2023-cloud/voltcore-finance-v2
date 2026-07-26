'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Target, BarChart3, PieChart,
  Search, Eye, Pencil, ArrowUpDown, Filter, Briefcase, Zap, Pickaxe, Cog
} from 'lucide-react';
import { toast } from 'sonner';

function generateMockRevenueData(): any[] {
  return [
    { id:1, projectName:'Barh STPP Switchyard Package', clientName:'NTPC Limited', sector:'power', stage:'value-proposition', value:450000000, probability:65, expectedClose:'2026-08-15' },
    { id:2, projectName:'Jharia Mine Electrical Infrastructure', clientName:'Coal India Ltd', sector:'mining', stage:'price-quote', value:285000000, probability:55, expectedClose:'2026-07-30' },
    { id:3, projectName:'Mahan Smelter Electrical BOP', clientName:'Hindalco Industries', sector:'industrial', stage:'qualification', value:620000000, probability:40, expectedClose:'2026-10-20' },
    { id:4, projectName:'BALCO CPP Electrical Works', clientName:'BALCO (Vedanta)', sector:'power', stage:'closed', value:390000000, probability:100, expectedClose:'2026-06-01' },
    { id:5, projectName:'Vijayanagar Cabling Phase III', clientName:'JSW Steel Ltd', sector:'industrial', stage:'identification', value:175000000, probability:25, expectedClose:'2026-12-15' },
    { id:6, projectName:'Neyveli Lignite Handling E&I', clientName:'NLC India Ltd', sector:'mining', stage:'value-proposition', value:510000000, probability:45, expectedClose:'2026-11-30' },
    { id:7, projectName:'Mundra FGD Electrical Package', clientName:'Tata Power', sector:'power', stage:'closed', value:340000000, probability:0, expectedClose:'2026-04-30' },
    { id:8, projectName:'Coal India Washery E&I', clientName:'Coal India Ltd', sector:'mining', stage:'qualification', value:220000000, probability:35, expectedClose:'2026-09-10' },
  ];
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#f5a623' },
};

const SECTOR_COLORS: Record<string, string> = { power: '#00e676', mining: '#f5a623', industrial: '#ff6b6b' };
const STAGE_COLORS: Record<string, string> = {
  identification: '#5a6878', qualification: '#00d4ff', 'value-proposition': '#a78bfa',
  'price-quote': '#f5a623', negotiation: '#ff6b6b', closed: '#00e676',
};
const STAGE_LABELS: Record<string, string> = {
  identification: 'Identification', qualification: 'Qualification', 'value-proposition': 'Value Proposition',
  'price-quote': 'Price Quote', negotiation: 'Negotiation', closed: 'Closed Won',
};
const SECTOR_LABELS: Record<string, string> = { power: 'Power', mining: 'Mining', industrial: 'Industrial' };

function fmtCr(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + (n ?? 0).toLocaleString('en-IN');
}

function fmtMonth(d: Date): string {
  return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

function getQuarter(month: number): number { return Math.ceil((month + 1) / 3); }

interface Opportunity {
  id: number;
  name: string;
  client: string;
  sector: string;
  stage: string;
  value: number;
  probability: number;
  expectedClose: Date;
  weightedValue: number;
}

export default function SalesRevenueForecast() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('weightedValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterSector, setFilterSector] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/sales/opportunities')
      .then(res => res.json())
      .then(json => {
        let data = json.data || [];
        if (!json.success || data.length === 0) {
          data = generateMockRevenueData();
          toast.info('Showing sample data — API unavailable');
        }
        const mapped: Opportunity[] = (data).map((r: any, i: number) => ({
          id: r.id ?? i + 1,
          name: r.projectName,
          client: r.clientName,
          sector: r.sector,
          stage: r.stage,
          value: r.value,
          probability: r.probability,
          expectedClose: new Date(r.expectedClose),
          weightedValue: Math.round(r.value * r.probability / 100),
        }));
        setOpportunities(mapped);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch opportunities:', err);
        const data = generateMockRevenueData();
        const mapped: Opportunity[] = data.map((r: any, i: number) => ({
          id: r.id ?? i + 1,
          name: r.projectName,
          client: r.clientName,
          sector: r.sector,
          stage: r.stage,
          value: r.value,
          probability: r.probability,
          expectedClose: new Date(r.expectedClose),
          weightedValue: Math.round(r.value * r.probability / 100),
        }));
        setOpportunities(mapped);
        setLoading(false);
        toast.info('Showing sample data — API unavailable');
      });
  }, []);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let items = [...opportunities];
    if (search) { const q = search.toLowerCase(); items = items.filter(o => o.name.toLowerCase().includes(q) || o.client.toLowerCase().includes(q)); }
    if (filterSector) items = items.filter(o => o.sector === filterSector);
    if (filterStage) items = items.filter(o => o.stage === filterStage);
    items.sort((a, b) => {
      let va: any = (a as any)[sortKey];
      let vb: any = (b as any)[sortKey];
      if (sortKey === 'expectedClose') { va = a.expectedClose.getTime(); vb = b.expectedClose.getTime(); }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return items;
  }, [search, sortKey, sortDir, filterSector, filterStage, opportunities]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const kpis = useMemo(() => {
    const totalPipeline = opportunities.reduce((s, o) => s + o.value, 0);
    const weightedPipeline = opportunities.reduce((s, o) => s + o.weightedValue, 0);
    const now = new Date();
    const q = getQuarter(now.getMonth());
    const year = now.getFullYear();
    const qStart = new Date(year, (q - 1) * 3, 1);
    const qEnd = new Date(year, q * 3, 0);
    const expectedCloseQ = opportunities
      .filter(o => o.expectedClose >= qStart && o.expectedClose <= qEnd && o.stage !== 'closed')
      .reduce((s, o) => s + o.weightedValue, 0);
    const submittedCount = opportunities.filter(o => o.stage !== 'identification').length;
    const wonCount = opportunities.filter(o => o.stage === 'closed').length;
    const conversionRate = submittedCount > 0 ? (wonCount / submittedCount) * 100 : 0;
    return { totalPipeline, weightedPipeline, expectedCloseQ, conversionRate };
  }, [opportunities]);

  const chartData = useMemo(() => {
    const months: { label: string; power: number; mining: number; industrial: number }[] = [];
    const base = new Date(2026, 6, 1);
    for (let i = 0; i < 6; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const label = fmtMonth(d);
      const power = opportunities.filter(o => o.sector === 'power' && o.expectedClose.getMonth() === d.getMonth() && o.expectedClose.getFullYear() === d.getFullYear()).reduce((s, o) => s + o.weightedValue, 0);
      const mining = opportunities.filter(o => o.sector === 'mining' && o.expectedClose.getMonth() === d.getMonth() && o.expectedClose.getFullYear() === d.getFullYear()).reduce((s, o) => s + o.weightedValue, 0);
      const industrial = opportunities.filter(o => o.sector === 'industrial' && o.expectedClose.getMonth() === d.getMonth() && o.expectedClose.getFullYear() === d.getFullYear()).reduce((s, o) => s + o.weightedValue, 0);
      months.push({ label, power: Math.round(power / 100000), mining: Math.round(mining / 100000), industrial: Math.round(industrial / 100000) });
    }
    return months;
  }, [opportunities]);

  const sectorConversion = useMemo(() => {
    const sectors = ['power', 'mining', 'industrial'];
    return sectors.map(s => {
      const total = opportunities.filter(o => o.sector === s && o.stage !== 'identification').length;
      const won = opportunities.filter(o => o.sector === s && o.stage === 'closed').length;
      const rate = total > 0 ? (won / total) * 100 : 0;
      const targets: Record<string, number> = { power: 35, mining: 25, industrial: 40 };
      return { sector: s, label: SECTOR_LABELS[s], rate: Math.round(rate * 10) / 10, target: targets[s] };
    });
  }, [opportunities]);

  const sectorWeighted = useMemo(() => {
    const sectors = ['power', 'mining', 'industrial'];
    const total = opportunities.reduce((s, o) => s + o.weightedValue, 0);
    return sectors.map(s => {
      const val = opportunities.filter(o => o.sector === s).reduce((s2, o) => s2 + o.weightedValue, 0);
      return { sector: s, label: SECTOR_LABELS[s], value: val, pct: total > 0 ? (val / total) * 100 : 0, color: SECTOR_COLORS[s] };
    });
  }, [opportunities]);

  const stageDistribution = useMemo(() => {
    const stages = ['identification', 'qualification', 'value-proposition', 'price-quote', 'negotiation', 'closed'];
    const maxVal = opportunities.reduce((s, o) => s + o.value, 0);
    return stages.map(st => {
      const items = opportunities.filter(o => o.stage === st);
      const val = items.reduce((s, o) => s + o.value, 0);
      return { stage: st, label: STAGE_LABELS[st], value: val, count: items.length, pct: maxVal > 0 ? (val / maxVal) * 100 : 0, color: STAGE_COLORS[st] };
    });
  }, [opportunities]);

  const SORTABLE = (key: string, label: string) => (
    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] cursor-pointer select-none hover:text-[#f5a623]" onClick={() => toggleSort(key)}>
      <div className="flex items-center gap-1">{label}{sortKey === key && <ArrowUpDown size={10} className={sortDir === 'asc' ? 'rotate-180' : ''} />}</div>
    </th>
  );

  return (
    <div className="space-y-4 p-6 text-[#e2e8f0]">
      {/* Header */}
      <div className="h-28 bg-gradient-to-r from-[#f5a623]/10 to-[#1e2630] border-b border-[#252e3a] relative overflow-hidden rounded-xl mb-6">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 w-64 h-64 bg-[#f5a623] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-[#f5a623] rounded-full blur-3xl" />
        </div>
        <div className="relative h-full flex items-center px-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5a623] tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>REVENUE FORECAST</h1>
            <p className="text-[#8899aa] text-sm tracking-wider">Sales & Business Development • Pipeline Projections</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[#f5a623] text-sm font-semibold">Loading opportunities...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-[#1a1414] border border-[#ff6b6b]/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-[#ff6b6b] text-sm">
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}

      {!loading && !error && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Pipeline</div>
              <div className="text-[22px] font-bold leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCr(kpis.totalPipeline)}</div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#00d4ff]/10"><DollarSign size={18} className="text-[#00d4ff]" /></div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-[#00e676]"><TrendingUp size={10} />12.3% vs last quarter</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Weighted Pipeline</div>
              <div className="text-[22px] font-bold leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCr(kpis.weightedPipeline)}</div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#f5a623]/10"><BarChart3 size={18} className="text-[#f5a623]" /></div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-[#f5a623]"><TrendingUp size={10} />8.7% vs last quarter</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Expected Close (Q)</div>
              <div className="text-[22px] font-bold leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCr(kpis.expectedCloseQ)}</div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#a78bfa]/10"><Target size={18} className="text-[#a78bfa]" /></div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-[#a78bfa]"><TrendingUp size={10} />5.2% vs target</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Conversion Rate</div>
              <div className="text-[22px] font-bold leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{kpis.conversionRate.toFixed(1)}%</div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#00e676]/10"><PieChart size={18} className="text-[#00e676]" /></div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-[#00e676]"><TrendingUp size={10} />+2.1% improvement</div>
        </div>
      </div>

      {/* Monthly Revenue Forecast Chart */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-[#f5a623]" />
          <span className="text-[13px] font-semibold text-[#e2e8f0]">Monthly Revenue Forecast (Weighted)</span>
          <span className="text-[10px] text-[#5a6878] ml-auto">Values in ₹ Cr</span>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={28} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252e3a" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8899aa', fontSize: 9 }} width={44} tickFormatter={(v: number) => v + 'Cr'} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, name: string) => [v + ' Cr', SECTOR_LABELS[name] || name]} cursor={{ fill: '#ffffff08' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#8899aa' }} formatter={(value: string) => <span style={{ color: '#8899aa' }}>{SECTOR_LABELS[value] || value}</span>} />
              <Bar dataKey="power" name="power" stackId="a" fill="#00e676" radius={[0, 0, 0, 0]} />
              <Bar dataKey="mining" name="mining" stackId="a" fill="#f5a623" radius={[0, 0, 0, 0]} />
              <Bar dataKey="industrial" name="industrial" stackId="a" fill="#ff6b6b" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Rate Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {sectorConversion.map(sc => (
          <div key={sc.sector} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: SECTOR_COLORS[sc.sector] + '20' }}>
                {sc.sector === 'power' ? <Zap size={16} style={{ color: SECTOR_COLORS[sc.sector] }} /> :
                 sc.sector === 'mining' ? <Pickaxe size={16} style={{ color: SECTOR_COLORS[sc.sector] }} /> :
                 <Cog size={16} style={{ color: SECTOR_COLORS[sc.sector] }} />}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#e2e8f0]">{sc.label} Sector</div>
                <div className="text-[20px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: SECTOR_COLORS[sc.sector] }}>{sc.rate}%</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#5a6878]">Actual</span>
                <span className="text-[#e2e8f0] font-mono">{sc.rate}%</span>
              </div>
              <div className="w-full h-[6px] bg-[#0a0d12] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(sc.rate, 100)}%`, background: SECTOR_COLORS[sc.sector] }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#5a6878]">Target</span>
                <span className="text-[#f5a623] font-mono">{sc.target}%</span>
              </div>
              <div className="w-full h-[6px] bg-[#0a0d12] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#f5a623]/40" style={{ width: `${Math.min(sc.target, 100)}%` }} />
              </div>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-medium" style={{ color: sc.rate >= sc.target ? '#00e676' : '#ff6b6b' }}>
                {sc.rate >= sc.target ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {sc.rate >= sc.target ? `${(sc.rate - sc.target).toFixed(1)}% above target` : `${(sc.target - sc.rate).toFixed(1)}% below target`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Table */}
      <div className="vc-panel mb-6">
        <div className="vc-panel-header">
          <Briefcase size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Pipeline Opportunities</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span>
          <div className="ml-2 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search opportunities..." className="bg-[#0f1318] border border-[#252e3a] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-[180px]" />
          </div>
          <div className="ml-2 relative">
            <select value={filterSector} onChange={e => { setFilterSector(e.target.value); setPage(1); }} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none cursor-pointer">
              <option value="">All Sectors</option>
              <option value="power">Power</option>
              <option value="mining">Mining</option>
              <option value="industrial">Industrial</option>
            </select>
            <Filter size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
          </div>
          <div className="ml-2 relative">
            <select value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1); }} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none cursor-pointer">
              <option value="">All Stages</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {SORTABLE('name', 'Opportunity')}
              {SORTABLE('client', 'Client')}
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Stage</th>
              {SORTABLE('value', 'Value')}
              {SORTABLE('probability', 'Win Prob')}
              {SORTABLE('weightedValue', 'Weighted')}
              {SORTABLE('expectedClose', 'Close Date')}
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Sector</th>
              <th className="w-[8%]"></th>
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {pageItems.map(o => (
                <tr key={o.id} className="hover:bg-[#141920]">
                  <td className="py-2.5 px-3 text-[#f5a623] font-medium cursor-pointer hover:underline">{o.name}</td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{o.client}</td>
                  <td className="py-2.5 px-3">
                    <span className="vc-badge text-[10px]" style={{ background: STAGE_COLORS[o.stage] + '20', color: STAGE_COLORS[o.stage], border: '1px solid ' + STAGE_COLORS[o.stage] + '30' }}>
                      {STAGE_LABELS[o.stage]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#00e676] font-mono font-medium">{fmtCr(o.value)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e2e8f0] font-mono w-8">{o.probability}%</span>
                      <div className="w-16 h-[5px] bg-[#0a0d12] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${o.probability}%`, background: o.probability >= 75 ? '#00e676' : o.probability >= 40 ? '#f5a623' : '#5a6878' }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[#a78bfa] font-mono font-medium">{fmtCr(o.weightedValue)}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono whitespace-nowrap">{fmtMonth(o.expectedClose)}</td>
                  <td className="py-2.5 px-3">
                    <span className="vc-badge text-[10px]" style={{ background: SECTOR_COLORS[o.sector] + '20', color: SECTOR_COLORS[o.sector], border: '1px solid ' + SECTOR_COLORS[o.sector] + '30' }}>
                      {SECTOR_LABELS[o.sector]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <button className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" onClick={() => toast.info(`Viewing: ${o.name}`)}><Eye size={13} /></button>
                      <button className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" onClick={() => toast.info(`Editing: ${o.name}`)}><Pencil size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No matching opportunities</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[#252e3a] text-[11px] text-[#8899aa] flex-wrap">
          <span className="font-mono">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-0.5">
            <button className="p-1.5 rounded text-[#8899aa] hover:text-[#f5a623] hover:bg-[#252e3a] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8899aa]" onClick={() => setPage(1)} disabled={page <= 1}>«</button>
            <button className="p-1.5 rounded text-[#8899aa] hover:text-[#f5a623] hover:bg-[#252e3a] disabled:opacity-30" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹</button>
            <span className="px-2 font-mono text-[#e2e8f0]">{page} / {totalPages}</span>
            <button className="p-1.5 rounded text-[#8899aa] hover:text-[#f5a623] hover:bg-[#252e3a] disabled:opacity-30" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>›</button>
            <button className="p-1.5 rounded text-[#8899aa] hover:text-[#f5a623] hover:bg-[#252e3a] disabled:opacity-30" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weighted Value by Sector */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-[#f5a623]" />
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Weighted Value by Sector</span>
          </div>
          <div className="space-y-4">
            {sectorWeighted.map(sw => (
              <div key={sw.sector}>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: sw.color }} />
                    <span className="text-[#e2e8f0]">{sw.label}</span>
                  </div>
                  <span className="text-[#e2e8f0] font-mono font-semibold">{fmtCr(sw.value)}</span>
                </div>
                <div className="w-full h-3 bg-[#0a0d12] rounded-full overflow-hidden relative">
                  {sectorWeighted.map((sw2, idx) => {
                    if (sw2.sector === sw.sector) return <div key={idx} className="absolute inset-0 h-full rounded-full" style={{ width: `${sw2.pct}%`, background: sw2.color, left: sectorWeighted.slice(0, idx).reduce((s, x) => s + x.pct, 0) + '%', zIndex: idx === 0 ? 1 : 0 }} />;
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Stage Distribution */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#f5a623]" />
            <span className="text-[13px] font-semibold text-[#e2e8f0]">Value by Stage</span>
          </div>
          <div className="space-y-3">
            {stageDistribution.map(sd => (
              <div key={sd.stage}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: sd.color }} />
                    <span className="text-[#e2e8f0]">{sd.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#5a6878] text-[10px]">{sd.count} opp{sd.count !== 1 ? 's' : ''}</span>
                    <span className="text-[#e2e8f0] font-mono text-[10px]">{fmtCr(sd.value)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#0a0d12] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${sd.pct}%`, background: sd.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
