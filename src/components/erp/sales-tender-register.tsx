'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Plus, Pencil, Trash2, Search, X, ChevronUp, ChevronDown, Calendar, Users, ClipboardCheck, FileSpreadsheet, ExternalLink, Loader2, BarChart3, PieChart, TrendingUp, TrendingDown, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

interface TenderDocument { name: string; status: 'Submitted' | 'Pending' | 'Not Required'; uploadedDate: string; }
interface BidTeamMember { name: string; role: string; email: string; assignedDate: string; }
interface Evaluation { technicalScore: number; commercialScore: number; totalScore: number; evaluatorNotes: string; }
interface Tender {
  id: number;
  tenderNo: string;
  client: string;
  project: string;
  sector: 'Power' | 'Mining' | 'Industrial';
  rftIssueDate: string;
  submissionDeadline: string;
  estimatedValue: number;
  estimator: string;
  status: 'Identify' | 'Qualify' | 'Bid Prep' | 'Submitted' | 'Won' | 'Lost';
  description: string;
  documents: TenderDocument[];
  bidTeam: BidTeamMember[];
  evaluation: Evaluation;
}

const TENDER_COLUMNS: ExportColumn<Tender>[] = [
  { header: 'Tender No', accessor: 'tenderNo' },
  { header: 'Client', accessor: 'client' },
  { header: 'Project', accessor: 'project' },
  { header: 'Sector', accessor: 'sector' },
  { header: 'RFT Issue Date', accessor: (r) => r.rftIssueDate?.split('T')[0] ?? '' },
  { header: 'Submission Deadline', accessor: (r) => r.submissionDeadline?.split('T')[0] ?? '' },
  { header: 'Estimated Value', accessor: 'estimatedValue' },
  { header: 'Estimator', accessor: 'estimator' },
  { header: 'Status', accessor: 'status' },
];

