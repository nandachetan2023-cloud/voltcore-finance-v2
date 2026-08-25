'use client';
import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Pencil, Trash2, Search, ExternalLink, DollarSign, Calendar, CheckCircle2, Loader2, AlertTriangle, User, Building2, Percent, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';

interface Milestone {
  id: number;
  description: string;
  scheduledAmount: number;
  percentOfTotal: number;
  dueDate: string;
  amountPaid: number;
  percentComplete: number;
  balance: number;
  status: 'Pending' | 'Paid' | 'Overdue';
}

interface RetentionRelease {
  id: number;
  date: string;
  amountReleased: number;
  status: string;
  condition: string;
}

interface ProgressClaim {
  id: number;
  claimNo: string;
  date: string;
  amountClaimed: number;
  certifiedAmount: number;
  amountPaid: number;
  balance: number;
  status: 'Submitted' | 'Certified' | 'Paid' | 'Disputed';
}

interface Subcontract {
  id: number;
  subcontractNo: string;
  vendor: string;
  project: string;
  scopeSummary: string;
  value: number;
  startDate: string;
  endDate: string;
  percentComplete: number;
  status: 'Active' | 'Completed' | 'On Hold' | 'Terminated';
  retentionPercent: number;
  notes: string;
  milestones: Milestone[];
  retentionReleases: RetentionRelease[];
  progressClaims: ProgressClaim[];
}

const SC_COLUMNS: ExportColumn<Subcontract>[] = [
  { header: 'Subcontract No', accessor: 'subcontractNo' },
  { header: 'Vendor', accessor: 'vendor' },
  { header: 'Project', accessor: 'project' },
  { header: 'Scope Summary', accessor: 'scopeSummary' },
  { header: 'Value', accessor: 'value' },
  { header: 'Start Date', accessor: (r) => r.startDate?.split('T')[0] ?? '' },
  { header: 'End Date', accessor: (r) => r.endDate?.split('T')[0] ?? '' },
  { header: '% Complete', accessor: 'percentComplete' },
  { header: 'Retention %', accessor: 'retentionPercent' },
  { header: 'Milestones', accessor: (r) => r.milestones.length },
  { header: 'Status', accessor: 'status' },
  { header: 'Notes', accessor: 'notes' },
];

const SC_IMPORT_FIELDS: ImportField[] = [
  { key: 'subcontractNo', label: 'Subcontract No', required: true },
  { key: 'vendor', label: 'Vendor' },
  { key: 'project', label: 'Project' },
  { key: 'scopeSummary', label: 'Scope Summary' },
  { key: 'value', label: 'Value', type: 'number' },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'percentComplete', label: '% Complete', type: 'number' },
  { key: 'retentionPercent', label: 'Retention %', type: 'number' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
];
const SC_SAMPLE_ROW = { subcontractNo: 'SUB-2026-001', vendor: 'KEC International', project: 'Godda Unit 5', scopeSummary: 'Electrical works', value: 5000000, startDate: '2026-02-01', endDate: '2026-08-31', percentComplete: 25, retentionPercent: 10, status: 'Active', notes: '' };

