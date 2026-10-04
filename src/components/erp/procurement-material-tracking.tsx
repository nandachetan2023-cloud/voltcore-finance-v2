'use client';
import { useState, useEffect, useMemo } from 'react';
import { Package, Truck, AlertTriangle, ClipboardCheck, Clock, ArrowRight, Search, Filter, ExternalLink, Send, CalendarDays, Building2, Layers, Box, Plus, Pencil, Trash2, FileText, List, LayoutDashboard, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface MaterialItem {
  id: number;
  poNo: string;
  vendor: string;
  project: string;
  site: string;
  material: string;
  category: string;
  unit: string;
  qtyRequired: number;
  qtyStock: number;
  qtyInTransit: number;
  scheduledDate: string;
  expectedDate: string;
  status: 'On-Time' | 'Overdue' | 'Upcoming';
  daysOverdue: number;
}

const MATERIAL_COLUMNS: ExportColumn<MaterialItem>[] = [
  { header: 'PO No', accessor: 'poNo' },
  { header: 'Material', accessor: 'material' },
  { header: 'Category', accessor: 'category' },
  { header: 'Vendor', accessor: 'vendor' },
  { header: 'Project', accessor: 'project' },
  { header: 'Site', accessor: 'site' },
  { header: 'Unit', accessor: 'unit' },
  { header: 'Qty Required', accessor: 'qtyRequired' },
  { header: 'Qty in Stock', accessor: 'qtyStock' },
  { header: 'Qty in Transit', accessor: 'qtyInTransit' },
  { header: 'Scheduled Date', accessor: (r) => r.scheduledDate?.split('T')[0] ?? '' },
  { header: 'Expected Date', accessor: (r) => r.expectedDate?.split('T')[0] ?? '' },
  { header: 'Days Overdue', accessor: 'daysOverdue' },
  { header: 'Status', accessor: 'status' },
];

const MATERIAL_IMPORT_FIELDS: ImportField[] = [
  { key: 'poNo', label: 'PO No', required: true },
  { key: 'material', label: 'Material', required: true },
  { key: 'category', label: 'Category' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'project', label: 'Project' },
  { key: 'site', label: 'Site' },
  { key: 'unit', label: 'Unit' },
  { key: 'qtyRequired', label: 'Qty Required', type: 'number' },
  { key: 'qtyStock', label: 'Qty in Stock', type: 'number' },
  { key: 'qtyInTransit', label: 'Qty in Transit', type: 'number' },
  { key: 'scheduledDate', label: 'Scheduled Date', type: 'date' },
  { key: 'expectedDate', label: 'Expected Date', type: 'date' },
  { key: 'status', label: 'Status' },
];
const MATERIAL_SAMPLE_ROW = { poNo: 'PO-001', material: 'Circuit Breaker', category: 'Electrical', vendor: 'Siemens', project: 'Godda Unit 5', site: 'TPP Adani Godda', unit: 'Nos', qtyRequired: 10, qtyStock: 2, qtyInTransit: 8, scheduledDate: '2026-02-15', expectedDate: '2026-02-20', status: 'In Transit' };

function generateMockMaterialItems(): MaterialItem[] {
  const now = new Date(); const d = (off: number) => new Date(now.getTime() + off * 86400000).toISOString().split('T')[0];
  return [
    { id:1, poNo:'PO-2026-001', vendor:'Tata Steel Ltd.', project:'BALCO', site:'Main Plant', material:'Structural Steel ISMB 300', category:'Structural Steel', unit:'MT', qtyRequired:500, qtyStock:75, qtyInTransit:200, scheduledDate:d(-30), expectedDate:d(-15), status:'Overdue', daysOverdue:15 },
    { id:2, poNo:'PO-2026-002', vendor:'Ultratech Cement', project:'BALCO', site:'Cooling Towers', material:'OPC 53 Grade Cement', category:'Cement', unit:'bags', qtyRequired:2500, qtyStock:800, qtyInTransit:1200, scheduledDate:d(-10), expectedDate:d(5), status:'On-Time', daysOverdue:0 },
    { id:3, poNo:'PO-2026-003', vendor:'KEC International', project:'NTPC', site:'Switchyard', material:'HV Power Cable 33kV 3Cx400sqmm', category:'HV Cables', unit:'m', qtyRequired:2000, qtyStock:0, qtyInTransit:2000, scheduledDate:d(10), expectedDate:d(20), status:'Upcoming', daysOverdue:0 },
    { id:4, poNo:'PO-2026-004', vendor:'Siemens Ltd.', project:'NTPC', site:'Turbine Building', material:'Power Transformer 50 MVA', category:'Transformers', unit:'units', qtyRequired:2, qtyStock:0, qtyInTransit:0, scheduledDate:d(30), expectedDate:d(45), status:'Upcoming', daysOverdue:0 },
    { id:5, poNo:'PO-2026-005', vendor:'Jindal Pipes', project:'Hindalco', site:'Boiler Area', material:'CS ERW Pipe 12" Sch40', category:'Pipes', unit:'m', qtyRequired:1500, qtyStock:400, qtyInTransit:600, scheduledDate:d(-20), expectedDate:d(-5), status:'Overdue', daysOverdue:5 },
    { id:6, poNo:'PO-2026-006', vendor:'ABB India', project:'Hindalco', site:'Main Plant', material:'11kV Switchgear Panel', category:'Switchgear', unit:'sets', qtyRequired:5, qtyStock:1, qtyInTransit:2, scheduledDate:d(-5), expectedDate:d(10), status:'On-Time', daysOverdue:0 },
    { id:7, poNo:'PO-2026-007', vendor:'Schneider Electric', project:'Coal India', site:'Coal Handling', material:'LV Control Panel MCC', category:'Control Panels', unit:'pcs', qtyRequired:8, qtyStock:2, qtyInTransit:4, scheduledDate:d(5), expectedDate:d(20), status:'Upcoming', daysOverdue:0 },
    { id:8, poNo:'PO-2026-008', vendor:'Prysmian Group', project:'Coal India', site:'Switchyard', material:'33kV Cable Trays Perforated', category:'Cable Trays', unit:'m', qtyRequired:1200, qtyStock:300, qtyInTransit:500, scheduledDate:d(-15), expectedDate:d(0), status:'On-Time', daysOverdue:0 },
  ];
}

const PROJECTS = ['BALCO', 'NTPC', 'Hindalco', 'Coal India', 'JSW'];
const CATEGORIES = ['Structural Steel', 'Cement', 'HV Cables', 'Transformers', 'Pipes', 'Valves', 'Motors', 'Switchgear', 'Control Panels', 'Cable Trays', 'Conduits', 'Earthing Materials'];
const UNITS: Record<string, string> = {
  'Structural Steel': 'MT', 'Cement': 'bags', 'HV Cables': 'm', 'Transformers': 'units',
  'Pipes': 'm', 'Valves': 'pcs', 'Motors': 'units', 'Switchgear': 'sets',
  'Control Panels': 'pcs', 'Cable Trays': 'm', 'Conduits': 'm', 'Earthing Materials': 'sets',
};
const VENDORS = ['Tata Steel Ltd.', 'Ultratech Cement', 'KEC International', 'Siemens Ltd.', 'Jindal Pipes', 'Forbes & Company', 'ABB India', 'Schneider Electric', 'L&T Electrical', 'Prysmian Group', 'Bharat Bijlee', 'Crompton Greaves', 'Ajay Industrial', 'Havells India', 'Godrej E&I', 'Ratnam Steel', 'Kirloskar Brothers', 'Reliance Pipes'];
const SITES = ['Main Plant', 'Switchyard', 'Coal Handling', 'Cooling Towers', 'Workshop', 'Turbine Building', 'Boiler Area', 'Raw Water Intake'];

const DAY = 86400000;

function fmtCr(n: number) { if (n >= 10000000) return (n / 10000000).toFixed(2) + ' Cr'; if (n >= 100000) return (n / 100000).toFixed(2) + ' L'; return (n ?? 0).toLocaleString('en-IN'); }

function computeStatus(scheduledDate: string, expectedDate: string, qtyStock: number, qtyRequired: number): { status: 'On-Time' | 'Overdue' | 'Upcoming'; daysOverdue: number } {
  const now = new Date();
  const exp = new Date(expectedDate);
  const diff = Math.floor((now.getTime() - exp.getTime()) / DAY);
  if (diff > 0 && qtyStock < qtyRequired) return { status: 'Overdue', daysOverdue: diff };
  const sched = new Date(scheduledDate);
  if (sched > now) return { status: 'Upcoming', daysOverdue: 0 };
  return { status: 'On-Time', daysOverdue: 0 };
}

interface FormState {
  poNo: string; vendor: string; project: string; site: string; material: string;
  category: string; unit: string; qtyRequired: number; qtyStock: number;
  qtyInTransit: number; scheduledDate: string; expectedDate: string;
}

const EMPTY_FORM: FormState = {
  poNo: '', vendor: '', project: PROJECTS[0], site: SITES[0], material: '',
  category: CATEGORIES[0], unit: UNITS[CATEGORIES[0]], qtyRequired: 0, qtyStock: 0,
  qtyInTransit: 0, scheduledDate: '', expectedDate: '',
};

export default function ProcurementMaterialTracking() {
  const [records, setRecords] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MaterialItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialItem | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [siteFilter, setSiteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetch('/api/procurement/material-tracking')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.data && data.data.length > 0) {
            setRecords(data.data);
          } else {
            setRecords(generateMockMaterialItems());
            toast.info('Showing sample data — API unavailable');
          }
        } else {
          setRecords(generateMockMaterialItems());
          toast.info('Showing sample data — API unavailable');
        }
      })
      .catch(() => {
        setRecords(generateMockMaterialItems());
        toast.info('Showing sample data — API unavailable');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredList = useMemo(() => {
    let arr = [...records];
    if (projectFilter !== 'All') arr = arr.filter(r => r.project === projectFilter);
    if (siteFilter !== 'All') arr = arr.filter(r => r.site === siteFilter);
    if (statusFilter !== 'All') arr = arr.filter(r => r.status === statusFilter);
    if (search.trim()) { const q = search.trim().toLowerCase(); arr = arr.filter(r => r.material.toLowerCase().includes(q) || r.poNo.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q)); }
    return arr;
  }, [records, projectFilter, siteFilter, statusFilter, search]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (r: MaterialItem) => {
    setEditTarget(r);
    setForm({ poNo: r.poNo, vendor: r.vendor, project: r.project, site: r.site, material: r.material, category: r.category, unit: r.unit, qtyRequired: r.qtyRequired, qtyStock: r.qtyStock, qtyInTransit: r.qtyInTransit, scheduledDate: r.scheduledDate, expectedDate: r.expectedDate });
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!form.poNo || !form.vendor || !form.material) { toast.error('PO#, Vendor, and Material are required'); return; }
    const { status, daysOverdue } = computeStatus(form.scheduledDate, form.expectedDate, form.qtyStock, form.qtyRequired);
    try {
      if (editTarget) {
        const res = await fetch(`/api/procurement/material-tracking/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, status, daysOverdue }),
        });
        const data = await res.json();
        if (data.success) {
          setRecords(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...form, status, daysOverdue } : r));
          toast.success(`Material entry ${form.poNo} updated`);
        } else {
          toast.error(data.message || 'Failed to update');
          return;
        }
      } else {
        const res = await fetch('/api/procurement/material-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, status, daysOverdue }),
        });
        const data = await res.json();
        if (data.success) {
          setRecords(prev => [...prev, data.data]);
          toast.success(`Material entry ${form.poNo} created`);
        } else {
          toast.error(data.message || 'Failed to create');
          return;
        }
      }
    } catch (err) {
      toast.error('Operation failed');
      return;
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/procurement/material-tracking/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        toast.success(`Entry ${deleteTarget.poNo} deleted`);
      } else {
        toast.error(data.message || 'Failed to delete');
        setDeleteOpen(false);
        setDeleteTarget(null);
        return;
      }
    } catch (err) {
      toast.error('Delete failed');
      setDeleteOpen(false);
      setDeleteTarget(null);
      return;
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  // ── Derived dashboard data (from live `records`) ──
  const totalPOs = records.length;
  const onTimeItems = records.filter(r => r.status === 'On-Time');
  const overdueItems = records.filter(r => r.status === 'Overdue');
  const upcomingItems = records.filter(r => r.status === 'Upcoming');
  const onTimePercent = totalPOs ? Math.round((onTimeItems.length / totalPOs) * 100) : 0;
  const totalStockQty = records.reduce((s, r) => s + r.qtyStock, 0);
  const totalRequiredQty = records.reduce((s, r) => s + r.qtyRequired, 0);
  const totalInTransit = records.reduce((s, r) => s + r.qtyInTransit, 0);
  const poCount = records.length;
  const stockItems = records.length;

  const byProject = useMemo(() => {
    const map = new Map<string, MaterialItem[]>();
    records.forEach(r => { if (!map.has(r.project)) map.set(r.project, []); map.get(r.project)!.push(r); });
    return Array.from(map.entries()).map(([project, items]) => ({
      project, items, totalReq: items.reduce((s, i) => s + i.qtyRequired, 0), totalStock: items.reduce((s, i) => s + i.qtyStock, 0), totalTransit: items.reduce((s, i) => s + i.qtyInTransit, 0),
      overdueCount: items.filter(i => i.status === 'Overdue').length,
    }));
  }, [records]);

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="vc-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 size={15} className="animate-spin text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Loading Material Tracking...</span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full bg-[#1a2028]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vc-panel p-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertTriangle size={24} className="text-[#ff3d3d] mb-2" />
          <span className="text-[14px] font-semibold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Failed to load data</span>
          <p className="text-[11px] text-[#8899aa] mt-1 mb-4">{error}</p>
          <button onClick={() => { setLoading(true); setError(null); fetch('/api/procurement/material-tracking').then(res => res.json()).then(data => { if (data.success) setRecords(data.data); else setError('Failed to load material tracking data'); }).catch(err => setError(err.message)).finally(() => setLoading(false)); }} className="px-3 py-1.5 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[11px] font-semibold hover:bg-[#e8991a]">Retry</button>
        </div>
      </div>
    );
  }

  if (importOpen) {
    return (
      <ImportWizard
        title="Material Tracking"
        fields={MATERIAL_IMPORT_FIELDS}
        keyField="poNo"
        existingKeys={new Set()}
        commitEndpoint="/api/procurement/material-tracking/import"
        sampleRow={MATERIAL_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
    );
  }

  // ── Render ──
  return (
    <div className="space-y-4 p-6">

      {/* ── Panel ── */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Package size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Material Tracking</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length} items</span>
          <div className="ml-2 flex gap-1 bg-[#0f1318] rounded-lg p-0.5 border border-[#252e3a]">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${viewMode === 'list' ? 'bg-[#f5a623] text-[#0a0d12]' : 'text-[#8899aa] hover:text-[#e2e8f0]'}`}><List size={13} className="inline mr-1" />List</button>
            <button onClick={() => setViewMode('dashboard')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-[#f5a623] text-[#0a0d12]' : 'text-[#8899aa] hover:text-[#e2e8f0]'}`}><LayoutDashboard size={13} className="inline mr-1" />Dashboard</button>
          </div>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={MATERIAL_COLUMNS} filename="procurement-material-tracking" />
          <button onClick={openCreate} className="vc-btn-primary ml-2 flex items-center gap-1.5"><Plus size={13} /> New Entry</button>
        </div>

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <>
            <div className="px-3 py-2 border-b border-[#252e3a] flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px] max-w-[240px]"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material, PO, vendor..." className="w-full bg-[#0f1318] border border-[#252e3a] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" /></div>
              <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"><option value="All">All Projects</option>{PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"><option value="All">All Sites</option>{SITES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none"><option value="All">All Status</option><option value="Overdue">Overdue</option><option value="On-Time">On-Time</option><option value="Upcoming">Upcoming</option></select>
            </div>
            <div className="overflow-x-auto">
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                    {['PO#', 'Vendor', 'Project', 'Site', 'Material', 'Category', 'Qty Req', 'Stock', 'In-Transit', 'Status', 'Actions'].map(h =>
                      <th key={h} className="text-left py-2 px-2.5 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                    )}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1a2028]">
                    {filteredList.map(r => (
                      <tr key={r.id} className="hover:bg-[#141920]">
                        <td className="py-2 px-2.5 text-[#f5a623] font-mono">{r.poNo}</td>
                        <td className="py-2 px-2.5 text-[#e2e8f0]">{r.vendor}</td>
                        <td className="py-2 px-2.5 text-[#8899aa]">{r.project}</td>
                        <td className="py-2 px-2.5 text-[#8899aa]">{r.site}</td>
                        <td className="py-2 px-2.5 text-[#e2e8f0] max-w-[180px] truncate" title={r.material}>{r.material}</td>
                        <td className="py-2 px-2.5 text-[#8899aa]">{r.category}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-[#e2e8f0]">{r.qtyRequired} {r.unit}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-[#e2e8f0]">{r.qtyStock} {r.unit}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-[#e2e8f0]">{r.qtyInTransit} {r.unit}</td>
                        <td className="py-2 px-2.5"><span className={`vc-badge ${r.status === 'On-Time' ? 'bg-[#00e676]/15 text-[#00e676]' : r.status === 'Overdue' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#00d4ff]/15 text-[#00d4ff]'}`}>{r.status}{r.status === 'Overdue' ? ` (${r.daysOverdue}d)` : ''}</span></td>
                        <td className="py-2 px-2.5"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button><button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button></div></td>
                      </tr>
                    ))}
                    {filteredList.length === 0 && <tr><td colSpan={11} className="py-10 text-center text-[#5a6878] text-[12px]">No material entries match the current filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── DASHBOARD VIEW ── */}
        {viewMode === 'dashboard' && (
          <div className="space-y-4 p-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total POs Monitored</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{poCount}</div></div>
              <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">On-Time Deliveries</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{onTimePercent}%</div></div>
              <div className="vc-stat-card relative overflow-hidden cursor-pointer" onClick={() => document.getElementById('overdue-section')?.scrollIntoView({ behavior: 'smooth' })}><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue POs</div><div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{overdueItems.length}</div></div>
              <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Site Stock Items</div><div className="text-[20px] font-bold text-[#a78bfa]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{stockItems}</div></div>
            </div>

            {/* Status summary pills */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full bg-[#00e676]" /><span className="text-[#e2e8f0]">On-Time</span><span className="text-[#5a6878] font-mono">({onTimeItems.length})</span></div>
              <div className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full bg-[#00d4ff]" /><span className="text-[#e2e8f0]">Upcoming</span><span className="text-[#5a6878] font-mono">({upcomingItems.length})</span></div>
              <div className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full bg-[#ff3d3d]" /><span className="text-[#e2e8f0]">Overdue</span><span className="text-[#5a6878] font-mono">({overdueItems.length})</span></div>
              <div className="flex items-center gap-1.5 text-[11px] ml-auto"><span className="text-[#5a6878]">In Transit:</span><span className="text-[#f5a623] font-mono font-semibold">{(totalInTransit ?? 0).toLocaleString('en-IN')}</span></div>
            </div>

            {/* Overdue PO Alerts */}
            {overdueItems.length > 0 && (
              <div id="overdue-section" className="bg-[#ff3d3d]/5 border border-[#ff3d3d]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3"><AlertTriangle size={15} className="text-[#ff3d3d]" /><span className="text-[12px] font-bold text-[#ff3d3d]">Overdue PO Alerts</span></div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 10).map(i => (
                    <div key={i.id} className="flex items-center justify-between text-[11px] bg-[#0f1318] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2"><span className="text-[#f5a623] font-mono">{i.poNo}</span><span className="text-[#8899aa]">—</span><span className="text-[#e2e8f0] max-w-[220px] truncate">{i.material}</span><span className="text-[#5a6878]">({i.project})</span></div>
                      <div className="flex items-center gap-3"><span className="text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{i.daysOverdue}d overdue</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gantt-style Timeline */}
            <div>
              <div className="flex items-center gap-2 mb-2"><Clock size={14} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Delivery Timeline</span></div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] space-y-1">
                  {(() => {
                    const today = new Date();
                    const minDate = new Date(Math.min(...records.map(r => new Date(r.scheduledDate).getTime())));
                    const maxDate = new Date(Math.max(...records.map(r => new Date(r.expectedDate).getTime())));
                    const totalDays = Math.max((maxDate.getTime() - minDate.getTime()) / DAY, 30);
                    const offsetDays = (d: string) => Math.max(((new Date(d).getTime() - minDate.getTime()) / DAY) / totalDays * 100, 0);
                    const durationDays = (s: string, e: string) => Math.max(((new Date(e).getTime() - new Date(s).getTime()) / DAY) / totalDays * 100, 2);
                    return records.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).slice(0, 15).map(r => {
                      const left = offsetDays(r.scheduledDate);
                      const width = durationDays(r.scheduledDate, r.expectedDate);
                      const barColor = r.status === 'Overdue' ? '#ff3d3d' : r.status === 'Upcoming' ? '#00d4ff' : '#00e676';
                      return (
                        <div key={r.id} className="flex items-center gap-2 text-[10px]">
                          <span className="w-[100px] truncate text-right text-[#8899aa]" title={r.material}>{r.material}</span>
                          <div className="flex-1 relative h-4 bg-[#0f1318] rounded">
                            <div className="absolute h-full rounded" style={{ left: `${left}%`, width: `${width}%`, background: barColor, opacity: 0.7 }} />
                            {(() => { const tdOff = ((today.getTime() - minDate.getTime()) / DAY) / totalDays * 100; return tdOff > 0 && tdOff < 100 ? <div className="absolute top-0 w-px h-full bg-[#f5a623] z-10" style={{ left: `${tdOff}%` }} /> : null; })()}
                          </div>
                          <span className="w-[60px] text-right text-[#5a6878]">{r.scheduledDate.slice(5)}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Site Stock Levels */}
            <div>
              <div className="flex items-center gap-2 mb-2"><Building2 size={14} className="text-[#f5a623]" /><span className="text-[12px] font-semibold text-[#e2e8f0]">Site Stock Levels</span></div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr className="bg-[#0f1318]">
                    {['Project', 'Items', 'Required Qty', 'Stock', 'In Transit', 'Shortfall %', 'Overdue'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-[#1a2028]">
                    {byProject.map(p => {
                      const shortfall = p.totalReq > 0 ? Math.round(((p.totalReq - p.totalStock) / p.totalReq) * 100) : 0;
                      return (
                        <tr key={p.project} className="hover:bg-[#141920]">
                          <td className="py-2 px-3 text-[#e2e8f0] font-medium">{p.project}</td>
                          <td className="py-2 px-3 text-[#8899aa]">{p.items.length}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#e2e8f0]">{(p.totalReq ?? 0).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#e2e8f0]">{(p.totalStock ?? 0).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#f5a623]">{(p.totalTransit ?? 0).toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3"><div className="flex items-center gap-2"><div className="flex-1 bg-[#0f1318] h-1.5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${shortfall}%`, background: shortfall > 30 ? '#ff3d3d' : shortfall > 15 ? '#f5a623' : '#00e676' }} /></div><span className={`font-mono w-10 text-right ${shortfall > 30 ? 'text-[#ff3d3d]' : shortfall > 15 ? 'text-[#f5a623]' : 'text-[#00e676]'}`}>{shortfall}%</span></div></td>
                          <td className="py-2 px-3"><span className={`vc-badge ${p.overdueCount > 0 ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : 'bg-[#00e676]/15 text-[#00e676]'}`}>{p.overdueCount > 0 ? `${p.overdueCount} overdue` : 'On track'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit' : 'New'} Material Entry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">PO No</label>
              <input value={form.poNo} onChange={e => setForm({...form, poNo: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Vendor</label>
              <select value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} className="vc-input">
                {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project</label>
              <select value={form.project} onChange={e => setForm({...form, project: e.target.value})} className="vc-input">
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Site</label>
              <select value={form.site} onChange={e => setForm({...form, site: e.target.value})} className="vc-input">
                {SITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Material</label>
              <input value={form.material} onChange={e => setForm({...form, material: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value, unit: UNITS[e.target.value] || ''})} className="vc-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Unit</label>
              <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="vc-input" readOnly />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Qty Required</label>
              <input type="number" value={form.qtyRequired} onChange={e => setForm({...form, qtyRequired: Number(e.target.value)})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Qty in Stock</label>
              <input type="number" value={form.qtyStock} onChange={e => setForm({...form, qtyStock: Number(e.target.value)})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Qty in Transit</label>
              <input type="number" value={form.qtyInTransit} onChange={e => setForm({...form, qtyInTransit: Number(e.target.value)})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduledDate} onChange={e => setForm({...form, scheduledDate: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Expected Date</label>
              <input type="date" value={form.expectedDate} onChange={e => setForm({...form, expectedDate: e.target.value})} className="vc-input" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleFormSubmit} className="vc-btn-primary">{editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Material Entry</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.material}</strong> ({deleteTarget?.poNo})? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