const TENDER_IMPORT_FIELDS: ImportField[] = [
  { key: 'tenderNo', label: 'Tender No', required: true },
  { key: 'client', label: 'Client' },
  { key: 'project', label: 'Project' },
  { key: 'sector', label: 'Sector' },
  { key: 'rftIssueDate', label: 'RFT Issue Date', type: 'date' },
  { key: 'submissionDeadline', label: 'Submission Deadline', type: 'date' },
  { key: 'estimatedValue', label: 'Estimated Value', type: 'number' },
  { key: 'estimator', label: 'Estimator' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
];
const TENDER_SAMPLE_ROW = { tenderNo: 'TDR-2026-001', client: 'NTPC Ltd', project: 'Barh 500MW', sector: 'Power', rftIssueDate: '2026-01-01', submissionDeadline: '2026-02-15', estimatedValue: 45000000, estimator: 'Vikram Patel', status: 'Submitted', description: 'Annual maintenance contract' };

function generateMockTenders(): Tender[] {
  const baseDocs = (overrides: Partial<TenderDocument>[]): TenderDocument[] =>
    ['Technical Bid', 'Commercial Bid', 'EMD / Bank Guarantee', 'Pre-Qualification Document'].map((name, i) => ({
      name, status: overrides[i]?.status as TenderDocument['status'] || 'Pending',
      uploadedDate: overrides[i]?.uploadedDate || '',
    }));
  const baseTeam = (names: string[]): BidTeamMember[] => [
    { name: names[0] || '', role: 'Bid Manager', email: `${names[0]?.toLowerCase().replace(' ','.')}@voltcore.in`, assignedDate: '2026-05-01' },
    { name: names[1] || '', role: 'Technical Lead', email: `${names[1]?.toLowerCase().replace(' ','.')}@voltcore.in`, assignedDate: '2026-05-01' },
    { name: names[2] || '', role: 'Commercial Lead', email: `${names[2]?.toLowerCase().replace(' ','.')}@voltcore.in`, assignedDate: '2026-05-02' },
  ];
  return [
    { id:1, tenderNo:'T-2026-001', client:'NTPC Limited', project:'Barh Super Thermal Power Project 3x660MW', sector:'Power', rftIssueDate:'2026-04-01', submissionDeadline:'2026-06-15', estimatedValue:450000000, estimator:'Amit Sharma', status:'Bid Prep', description:'Design, supply & installation of 500kV switchyard package.', documents:baseDocs([{status:'Submitted'},{status:'Submitted'}] as any), bidTeam:baseTeam(['Amit Sharma','Ravi Kumar','Priya Singh']), evaluation:{ technicalScore:0, commercialScore:0, totalScore:0, evaluatorNotes:'' } },
    { id:2, tenderNo:'T-2026-002', client:'Coal India Ltd', project:'Jharia Mine Development & Infrastructure', sector:'Mining', rftIssueDate:'2026-03-15', submissionDeadline:'2026-05-30', estimatedValue:285000000, estimator:'Rohit Joshi', status:'Submitted', description:'Electrical infrastructure for underground mine expansion.', documents:baseDocs([{status:'Submitted'},{status:'Submitted'},{status:'Submitted'}] as any), bidTeam:baseTeam(['Rohit Joshi','Sneha Patel','Vikram Singh']), evaluation:{ technicalScore:82, commercialScore:76, totalScore:79, evaluatorNotes:'Strong technical proposal, commercial needs negotiation.' } },
    { id:3, tenderNo:'T-2026-003', client:'Hindalco Industries', project:'Mahan Aluminium Smelter Expansion', sector:'Industrial', rftIssueDate:'2026-05-01', submissionDeadline:'2026-07-20', estimatedValue:620000000, estimator:'Priya Verma', status:'Qualify', description:'Complete electrical balance of plant for smelter expansion.', documents:baseDocs([]), bidTeam:baseTeam(['Priya Verma','Ananya Gupta','Sandeep Rao']), evaluation:{ technicalScore:0, commercialScore:0, totalScore:0, evaluatorNotes:'' } },
    { id:4, tenderNo:'T-2026-004', client:'BALCO (Vedanta)', project:'CPP 540 MW Balance of Plant', sector:'Power', rftIssueDate:'2026-02-10', submissionDeadline:'2026-04-25', estimatedValue:390000000, estimator:'Amit Sharma', status:'Won', description:'BOP electrical works for captive power plant.', documents:baseDocs([{status:'Submitted'},{status:'Submitted'},{status:'Submitted'},{status:'Submitted'}] as any), bidTeam:baseTeam(['Amit Sharma','Ravi Kumar','Vikram Singh']), evaluation:{ technicalScore:88, commercialScore:84, totalScore:86, evaluatorNotes:'Best overall bid, awarded on 2026-05-02.' } },
    { id:5, tenderNo:'T-2026-005', client:'JSW Steel Ltd', project:'Vijayanagar Steel Plant Expansion Phase III', sector:'Industrial', rftIssueDate:'2026-04-20', submissionDeadline:'2026-06-10', estimatedValue:175000000, estimator:'Sneha Patel', status:'Identify', description:'HT/LT cable laying and termination works.', documents:baseDocs([]), bidTeam:baseTeam(['Sneha Patel','Rohit Joshi','Priya Verma']), evaluation:{ technicalScore:0, commercialScore:0, totalScore:0, evaluatorNotes:'' } },
    { id:6, tenderNo:'T-2026-006', client:'NLC India Ltd', project:'Neyveli Lignite Mine Expansion', sector:'Mining', rftIssueDate:'2026-05-10', submissionDeadline:'2026-08-05', estimatedValue:510000000, estimator:'Vikram Singh', status:'Bid Prep', description:'Electrical & instrumentation for lignite handling system.', documents:baseDocs([{status:'Submitted'}] as any), bidTeam:baseTeam(['Vikram Singh','Amit Sharma','Sneha Patel']), evaluation:{ technicalScore:0, commercialScore:0, totalScore:0, evaluatorNotes:'' } },
    { id:7, tenderNo:'T-2026-007', client:'Tata Power', project:'Mundra Ultra Mega Power Plant FGD Retrofit', sector:'Power', rftIssueDate:'2026-01-05', submissionDeadline:'2026-03-20', estimatedValue:340000000, estimator:'Priya Verma', status:'Lost', description:'FGD electrical package for 4x800MW units.', documents:baseDocs([{status:'Submitted'},{status:'Submitted'},{status:'Submitted'}] as any), bidTeam:baseTeam(['Priya Verma','Rohit Joshi','Ananya Gupta']), evaluation:{ technicalScore:75, commercialScore:70, totalScore:72.5, evaluatorNotes:'Competitive but lost on price to L&T.' } },
  ];
}

const SECTORS: Tender['sector'][] = ['Power', 'Mining', 'Industrial'];
const STATUSES: Tender['status'][] = ['Identify', 'Qualify', 'Bid Prep', 'Submitted', 'Won', 'Lost'];
const SECTOR_COLORS: Record<Tender['sector'], string> = { Power: '#00e676', Mining: '#f5a623', Industrial: '#ff6b6b' };
const STATUS_COLORS: Record<Tender['status'], string> = { Identify: '#5a6878', Qualify: '#00d4ff', 'Bid Prep': '#a78bfa', Submitted: '#f5a623', Won: '#00e676', Lost: '#ff3d3d' };

const EMPTY_DOCS: TenderDocument[] = [
  { name: 'Technical Bid', status: 'Pending', uploadedDate: '' },
  { name: 'Commercial Bid', status: 'Pending', uploadedDate: '' },
  { name: 'EMD / Bank Guarantee', status: 'Not Required', uploadedDate: '' },
  { name: 'Pre-Qualification Document', status: 'Pending', uploadedDate: '' },
  { name: 'Work Plan / Methodology', status: 'Pending', uploadedDate: '' },
  { name: 'HSE Policy', status: 'Not Required', uploadedDate: '' },
];
const EMPTY_TEAM: BidTeamMember[] = [
  { name: '', role: 'Bid Manager', email: '', assignedDate: '' },
  { name: '', role: 'Technical Lead', email: '', assignedDate: '' },
  { name: '', role: 'Commercial Lead', email: '', assignedDate: '' },
];
const EMPTY_EVAL: Evaluation = { technicalScore: 0, commercialScore: 0, totalScore: 0, evaluatorNotes: '' };
const EMPTY_FORM: Tender = {
  id: 0, tenderNo: '', client: '', project: '', sector: 'Power', rftIssueDate: '', submissionDeadline: '',
  estimatedValue: 0, estimator: '', status: 'Identify', description: '', documents: EMPTY_DOCS.map(d => ({ ...d })),
  bidTeam: EMPTY_TEAM.map(m => ({ ...m })), evaluation: { ...EMPTY_EVAL },
};



function formatCurrency(amount: number): string {
  if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
  return '₹' + (amount ?? 0).toLocaleString('en-IN');
}

function daysUntil(dateStr: string): { days: number; label: string; type: 'overdue' | 'urgent' | 'warning' | 'safe' } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { days: Math.abs(diff), label: `${Math.abs(diff)}d overdue`, type: 'overdue' };
  if (diff <= 7) return { days: diff, label: `${diff}d left`, type: 'urgent' };
  if (diff <= 14) return { days: diff, label: `${diff}d left`, type: 'warning' };
  return { days: diff, label: `${diff}d left`, type: 'safe' };
}

