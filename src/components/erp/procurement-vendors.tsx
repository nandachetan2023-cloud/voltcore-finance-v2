'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Search, LayoutGrid, List, Star, X, Shield, Award,
  TrendingUp, Clock, FileText, User, Phone, Mail, MapPin, CreditCard, ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import ContractorWizard, { type ContractorRecord } from '@/components/erp/contractor-wizard';

type Category = 'Electrical' | 'Mechanical' | 'Civil' | 'Labour' | 'Services';
type VendorStatus = 'preferred' | 'standard' | 'blacklisted';

interface Certificate {
  name: string;
  certNo: string;
  issueDate: string;
  expiryDate: string;
}

interface BlacklistEntry {
  date: string;
  reason: string;
  setBy: string;
}

interface PerformanceMetrics {
  onTimeDelivery: number;
  qualityRating: number;
  priceCompetitiveness: number;
}

interface Vendor extends ContractorRecord {
  id: number;
  name: string;
  categories: string[];
  region: string;
  status: string;
  rating: number;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  certificates: Certificate[];
  metrics: Partial<PerformanceMetrics>;
  blacklistLog: BlacklistEntry[];
}

const CATEGORIES: Category[] = ['Electrical', 'Mechanical', 'Civil', 'Labour', 'Services'];

const CATEGORY_PILL: Record<string, string> = {
  Electrical: 'bg-[#00d4ff]/10 text-[#00d4ff]',
  Mechanical: 'bg-[#f5a623]/10 text-[#f5a623]',
  Civil: 'bg-[#a78bfa]/10 text-[#a78bfa]',
  Labour: 'bg-[#ff6b6b]/10 text-[#ff6b6b]',
  Services: 'bg-[#00e676]/10 text-[#00e676]',
  'Material Supply': 'bg-[#38bdf8]/10 text-[#38bdf8]',
  EPC: 'bg-[#f472b6]/10 text-[#f472b6]',
  Logistics: 'bg-[#94a3b8]/10 text-[#94a3b8]',
};

function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }

function daysUntil(dateStr: string) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function complianceStatus(expiryDate: string) {
  const d = daysUntil(expiryDate);
  if (d < 0) return { label: 'Expired', dot: 'bg-[#ff3d3d]', text: 'text-[#ff3d3d]', chip: 'bg-[#ff3d3d]/15 text-[#ff3d3d]', badge: 'EXPIRED' } as const;
  if (d <= 30) return { label: 'Expiring', dot: 'bg-[#f5a623]', text: 'text-[#f5a623]', chip: 'bg-[#f5a623]/15 text-[#f5a623]', badge: `${d}d` } as const;
  return { label: 'Valid', dot: 'bg-[#00e676]', text: 'text-[#00e676]', chip: 'bg-[#00e676]/15 text-[#00e676]', badge: null } as const;
}

function overallCompliance(v: Vendor) {
  let expired = 0, expiring = 0;
  for (const c of v.certificates || []) {
    const cs = complianceStatus(c.expiryDate);
    if (cs.label === 'Expired') expired++;
    else if (cs.label === 'Expiring') expiring++;
  }
  if (expired > 0) return { label: 'Expired', dot: 'bg-[#ff3d3d]', text: 'text-[#ff3d3d]' } as const;
  if (expiring > 0) return { label: 'Attention', dot: 'bg-[#f5a623]', text: 'text-[#f5a623]' } as const;
  return { label: 'Compliant', dot: 'bg-[#00e676]', text: 'text-[#00e676]' } as const;
}

function starRating(n: number) {
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={11} fill={s <= full ? '#f5a623' : s === full + 1 && half ? '#f5a623' : 'none'}
          className={s <= full || (s === full + 1 && half) ? 'text-[#f5a623]' : 'text-[#3a4450]'} />
      ))}
    </span>
  );
}

function getOtdColor(pct: number) {
  return pct >= 90 ? 'text-[#00e676]' : pct >= 75 ? 'text-[#f5a623]' : 'text-[#ff3d3d]';
}

function mapVendor(row: any): Vendor {
  return {
    ...row,
    categories: Array.isArray(row.categories) ? row.categories : [],
    certificates: Array.isArray(row.certificates) ? row.certificates : [],
    metrics: row.metrics && typeof row.metrics === 'object' ? row.metrics : {},
    blacklistLog: Array.isArray(row.blacklistLog) ? row.blacklistLog : [],
    status: row.status || 'standard',
    rating: Number(row.rating) || 0,
  };
}

