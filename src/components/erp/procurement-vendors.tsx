'use client';
import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Search, LayoutGrid, List, Star, X, ChevronDown, ChevronUp, Shield, Award, TrendingUp, Clock, FileText, User, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

type Category = 'Electrical' | 'Mechanical' | 'Civil' | 'Labour' | 'Services';
type VendorStatus = 'preferred' | 'standard' | 'blacklisted';
type CertName = 'BBBEE Certificate' | 'ISO 9001' | 'ISO 14001' | 'OHSAS 18001' | 'Tax Clearance' | 'GST Registration';

interface Certificate {
  name: CertName;
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

interface Vendor {
  id: number;
  name: string;
  categories: Category[];
  region: string;
  status: VendorStatus;
  rating: number;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  certificates: Certificate[];
  metrics: PerformanceMetrics;
  blacklistLog: BlacklistEntry[];
}

const CATEGORIES: Category[] = ['Electrical', 'Mechanical', 'Civil', 'Labour', 'Services'];

const CATEGORY_COLORS: Record<Category, string> = {
  Electrical: '#00d4ff',
  Mechanical: '#f5a623',
  Civil: '#a78bfa',
  Labour: '#ff6b6b',
  Services: '#00e676',
};

const CERT_NAMES: CertName[] = ['BBBEE Certificate', 'ISO 9001', 'ISO 14001', 'OHSAS 18001', 'Tax Clearance', 'GST Registration'];

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }

