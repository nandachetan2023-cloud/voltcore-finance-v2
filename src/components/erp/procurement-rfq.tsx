'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Pencil, Trash2, Search, Link, Loader2, CheckCircle, Calendar, X as XIcon,
  TrendingUp, TrendingDown, Clock, Users, Award, BarChart3, ChevronDown, ChevronRight, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface Vendor { id: number; name: string; }
interface RFQLineItem { id: number; description: string; qty: number; unit: string; }
interface VendorBid { vendorId: number; lineItemId: number; unitPrice: number; leadTime: number; notes: string; compliant: boolean; }
interface RFQ { id: number; rfqNo: string; description: string; issueDate: string; responseDeadline: string; project: string; notes: string; status: string; vendorIds?: number[]; lineItems: RFQLineItem[]; bids: VendorBid[]; }

const RFQ_COLUMNS: ExportColumn<RFQ>[] = [
  { header: 'RFQ No', accessor: 'rfqNo' },
  { header: 'Description', accessor: 'description' },
  { header: 'Issue Date', accessor: (r) => r.issueDate?.split('T')[0] ?? '' },
  { header: 'Project', accessor: 'project' },
  { header: 'Vendors Invited', accessor: (r) => vendorIdsOf(r).length },
  { header: 'Responses', accessor: (r) => new Set(r.bids.map(b => b.vendorId)).size },
  { header: 'Response Deadline', accessor: (r) => r.responseDeadline?.split('T')[0] ?? '' },
  { header: 'Status', accessor: 'status' },
];

const RFQ_IMPORT_FIELDS: ImportField[] = [
  { key: 'rfqNo', label: 'RFQ No', required: true },
  { key: 'description', label: 'Description' },
  { key: 'issueDate', label: 'Issue Date', type: 'date' },
  { key: 'responseDeadline', label: 'Response Deadline', type: 'date' },
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
];
const RFQ_SAMPLE_ROW = { rfqNo: 'RFQ-2026-001', description: 'Safety equipment procurement', issueDate: '2026-01-10', responseDeadline: '2026-01-25', project: 'Godda Unit 5', status: 'Sent' };