function generateMockSubcontracts(): Subcontract[] {
  const now = new Date(); const d = (off: number) => new Date(now.getTime() + off * 86400000).toISOString().split('T')[0];
  const ms = (id: number, desc: string, pct: number, dueOff: number, status: Milestone['status']): Milestone => ({ id, description: desc, scheduledAmount: 0, percentOfTotal: pct, dueDate: d(dueOff), amountPaid: status === 'Paid' ? 1000000 : 0, percentComplete: status === 'Paid' ? 100 : status === 'Overdue' ? 80 : 0, balance: status === 'Paid' ? 0 : 1000000, status });
  const pc = (id: number, no: string, dateOff: number, claimed: number, certified: number, paid: number, status: ProgressClaim['status']): ProgressClaim => ({ id, claimNo: no, date: d(dateOff), amountClaimed: claimed, certifiedAmount: certified, amountPaid: paid, balance: claimed - paid, status });
  return [
    { id:1, subcontractNo:'SC-2026-001', vendor:'Singh Civil Contractors', project:'BALCO', scopeSummary:'Site levelling, foundations & civil works for switchyard', value:185000000, startDate:d(-120), endDate:d(60), percentComplete:65, status:'Active', retentionPercent:5, notes:'', milestones:[ms(1,'Mobilisation',10,-150,'Paid'),ms(2,'Foundation Complete',30,-60,'Paid'),ms(3,'Structural Steel Erection',35,15,'Pending'),ms(4,'Finishing & Handover',25,60,'Pending')], retentionReleases:[], progressClaims:[pc(1,'PC-001',-90,25000000,24000000,24000000,'Paid'),pc(2,'PC-002',-30,35000000,34000000,30000000,'Paid')] },
    { id:2, subcontractNo:'SC-2026-002', vendor:'Pioneer Fabricators', project:'NTPC', scopeSummary:'Fabrication & erection of structural steel for turbine building', value:320000000, startDate:d(-90), endDate:d(90), percentComplete:40, status:'Active', retentionPercent:5, notes:'', milestones:[ms(5,'Mobilisation & Shop Drawings',10,-120,'Paid'),ms(6,'Steel Fabrication 50%',25,-45,'Paid'),ms(7,'Steel Fabrication 100%',25,30,'Pending'),ms(8,'Erection & Bolting',40,90,'Pending')], retentionReleases:[], progressClaims:[pc(3,'PC-003',-60,50000000,48000000,48000000,'Paid')] },
    { id:3, subcontractNo:'SC-2026-003', vendor:'MinMet Engineering', project:'Coal India', scopeSummary:'Crusher house & conveyor structure mechanical works', value:95000000, startDate:d(-60), endDate:d(-5), percentComplete:100, status:'Completed', retentionPercent:5, notes:'Completed on schedule. Final inspection pending.', milestones:[ms(9,'Design & Engineering',10,-90,'Paid'),ms(10,'Equipment Supply',40,-40,'Paid'),ms(11,'Installation & Commissioning',50,-5,'Paid')], retentionReleases:[{ id:1, date:d(-10), amountReleased:4750000, status:'Pending', condition:'Defect liability period - 6 months' }], progressClaims:[pc(4,'PC-004',-70,15000000,15000000,15000000,'Paid'),pc(5,'PC-005',-30,25000000,25000000,25000000,'Paid')] },
    { id:4, subcontractNo:'SC-2026-004', vendor:'GreenTech Electricals', project:'Hindalco', scopeSummary:'HT cable laying & termination for smelter expansion', value:78000000, startDate:d(-45), endDate:d(45), percentComplete:25, status:'Active', retentionPercent:5, notes:'', milestones:[ms(12,'Material Delivery',20,-60,'Paid'),ms(13,'Cable Tray Installation',30,0,'Pending'),ms(14,'Cable Laying',35,30,'Pending'),ms(15,'Termination & Testing',15,45,'Pending')], retentionReleases:[], progressClaims:[pc(6,'PC-006',-20,12000000,10000000,8000000,'Paid')] },
    { id:5, subcontractNo:'SC-2026-005', vendor:'Rapid Logistics', project:'BALCO', scopeSummary:'Logistics & material handling for CPP project', value:45000000, startDate:d(-90), endDate:d(-15), percentComplete:100, status:'Completed', retentionPercent:3, notes:'All deliveries completed.', milestones:[ms(16,'Mobilisation',15,-120,'Paid'),ms(17,'Phase I Deliveries',40,-60,'Paid'),ms(18,'Phase II Deliveries',45,-15,'Paid')], retentionReleases:[{ id:2, date:d(-5), amountReleased:1350000, status:'Pending', condition:'Proof of delivery docs verification' }], progressClaims:[pc(7,'PC-007',-80,8000000,8000000,8000000,'Paid'),pc(8,'PC-008',-40,12000000,12000000,12000000,'Paid'),pc(9,'PC-009',-15,10000000,10000000,10000000,'Paid')] },
    { id:6, subcontractNo:'SC-2026-006', vendor:'Singh Civil Contractors', project:'JSW', scopeSummary:'Blast furnace area civil & structural works', value:210000000, startDate:d(-30), endDate:d(150), percentComplete:15, status:'Active', retentionPercent:5, notes:'Just commenced excavation.', milestones:[ms(19,'Site Mobilisation',5,-45,'Paid'),ms(20,'Excavation & Piling',25,15,'Pending'),ms(21,'Concrete Foundations',40,75,'Pending'),ms(22,'Superstructure',30,150,'Pending')], retentionReleases:[], progressClaims:[] },
    { id:7, subcontractNo:'SC-2026-007', vendor:'Pioneer Fabricators', project:'NTPC', scopeSummary:'Cooling tower pipe fabrication & installation', value:135000000, startDate:d(-15), endDate:d(45), percentComplete:85, status:'Active', retentionPercent:5, notes:'On track for early completion.', milestones:[ms(23,'Pipe Procurement',20,-45,'Paid'),ms(24,'Fabrication 50%',30,-15,'Paid'),ms(25,'Fabrication Complete',25,15,'Paid'),ms(26,'Site Installation',25,45,'Pending')], retentionReleases:[], progressClaims:[pc(10,'PC-010',-40,25000000,25000000,25000000,'Paid'),pc(11,'PC-011',-10,30000000,28000000,20000000,'Certified')] },
  ];
}