const VENDORS: Vendor[] = [
  {
    id: 1, name: 'ElectroMech Solutions', categories: ['Electrical'], region: 'Maharashtra', status: 'preferred', rating: 4.2,
    contactPerson: 'Sandeep Joshi', phone: '+91-9876543001', email: 'sjoshi@electromech.in', address: 'Pune, Maharashtra', notes: 'Reliable electrical contractor for mining sites.',
    certificates: [
      { name: 'BBBEE Certificate', certNo: 'BBBEE-2024-001', issueDate: '2024-01-10', expiryDate: '2025-01-09' },
      { name: 'ISO 9001', certNo: 'ISO-9001-EM-2023', issueDate: '2023-06-15', expiryDate: '2026-06-14' },
      { name: 'ISO 14001', certNo: 'ISO-14001-EM-2023', issueDate: '2023-06-15', expiryDate: '2026-06-14' },
      { name: 'Tax Clearance', certNo: 'TAX-EM-2024', issueDate: '2024-03-01', expiryDate: '2025-03-01' },
    ],
    metrics: { onTimeDelivery: 94, qualityRating: 4.3, priceCompetitiveness: 4.0 },
    blacklistLog: [],
  },
  {
    id: 2, name: 'PowerTech Industries', categories: ['Electrical', 'Mechanical'], region: 'Gujarat', status: 'standard', rating: 3.8,
    contactPerson: 'Amit Shah', phone: '+91-9876543002', email: 'amit@powertech.in', address: 'Vadodara, Gujarat', notes: '',
    certificates: [
      { name: 'ISO 9001', certNo: 'ISO-9001-PT-2022', issueDate: '2022-04-01', expiryDate: '2025-03-31' },
      { name: 'ISO 14001', certNo: 'ISO-14001-PT-2022', issueDate: '2022-04-01', expiryDate: '2025-03-31' },
      { name: 'GST Registration', certNo: 'GST-PT-2021', issueDate: '2021-07-01', expiryDate: '2026-06-30' },
    ],
    metrics: { onTimeDelivery: 82, qualityRating: 3.8, priceCompetitiveness: 3.5 },
    blacklistLog: [],
  },
  {
    id: 3, name: 'Bharat Heavy Electricals Ltd', categories: ['Electrical', 'Mechanical'], region: 'Multiple', status: 'preferred', rating: 4.5,
    contactPerson: 'Rajiv Mehta', phone: '+91-9876543003', email: 'rajiv@bhel.in', address: 'Bhopal, Madhya Pradesh', notes: 'Government PSU. Preferred partner for high-value electrical contracts.',
    certificates: [
      { name: 'BBBEE Certificate', certNo: 'BBBEE-BHEL-2024', issueDate: '2024-02-01', expiryDate: '2025-01-31' },
      { name: 'ISO 9001', certNo: 'ISO-9001-BHEL-2023', issueDate: '2023-01-01', expiryDate: '2026-12-31' },
      { name: 'ISO 14001', certNo: 'ISO-14001-BHEL-2023', issueDate: '2023-01-01', expiryDate: '2026-12-31' },
      { name: 'OHSAS 18001', certNo: 'OHSAS-BHEL-2023', issueDate: '2023-03-15', expiryDate: '2025-03-14' },
      { name: 'Tax Clearance', certNo: 'TAX-BHEL-2024', issueDate: '2024-04-01', expiryDate: '2025-03-31' },
      { name: 'GST Registration', certNo: 'GST-BHEL-2021', issueDate: '2021-07-01', expiryDate: '2026-06-30' },
    ],
    metrics: { onTimeDelivery: 97, qualityRating: 4.7, priceCompetitiveness: 4.2 },
    blacklistLog: [],
  },
  {
    id: 4, name: 'MinMet Engineering', categories: ['Mechanical', 'Civil'], region: 'Odisha', status: 'standard', rating: 3.2,
    contactPerson: 'Prakash Nayak', phone: '+91-9876543004', email: 'prakash@minmet.in', address: 'Bhubaneswar, Odisha', notes: '',
    certificates: [
      { name: 'ISO 9001', certNo: 'ISO-9001-MM-2021', issueDate: '2021-11-01', expiryDate: '2024-10-31' },
      { name: 'OHSAS 18001', certNo: 'OHSAS-MM-2022', issueDate: '2022-05-01', expiryDate: '2024-04-30' },
      { name: 'Tax Clearance', certNo: 'TAX-MM-2024', issueDate: '2024-01-15', expiryDate: '2025-01-14' },
    ],
    metrics: { onTimeDelivery: 68, qualityRating: 3.0, priceCompetitiveness: 3.8 },
    blacklistLog: [],
  },
  {
    id: 5, name: 'Industrial Supplies Co', categories: ['Mechanical', 'Services'], region: 'Jharkhand', status: 'standard', rating: 3.5,
    contactPerson: 'Vikram Singh', phone: '+91-9876543005', email: 'vikram@indsupplies.in', address: 'Jamshedpur, Jharkhand', notes: '',
    certificates: [
      { name: 'ISO 9001', certNo: 'ISO-9001-ISC-2022', issueDate: '2022-08-01', expiryDate: '2025-07-31' },
      { name: 'GST Registration', certNo: 'GST-ISC-2020', issueDate: '2020-06-01', expiryDate: '2025-05-31' },
      { name: 'Tax Clearance', certNo: 'TAX-ISC-2024', issueDate: '2024-02-01', expiryDate: fmtDate(addDays(new Date(), 20)) },
    ],
    metrics: { onTimeDelivery: 76, qualityRating: 3.5, priceCompetitiveness: 3.3 },
    blacklistLog: [],
  },
  {
    id: 6, name: 'GreenTech Electricals', categories: ['Electrical'], region: 'Karnataka', status: 'blacklisted', rating: 2.8,
    contactPerson: 'Mahesh Rao', phone: '+91-9876543006', email: 'mahesh@greentech.in', address: 'Bengaluru, Karnataka', notes: 'Quality issues and repeated delivery failures.',
    certificates: [
      { name: 'ISO 9001', certNo: 'ISO-9001-GT-2021', issueDate: '2021-03-01', expiryDate: '2024-02-29' },
      { name: 'BBBEE Certificate', certNo: 'BBBEE-GT-2022', issueDate: '2022-06-01', expiryDate: '2023-05-31' },
      { name: 'Tax Clearance', certNo: 'TAX-GT-2023', issueDate: '2023-01-01', expiryDate: '2024-01-01' },
    ],
    metrics: { onTimeDelivery: 45, qualityRating: 2.5, priceCompetitiveness: 3.0 },
    blacklistLog: [
      { date: '2024-11-15', reason: 'Supplied substandard cable drums - failed QC inspection', setBy: 'Ramesh Kumar (QA)' },
      { date: '2024-08-22', reason: 'Repeated late deliveries on 3 consecutive POs', setBy: 'Suresh Patel (Procurement)' },
    ],
  },
  {
    id: 7, name: 'Singh Civil Contractors', categories: ['Civil', 'Labour'], region: 'Madhya Pradesh', status: 'preferred', rating: 4.0,
    contactPerson: 'Gurpreet Singh', phone: '+91-9876543007', email: 'gurpreet@scc.in', address: 'Indore, Madhya Pradesh', notes: 'Excellent civil works team. Preferred for site development.',
    certificates: [
      { name: 'ISO 9001', certNo: 'ISO-9001-SCC-2023', issueDate: '2023-05-01', expiryDate: '2026-04-30' },
      { name: 'OHSAS 18001', certNo: 'OHSAS-SCC-2023', issueDate: '2023-05-01', expiryDate: '2025-04-30' },
      { name: 'Tax Clearance', certNo: 'TAX-SCC-2024', issueDate: '2024-03-15', expiryDate: '2025-03-14' },
      { name: 'GST Registration', certNo: 'GST-SCC-2020', issueDate: '2020-08-01', expiryDate: '2025-07-31' },
    ],
    metrics: { onTimeDelivery: 91, qualityRating: 4.2, priceCompetitiveness: 3.8 },
    blacklistLog: [],
  },
  {
    id: 8, name: 'Rapid Logistics', categories: ['Services'], region: 'West Bengal', status: 'blacklisted', rating: 2.5,
    contactPerson: 'Subrata Dey', phone: '+91-9876543008', email: 'subrata@rapidlogistics.in', address: 'Kolkata, West Bengal', notes: 'Frequent loss of materials in transit.',
    certificates: [
      { name: 'GST Registration', certNo: 'GST-RL-2021', issueDate: '2021-04-01', expiryDate: '2026-03-31' },
      { name: 'Tax Clearance', certNo: 'TAX-RL-2023', issueDate: '2023-06-01', expiryDate: '2024-05-31' },
    ],
    metrics: { onTimeDelivery: 52, qualityRating: 2.0, priceCompetitiveness: 3.5 },
    blacklistLog: [
      { date: '2024-10-05', reason: 'Lost shipment worth ₹4.2L - insurance claim pending', setBy: 'Anita Verma (Logistics)' },
      { date: '2024-07-12', reason: 'Damaged goods on delivery - 3 incidents', setBy: 'Rohit Sharma (Warehouse)' },
      { date: '2024-03-28', reason: 'Unauthorized subcontracting of delivery route', setBy: 'Management' },
    ],
  },
  {
    id: 9, name: 'Pioneer Fabricators', categories: ['Mechanical', 'Civil'], region: 'Chhattisgarh', status: 'standard', rating: 3.0,
    contactPerson: 'Dilip Verma', phone: '+91-9876543009', email: 'dilip@pioneerfab.in', address: 'Raipur, Chhattisgarh', notes: '',
    certificates: [
      { name: 'ISO 9001', certNo: 'ISO-9001-PF-2022', issueDate: '2022-09-01', expiryDate: '2025-08-31' },
      { name: 'OHSAS 18001', certNo: 'OHSAS-PF-2020', issueDate: '2020-12-01', expiryDate: '2023-11-30' },
      { name: 'Tax Clearance', certNo: 'TAX-PF-2024', issueDate: '2024-01-01', expiryDate: fmtDate(addDays(new Date(), 10)) },
    ],
    metrics: { onTimeDelivery: 65, qualityRating: 3.2, priceCompetitiveness: 3.0 },
    blacklistLog: [],
  },
  {
    id: 10, name: 'Hitech Cables Ltd', categories: ['Electrical'], region: 'Maharashtra', status: 'preferred', rating: 4.3,
    contactPerson: 'Neha Kulkarni', phone: '+91-9876543010', email: 'neha@hitechcables.in', address: 'Mumbai, Maharashtra', notes: 'Premium cable supplier for all mining electrification projects.',
    certificates: [
      { name: 'BBBEE Certificate', certNo: 'BBBEE-HCL-2024', issueDate: '2024-03-01', expiryDate: '2025-02-28' },
      { name: 'ISO 9001', certNo: 'ISO-9001-HCL-2023', issueDate: '2023-04-01', expiryDate: '2026-03-31' },
      { name: 'ISO 14001', certNo: 'ISO-14001-HCL-2023', issueDate: '2023-04-01', expiryDate: '2026-03-31' },
      { name: 'OHSAS 18001', certNo: 'OHSAS-HCL-2024', issueDate: '2024-01-15', expiryDate: '2026-01-14' },
      { name: 'GST Registration', certNo: 'GST-HCL-2019', issueDate: '2019-06-01', expiryDate: '2024-05-31' },
    ],
    metrics: { onTimeDelivery: 96, qualityRating: 4.5, priceCompetitiveness: 3.8 },
    blacklistLog: [],
  },
];