function generateMockRFQs(): RFQ[] {
  const now = new Date(); const d = (off: number) => new Date(now.getTime() + off * 86400000).toISOString().split('T')[0];
  const li = (id: number, desc: string, qty: number, unit: string): RFQLineItem => ({ id, description: desc, qty, unit });
  const vb = (vid: number, lid: number, price: number, lead: number, notes: string, compliant: boolean): VendorBid => ({ vendorId: vid, lineItemId: lid, unitPrice: price, leadTime: lead, notes, compliant });
  return [
    { id:1, rfqNo:'RFQ-2026-001', description:'Supply of HT Cables 33kV for BALCO Switchyard', issueDate:d(-30), responseDeadline:d(10), project:'BALCO', notes:'Emergency requirement. Urgent delivery needed.', status:'Sent', vendorIds:[1,2,3,5],
      lineItems:[li(1,'33kV XLPE Cable 3Cx400sqmm',2500,'Mtr'),li(2,'33kV XLPE Cable 3Cx240sqmm',1800,'Mtr'),li(3,'Cable Jointing Kit 33kV 3C',25,'Set')],
      bids:[vb(1,1,4850,25,'Standard pricing, 25 days lead',true),vb(1,2,3250,25,'',true),vb(1,3,18500,20,'',true),vb(2,1,5200,30,'Premium quality cable',true),vb(2,2,3500,30,'',true),vb(2,3,22000,25,'Includes installation kit',true),vb(3,1,4750,20,'Bulk discount available',true),vb(3,2,3100,20,'',true),vb(3,3,17500,15,'',true)] },
    { id:2, rfqNo:'RFQ-2026-002', description:'Structural Steel for NTPC Barh Turbine Building', issueDate:d(-20), responseDeadline:d(20), project:'NTPC', notes:'ISMB & ISMC sections as per BOQ.', status:'Responses Received', vendorIds:[1,4,5],
      lineItems:[li(4,'ISMB 300 x 140mm x 44.2kg/m',120,'MT'),li(5,'ISMC 200 x 75mm x 22.1kg/m',85,'MT'),li(6,'ISMB 600 x 210mm x 123kg/m',60,'MT')],
      bids:[vb(4,4,72500,30,'',true),vb(4,5,68500,30,'',true),vb(4,6,76500,35,'',true),vb(1,4,74000,25,'Mild steel grade',true),vb(1,5,70000,25,'',true),vb(1,6,78000,25,'',true),vb(5,4,71000,35,'Economy grade available',true),vb(5,5,67500,35,'',true),vb(5,6,75000,40,'',false)] },
    { id:3, rfqNo:'RFQ-2026-003', description:'Power Transformers for Hindalco Mahan Smelter', issueDate:d(-15), responseDeadline:d(25), project:'Hindalco', notes:'ONAN cooled, 50 MVA, 132/33kV.', status:'Sent', vendorIds:[3,6],
      lineItems:[li(7,'Power Transformer 50 MVA 132/33kV',2,'Nos'),li(8,'Power Transformer 25 MVA 33/11kV',3,'Nos')], bids:[] },
    { id:4, rfqNo:'RFQ-2026-004', description:'Cement OPC 53 Grade for BALCO Foundations', issueDate:d(-45), responseDeadline:d(-10), project:'BALCO', notes:'Bulk supply with silo unloading.', status:'Awarded', vendorIds:[2,5],
      lineItems:[li(9,'OPC 53 Grade Cement Bulk',5000,'MT')],
      bids:[vb(2,9,6250,10,'Bulk supply with 2 silos',true),vb(5,9,6400,12,'Includes logistics',true)] },
    { id:5, rfqNo:'RFQ-2026-005', description:'LV Switchgear & Control Panels for Coal India CHP', issueDate:d(-10), responseDeadline:d(30), project:'Coal India', notes:'As per Drg No. CIL-CHP-E-001 to 005.', status:'Draft', vendorIds:[3,5,6],
      lineItems:[li(10,'LV Main Distribution Panel 2000A',4,'Nos'),li(11,'MCC Panel 630A',8,'Nos'),li(12,'PLC Control Panel',2,'Nos')], bids:[] },
    { id:6, rfqNo:'RFQ-2026-006', description:'Cable Trays & Conduits for JSW Vijayanagar', issueDate:d(-25), responseDeadline:d(5), project:'JSW', notes:'Hot-dip galvanised as per IS 3509.', status:'Draft', vendorIds:[1,4,6],
      lineItems:[li(13,'Perforated Cable Tray 600mm x 150mm',800,'Mtr'),li(14,'Perforated Cable Tray 300mm x 100mm',1200,'Mtr'),li(15,'GI Conduit 50mm dia',3000,'Mtr')],
      bids:[vb(1,13,2850,15,'',true),vb(1,14,1850,15,'',true),vb(1,15,320,15,'',true),vb(4,13,2750,20,'',true),vb(4,14,1750,20,'',true),vb(4,15,310,20,'',true),vb(6,13,3100,12,'Premium quality',true),vb(6,14,2100,12,'',true),vb(6,15,350,12,'',true)] },
  ];
}

const VENDORS: Vendor[] = [
  { id: 1, name: 'ElectroMech Solutions' },
  { id: 2, name: 'PowerTech Industries' },
  { id: 3, name: 'Bharat Heavy Electricals' },
  { id: 4, name: 'MinMet Engineering' },
  { id: 5, name: 'Industrial Supplies Co' },
  { id: 6, name: 'GreenTech Electricals' },
];

const UNITS = ['Nos', 'Mtr', 'Kg', 'Set', 'Lot'];
const STATUSES = ['All', 'Draft', 'Sent', 'Responses Received', 'Awarded', 'Cancelled'];
const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-[#5a6878]/15 text-[#5a6878]',
  Sent: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  'Responses Received': 'bg-[#f5a623]/15 text-[#f5a623]',
  Awarded: 'bg-[#00e676]/15 text-[#00e676]',
  Cancelled: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr); const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function deadlineColor(days: number): string {
  if (days > 14) return 'text-[#00e676]'; if (days >= 7) return 'text-[#f5a623]'; return 'text-[#ff3d3d]';
}

function totalBid(vendorId: number, items: RFQLineItem[], bids: VendorBid[]): number {
  return bids.filter(b => b.vendorId === vendorId).reduce((s, b) => s + b.unitPrice * (items.find(i => i.id === b.lineItemId)?.qty ?? 1), 0);
}

function vendorName(id: number): string { return VENDORS.find(v => v.id === id)?.name ?? 'Unknown'; }

function vendorIdsOf(r: any): number[] {
  if (Array.isArray(r.vendorIds)) return r.vendorIds;
  const fromBids = new Set((r.bids ?? []).map((b: any) => b.vendorId));
  return [...fromBids].filter((v): v is number => typeof v === 'number');
}

function getMinPrice(lineItemId: number, bids: VendorBid[]): number {
  return Math.min(...bids.filter(b => b.lineItemId === lineItemId && b.compliant).map(b => b.unitPrice));
}

function EMPTY_LINE(): RFQLineItem { return { id: Date.now(), description: '', qty: 1, unit: 'Nos' }; }