export default function ProcurementVendors() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'compliance' | 'scorecard' | 'blacklist'>('profile');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTarget, setWizardTarget] = useState<Vendor | null>(null);
  const [blacklistInput, setBlacklistInput] = useState({ reason: '', setBy: '' });
  const [showAddBlacklist, setShowAddBlacklist] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = useCallback(async () => {
    try {
      const r = await fetch('/api/fin/vendors');
      const j = await r.json();
      if (j.success) requestAnimationFrame(() => setVendors((j.data || []).map(mapVendor)));
    } catch { toast.error('Failed to load contractors'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadVendors(); }, [loadVendors]);

  const filtered = vendors.filter(v => {
    if (categoryFilter !== 'All' && !v.categories.includes(categoryFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.region.toLowerCase().includes(q)
        || v.categories.some(c => c.toLowerCase().includes(q))
        || (v.vendorCode || '').toLowerCase().includes(q)
        || (v.city || '').toLowerCase().includes(q);
    }
    return true;
  });

  function openDetail(v: Vendor) {
    setSelectedVendor(v);
    setDetailTab('profile');
    setShowAddBlacklist(false);
    setBlacklistInput({ reason: '', setBy: '' });
    setDetailOpen(true);
  }

  function openCreate() {
    setWizardTarget(null);
    setWizardOpen(true);
  }

  function openEdit(v: Vendor) {
    setWizardTarget(v);
    setWizardOpen(true);
  }

  function handleSaved(record: ContractorRecord) {
    const saved = mapVendor(record);
    setVendors(prev => {
      const exists = prev.some(v => v.id === saved.id);
      return exists ? prev.map(v => (v.id === saved.id ? saved : v)) : [...prev, saved];
    });
    setSelectedVendor(saved);
    setWizardOpen(false);
    setWizardTarget(null);
    loadVendors();
  }

  function handleStatusChange(v: Vendor, status: VendorStatus) {
    const updated = { ...v, status };
    setVendors(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    setSelectedVendor(updated);
    fetch('/api/fin/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated.id, status }) })
      .then(r => r.json())
      .then(j => { if (!j.success) { toast.error(j.error || 'Failed'); loadVendors(); } })
      .catch(() => { toast.error('Network error'); loadVendors(); });
    toast.success(status === 'preferred' ? 'Marked as Preferred' : status === 'blacklisted' ? 'Blacklisted' : 'Reverted to Standard');
  }

  function handleAddBlacklist() {
    if (!blacklistInput.reason || !blacklistInput.setBy || !selectedVendor) return;
    const entry: BlacklistEntry = { date: fmtDate(new Date()), reason: blacklistInput.reason, setBy: blacklistInput.setBy };
    const updated = { ...selectedVendor, status: 'blacklisted' as VendorStatus, blacklistLog: [entry, ...(selectedVendor.blacklistLog || [])] };
    setVendors(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    setSelectedVendor(updated);
    fetch('/api/fin/vendors', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated.id, status: 'blacklisted', blacklistLog: updated.blacklistLog }) })
      .then(r => r.json())
      .then(j => { if (!j.success) { toast.error(j.error || 'Failed'); loadVendors(); } })
      .catch(() => { toast.error('Network error'); loadVendors(); });
    setBlacklistInput({ reason: '', setBy: '' });
    setShowAddBlacklist(false);
    toast.success('Blacklist entry added');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    fetch(`/api/fin/vendors?id=${target.id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(j => {
        if (!j.success) { toast.error(j.error || 'Failed to delete contractor'); return; }
        setVendors(prev => prev.filter(v => v.id !== target.id));
        toast.success('Contractor deleted');
      })
      .catch(() => toast.error('Network error'));
    setDeleteOpen(false);
    setDetailOpen(false);
    setDeleteTarget(null);
    setSelectedVendor(null);
  }

  function catPill(cat: string) {
    return (
      <span key={cat} className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-tight ${CATEGORY_PILL[cat] || 'bg-[#8899aa]/10 text-[#8899aa]'}`}>
        {cat}
      </span>
    );
  }

  function complianceDot(v: Vendor) {
    const cs = overallCompliance(v);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${cs.dot}`} />
        <span className={`text-[10px] font-medium ${cs.text}`}>{cs.label}</span>
      </span>
    );
  }

  function statusBadge(v: Vendor) {
    if (v.status === 'preferred') return <span className="vc-badge bg-[#f5a623]/20 text-[#f5a623] text-[9px]">Preferred</span>;
    if (v.status === 'blacklisted') return <span className="vc-badge bg-[#ff3d3d]/20 text-[#ff3d3d] text-[9px]">Blacklisted</span>;
    return null;
  }

  function renderCard(v: Vendor) {
    return (
      <button key={v.id} onClick={() => openDetail(v)}
        className="vc-panel text-left w-full cursor-pointer hover:border-[#f5a623]/40 transition-colors">
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-bold text-[#e2e8f0] truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{v.name}</h3>
              <div className="text-[9px] text-[#5a6878] mt-0.5 flex items-center gap-2 flex-wrap">
                {v.vendorCode && <span className="font-mono">{v.vendorCode}</span>}
                <span>{v.vendorType || 'Contractor'}</span>
                {v.city && <span className="flex items-center gap-0.5"><MapPin size={9} />{v.city}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {v.categories.map(catPill)}
              </div>
            </div>
            {statusBadge(v)}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#5a6878] flex items-center gap-1"><MapPin size={10} />{v.region}</span>
            {starRating(v.rating)}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#1a2028]">
            {complianceDot(v)}
            <span className={`text-[10px] font-mono font-medium ${getOtdColor(v.metrics?.onTimeDelivery ?? 0)}`}>{v.metrics?.onTimeDelivery ?? 0}% OTD</span>
          </div>
        </div>
      </button>
    );
  }

  function renderRow(v: Vendor) {
    return (
      <button key={v.id} onClick={() => openDetail(v)}
        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 border-b border-[#1a2028] hover:bg-[#141920] transition-colors last:border-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#e2e8f0] truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{v.name}</span>
            {statusBadge(v)}
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">{v.categories.map(catPill)}</div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#8899aa]">
          <MapPin size={10} />{v.region}
        </div>
        <div className="hidden md:block">{starRating(v.rating)}</div>
        <div className="flex items-center gap-3">
          {complianceDot(v)}
          <span className={`text-[10px] font-mono font-medium ${getOtdColor(v.metrics?.onTimeDelivery ?? 0)}`}>{v.metrics?.onTimeDelivery ?? 0}%</span>
        </div>
      </button>
    );
  }

  const colHeaderClass = 'text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]';

  const detailRows: [string, string][] = selectedVendor ? [
    ['Contractor Code', selectedVendor.vendorCode || '—'],
    ['Legal Name', selectedVendor.legalName || '—'],
    ['Trade Name', selectedVendor.tradeName || '—'],
    ['Type', selectedVendor.vendorType || 'Contractor'],
    ['Region', selectedVendor.region],
    ['Status', selectedVendor.status],
    ['Registered On', selectedVendor.registeredOn ? String(selectedVendor.registeredOn).slice(0, 10) : '—'],
    ['GSTIN', selectedVendor.gstin || '—'],
    ['PAN', selectedVendor.pan || '—'],
    ['TAN', selectedVendor.tan || '—'],
    ['MSME', selectedVendor.msmeRegistered ? 'Yes' : 'No'],
    ['TDS Section', selectedVendor.taxDeduction || '—'],
    ['Bank', selectedVendor.bankName || '—'],
    ['Account Holder', selectedVendor.bankAccountName || '—'],
    ['Account No', selectedVendor.bankAccountNumber || '—'],
    ['IFSC', selectedVendor.bankIfsc || '—'],
    ['Payment Terms', selectedVendor.paymentTerms || '—'],
    ['Credit Days', selectedVendor.creditDays != null ? String(selectedVendor.creditDays) : '—'],
  ] : [];

  return (
    <div className="space-y-4 p-6">
      {/* Toolbar */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Building2 size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Contractors Management</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{vendors.length}</span>
          <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Contractor</button>
        </div>
        <div className="px-3 pb-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contractors by name, code, category, city..." className="bg-[#0f1318] border border-[#252e3a] rounded-lg pl-8 pr-8 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-full" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0]"><X size={12} /></button>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded text-[11px] ${viewMode === 'grid' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'text-[#5a6878] hover:text-[#8899aa]'}`}><LayoutGrid size={14} /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded text-[11px] ${viewMode === 'list' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'text-[#5a6878] hover:text-[#8899aa]'}`}><List size={14} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['All', ...CATEGORIES] as const).map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30'
                    : 'bg-[#0f1318] text-[#5a6878] border border-[#252e3a] hover:border-[#3a4450]'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contractor cards / list */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div className="vc-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-[#0f1318]">
                <th className={colHeaderClass}>Contractor</th>
                <th className={colHeaderClass + ' hidden sm:table-cell'}>Region</th>
                <th className={colHeaderClass + ' hidden md:table-cell'}>Rating</th>
                <th className={colHeaderClass}>Compliance</th>
                <th className={colHeaderClass}>OTD</th>
              </tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-[#141920] cursor-pointer" onClick={() => openDetail(v)}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[#e2e8f0] font-medium">{v.name}</span>
                        {statusBadge(v)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">{v.categories.map(catPill)}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa] hidden sm:table-cell">{v.region}</td>
                    <td className="py-2.5 px-3 hidden md:table-cell">{starRating(v.rating)}</td>
                    <td className="py-2.5 px-3">{complianceDot(v)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-mono font-medium ${getOtdColor(v.metrics?.onTimeDelivery ?? 0)}`}>{v.metrics?.onTimeDelivery ?? 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && !loading && <div className="py-8 text-center text-[#5a6878] text-[11px]">No contractors found</div>}
        </div>
      )}

      {/* Contractor detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVendor?.name || 'Contractor Details'}
              {selectedVendor && statusBadge(selectedVendor)}
            </DialogTitle>
          </DialogHeader>

          {selectedVendor && (
            <>
              <div className="flex gap-1 border-b border-[#252e3a] -mt-2 mb-3">
                {([
                  ['profile', 'Profile', FileText],
                  ['compliance', 'Compliance', Shield],
                  ['scorecard', 'Scorecard', Award],
                  ['blacklist', 'Blacklist', TrendingUp],
                ] as const).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px transition-colors ${
                      detailTab === key ? 'border-[#f5a623] text-[#f5a623]' : 'border-transparent text-[#8899aa] hover:text-[#e2e8f0]'
                    }`}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              {detailTab === 'profile' && (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                    <div><div className="text-[#5a6878] mb-0.5 flex items-center gap-1"><User size={10} /> Contact Person</div><div className="text-[#e2e8f0]">{selectedVendor.contactPerson || '—'}{selectedVendor.contactDesignation ? ` (${selectedVendor.contactDesignation})` : ''}</div></div>
                    <div><div className="text-[#5a6878] mb-0.5 flex items-center gap-1"><Phone size={10} /> Phone</div><div className="text-[#e2e8f0]">{selectedVendor.phone || '—'}{selectedVendor.alternatePhone ? `, ${selectedVendor.alternatePhone}` : ''}</div></div>
                    <div><div className="text-[#5a6878] mb-0.5 flex items-center gap-1"><Mail size={10} /> Email</div><div className="text-[#e2e8f0] break-all">{selectedVendor.email || '—'}</div></div>
                    <div><div className="text-[#5a6878] mb-0.5 flex items-center gap-1"><MapPin size={10} /> Address</div><div className="text-[#e2e8f0]">{selectedVendor.address || '—'}</div></div>
                    <div><div className="text-[#5a6878] mb-0.5 flex items-center gap-1"><Building2 size={10} /> Location</div><div className="text-[#e2e8f0]">{[selectedVendor.city, selectedVendor.state, selectedVendor.pincode, selectedVendor.country].filter(Boolean).join(', ') || '—'}</div></div>
                    <div><div className="text-[#5a6878] mb-0.5 flex items-center gap-1"><CreditCard size={10} /> Bank A/c</div><div className="text-[#e2e8f0]">{selectedVendor.bankName || '—'}{selectedVendor.bankIfsc ? ` (${selectedVendor.bankIfsc})` : ''}</div></div>
                  </div>

                  <div className="border border-[#252e3a] rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-[#0f1318] text-[10px] uppercase tracking-[1.5px] text-[#8899aa] font-bold">Master Record</div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                      {detailRows.map(([label, value]) => (
                        <div key={label} className="flex gap-2 border-b border-[#1a2028] pb-1">
                          <span className="text-[#5a6878] w-32 shrink-0">{label}</span>
                          <span className="text-[#e2e8f0] flex-1 break-words">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedVendor.notes && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[1.5px] text-[#8899aa] font-bold mb-1 flex items-center gap-1"><ScrollText size={11} /> Notes</div>
                      <div className="text-[11px] text-[#e2e8f0] whitespace-pre-wrap">{selectedVendor.notes}</div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#252e3a]">
                    <span className="text-[10px] text-[#5a6878] mr-1">Status:</span>
                    {(['standard', 'preferred', 'blacklisted'] as const).map(s => (
                      <button key={s} onClick={() => handleStatusChange(selectedVendor, s)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-colors ${
                          selectedVendor.status === s ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'bg-[#0f1318] text-[#5a6878] border border-[#252e3a] hover:border-[#3a4450]'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === 'compliance' && (
                <div className="space-y-2 py-2">
                  {(selectedVendor.certificates || []).length === 0 && (
                    <div className="text-[11px] text-[#5a6878] py-4 text-center">No certificates on record.</div>
                  )}
                  {(selectedVendor.certificates || []).map((c, i) => {
                    const cs = complianceStatus(c.expiryDate);
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 border border-[#252e3a] rounded-lg">
                        <Shield size={13} className={`shrink-0 ${cs.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-[#e2e8f0] font-medium">{c.name}</div>
                          <div className="text-[10px] text-[#5a6878]">{c.certNo || 'No number'} · Issued {c.issueDate || '—'} · Expires {c.expiryDate || '—'}</div>
                        </div>
                        <span className={`vc-badge ${cs.chip}`}>{cs.badge || cs.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {detailTab === 'scorecard' && (
                <div className="space-y-3 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {([
                      ['On-Time Delivery', `${selectedVendor.metrics?.onTimeDelivery ?? 0}%`, getOtdColor(selectedVendor.metrics?.onTimeDelivery ?? 0)],
                      ['Quality Rating', `${selectedVendor.metrics?.qualityRating ?? 0} / 5`, 'text-[#00d4ff]'],
                      ['Price Competitiveness', `${selectedVendor.metrics?.priceCompetitiveness ?? 0} / 5`, 'text-[#a78bfa]'],
                    ] as [string, string, string][]).map(([label, value, otdClass]) => (
                      <div key={label} className="p-3 border border-[#252e3a] rounded-lg">
                        <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold">{label}</div>
                        <div className={`text-[18px] font-bold mt-1 ${otdClass}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#8899aa]">
                    <span>Overall rating</span>{starRating(selectedVendor.rating)}
                  </div>
                </div>
              )}

              {detailTab === 'blacklist' && (
                <div className="space-y-3 py-2">
                  {showAddBlacklist && (
                    <div className="p-3 border border-[#252e3a] rounded-lg space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input value={blacklistInput.setBy} onChange={e => setBlacklistInput({ ...blacklistInput, setBy: e.target.value })} className="vc-input" placeholder="Set by (name)" />
                        <input value={blacklistInput.reason} onChange={e => setBlacklistInput({ ...blacklistInput, reason: e.target.value })} className="vc-input" placeholder="Reason for blacklisting" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddBlacklist(false)} className="vc-btn-ghost">Cancel</button>
                        <button onClick={handleAddBlacklist} className="vc-btn-primary">Add Entry</button>
                      </div>
                    </div>
                  )}
                  {!showAddBlacklist && (
                    <button onClick={() => setShowAddBlacklist(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Plus size={13} /> Add Blacklist Entry</button>
                  )}
                  {(selectedVendor.blacklistLog || []).length === 0 && (
                    <div className="text-[11px] text-[#5a6878] py-4 text-center">This contractor has no blacklist entries.</div>
                  )}
                  {(selectedVendor.blacklistLog || []).map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 border border-[#ff3d3d]/30 rounded-lg bg-[#ff3d3d]/5">
                      <Clock size={13} className="text-[#ff3d3d] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-[12px] text-[#e2e8f0]">{b.reason}</div>
                        <div className="text-[10px] text-[#5a6878]">{b.date} · by {b.setBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <DialogFooter className="gap-2">
            {selectedVendor && (
              <>
                <button onClick={() => { setDeleteTarget(selectedVendor); setDeleteOpen(true); }} className="vc-btn-danger flex items-center gap-1.5 mr-auto"><Trash2 size={13} /> Delete</button>
                <button onClick={() => openEdit(selectedVendor)} className="vc-btn-ghost flex items-center gap-1.5"><Pencil size={13} /> Edit</button>
              </>
            )}
            <button onClick={() => setDetailOpen(false)} className="vc-btn-primary">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>? A contractor that is already used by a purchase order, RFQ, contract or bill cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contractor wizard — the only place contractor records are created/edited */}
      <ContractorWizard
        open={wizardOpen}
        existing={wizardTarget}
        onClose={() => { setWizardOpen(false); setWizardTarget(null); }}
        onSaved={handleSaved}
      />
    </div>
  );
}