function daysUntil(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function complianceStatus(expiryDate: string) {
  const d = daysUntil(expiryDate);
  if (d < 0) return { label: 'Expired', color: '#ff3d3d', badge: 'EXPIRED' } as const;
  if (d <= 30) return { label: 'Expiring', color: '#f5a623', badge: `${d}d` } as const;
  return { label: 'Valid', color: '#00e676', badge: null } as const;
}

function overallCompliance(v: Vendor) {
  let expired = 0, expiring = 0, valid = 0;
  for (const c of v.certificates) {
    const cs = complianceStatus(c.expiryDate);
    if (cs.label === 'Expired') expired++;
    else if (cs.label === 'Expiring') expiring++;
    else valid++;
  }
  if (expired > 0) return { label: 'Expired', color: '#ff3d3d' } as const;
  if (expiring > 0) return { label: 'Attention', color: '#f5a623' } as const;
  return { label: 'Compliant', color: '#00e676' } as const;
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

function getOverallScore(m: PerformanceMetrics) {
  return (m.onTimeDelivery / 20 + m.qualityRating + m.priceCompetitiveness) / 3;
}

function getOtdColor(pct: number) {
  return pct >= 90 ? '#00e676' : pct >= 75 ? '#f5a623' : '#ff3d3d';
}

const EMPTY_VENDOR = {
  name: '', categories: [] as Category[], region: '', contactPerson: '', phone: '', email: '', address: '', notes: '',
};

export default function ProcurementVendors() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'compliance' | 'scorecard' | 'blacklist'>('compliance');
  const [newOpen, setNewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_VENDOR);
  const [blacklistInput, setBlacklistInput] = useState({ reason: '', setBy: '' });
  const [showAddBlacklist, setShowAddBlacklist] = useState(false);
  const [vendors, setVendors] = useState(VENDORS);

  const filtered = vendors.filter(v => {
    if (categoryFilter !== 'All' && !v.categories.includes(categoryFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.region.toLowerCase().includes(q) || v.categories.some(c => c.toLowerCase().includes(q));
    }
    return true;
  });

  function openDetail(v: Vendor) {
    setSelectedVendor(v);
    setEditMode(false);
    setDetailTab('compliance');
    setShowAddBlacklist(false);
    setBlacklistInput({ reason: '', setBy: '' });
    setDetailOpen(true);
  }

  function handleStatusChange(v: Vendor, status: VendorStatus) {
    setVendors(prev => prev.map(x => x.id === v.id ? { ...x, status } : x));
    setSelectedVendor(prev => prev && prev.id === v.id ? { ...prev, status } : prev);
    toast.success(status === 'preferred' ? 'Marked as Preferred' : status === 'blacklisted' ? 'Blacklisted' : 'Reverted to Standard');
  }

  function handleAddBlacklist() {
    if (!blacklistInput.reason || !blacklistInput.setBy || !selectedVendor) return;
    const entry: BlacklistEntry = { date: fmtDate(new Date()), reason: blacklistInput.reason, setBy: blacklistInput.setBy };
    setVendors(prev => prev.map(x => x.id === selectedVendor.id ? { ...x, status: 'blacklisted', blacklistLog: [entry, ...x.blacklistLog] } : x));
    setSelectedVendor(prev => prev && prev.id === selectedVendor.id ? { ...prev, status: 'blacklisted', blacklistLog: [entry, ...prev.blacklistLog] } : prev);
    setBlacklistInput({ reason: '', setBy: '' });
    setShowAddBlacklist(false);
    toast.success('Blacklist entry added');
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendor) return;
    setVendors(prev => prev.map(x => x.id === selectedVendor.id ? { ...x, ...editForm } : x));
    const updated = vendors.find(v => v.id === selectedVendor.id);
    if (updated) setSelectedVendor({ ...updated, ...editForm });
    toast.success('Vendor updated');
    setEditMode(false);
  }

  function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name || editForm.categories.length === 0 || !editForm.region) { toast.error('Name, categories, and region are required'); return; }
    const newVendor: Vendor = {
      id: Math.max(...vendors.map(v => v.id)) + 1,
      name: editForm.name,
      categories: editForm.categories,
      region: editForm.region,
      status: 'standard',
      rating: 3.0,
      contactPerson: editForm.contactPerson,
      phone: editForm.phone,
      email: editForm.email,
      address: editForm.address,
      notes: editForm.notes,
      certificates: CERT_NAMES.slice(0, Math.floor(Math.random() * 4) + 2).map((c, i) => ({
        name: c,
        certNo: `${c.substring(0, 4)}-NEW-${new Date().getFullYear()}`,
        issueDate: fmtDate(new Date()),
        expiryDate: fmtDate(addDays(new Date(), 365)),
      })),
      metrics: { onTimeDelivery: 85, qualityRating: 3.5, priceCompetitiveness: 3.5 },
      blacklistLog: [],
    };
    setVendors(prev => [...prev, newVendor]);
    setNewOpen(false);
    setEditForm(EMPTY_VENDOR);
    toast.success('Vendor created');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setVendors(prev => prev.filter(v => v.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDetailOpen(false);
    setDeleteTarget(null);
    setSelectedVendor(null);
    toast.success('Vendor deleted');
  }

  function openNewDialog() {
    setEditForm(EMPTY_VENDOR);
    setNewOpen(true);
  }

  function openEditForm() {
    if (!selectedVendor) return;
    setEditForm({
      name: selectedVendor.name,
      categories: [...selectedVendor.categories],
      region: selectedVendor.region,
      contactPerson: selectedVendor.contactPerson,
      phone: selectedVendor.phone,
      email: selectedVendor.email,
      address: selectedVendor.address,
      notes: selectedVendor.notes,
    });
    setEditMode(true);
  }

  function catPill(cat: Category) {
    return (
      <span key={cat} className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-tight"
        style={{ backgroundColor: CATEGORY_COLORS[cat] + '15', color: CATEGORY_COLORS[cat] }}>
        {cat}
      </span>
    );
  }

  function complianceDot(v: Vendor) {
    const cs = overallCompliance(v);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cs.color }} />
        <span className="text-[10px] font-medium" style={{ color: cs.color }}>{cs.label}</span>
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
            <span className="text-[10px] font-mono" style={{ color: getOtdColor(v.metrics.onTimeDelivery) }}>{v.metrics.onTimeDelivery}% OTD</span>
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
          <span className="text-[10px] font-mono" style={{ color: getOtdColor(v.metrics.onTimeDelivery) }}>{v.metrics.onTimeDelivery}%</span>
        </div>
      </button>
    );
  }

  const colHeaderClass = 'text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]';

  return (
    <div className="space-y-4 p-6">
      {/* Toolbar */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Building2 size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Vendor Directory</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{vendors.length}</span>
          <button onClick={openNewDialog} className="vc-btn-primary flex items-center gap-1.5 ml-2"><Plus size={13} /> New Vendor</button>
        </div>
        <div className="px-3 pb-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors by name, category, region..." className="bg-[#0f1318] border border-[#252e3a] rounded-lg pl-8 pr-8 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-full" />
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

      {/* Vendor Cards / List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div className="vc-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-[#0f1318]">
                <th className={colHeaderClass}>Vendor</th>
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
                      <span className="font-mono font-medium" style={{ color: getOtdColor(v.metrics.onTimeDelivery) }}>{v.metrics.onTimeDelivery}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="py-8 text-center text-[#5a6878] text-[11px]">No vendors found</div>}
        </div>
      )}

      {/* Vendor Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={o => { setDetailOpen(o); if (!o) setEditMode(false); }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVendor?.name || 'Vendor Details'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedVendor && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Contact Person</label>
                  <div className="text-[#e2e8f0]">{selectedVendor.contactPerson}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Phone</label>
                  <div className="text-[#e2e8f0]">{selectedVendor.phone}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Email</label>
                  <div className="text-[#e2e8f0]">{selectedVendor.email}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Region</label>
                  <div className="text-[#e2e8f0]">{selectedVendor.region}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Address</label>
                  <div className="text-[#e2e8f0]">{selectedVendor.address}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Notes</label>
                  <div className="text-[#e2e8f0]">{selectedVendor.notes || '—'}</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => { setDetailOpen(false); setEditMode(false); }} className="vc-btn-ghost">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Vendor Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVendor} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Name</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="vc-input" required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Region</label>
                <input value={editForm.region} onChange={e => setEditForm({...editForm, region: e.target.value})} className="vc-input" required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Contact Person</label>
                <input value={editForm.contactPerson} onChange={e => setEditForm({...editForm, contactPerson: e.target.value})} className="vc-input" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Phone</label>
                <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="vc-input" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="vc-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Address</label>
                <input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="vc-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="vc-input" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setNewOpen(false)} className="vc-btn-ghost">Cancel</button>
              <button type="submit" className="vc-btn-primary">Create Vendor</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Vendor</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Delete <strong className="text-[#f5a623]">{deleteTarget?.name}</strong>? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