function formatINR(n: number): string {
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ProcurementRFQ() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRfq, setDetailRfq] = useState<RFQ | null>(null);
  const [editTarget, setEditTarget] = useState<RFQ | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RFQ | null>(null);
  const [poConfirmOpen, setPoConfirmOpen] = useState(false);
  const [poVendorId, setPoVendorId] = useState<number | null>(null);
  const [activeVendorTab, setActiveVendorTab] = useState<number | null>(null);
  const [vendorBidsEdit, setVendorBidsEdit] = useState<VendorBid[]>([]);
  const [detailTab, setDetailTab] = useState<'bids' | 'compare'>('bids');
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch('/api/procurement/rfqs')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          if (json.data && json.data.length > 0) setRfqs(json.data);
          else { setRfqs(generateMockRFQs()); toast.info('Showing sample data — API unavailable'); }
        } else { setRfqs(generateMockRFQs()); toast.info('Showing sample data — API unavailable'); }
      })
      .catch(() => { setRfqs(generateMockRFQs()); toast.info('Showing sample data — API unavailable'); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = rfqs.filter(r => statusFilter === 'All' || r.status === statusFilter);
  const tc = useTableControls(filtered, (r) => r.rfqNo + ' ' + r.description + ' ' + r.project + ' ' + r.status);

  const [form, setForm] = useState({ rfqNo: '', description: '', issueDate: new Date().toISOString().split('T')[0], responseDeadline: '', project: '', notes: '' });
  const [formVendors, setFormVendors] = useState<number[]>([]);
  const [formLines, setFormLines] = useState<RFQLineItem[]>([EMPTY_LINE()]);
  const [formSearch, setFormSearch] = useState('');

  const summary = useMemo(() => ({
    total: rfqs.length, sent: rfqs.filter(r => r.status === 'Sent').length,
    responded: rfqs.filter(r => r.status === 'Responses Received').length,
    awarded: rfqs.filter(r => r.status === 'Awarded').length,
    draft: rfqs.filter(r => r.status === 'Draft').length,
  }), [rfqs]);

  const generateRfqNo = () => {
    const year = new Date().getFullYear();
    const existing = new Set(rfqs.map(r => r.rfqNo));
    let seq = rfqs.length + 1;
    let candidate = `RFQ/${year}/${String(seq).padStart(3, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `RFQ/${year}/${String(seq).padStart(3, '0')}`; }
    return candidate;
  };
  const openCreate = () => {
    setEditTarget(null);
    setForm({ rfqNo: generateRfqNo(), description: '', issueDate: new Date().toISOString().split('T')[0], responseDeadline: '', project: '', notes: '' });
    setFormVendors([]); setFormLines([EMPTY_LINE()]); setFormSearch(''); setFormOpen(true);
  };

  const openEdit = (r: RFQ) => {
    setEditTarget(r);
    setForm({ rfqNo: r.rfqNo, description: r.description, issueDate: r.issueDate, responseDeadline: r.responseDeadline, project: r.project, notes: r.notes });
    setFormVendors([...vendorIdsOf(r)]); setFormLines(r.lineItems.map(li => ({ ...li }))); setFormSearch(''); setFormOpen(true);
  };

  const saveForm = () => {
    if (!form.rfqNo || !form.description || !form.issueDate || !form.responseDeadline || !form.project) { toast.error('Fill required fields'); return; }
    if (formVendors.length === 0) { toast.error('Invite at least one vendor'); return; }
    if (!formLines.some(l => l.description.trim())) { toast.error('Add at least one line item'); return; }
    const body = { ...form, vendorIds: formVendors, lineItems: formLines };
    if (editTarget) {
      fetch('/api/procurement/rfqs/' + editTarget.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(res => res.json())
        .then(json => { if (json.success) { setRfqs(prev => prev.map(r => r.id === editTarget.id ? json.data : r)); toast.success('RFQ updated'); setFormOpen(false); } else toast.error('Failed to update RFQ'); })
        .catch(() => toast.error('Failed to update RFQ'));
    } else {
      fetch('/api/procurement/rfqs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(res => res.json())
        .then(json => { if (json.success) { setRfqs(prev => [...prev, json.data]); toast.success('RFQ created'); setFormOpen(false); } else toast.error('Failed to create RFQ'); })
        .catch(() => toast.error('Failed to create RFQ'));
    }
  };

  const deleteRfq = () => {
    if (!deleteTarget) return;
    fetch('/api/procurement/rfqs/' + deleteTarget.id, { method: 'DELETE' })
      .then(res => res.json())
      .then(json => { if (json.success) { setRfqs(prev => prev.filter(r => r.id !== deleteTarget.id)); setDeleteOpen(false); toast.success('RFQ deleted'); } else toast.error('Failed to delete RFQ'); })
      .catch(() => toast.error('Failed to delete RFQ'));
  };

  const openDetail = (r: RFQ) => {
    setDetailRfq(r);
    const ids = vendorIdsOf(r);
    setActiveVendorTab(ids.length > 0 ? ids[0] : null);
    setVendorBidsEdit(r.bids.filter(b => b.vendorId === (ids[0] ?? 0)));
    setDetailTab('bids');
    setDetailOpen(true);
  };

  const openVendorTab = (vid: number) => {
    setActiveVendorTab(vid);
    setVendorBidsEdit(detailRfq?.bids.filter(b => b.vendorId === vid) ?? []);
  };

  const updateBid = (lineItemId: number, field: keyof VendorBid, value: string | number | boolean) => {
    setVendorBidsEdit(prev => prev.map(b => b.lineItemId === lineItemId ? { ...b, [field]: value } : b));
  };

  const saveVendorBids = () => {
    if (!detailRfq || !activeVendorTab) return;
    const otherBids = detailRfq.bids.filter(b => b.vendorId !== activeVendorTab);
    const updated: RFQ = { ...detailRfq, bids: [...otherBids, ...vendorBidsEdit], status: 'Responses Received' };
    fetch('/api/procurement/rfqs/' + detailRfq.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      .then(res => res.json())
      .then(json => { if (json.success) { setRfqs(prev => prev.map(r => r.id === updated.id ? json.data : r)); setDetailRfq(json.data); toast.success('Bids saved for ' + vendorName(activeVendorTab)); } else toast.error('Failed to save bids'); })
      .catch(() => toast.error('Failed to save bids'));
  };

  const canAward = (r: RFQ): boolean => r.status === 'Responses Received' || r.status === 'Sent';

  const recommendVendor = (r: RFQ): number | null => {
    if (r.bids.length === 0) return null;
    const responded = [...new Set(r.bids.map(b => b.vendorId))].filter(v => vendorIdsOf(r).includes(v));
    if (responded.length === 0) return null;
    let best = responded[0]; let bestTotal = totalBid(best, r.lineItems, r.bids);
    for (let i = 1; i < responded.length; i++) {
      const t = totalBid(responded[i], r.lineItems, r.bids);
      if (t < bestTotal) { best = responded[i]; bestTotal = t; }
    }
    return best;
  };

  const handleCreatePO = () => {
    if (!detailRfq) return;
    const rec = recommendVendor(detailRfq);
    if (!rec) { toast.error('No vendor responses to create PO from'); return; }
    setPoVendorId(rec); setPoConfirmOpen(true);
  };

  const confirmCreatePO = () => {
    if (!detailRfq || !poVendorId) return;
    const rfq: RFQ = { ...detailRfq, status: 'Awarded' };
    fetch('/api/procurement/rfqs/' + detailRfq.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rfq) })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setRfqs(prev => prev.map(r => r.id === rfq.id ? json.data : r)); setDetailRfq(json.data);
          setPoConfirmOpen(false);
          toast.success('PO awarded to ' + vendorName(poVendorId) + ' - ' + formatINR(totalBid(poVendorId, detailRfq.lineItems, detailRfq.bids)));
        } else toast.error('Failed to create PO');
      })
      .catch(() => toast.error('Failed to create PO'));
  };

  const filteredVendors = VENDORS.filter(v => v.name.toLowerCase().includes(formSearch.toLowerCase()));
  const daysRemaining = detailRfq ? daysUntil(detailRfq.responseDeadline) : 0;
  const recommendId = detailRfq ? recommendVendor(detailRfq) : null;

  if (importOpen) {
    return (
      <ImportWizard
        title="RFQs"
        fields={RFQ_IMPORT_FIELDS}
        keyField="rfqNo"
        existingKeys={new Set(rfqs.map(r => r.rfqNo))}
        commitEndpoint="/api/procurement/rfq/import"
        sampleRow={RFQ_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  if (error) return <div className="flex items-center justify-center h-64 text-[#ff3d3d] text-[13px] font-medium">{error}</div>;

  return (
    <div className="space-y-4 p-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total RFQs', value: summary.total, color: 'text-[#e2e8f0]', bg: 'bg-[#f5a623]/10', icon: FileText, border: 'border-[#f5a623]/20' },
          { label: 'Draft', value: summary.draft, color: 'text-[#5a6878]', bg: 'bg-[#5a6878]/10', icon: Clock, border: 'border-[#5a6878]/20' },
          { label: 'Sent', value: summary.sent, color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10', icon: TrendingUp, border: 'border-[#00d4ff]/20' },
          { label: 'Responses In', value: summary.responded, color: 'text-[#f5a623]', bg: 'bg-[#f5a623]/10', icon: Users, border: 'border-[#f5a623]/20' },
          { label: 'Awarded', value: summary.awarded, color: 'text-[#00e676]', bg: 'bg-[#00e676]/10', icon: Award, border: 'border-[#00e676]/20' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={'bg-[#0f1318] border ' + card.border + ' rounded-xl p-4'}>
              <div className="flex items-center gap-3">
                <div className={'w-9 h-9 ' + card.bg + ' rounded-lg flex items-center justify-center'}><Icon size={16} className={card.color} /></div>
                <div>
                  <div className={'text-[18px] font-bold ' + card.color} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{card.value}</div>
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">{card.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">RFQ Management</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{tc.total}</span>
          <div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search RFQs..." /></div>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={rfqs} columns={RFQ_COLUMNS} filename="procurement-rfq" />
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New RFQ</button>
        </div>
        <div className="flex gap-1.5 px-3 py-2 border-b border-[#252e3a]">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={'px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[1px] transition-all ' + (statusFilter === s ? 'bg-[#f5a623] text-[#0f1318]' : 'bg-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]')}>{s}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['RFQ#', 'Description', 'Vendors', 'Responses', 'Deadline', 'Status', ''].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.map(r => {
                const dd = daysUntil(r.responseDeadline);
                const responded = [...new Set(r.bids.map(b => b.vendorId))].length;
                return (
                  <tr key={r.id} className="hover:bg-[#141920]">
                    <td className="py-2.5 px-3"><button onClick={() => openDetail(r)} className="text-[#f5a623] font-mono font-medium hover:underline">{r.rfqNo}</button></td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] max-w-[200px] truncate">{r.description}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{vendorIdsOf(r).length}</td>
                    <td className="py-2.5 px-3">
                      <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ' + (responded > 0 ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'bg-[#5a6878]/15 text-[#5a6878]')}>
                        {responded} / {vendorIdsOf(r).length}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={'font-mono inline-flex items-center gap-1 ' + deadlineColor(dd)}>
                        <Calendar size={11} />{r.responseDeadline} {dd <= 0 ? '(Overdue)' : '(' + dd + 'd)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3"><span className={'inline-block px-2 py-0.5 rounded text-[10px] font-medium ' + (STATUS_STYLES[r.status] || '')}>{r.status}</span></td>
                    <td className="py-2.5 px-3"><div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                      <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                    </div></td>
                  </tr>
                );
              })}
              {tc.pageItems.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No RFQs found</td></tr>}
            </tbody>
          </table>
          <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit' : 'New'} RFQ</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><label className="block text-[11px] font-semibold text-[#8899aa] mb-1">RFQ No</label><input value={form.rfqNo} readOnly className="vc-input opacity-60" placeholder="Auto-generated" /></div>
            <div><label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Issue Date</label><input type="date" value={form.issueDate} onChange={e => setForm({...form, issueDate: e.target.value})} className="vc-input" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="vc-input" /></div>
            <div><label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Response Deadline</label><input type="date" value={form.responseDeadline} onChange={e => setForm({...form, responseDeadline: e.target.value})} className="vc-input" /></div>
            <div><label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project</label><input value={form.project} onChange={e => setForm({...form, project: e.target.value})} className="vc-input" /></div>
            <div className="col-span-2"><label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="vc-input" rows={3} /></div>
          </div>
          {/* Vendor Selection */}
          <div className="border-t border-[#252e3a] pt-4">
            <label className="block text-[11px] font-semibold text-[#8899aa] mb-2">Invite Vendors ({formVendors.length} selected)</label>
            <div className="flex gap-2 mb-2"><input value={formSearch} onChange={e => setFormSearch(e.target.value)} placeholder="Search vendors..." className="vc-input flex-1" /></div>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
              {filteredVendors.map(v => (
                <button key={v.id} onClick={() => setFormVendors(p => p.includes(v.id) ? p.filter(x => x !== v.id) : [...p, v.id])}
                  className={'px-2.5 py-1 rounded text-[10px] font-medium transition-all ' + (formVendors.includes(v.id) ? 'bg-[#f5a623] text-[#0a0d12]' : 'bg-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]')}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
          {/* Line Items */}
          <div className="border-t border-[#252e3a] pt-4">
            <label className="block text-[11px] font-semibold text-[#8899aa] mb-2">Line Items ({formLines.length})</label>
            <div className="overflow-x-auto border border-[#252e3a] rounded-lg">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-[#0a0d12]">
                  <th className="text-left py-2 px-3 text-[#5a6878] text-[9px] uppercase w-1/2">Description</th>
                  <th className="text-left py-2 px-3 text-[#5a6878] text-[9px] uppercase w-[60px]">Qty</th>
                  <th className="text-left py-2 px-3 text-[#5a6878] text-[9px] uppercase w-[70px]">Unit</th>
                  <th className="w-8" />
                </tr></thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {formLines.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-[#141920]">
                      <td className="py-1.5 px-3"><input type="text" value={it.description} onChange={e => { const n = [...formLines]; n[idx] = {...n[idx], description: e.target.value}; setFormLines(n); }} className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] w-full focus:border-[#f5a623] focus:outline-none" placeholder="Item description" /></td>
                      <td className="py-1.5 px-3"><input type="number" value={it.qty} onChange={e => { const n = [...formLines]; n[idx] = {...n[idx], qty: Number(e.target.value)}; setFormLines(n); }} className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] w-[50px] focus:border-[#f5a623] focus:outline-none" /></td>
                      <td className="py-1.5 px-3"><select value={it.unit} onChange={e => { const n = [...formLines]; n[idx] = {...n[idx], unit: e.target.value}; setFormLines(n); }} className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] w-[60px] appearance-none focus:border-[#f5a623] focus:outline-none">{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></td>
                      <td className="py-1.5 px-3"><button onClick={() => { if (formLines.length > 1) setFormLines(p => p.filter((_, i) => i !== idx)); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d]"><XIcon size={11} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setFormLines(p => [...p, EMPTY_LINE()])} className="mt-2 text-[10px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={11} /> Add Item</button>
          </div>
          <DialogFooter><button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button><button onClick={saveForm} className="vc-btn-primary">{editTarget ? 'Update' : 'Create'}</button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {detailRfq && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{detailRfq.rfqNo} — {detailRfq.project}</DialogTitle>
                <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold ' + (STATUS_STYLES[detailRfq.status] || '')}>{detailRfq.status}</span>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* RFQ Info */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Description</div>
                  <div className="text-[11px] text-[#e2e8f0]">{detailRfq.description}</div>
                </div>
                <div className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Issue Date</div>
                  <div className="text-[11px] text-[#e2e8f0]">{detailRfq.issueDate?.split('T')[0]}</div>
                </div>
                <div className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Deadline</div>
                  <div className={'text-[11px] font-semibold ' + deadlineColor(daysRemaining)}>
                    {detailRfq.responseDeadline?.split('T')[0]} ({daysRemaining > 0 ? daysRemaining + 'd left' : daysRemaining === 0 ? 'Today' : Math.abs(daysRemaining) + 'd overdue'})
                  </div>
                </div>
                <div className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Line Items</div>
                  <div className="text-[11px] text-[#e2e8f0]">{detailRfq.lineItems.length} items</div>
                </div>
                <div className="col-span-2 bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Notes</div>
                  <div className="text-[11px] text-[#e2e8f0]">{detailRfq.notes || '\u2014'}</div>
                </div>
                <div className="col-span-2 bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">Invited Vendors</div>
                  <div className="flex flex-wrap gap-1.5">
                    {vendorIdsOf(detailRfq).map(vid => {
                      const hasBid = detailRfq.bids.some(b => b.vendorId === vid);
                      return (
                        <span key={vid} className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ' + (hasBid ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#5a6878]/15 text-[#5a6878]')}>
                          {vendorName(vid)} {hasBid ? <CheckCircle size={10} /> : <Clock size={10} />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-0.5 border-b border-[#252e3a]">
                <button onClick={() => setDetailTab('bids')}
                  className={'px-4 py-2 text-[11px] font-medium transition-all border-b-2 ' + (detailTab === 'bids' ? 'border-[#f5a623] text-[#f5a623]' : 'border-transparent text-[#5a6878] hover:text-[#e2e8f0]')}>
                  <Users size={13} className="inline mr-1.5" />Vendor Bids
                </button>
                <button onClick={() => setDetailTab('compare')}
                  className={'px-4 py-2 text-[11px] font-medium transition-all border-b-2 ' + (detailTab === 'compare' ? 'border-[#f5a623] text-[#f5a623]' : 'border-transparent text-[#5a6878] hover:text-[#e2e8f0]')}>
                  <BarChart3 size={13} className="inline mr-1.5" />Bid Comparison
                </button>
              </div>

              {/* Tab: Vendor Bids */}
              {detailTab === 'bids' && (
                <div>
                  {/* Vendor Tabs */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {vendorIdsOf(detailRfq).map(vid => {
                      const hasBid = detailRfq.bids.some(b => b.vendorId === vid);
                      const isActive = activeVendorTab === vid;
                      return (
                        <button key={vid} onClick={() => openVendorTab(vid)}
                          className={'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 ' + (isActive ? 'bg-[#f5a623] text-[#0a0d12]' : hasBid ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]')}>
                          {vendorName(vid)} {hasBid && <CheckCircle size={10} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bid Entry Table */}
                  {activeVendorTab && (
                    <div className="border border-[#252e3a] rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead><tr className="bg-[#0a0d12]">
                          <th className="text-left py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-2/5">Line Item</th>
                          <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-[80px]">Qty</th>
                          <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-[100px]">Unit Price</th>
                          <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-[100px]">Line Total</th>
                          <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-[70px]">Lead (d)</th>
                          <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-[60px]">Compliant</th>
                        </tr></thead>
                        <tbody className="divide-y divide-[#1a2028]">
                          {detailRfq.lineItems.map(li => {
                            const bid = vendorBidsEdit.find(b => b.lineItemId === li.id);
                            const minPrice = getMinPrice(li.id, detailRfq.bids);
                            const isMin = bid ? bid.unitPrice === minPrice : false;
                            return (
                              <tr key={li.id} className="hover:bg-[#141920]">
                                <td className="py-2 px-3 text-[#e2e8f0]">{li.description}</td>
                                <td className="py-2 px-3 text-center text-[#8899aa] font-mono">{li.qty} {li.unit}</td>
                                <td className="py-2 px-3">
                                  <div className="relative inline-block w-full">
                                    <input type="number" value={bid?.unitPrice ?? ''} onChange={e => updateBid(li.id, 'unitPrice', Number(e.target.value))}
                                      className={'w-full bg-[#0a0d12] border rounded px-2 py-1 text-[11px] text-[#e2e8f0] text-center font-mono focus:outline-none ' + (isMin ? 'border-[#00e676]' : 'border-[#252e3a] focus:border-[#f5a623]')} />
                                    {isMin && <span className="absolute -top-1.5 -right-1 text-[#00e676]"><Award size={10} /></span>}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center text-[#e2e8f0] font-mono font-medium">
                                  {bid ? formatINR(bid.unitPrice * li.qty) : '\u2014'}
                                </td>
                                <td className="py-2 px-3"><input type="number" value={bid?.leadTime ?? ''} onChange={e => updateBid(li.id, 'leadTime', Number(e.target.value))} className="w-full bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] text-center font-mono focus:border-[#f5a623] focus:outline-none" /></td>
                                <td className="py-2 px-3 text-center">
                                  <input type="checkbox" checked={bid?.compliant ?? false} onChange={e => updateBid(li.id, 'compliant', e.target.checked)} className="accent-[#f5a623]" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}

                  {/* Bid actions */}
                  {activeVendorTab && (
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <button onClick={saveVendorBids} className="px-4 py-1.5 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[11px] font-bold flex items-center gap-1.5 hover:bg-[#e8991a] transition-all">
                          <CheckCircle size={13} /> Save {vendorName(activeVendorTab)} Bids
                        </button>
                      </div>
                      <div className="text-[11px] text-[#8899aa]">
                        Vendor Total: <span className="text-[#f5a623] font-bold font-mono">{formatINR(totalBid(activeVendorTab, detailRfq.lineItems, vendorBidsEdit))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Bid Comparison */}
              {detailTab === 'compare' && (
                <div>
                  {(() => {
                    const responded = vendorIdsOf(detailRfq).filter(v => detailRfq.bids.some(b => b.vendorId === v));
                    if (responded.length === 0) return <div className="text-center py-8 text-[#5a6878] text-[12px]">No vendor responses yet. Enter bids in the Vendor Bids tab first.</div>;
                    return (
                      <div className="overflow-x-auto border border-[#252e3a] rounded-lg">
                        <table className="w-full text-[11px]">
                          <thead><tr className="bg-[#0a0d12]">
                            <th className="text-left py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold">Line Item</th>
                            <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold">Qty</th>
                            {responded.map(vid => {
                              const isRec = vid === recommendId;
                              return (
                                <th key={vid} className={'text-center py-2 px-3 text-[9px] uppercase font-semibold ' + (isRec ? 'text-[#00e676]' : 'text-[#5a6878]')}>
                                  <div className="flex items-center justify-center gap-1">
                                    {vendorName(vid)} {isRec && <Award size={11} className="text-[#00e676]" />}
                                  </div>
                                </th>
                              );
                            })}
                            <th className="text-center py-2 px-3 text-[#5a6878] text-[9px] uppercase font-semibold w-[80px]">Best Price</th>
                          </tr></thead>
                          <tbody className="divide-y divide-[#1a2028]">
                            {detailRfq.lineItems.map(li => {
                              const minPrice = getMinPrice(li.id, detailRfq.bids);
                              return (
                                <tr key={li.id} className="hover:bg-[#141920]">
                                  <td className="py-2 px-3 text-[#e2e8f0]">{li.description}</td>
                                  <td className="py-2 px-3 text-center text-[#8899aa] font-mono">{li.qty} {li.unit}</td>
                                  {responded.map(vid => {
                                    const bid = detailRfq.bids.find(b => b.vendorId === vid && b.lineItemId === li.id);
                                    const isMin = bid && bid.unitPrice === minPrice && bid.compliant;
                                    const isRec = vid === recommendId;
                                    return (
                                      <td key={vid} className={'py-2 px-3 text-center font-mono ' + (isMin ? 'text-[#00e676] font-bold' : isRec ? 'text-[#e2e8f0]' : 'text-[#8899aa]')}>
                                        {bid ? formatINR(bid.unitPrice) : '-'}
                                        {isMin && <Award size={10} className="inline ml-1 text-[#00e676]" />}
                                        {!bid && <span className="text-[#ff3d3d]">No bid</span>}
                                      </td>
                                    );
                                  })}
                                  <td className="py-2 px-3 text-center font-mono font-bold text-[#00e676]">{formatINR(minPrice)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#0a0d12]">
                              <td className="py-2.5 px-3 text-[#5a6878] text-[10px] font-semibold uppercase">Grand Total</td>
                              <td />
                              {responded.map(vid => {
                                const total = totalBid(vid, detailRfq.lineItems, detailRfq.bids);
                                const isRec = vid === recommendId;
                                return (
                                  <td key={vid} className={'py-2.5 px-3 text-center font-mono font-bold text-[13px] ' + (isRec ? 'text-[#00e676]' : 'text-[#e2e8f0]')} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                    {formatINR(total)}
                                    {isRec && <div className="text-[8px] uppercase tracking-wider text-[#00e676]">Recommended</div>}
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-[13px] text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                {formatINR(Math.min(...responded.map(v => totalBid(v, detailRfq.lineItems, detailRfq.bids))))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Award Action */}
                  {canAward(detailRfq) && detailRfq.bids.length > 0 && (
                    <div className="flex justify-end mt-4">
                      <button onClick={handleCreatePO}
                        className="px-5 py-2 rounded-lg bg-[#00e676] text-[#0a0d12] font-bold text-[12px] flex items-center gap-1.5 hover:bg-[#00b85c] transition-all">
                        <Award size={14} /> Create PO - {recommendId ? vendorName(recommendId) : 'Best Vendor'}
                        {recommendId && <span className="font-mono ml-1">{formatINR(totalBid(recommendId, detailRfq.lineItems, detailRfq.bids))}</span>}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <button onClick={() => setDetailOpen(false)} className="vc-btn-ghost">Close</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PO Confirmation Dialog */}
      <AlertDialog open={poConfirmOpen} onOpenChange={setPoConfirmOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#00e676] flex items-center gap-2"><Award size={16} /> Confirm Purchase Order</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              <div className="space-y-3 mt-2">
                <div className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">Vendor</div>
                  <div className="text-[14px] text-[#f5a623] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{poVendorId ? vendorName(poVendorId) : ''}</div>
                </div>
                <div className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                  <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-2">Items</div>
                  {detailRfq?.lineItems.map(li => {
                    const bid = detailRfq?.bids.find(b => b.vendorId === poVendorId && b.lineItemId === li.id);
                    return (
                      <div key={li.id} className="flex items-center justify-between py-1 text-[11px]">
                        <span className="text-[#e2e8f0]">{li.description}</span>
                        <span className="text-[#e2e8f0] font-mono">{li.qty} {li.unit} x {bid ? formatINR(bid.unitPrice) : '-'}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-[#252e3a] pt-2 mt-2 flex items-center justify-between">
                    <span className="text-[12px] text-[#e2e8f0] font-semibold">Total</span>
                    <span className="text-[16px] text-[#00e676] font-bold font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {detailRfq && poVendorId ? formatINR(totalBid(poVendorId, detailRfq.lineItems, detailRfq.bids)) : '-'}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-[#5a6878]">This will mark the RFQ as <strong className="text-[#00e676]">Awarded</strong> and create a Purchase Order.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreatePO} className="bg-[#00e676] hover:bg-[#00b85c] text-[#0f1318] rounded-lg font-semibold flex items-center gap-1.5"><CheckCircle size={14} /> Confirm &amp; Award</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete RFQ</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.rfqNo}</strong> - {deleteTarget?.description}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRfq} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