const STYLE = {
  btn: 'bg-[#f5a623] hover:bg-[#e8991a] text-[#0f1318] text-[11px] font-semibold rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors',
  btnOutline: 'border border-[#252e3a] hover:border-[#f5a623] text-[#e2e8f0] text-[11px] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors',
  ghost: 'text-[#8899aa] hover:text-[#e2e8f0] text-[11px] rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors',
  input: 'bg-[#0f1318] border border-[#252e3a] rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-full',
  label: 'text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block',
};

export default function SalesTenderRegister() {
  const [records, setRecords] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tender | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tender | null>(null);
  const [detailTarget, setDetailTarget] = useState<Tender | null>(null);
  const [form, setForm] = useState<Tender>(JSON.parse(JSON.stringify(EMPTY_FORM)));
  const [quickFilter, setQuickFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<keyof Tender>('tenderNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [detailTab, setDetailTab] = useState<'general' | 'documents' | 'team' | 'evaluation'>('general');
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    fetch('/api/sales/tenders')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          if (json.data && json.data.length > 0) {
            setRecords(json.data);
          } else {
            setRecords(generateMockTenders());
            toast.info('Showing sample data — API unavailable');
          }
        } else {
          setRecords(generateMockTenders());
          toast.info('Showing sample data — API unavailable');
        }
        setLoading(false);
      })
      .catch(() => {
        setRecords(generateMockTenders());
        toast.info('Showing sample data — API unavailable');
        setLoading(false);
      });
  }, []);

  const filteredByStatus = useMemo(() => {
    if (quickFilter === 'All') return records;
    return records.filter(r => r.status === quickFilter);
  }, [records, quickFilter]);

  const tc = useTableControls(filteredByStatus, (r) => `${r.tenderNo} ${r.client} ${r.project} ${r.estimator}`);

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

  const handleSort = (key: keyof Tender) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIcon = (key: keyof Tender) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />;
  };

  const generateTenderNo = () => {
    const year = new Date().getFullYear();
    const existing = new Set(records.map(r => r.tenderNo));
    let seq = records.length + 1;
    let candidate = `TDR/${year}/${String(seq).padStart(3, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `TDR/${year}/${String(seq).padStart(3, '0')}`; }
    return candidate;
  };
  const openNew = () => {
    setEditTarget(null);
    setForm({ ...JSON.parse(JSON.stringify(EMPTY_FORM)), tenderNo: generateTenderNo() });
    setFormOpen(true);
  };

  const openEdit = (r: Tender) => {
    setEditTarget(r);
    setForm(JSON.parse(JSON.stringify(r)));
    setFormOpen(true);
  };

  const openDetail = (r: Tender) => {
    setDetailTarget(r);
    setDetailTab('general');
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.tenderNo || !form.client || !form.project || !form.submissionDeadline || !form.estimator) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const url = editTarget ? `/api/sales/tenders/${form.id}` : '/api/sales/tenders';
      const method = editTarget ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) {
        if (editTarget) {
          setRecords(prev => prev.map(r => r.id === json.data.id ? json.data : r));
          toast.success('Tender updated successfully');
        } else {
          setRecords(prev => [...prev, json.data]);
          toast.success('Tender created successfully');
        }
        setFormOpen(false);
      } else {
        toast.error('Failed to save tender');
      }
    } catch {
      toast.error('Failed to save tender');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/sales/tenders/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        toast.success(`Tender ${deleteTarget.tenderNo} deleted`);
      } else {
        toast.error('Failed to delete tender');
      }
    } catch {
      toast.error('Failed to delete tender');
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleUpdateDetail = async () => {
    if (!detailTarget) return;
    try {
      const res = await fetch(`/api/sales/tenders/${detailTarget.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(detailTarget)
      });
      const json = await res.json();
      if (json.success) {
        setRecords(prev => prev.map(r => r.id === json.data.id ? json.data : r));
        toast.success('Tender details updated');
      } else {
        toast.error('Failed to update tender');
      }
    } catch {
      toast.error('Failed to update tender');
    }
  };

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-[#ff3d3d] text-[28px] font-bold mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Error</div>
        <div className="text-[#8899aa] text-[12px] mb-4">{error}</div>
        <button onClick={() => window.location.reload()} className={STYLE.btn}>Retry</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="vc-stat-card"><Skeleton className="h-12 bg-[#252e3a]" /></div>)}
      </div>
      <div className="vc-panel">
        <div className="p-4"><Skeleton className="h-8 bg-[#252e3a] w-full mb-4" /></div>
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="px-4 py-2"><Skeleton className="h-6 bg-[#252e3a] w-full" /></div>)}
      </div>
    </div>
  );

  if (importOpen) {
    return (
      <ImportWizard
        title="Tender Register"
        fields={TENDER_IMPORT_FIELDS}
        keyField="tenderNo"
        existingKeys={new Set(records.map(r => r.tenderNo))}
        commitEndpoint="/api/sales/tender-register/import"
        sampleRow={TENDER_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
    );
  }

  const statActive = records.filter(r => r.status === 'Bid Prep' || r.status === 'Qualify' || r.status === 'Identify').length;
  const statSubmitted = records.filter(r => r.status === 'Submitted').length;
  const statWon = records.filter(r => r.status === 'Won').length;
  const totalValue = records.reduce((s, r) => s + r.estimatedValue, 0);

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Active Tenders</div>
          <div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{statActive}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Submitted</div>
          <div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{statSubmitted}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Won</div>
          <div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{statWon}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a78bfa]" />
          <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Value</div>
          <div className="text-[20px] font-bold text-[#a78bfa]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{formatCurrency(totalValue)}</div>
        </div>
      </div>

      {/* Graphical Reports Toggle */}
      <div className="flex justify-end">
        <button onClick={() => setShowReports(!showReports)}
          className={'text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ' + (showReports ? 'bg-[#f5a623] text-[#0f1318] font-semibold' : 'bg-[#0a0d12] text-[#5a6878] border border-[#252e3a] hover:text-[#e2e8f0]')}>
          <BarChart3 size={14} /> {showReports ? 'Hide Reports' : 'Show Reports'}
        </button>
      </div>

      {/* Reports Dashboard */}
      {showReports && (
        <div className="space-y-4">
          {/* Row 1: Pipeline + Sector Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Pipeline */}
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-5">
              <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-[#f5a623]" /> Tender Pipeline
              </h3>
              <div className="space-y-0">
                {STATUSES.map((s, i) => {
                  const count = records.filter(r => r.status === s).length;
                  const maxCount = Math.max(...STATUSES.map(st => records.filter(r => r.status === st).length), 1);
                  const barW = (count / maxCount) * 100;
                  const color = STATUS_COLORS[s];
                  return (
                    <React.Fragment key={s}>
                      {i > 0 && (
                        <div className="flex items-center pl-10 h-5 text-[#252e3a]">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"/></svg>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="w-[90px] text-[10px] font-medium text-right" style={{ color }}>{s}</span>
                        <div className="flex-1 h-7 bg-[#0f1318] rounded overflow-hidden relative">
                          <div className="h-full rounded transition-all duration-500" style={{ width: barW + '%', backgroundColor: color + '30' }}>
                            <div className="h-full rounded" style={{ width: Math.min(count / maxCount * 100, 100) + '%', backgroundColor: color, opacity: 0.7 }} />
                          </div>
                        </div>
                        <span className="w-6 text-[11px] font-mono font-semibold text-right" style={{ color }}>{count}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Sector Donut + Estimators */}
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-5">
              <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-4 flex items-center gap-2">
                <PieChart size={14} className="text-[#f5a623]" /> Sector Distribution
              </h3>
              <div className="flex items-center gap-6">
                {/* SVG Donut */}
                <div className="relative shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {(() => {
                      const total = records.length || 1;
                      const bySec = SECTORS.map(s => ({ sector: s, count: records.filter(r => r.sector === s).length }));
                      const sectorsWithValue = bySec.filter(x => x.count > 0);
                      const circumference = 2 * Math.PI * 40;
                      let offset = 0;
                      return sectorsWithValue.map((item) => {
                        const pct = item.count / total;
                        const length = pct * circumference;
                        const seg = (
                          <circle key={item.sector} cx="60" cy="60" r="40" fill="none"
                            stroke={SECTOR_COLORS[item.sector]}
                            strokeWidth="20"
                            strokeDasharray={length + ' ' + (circumference - length)}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 60 60)"
                          />
                        );
                        offset += length;
                        return seg;
                      });
                    })()}
                    <circle cx="60" cy="60" r="40" fill="none" stroke="#252e3a" strokeWidth="20" strokeDasharray="0 1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{records.length}</div>
                      <div className="text-[8px] uppercase text-[#5a6878] tracking-wider">Total</div>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {SECTORS.map(s => {
                    const count = records.filter(r => r.sector === s).length;
                    const pct = records.length ? ((count / records.length) * 100).toFixed(1) : '0';
                    const val = records.filter(r => r.sector === s).reduce((acc, r) => acc + r.estimatedValue, 0);
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SECTOR_COLORS[s] }} />
                        <span className="flex-1 text-[11px] text-[#e2e8f0]">{s}</span>
                        <span className="text-[11px] font-mono text-[#8899aa]">{count} ({pct}%)</span>
                        <span className="text-[10px] font-mono text-[#5a6878]">{formatCurrency(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Estimator workload */}
              <div className="mt-4 pt-3 border-t border-[#252e3a]">
                <h4 className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-2">Estimator Workload</h4>
                <div className="space-y-1.5">
                  {(() => {
                    const estMap: Record<string, number> = {};
                    records.forEach(r => { estMap[r.estimator] = (estMap[r.estimator] || 0) + 1; });
                    const estArr = Object.entries(estMap).sort((a, b) => b[1] - a[1]);
                    const maxEst = Math.max(...estArr.map(([,c]) => c), 1);
                    return estArr.map(([name, count]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8899aa] w-[120px] truncate">{name}</span>
                        <div className="flex-1 h-4 bg-[#0f1318] rounded overflow-hidden">
                          <div className="h-full rounded transition-all duration-500" style={{ width: (count / maxEst * 100) + '%', backgroundColor: '#f5a623' }} />
                        </div>
                        <span className="text-[10px] font-mono text-[#e2e8f0] w-4 text-right">{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Value by Sector + Top Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-5">
              <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-4 flex items-center gap-2">
                <TrendingDown size={14} className="text-[#ff3d3d]" /> Value by Sector
              </h3>
              {(() => {
                const bySec = SECTORS.map(s => ({
                  sector: s,
                  total: records.filter(r => r.sector === s).reduce((acc, r) => acc + r.estimatedValue, 0),
                  count: records.filter(r => r.sector === s).length,
                }));
                const maxV = Math.max(...bySec.map(x => x.total), 1);
                return (
                  <div className="space-y-3">
                    {bySec.map(item => (
                      <div key={item.sector}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5 text-[11px] text-[#e2e8f0]">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SECTOR_COLORS[item.sector] }} />
                            {item.sector}
                          </span>
                          <span className="text-[11px] font-mono font-medium text-[#e2e8f0]">{formatCurrency(item.total)}</span>
                        </div>
                        <div className="h-5 bg-[#0f1318] rounded overflow-hidden">
                          <div className="h-full rounded transition-all duration-500 flex items-center justify-end pr-1"
                            style={{ width: (item.total / maxV * 100) + '%', backgroundColor: SECTOR_COLORS[item.sector] + '40' }}>
                            <div className="h-3 rounded" style={{ width: Math.min(item.total / maxV * 100, 100) + '%', backgroundColor: SECTOR_COLORS[item.sector], opacity: 0.7 }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-5">
              <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-[#00d4ff]" /> Top Clients by Value
              </h3>
              {(() => {
                const byCli: Record<string, number> = {};
                records.forEach(r => { byCli[r.client] = (byCli[r.client] || 0) + r.estimatedValue; });
                const sorted = Object.entries(byCli).sort((a, b) => b[1] - a[1]);
                const maxV = Math.max(...sorted.map(([,v]) => v), 1);
                return (
                  <div className="space-y-2">
                    {sorted.slice(0, 6).map(([client, val], i) => (
                      <div key={client}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="flex items-center gap-1.5 text-[10px] text-[#8899aa]">
                            <span className="text-[9px] text-[#5a6878] w-4">{i + 1}.</span>
                            {client}
                          </span>
                          <span className="text-[10px] font-mono text-[#e2e8f0]">{formatCurrency(val)}</span>
                        </div>
                        <div className="h-4 bg-[#0f1318] rounded overflow-hidden">
                          <div className="h-full rounded transition-all duration-500" style={{ width: (val / maxV * 100) + '%', backgroundColor: '#00d4ff' }} />
                        </div>
                      </div>
                    ))}
                    {sorted.length === 0 && <div className="text-[10px] text-[#5a6878] text-center py-4">No data</div>}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Row 3: Win/Loss Summary */}
          {records.length > 0 && (
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-xl p-5">
              <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-3 flex items-center gap-2">
                <ClipboardCheck size={14} className="text-[#00e676]" /> Win / Loss Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const won = records.filter(r => r.status === 'Won');
                  const lost = records.filter(r => r.status === 'Lost');
                  const submitted = records.filter(r => r.status === 'Submitted');
                  const wonVal = won.reduce((s, r) => s + r.estimatedValue, 0);
                  const lostVal = lost.reduce((s, r) => s + r.estimatedValue, 0);
                  const pendVal = submitted.reduce((s, r) => s + r.estimatedValue, 0);
                  const totalDecided = won.length + lost.length;
                  const winRate = totalDecided > 0 ? ((won.length / totalDecided) * 100).toFixed(1) : '0';
                  const maxV = Math.max(wonVal, lostVal, pendVal, 1);
                  return (
                    <>
                      <div className="bg-[#0f1318] rounded-lg p-4 border border-[#252e3a]">
                        <div className="text-[10px] uppercase tracking-[1px] text-[#5a6878] font-semibold mb-1">Win Rate</div>
                        <div className="text-[24px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{winRate}%</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#00e676]">{won.length} Won</span>
                          <span className="text-[#252e3a]">/</span>
                          <span className="text-[10px] text-[#ff3d3d]">{lost.length} Lost</span>
                        </div>
                      </div>
                      <div className="bg-[#0f1318] rounded-lg p-4 border border-[#252e3a]">
                        <div className="text-[10px] uppercase tracking-[1px] text-[#5a6878] font-semibold mb-1">Won Value</div>
                        <div className="text-[24px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{formatCurrency(wonVal)}</div>
                        <div className="h-2 bg-[#1a2028] rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-[#00e676] rounded-full" style={{ width: (wonVal / maxV * 100) + '%' }} />
                        </div>
                      </div>
                      <div className="bg-[#0f1318] rounded-lg p-4 border border-[#252e3a]">
                        <div className="text-[10px] uppercase tracking-[1px] text-[#5a6878] font-semibold mb-1">Pending Decision</div>
                        <div className="text-[24px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{formatCurrency(pendVal)}</div>
                        <div className="text-[10px] text-[#8899aa]">{submitted.length} tender(s) awaiting decision</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Tender Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{records.length}</span>
          <div className="ml-2"><SearchInput value={tc.search} onChange={tc.setSearch} placeholder="Search tender, client, project..." /></div>
          <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={TENDER_COLUMNS} filename="sales-tender-register" />
          <div className="ml-2 flex gap-1">
            {['All', 'Active', 'Won', 'Lost', 'Submitted'].map(f => (
              <button key={f} onClick={() => setQuickFilter(f)}
                className={'text-[10px] px-2 py-1 rounded transition-colors ' + (quickFilter === f ? 'bg-[#f5a623] text-[#0f1318] font-semibold' : 'text-[#8899aa] hover:text-[#e2e8f0]')}
              >{f}</button>
            ))}
          </div>
          <button onClick={openNew} className={STYLE.btn}>
            <Plus size={13} /> New Tender
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#0f1318]">
                {[
                  { key: 'tenderNo', label: 'Tender #' },
                  { key: 'client', label: 'Client' },
                  { key: 'project', label: 'Project' },
                  { key: 'sector', label: 'Sector' },
                  { key: 'rftIssueDate', label: 'RFT Issue Date' },
                  { key: 'submissionDeadline', label: 'Deadline' },
                  { key: 'estimatedValue', label: 'Est. Value' },
                  { key: 'estimator', label: 'Estimator' },
                  { key: 'status', label: 'Status' },
                  { key: '' as any, label: '' },
                ].map(h => (
                  <th key={h.label || 'actions'} onClick={() => h.key && handleSort(h.key)}
                    className={`text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] ${h.key ? 'cursor-pointer hover:text-[#f5a623] select-none' : ''}`}
                  >
                    {h.label}{h.key ? sortIcon(h.key) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2028]">
              {sorted.map(r => {
                const dd = daysUntil(r.submissionDeadline);
                const deadlineBadge = dd.type === 'safe'
                  ? 'bg-[#00e676]/15 text-[#00e676]'
                  : dd.type === 'warning'
                  ? 'bg-[#f5a623]/15 text-[#f5a623]'
                  : dd.type === 'urgent'
                  ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]'
                  : 'bg-[#ff3d3d]/20 text-[#ff3d3d] animate-pulse';
                return (
                  <tr key={r.id} className="hover:bg-[#141920]">
                    <td className="py-2.5 px-3">
                      <button onClick={() => openDetail(r)} className="text-[#f5a623] font-mono hover:underline flex items-center gap-1">
                        {r.tenderNo} <ExternalLink size={10} />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{r.client}</td>
                    <td className="py-2.5 px-3 text-[#8899aa] max-w-[160px] truncate" title={r.project}>{r.project}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: SECTOR_COLORS[r.sector] }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: SECTOR_COLORS[r.sector] }} />
                        {r.sector}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.rftIssueDate}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[#8899aa] font-mono">{r.submissionDeadline}</span>
                        <span className={`vc-badge text-[9px] ${deadlineBadge}`}>{dd.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#e2e8f0] font-mono font-medium">{formatCurrency(r.estimatedValue)}</td>
                    <td className="py-2.5 px-3 text-[#8899aa]">{r.estimator}</td>
                    <td className="py-2.5 px-3">
                      <span className="vc-badge" style={{ backgroundColor: STATUS_COLORS[r.status] + '26', color: STATUS_COLORS[r.status] }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => openDetail(r)} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10" title="Documents"><FileSpreadsheet size={13} /></button>
                        <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-[#5a6878]">No matching tenders found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit' : 'New'} Tender</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Tender No</label>
              <input value={form.tenderNo} readOnly className="vc-input opacity-60" placeholder="Auto-generated" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Client</label>
              <input value={form.client} onChange={e => setForm({...form, client: e.target.value})} className="vc-input" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project</label>
              <input value={form.project} onChange={e => setForm({...form, project: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Sector</label>
              <select value={form.sector} onChange={e => setForm({...form, sector: e.target.value as Tender['sector']})} className="vc-input">
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Tender['status']})} className="vc-input">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">RFT Issue Date</label>
              <input type="date" value={form.rftIssueDate} onChange={e => setForm({...form, rftIssueDate: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Submission Deadline</label>
              <input type="date" value={form.submissionDeadline} onChange={e => setForm({...form, submissionDeadline: e.target.value})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Estimated Value</label>
              <input type="number" value={form.estimatedValue} onChange={e => setForm({...form, estimatedValue: Number(e.target.value)})} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Estimator</label>
              <input value={form.estimator} onChange={e => setForm({...form, estimator: e.target.value})} className="vc-input" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="vc-input" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setFormOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="vc-btn-primary">{saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTarget?.tenderNo || 'Tender Details'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {detailTarget && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Client</label>
                  <div className="text-[#e2e8f0]">{detailTarget.client}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project</label>
                  <div className="text-[#e2e8f0]">{detailTarget.project}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Sector</label>
                  <span className="vc-badge">{detailTarget.sector}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Status</label>
                  <span className="vc-badge">{detailTarget.status}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">RFT Issue Date</label>
                  <div className="text-[#e2e8f0]">{detailTarget.rftIssueDate?.split('T')[0]}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Submission Deadline</label>
                  <div className="text-[#e2e8f0]">{detailTarget.submissionDeadline?.split('T')[0]}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Estimated Value</label>
                  <div className="text-[#e2e8f0] font-mono">{formatCurrency(detailTarget.estimatedValue)}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Estimator</label>
                  <div className="text-[#e2e8f0]">{detailTarget.estimator}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Description</label>
                  <div className="text-[#e2e8f0]">{detailTarget.description}</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setDetailOpen(false)} className="vc-btn-ghost">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Tender</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete tender <strong className="text-[#f5a623]">{deleteTarget?.tenderNo}</strong>? This action cannot be undone.
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