const VENDORS = ['Singh Civil Contractors', 'Pioneer Fabricators', 'MinMet Engineering', 'GreenTech Electricals', 'Rapid Logistics'];
const PROJECTS = ['BALCO', 'NTPC', 'Hindalco', 'Coal India'];
const STATUSES: Subcontract['status'][] = ['Active', 'Completed', 'On Hold', 'Terminated'];
const STATUS_STYLES: Record<Subcontract['status'], string> = {
  Active: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  Completed: 'bg-[#00e676]/15 text-[#00e676]',
  'On Hold': 'bg-[#f5a623]/15 text-[#f5a623]',
  Terminated: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};
const CLAIM_STATUS_STYLES: Record<ProgressClaim['status'], string> = {
  Submitted: 'bg-[#00d4ff]/15 text-[#00d4ff]',
  Certified: 'bg-[#f5a623]/15 text-[#f5a623]',
  Paid: 'bg-[#00e676]/15 text-[#00e676]',
  Disputed: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};
const MILESTONE_STATUS_STYLES: Record<Milestone['status'], string> = {
  Pending: 'bg-[#f5a623]/15 text-[#f5a623]',
  Paid: 'bg-[#00e676]/15 text-[#00e676]',
  Overdue: 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

function formatCr(amount: number): string {
  return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
}

function formatInr(amount: number): string {
  return '₹' + (amount ?? 0).toLocaleString('en-IN');
}

const EMPTY_FORM: Subcontract = {
  id: 0, subcontractNo: '', vendor: VENDORS[0], project: PROJECTS[0], scopeSummary: '', value: 0,
  startDate: '', endDate: '', percentComplete: 0, status: 'Active', retentionPercent: 5, notes: '',
  milestones: [], retentionReleases: [], progressClaims: [],
};

const STYLE = {
  btn: 'bg-[#f5a623] hover:bg-[#e8991a] text-[#0f1318] text-[11px] font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors',
  btnOutline: 'border border-[#252e3a] hover:border-[#f5a623] text-[#e2e8f0] text-[11px] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors',
  ghost: 'text-[#8899aa] hover:text-[#e2e8f0] text-[11px] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors',
  input: 'bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-full',
  label: 'text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block',
};

export default function ProcurementSubcontracts() {
  const [records, setRecords] = useState<Subcontract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subcontract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcontract | null>(null);
  const [detailTarget, setDetailTarget] = useState<Subcontract | null>(null);
  const [claimTargetSub, setClaimTargetSub] = useState<Subcontract | null>(null);
  const [form, setForm] = useState<Subcontract>(JSON.parse(JSON.stringify(EMPTY_FORM)));
  const [quickFilter, setQuickFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<keyof Subcontract>('subcontractNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'general' | 'milestones' | 'retention' | 'claims'>('general');
  const [claimForm, setClaimForm] = useState({ claimNo: '', date: '', amountClaimed: 0 });

  useEffect(() => {
    fetch('/api/procurement/subcontracts')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch subcontracts');
        return res.json();
      })
      .then(json => {
        if (json.success) {
          if (json.data && json.data.length > 0) {
            setRecords(json.data);
          } else {
            setRecords(generateMockSubcontracts());
            toast.info('Showing sample data — API unavailable');
          }
        } else {
          setRecords(generateMockSubcontracts());
          toast.info('Showing sample data — API unavailable');
        }
      })
      .catch(err => {
        setRecords(generateMockSubcontracts());
        toast.info('Showing sample data — API unavailable');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredByStatus = useMemo(() => {
    if (quickFilter === 'All') return records;
    return records.filter(r => r.status === quickFilter);
  }, [records, quickFilter]);

  const tc = useTableControls(filteredByStatus, (r) => `${r.subcontractNo} ${r.vendor} ${r.project} ${r.scopeSummary}`);

  const sorted = useMemo(() => {
    const arr = [...tc.pageItems];
    arr.sort((a, b) => {
      let cmp = 0;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [tc.pageItems, sortKey, sortDir]);

  const handleSort = (key: keyof Subcontract) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const generateSubcontractNo = () => {
    const year = new Date().getFullYear();
    const existing = new Set(records.map(r => r.subcontractNo));
    let seq = records.length + 1;
    let candidate = `SC-${year}-${String(seq).padStart(3, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `SC-${year}-${String(seq).padStart(3, '0')}`; }
    return candidate;
  };
  const openNew = () => {
    setEditTarget(null);
    setForm({ ...JSON.parse(JSON.stringify(EMPTY_FORM)), subcontractNo: generateSubcontractNo() });
    setFormOpen(true);
  };

  const openDetail = (r: Subcontract) => {
    setDetailTarget(JSON.parse(JSON.stringify(r)));
    setDetailTab('general');
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.subcontractNo || !form.vendor || !form.project || !form.value || !form.startDate || !form.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const res = await fetch(`/api/procurement/subcontracts/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Update failed');
        setRecords(prev => prev.map(r => r.id === json.data.id ? json.data : r));
        toast.success('Subcontract updated');
      } else {
        const res = await fetch('/api/procurement/subcontracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Create failed');
        setRecords(prev => [...prev, json.data]);
        toast.success('Subcontract created');
      }
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/procurement/subcontracts/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Delete failed');
      setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
      toast.success(`Subcontract ${deleteTarget.subcontractNo} deleted`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleUpdateDetail = async () => {
    if (!detailTarget) return;
    try {
      const res = await fetch(`/api/procurement/subcontracts/${detailTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailTarget),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Update failed');
      setRecords(prev => prev.map(r => r.id === json.data.id ? json.data : r));
      setDetailTarget(json.data);
      toast.success('Subcontract details updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const recordPayment = (milestone: Milestone) => {
    toast.success(`Payment recorded for "${milestone.description}" — ${formatInr(milestone.balance)}`);
  };

  const updateMilestonePct = (msId: number, val: number) => {
    if (!detailTarget) return;
    const upd = detailTarget.milestones.map(m => m.id === msId ? { ...m, percentComplete: Math.min(100, Math.max(0, val)) } : m);
    setDetailTarget({ ...detailTarget, milestones: upd, percentComplete: Math.round(upd.reduce((s, m) => s + m.percentComplete * m.percentOfTotal, 0) / 100) });
  };

  const addProgressClaim = async () => {
    if (!claimTargetSub || !claimForm.claimNo || !claimForm.date || !claimForm.amountClaimed) {
      toast.error('Please fill claim no, date and amount');
      return;
    }
    try {
      const res = await fetch(`/api/procurement/subcontracts/${claimTargetSub.id}/progress-claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to add claim');
      setRecords(prev => prev.map(r => r.id === json.data.id ? json.data : r));
      if (detailTarget?.id === json.data.id) setDetailTarget(json.data);
      toast.success('Progress claim added');
    } catch (err: any) {
      toast.error(err.message);
    }
    setClaimFormOpen(false);
    setClaimForm({ claimNo: '', date: '', amountClaimed: 0 });
  };

  const totalRetention = (sc: Subcontract) => Math.round(sc.value * sc.retentionPercent / 100);
  const totalReleased = (sc: Subcontract) => sc.retentionReleases.filter(r => r.status === 'Released').reduce((s, r) => s + r.amountReleased, 0);

  if (importOpen) {
    return (
      <ImportWizard
        title="Subcontracts"
        fields={SC_IMPORT_FIELDS}
        keyField="subcontractNo"
        existingKeys={new Set(records.map(r => r.subcontractNo))}
        commitEndpoint="/api/procurement/subcontracts/import"
        sampleRow={SC_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
    );
  }

  if (error) return (
    <div className="p-6">
      <div className="vc-panel p-8 text-center">
        <AlertTriangle size={28} className="mx-auto mb-3 text-[#ff3d3d]" />
        <p className="text-[#e2e8f0] font-semibold text-[13px]">Failed to load subcontracts</p>
        <p className="text-[#8899aa] text-[11px] mt-1">{error}</p>
        <button onClick={() => window.location.reload()} className={STYLE.btn + ' mt-5 mx-auto inline-flex'}>Retry</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="space-y-4">
      <div className="vc-panel">
        <div className="p-4"><Skeleton className="h-8 bg-[#252e3a] w-full mb-4" /></div>
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="px-4 py-2"><Skeleton className="h-6 bg-[#252e3a] w-full" /></div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Subcontract Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span>
          <div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search subcontract, vendor..." /></div>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={SC_COLUMNS} filename="procurement-subcontracts" />
          <div className="ml-2 flex gap-1">
            {['All', 'Active', 'Completed', 'On Hold', 'Terminated'].map(f => (
              <button key={f} onClick={() => setQuickFilter(f)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${quickFilter === f ? 'bg-[#f5a623] text-[#0f1318] font-semibold' : 'text-[#8899aa] hover:text-[#e2e8f0]'}`}
              >{f}</button>
            ))}
          </div>
          <button onClick={openNew} className={STYLE.btn}>
            <Plus size={13} /> New Subcontract
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#0f1318]">
                {[
                  { key: 'subcontractNo', label: 'Subcontract #' },
                  { key: 'vendor', label: 'Vendor/Contractor' },
                  { key: 'project', label: 'Project/Site' },
                  { key: '' as any, label: 'Scope Summary' },
                  { key: 'value', label: 'Value' },
                  { key: 'startDate', label: 'Start Date' },
                  { key: 'endDate', label: 'End Date' },
                  { key: 'percentComplete', label: '% Complete' },
                  { key: 'status', label: 'Status' },
                  { key: '' as any, label: 'Retention Held' },
                  { key: '' as any, label: '' },
                ].map(h => (
                  <th key={h.label || 'actions'} onClick={() => h.key && handleSort(h.key)}
                    className={`text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] ${h.key ? 'cursor-pointer hover:text-[#f5a623] select-none' : ''}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2028]">
              {sorted.map(r => {
                const retHeld = Math.round(r.value * r.retentionPercent / 100);
                return (
                  <tr key={r.id} className="hover:bg-[#141920]">
                    <td className="py-2.5 px-3">
                      <button onClick={() => openDetail(r)} className="text-[#f5a623] font-mono hover:underline flex items-center gap-1">
                        {r.subcontractNo} <ExternalLink size={10} />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.vendor}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{r.project}</td>
                    <td className="py-2.5 px-3 text-[#5a6878] max-w-[160px] truncate" title={r.scopeSummary}>{r.scopeSummary}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">{formatCr(r.value)}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.startDate}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.endDate}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#0f1318] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: r.percentComplete + '%', backgroundColor: r.percentComplete === 100 ? '#00e676' : '#f5a623' }} />
                        </div>
                        <span className="text-[10px] font-mono text-[#8899aa]">{r.percentComplete}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`vc-badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{formatInr(retHeld)}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditTarget(r); setForm({ ...JSON.parse(JSON.stringify(r)), scopeSummary: r.scopeSummary || '', notes: r.notes || '' }); setFormOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => { openDetail(r); }} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="View"><FileText size={13} /></button>
                        <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="py-12 text-center text-[#5a6878]">No matching subcontracts found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit' : 'New'} Subcontract</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Subcontract No</label>
              <input value={form.subcontractNo} readOnly className="vc-input opacity-60" placeholder="Auto-generated" />
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
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Value</label>
              <input type="number" value={form.value} onChange={e => setForm({...form, value: Number(e.target.value)})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Subcontract['status']})} className="vc-input">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Retention %</label>
              <input type="number" value={form.retentionPercent} onChange={e => setForm({...form, retentionPercent: Number(e.target.value)})} className="vc-input" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Scope Summary</label>
              <textarea value={form.scopeSummary} onChange={e => setForm({...form, scopeSummary: e.target.value})} className="vc-input" rows={2} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="vc-input" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="vc-btn-primary">{saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subcontract Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {detailTarget && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Subcontract No</label>
                  <div className="text-[#e2e8f0]">{detailTarget.subcontractNo}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Vendor</label>
                  <div className="text-[#e2e8f0]">{detailTarget.vendor}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project</label>
                  <div className="text-[#e2e8f0]">{detailTarget.project}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Status</label>
                  <span className="vc-badge">{detailTarget.status}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Value</label>
                  <div className="text-[#e2e8f0] font-mono">{formatInr(detailTarget.value)}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">% Complete</label>
                  <div className="text-[#e2e8f0]">{detailTarget.percentComplete}%</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Start Date</label>
                  <div className="text-[#e2e8f0]">{detailTarget.startDate?.split('T')[0]}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">End Date</label>
                  <div className="text-[#e2e8f0]">{detailTarget.endDate?.split('T')[0]}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Scope</label>
                  <div className="text-[#e2e8f0]">{detailTarget.scopeSummary}</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setDetailOpen(false)} className="vc-btn-ghost">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={claimFormOpen} onOpenChange={setClaimFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Progress Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Claim No</label>
              <input value={claimForm.claimNo} onChange={e => setClaimForm({...claimForm, claimNo: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Date</label>
              <input type="date" value={claimForm.date} onChange={e => setClaimForm({...claimForm, date: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Amount Claimed</label>
              <input type="number" value={claimForm.amountClaimed} onChange={e => setClaimForm({...claimForm, amountClaimed: Number(e.target.value)})} className="vc-input" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setClaimFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button className="vc-btn-primary">Submit</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2">
              <AlertTriangle size={16} /> Delete Subcontract
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete subcontract <strong className="text-[#f5a623]">{deleteTarget?.subcontractNo}</strong> — {deleteTarget?.vendor} ({deleteTarget?.project})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={STYLE.ghost}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
