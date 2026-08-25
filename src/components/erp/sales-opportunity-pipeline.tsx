'use client';
import { useState, useMemo, useEffect, DragEvent } from 'react';
import { Plus, Search, GripVertical, X, Calendar, User, DollarSign, Target, CheckSquare, Clock, Building2, BarChart3, Filter, TrendingUp, TrendingDown, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Sector = 'Power' | 'Mining' | 'Industrial';
type Stage = 'Identify' | 'Qualify' | 'Bid Prep' | 'Submitted' | 'Negotiate' | 'Won' | 'Lost';

interface Contact { name: string; role: string; phone: string; email: string; }
interface Document_ { name: string; type: string; uploadDate: string; status: 'Uploaded' | 'Pending'; }
interface BidCostItem { item: string; estimated: number; actual: number; }
interface Competitor { name: string; estimatedBid: number; strengths: string; weaknesses: string; }
interface StageHistory { stage: Stage; timestamp: string; }

interface Opportunity {
  id: number;
  projectName: string;
  clientName: string;
  value: number;
  sector: Sector;
  winProbability: number;
  dueDate: string;
  bdOwner: string;
  stage: Stage;
  scope: string;
  contacts: Contact[];
  documents: Document_[];
  bidCosts: BidCostItem[];
  competitors: Competitor[];
  notes: string;
  goNoGo: { label: string; checked: boolean; signOff: string }[];
  stageHistory: StageHistory[];
}

function generateMockOpportunities(): Opportunity[] {
  const now = new Date(); const d = (off: number) => new Date(now.getTime() + off * 86400000).toISOString().split('T')[0];
  const baseOpp = (id: number, overrides: Partial<Opportunity>): Opportunity => ({
    id, projectName: '', clientName: '', value: 0, sector: 'Power', winProbability: 50, dueDate: d(30),
    bdOwner: 'Amit Sharma', stage: 'Identify', scope: '', contacts: [], documents: [], bidCosts: [], competitors: [],
    notes: '', goNoGo: [
      { label: 'Budget Available', checked: false, signOff: '' },
      { label: 'Technical Capability', checked: false, signOff: '' },
      { label: 'Resource Available', checked: false, signOff: '' },
      { label: 'Strategic Fit', checked: false, signOff: '' },
    ],
    stageHistory: [{ stage: 'Identify', timestamp: new Date().toLocaleString('en-IN', { hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }],
    ...overrides,
  });
  return [
    baseOpp(1, { projectName:'Barh STPP Switchyard Package', clientName:'NTPC Limited', value:450000000, sector:'Power', winProbability:65, dueDate:d(45), bdOwner:'Amit Sharma', stage:'Bid Prep', scope:'Design, supply & install 500kV switchyard including GIS, busbars, protection relays.','contacts':[{name:'Rajiv Mehta',role:'CPO',phone:'+91-9876543001',email:'rajiv@ntpc.co.in'}],'documents':[{name:'RFP Document',type:'Technical',uploadDate:d(-10),status:'Uploaded'},{name:'Employer Requirements',type:'Commercial',uploadDate:d(-10),status:'Uploaded'}],bidCosts:[{item:'Pre-bid Engineering',estimated:850000,actual:720000},{item:'Site Visit & Data Collection',estimated:350000,actual:310000}],competitors:[{name:'L&T Ltd',estimatedBid:480000000,strengths:'Strong local presence',weaknesses:'Premium pricing'}],stageHistory:[{stage:'Identify',timestamp:'10-Apr-2026 09:30'},{stage:'Qualify',timestamp:'18-Apr-2026 14:15'},{stage:'Bid Prep',timestamp:'25-Apr-2026 11:00'}] }),
    baseOpp(2, { projectName:'Jharia Mine Electrical Infrastructure', clientName:'Coal India Ltd', value:285000000, sector:'Mining', winProbability:55, dueDate:d(30), bdOwner:'Rohit Joshi', stage:'Submitted', scope:'Complete electrical infrastructure for underground mine expansion including MV switchgear, transformers, cable networks.','contacts':[{name:'Suresh Pandey',role:'GM - Projects',phone:'+91-9876543002',email:'suresh@coalindia.in'}],'documents':[{name:'Technical Proposal',type:'Technical',uploadDate:d(-5),status:'Uploaded'},{name:'Commercial Bid',type:'Commercial',uploadDate:d(-5),status:'Uploaded'}],bidCosts:[{item:'Engineering Design',estimated:1200000,actual:980000},{item:'Proposal Preparation',estimated:600000,actual:550000}],competitors:[{name:'Siemens India',estimatedBid:300000000,strengths:'Technology leader',weaknesses:'Higher cost'}],stageHistory:[{stage:'Identify',timestamp:'15-Mar-2026 10:00'},{stage:'Qualify',timestamp:'28-Mar-2026 16:30'},{stage:'Bid Prep',timestamp:'05-Apr-2026 09:00'},{stage:'Submitted',timestamp:'20-Apr-2026 15:00'}] }),
    baseOpp(3, { projectName:'Mahan Smelter Electrical BOP', clientName:'Hindalco Industries', value:620000000, sector:'Industrial', winProbability:40, dueDate:d(60), bdOwner:'Priya Verma', stage:'Qualify', scope:'Complete electrical balance of plant for 360 KTPA aluminium smelter expansion.','contacts':[{name:'Vikram Agarwal',role:'VP - Projects',phone:'+91-9876543003',email:'vikram@hindalco.com'}],'documents':[{name:'Pre-Qualification Document',type:'Technical',uploadDate:d(-3),status:'Uploaded'}],bidCosts:[{item:'Technical Study',estimated:2000000,actual:1500000}],competitors:[{name:'ABB India',estimatedBid:650000000,strengths:'Automation expertise',weaknesses:'Limited power experience'}],stageHistory:[{stage:'Identify',timestamp:'01-Apr-2026 11:00'},{stage:'Qualify',timestamp:'15-Apr-2026 10:30'}] }),
    baseOpp(4, { projectName:'BALCO CPP 540 MW BOP', clientName:'BALCO (Vedanta)', value:390000000, sector:'Power', winProbability:80, dueDate:d(-15), bdOwner:'Amit Sharma', stage:'Won', scope:'BOP electrical works for 540 MW captive power plant.','contacts':[{name:'Anil Dubey',role:'Head - Electrical',phone:'+91-9876543004',email:'anil@balco.in'}],'documents':[{name:'Technical Proposal',type:'Technical',uploadDate:d(-60),status:'Uploaded'},{name:'Commercial Bid',type:'Commercial',uploadDate:d(-60),status:'Uploaded'}],bidCosts:[{item:'Engineering',estimated:1500000,actual:1200000},{item:'Proposal',estimated:500000,actual:450000}],competitors:[{name:'BHEL',estimatedBid:420000000,strengths:'PSU preference',weaknesses:'Long delivery'}],stageHistory:[{stage:'Identify',timestamp:'10-Feb-2026 09:00'},{stage:'Qualify',timestamp:'20-Feb-2026 14:00'},{stage:'Bid Prep',timestamp:'05-Mar-2026 10:00'},{stage:'Submitted',timestamp:'25-Mar-2026 16:00'},{stage:'Negotiate',timestamp:'05-Apr-2026 11:30'},{stage:'Won',timestamp:'02-May-2026 15:00'}] }),
    baseOpp(5, { projectName:'Vijayanagar Steel Cabling Works', clientName:'JSW Steel Ltd', value:175000000, sector:'Industrial', winProbability:25, dueDate:d(40), bdOwner:'Sneha Patel', stage:'Identify', scope:'HT/LT cable laying, termination and testing for expansion phase III.','contacts':[{name:'Kiran Shetty',role:'DGM - Electrical',phone:'+91-9876543005',email:'kiran@jsw.in'}],'documents':[],bidCosts:[],competitors:[{name:'KEC International',estimatedBid:180000000,strengths:'Cabling specialist',weaknesses:''}],stageHistory:[{stage:'Identify',timestamp:'20-Apr-2026 10:00'}] }),
    baseOpp(6, { projectName:'Neyveli Lignite Handling E&I', clientName:'NLC India Ltd', value:510000000, sector:'Mining', winProbability:45, dueDate:d(75), bdOwner:'Vikram Singh', stage:'Bid Prep', scope:'Electrical & instrumentation for belt conveyors, crushers, stackers & reclaimers.','contacts':[{name:'Mohan Krishnan',role:'GM - E&M',phone:'+91-9876543006',email:'mohan@nlcindia.in'}],'documents':[{name:'RFP Document',type:'Technical',uploadDate:d(-2),status:'Uploaded'}],bidCosts:[{item:'Pre-bid Engineering',estimated:1800000,actual:0},{item:'Bid Bond Cost',estimated:250000,actual:0}],competitors:[{name:'L&T Ltd',estimatedBid:530000000,strengths:'EPC capabilities',weaknesses:'Premium pricing'},{name:'Tata Projects',estimatedBid:495000000,strengths:'Cost competitive',weaknesses:'Less mining experience'}],stageHistory:[{stage:'Identify',timestamp:'10-May-2026 09:00'},{stage:'Qualify',timestamp:'18-May-2026 11:30'},{stage:'Bid Prep',timestamp:'25-May-2026 14:00'}] }),
    baseOpp(7, { projectName:'Mundra FGD Electrical Package', clientName:'Tata Power', value:340000000, sector:'Power', winProbability:20, dueDate:d(-30), bdOwner:'Priya Verma', stage:'Lost', scope:'FGD electrical package for 4x800MW units - lost to L&T.','contacts':[{name:'Rohan Desai',role:'Manager - Electrical',phone:'+91-9876543007',email:'rohan@tatapower.com'}],'documents':[{name:'Final Technical Proposal',type:'Technical',uploadDate:d(-60),status:'Uploaded'},{name:'Commercial Bid',type:'Commercial',uploadDate:d(-60),status:'Uploaded'}],bidCosts:[{item:'Bid Preparation',estimated:900000,actual:850000}],competitors:[{name:'L&T Ltd',estimatedBid:325000000,strengths:'Aggressive pricing',weaknesses:''}],stageHistory:[{stage:'Identify',timestamp:'05-Jan-2026 10:00'},{stage:'Qualify',timestamp:'20-Jan-2026 14:30'},{stage:'Bid Prep',timestamp:'05-Feb-2026 09:00'},{stage:'Submitted',timestamp:'25-Feb-2026 16:00'},{stage:'Negotiate',timestamp:'15-Mar-2026 11:00'},{stage:'Lost',timestamp:'30-Apr-2026 17:00'}] }),
  ];
}

const SECTORS: Sector[] = ['Power', 'Mining', 'Industrial'];
const STAGES: Stage[] = ['Identify', 'Qualify', 'Bid Prep', 'Submitted', 'Negotiate', 'Won', 'Lost'];
const BD_OWNERS = ['Amit Sharma', 'Priya Verma', 'Rohit Joshi', 'Sneha Patel', 'Vikram Singh', 'Ananya Gupta'];
const SECTOR_COLORS: Record<Sector, string> = { Power: '#00e676', Mining: '#f5a623', Industrial: '#ff6b6b' };

const NOW = new Date();
const DAY = 86400000;
const dd = (offset: number) => new Date(NOW.getTime() + offset * DAY).toISOString().split('T')[0];

const STAGE_COLORS: Record<Stage, string> = {
  Identify: '#5a6878', Qualify: '#00d4ff', 'Bid Prep': '#a78bfa', Submitted: '#f5a623', Negotiate: '#ff6b6b', Won: '#00e676', Lost: '#ff3d3d',
};

const IND = (n: number) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  return '₹' + (n ?? 0).toLocaleString('en-IN');
};

const dateColor = (d: string) => {
  const diff = Math.ceil((new Date(d).getTime() - NOW.getTime()) / DAY);
  if (diff < 0) return '#ff3d3d';
  if (diff <= 7) return '#ff3d3d';
  if (diff <= 14) return '#f5a623';
  return '#00e676';
};

export default function SalesOpportunityPipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [valueFilter, setValueFilter] = useState<string>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('All');
  const [searchText, setSearchText] = useState('');
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [dialogTab, setDialogTab] = useState<string>('Scope');
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragSource, setDragSource] = useState<{ oppId: number; fromStage: Stage } | null>(null);

  useEffect(() => {
    fetch('/api/sales/opportunities')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          if (json.data && json.data.length > 0) {
            setOpportunities(json.data);
          } else {
            setOpportunities(generateMockOpportunities());
            toast.info('Showing sample data — API unavailable');
          }
        } else {
          setOpportunities(generateMockOpportunities());
          toast.info('Showing sample data — API unavailable');
        }
      })
      .catch(() => {
        setOpportunities(generateMockOpportunities());
        toast.info('Showing sample data — API unavailable');
      })
      .finally(() => setLoading(false));
  }, []);

  const emptyOpp = (): Opportunity => ({
    id: Date.now(), projectName: '', clientName: '', value: 0, sector: 'Power', winProbability: 50,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], bdOwner: 'Amit Sharma',
    stage: 'Identify', scope: '', contacts: [], documents: [], bidCosts: [], competitors: [], notes: '',
    goNoGo: [
      { label: 'Budget Available', checked: false, signOff: '' },
      { label: 'Technical Capability', checked: false, signOff: '' },
      { label: 'Resource Available', checked: false, signOff: '' },
      { label: 'Strategic Fit', checked: false, signOff: '' },
    ],
    stageHistory: [{ stage: 'Identify', timestamp: new Date().toLocaleString('en-IN', { hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }],
  });

  const openCreate = () => { setSelectedOpp(emptyOpp()); setDialogTab('Scope'); setDetailOpen(true); };
  const handleDelete = async () => {
    if (!selectedOpp) return;
    if (!window.confirm(`Delete "${selectedOpp.projectName || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/sales/opportunities?id=${selectedOpp.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setOpportunities(prev => prev.filter(o => o.id !== selectedOpp.id));
        toast.success('Opportunity deleted');
        setDetailOpen(false);
      } else {
        toast.error('Failed to delete opportunity');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const filtered = useMemo(() => {
    return opportunities.filter(o => {
      if (sectorFilter !== 'All' && o.sector !== sectorFilter) return false;
      if (ownerFilter !== 'All' && o.bdOwner !== ownerFilter) return false;
      if (deadlineFilter === 'This Week') { const d = new Date(o.dueDate); const weekEnd = new Date(NOW.getTime() + 7 * DAY); if (d > weekEnd || d < NOW) return false; }
      if (deadlineFilter === 'This Month') { const d = new Date(o.dueDate); const monthEnd = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0); if (d > monthEnd || d < NOW) return false; }
      if (deadlineFilter === 'Next Quarter') { const qStart = new Date(NOW.getFullYear(), Math.floor(NOW.getMonth() / 3) * 3 + 3, 1); const qEnd = new Date(NOW.getFullYear(), Math.floor(NOW.getMonth() / 3) * 3 + 6, 0); const d = new Date(o.dueDate); if (d < qStart || d > qEnd) return false; }
      if (valueFilter !== 'All') {
        if (valueFilter === '< ₹1Cr' && o.value >= 10000000) return false;
        if (valueFilter === '₹1-5Cr' && (o.value < 10000000 || o.value > 50000000)) return false;
        if (valueFilter === '₹5-10Cr' && (o.value < 50000000 || o.value > 100000000)) return false;
        if (valueFilter === '> ₹10Cr' && o.value <= 100000000) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!o.projectName.toLowerCase().includes(q) && !o.clientName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [opportunities, sectorFilter, valueFilter, ownerFilter, deadlineFilter, searchText]);

  const totalValue = opportunities.reduce((s, o) => s + o.value, 0);
  const totalWeighted = opportunities.reduce((s, o) => s + o.value * o.winProbability / 100, 0);
  const wonCount = opportunities.filter(o => o.stage === 'Won').length;
  const lostCount = opportunities.filter(o => o.stage === 'Lost').length;
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
  const overdueCount = opportunities.filter(o => new Date(o.dueDate) < NOW && o.stage !== 'Won' && o.stage !== 'Lost').length;
  const activeCount = opportunities.filter(o => o.stage !== 'Won' && o.stage !== 'Lost').length;
  const activeValue = opportunities.filter(o => o.stage !== 'Won' && o.stage !== 'Lost').reduce((s, o) => s + o.value, 0);

  const grouped = useMemo(() => {
    const g: Record<Stage, Opportunity[]> = { Identify: [], Qualify: [], 'Bid Prep': [], Submitted: [], Negotiate: [], Won: [], Lost: [] };
    filtered.forEach(o => { if (g[o.stage]) g[o.stage].push(o); });
    return g;
  }, [filtered]);

  const maxStageValue = Math.max(...STAGES.map(st => opportunities.filter(o => o.stage === st).reduce((s, o) => s + o.value, 0)), 1);

  const handleDragStart = (opp: Opportunity) => setDragSource({ oppId: opp.id, fromStage: opp.stage });
  const handleDrop = (targetStage: Stage) => {
    if (!dragSource || dragSource.fromStage === targetStage) { setDragSource(null); return; }
    setOpportunities(prev => prev.map(o => o.id !== dragSource.oppId ? o : { ...o, stage: targetStage, stageHistory: [...o.stageHistory, { stage: targetStage, timestamp: new Date().toLocaleString('en-IN', { hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }] }));
    toast.success(`Moved to ${targetStage}`);
    setDragSource(null);
  };

  const openDetail = (opp: Opportunity) => { setSelectedOpp(JSON.parse(JSON.stringify(opp))); setDialogTab('Scope'); setDetailOpen(true); };
  const updateOppField = <K extends keyof Opportunity>(key: K, value: Opportunity[K]) => { if (!selectedOpp) return; setSelectedOpp({ ...selectedOpp, [key]: value }); };
  const saveDetail = async () => {
    if (!selectedOpp) return;
    try {
      const isNew = !opportunities.find(o => o.id === selectedOpp.id);
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch('/api/sales/opportunities', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedOpp),
      });
      const json = await res.json();
      if (json.success) {
        if (isNew) {
          setOpportunities(prev => [...prev, json.data]);
          toast.success('Opportunity created');
        } else {
          setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? json.data : o));
          toast.success('Opportunity updated');
        }
        setDetailOpen(false);
      } else {
        toast.error('Failed to save opportunity');
      }
    } catch {
      toast.error('Network error');
    }
  };
  const addContact = () => { if (!selectedOpp) return; updateOppField('contacts', [...selectedOpp.contacts, { name: '', role: '', phone: '', email: '' }]); };
  const updateContact = (i: number, field: keyof Contact, value: string) => { if (!selectedOpp) return; const c = [...selectedOpp.contacts]; c[i] = { ...c[i], [field]: value }; updateOppField('contacts', c); };
  const addDocument = () => { if (!selectedOpp) return; updateOppField('documents', [...selectedOpp.documents, { name: '', type: '', uploadDate: new Date().toISOString().split('T')[0], status: 'Pending' }]); };
  const updateDocument = (i: number, field: keyof Document_, value: string) => { if (!selectedOpp) return; const d = [...selectedOpp.documents]; (d[i] as any)[field] = value; updateOppField('documents', d); };
  const addBidCost = () => { if (!selectedOpp) return; updateOppField('bidCosts', [...selectedOpp.bidCosts, { item: '', estimated: 0, actual: 0 }]); };
  const updateBidCost = (i: number, field: keyof BidCostItem, value: number | string) => { if (!selectedOpp) return; const b = [...selectedOpp.bidCosts]; (b[i] as any)[field] = value; updateOppField('bidCosts', b); };
  const addCompetitor = () => { if (!selectedOpp) return; updateOppField('competitors', [...selectedOpp.competitors, { name: '', estimatedBid: 0, strengths: '', weaknesses: '' }]); };
  const updateCompetitor = (i: number, field: keyof Competitor, value: string | number) => { if (!selectedOpp) return; const c = [...selectedOpp.competitors]; (c[i] as any)[field] = value; updateOppField('competitors', c); };
  const toggleGoNoGo = (i: number) => { if (!selectedOpp) return; const g = [...selectedOpp.goNoGo]; g[i] = { ...g[i], checked: !g[i].checked }; updateOppField('goNoGo', g); };
  const updateSignOff = (i: number, value: string) => { if (!selectedOpp) return; const g = [...selectedOpp.goNoGo]; g[i] = { ...g[i], signOff: value }; updateOppField('goNoGo', g); };

  const filterSelect = (val: string, setter: (v: string) => void, label: string) => (
    <select value={val} onChange={e => setter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none cursor-pointer min-w-[100px]">{label.split(',').map(s => <option key={s} value={s}>{s}</option>)}</select>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#f5a623]" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[#ff3d3d] text-center py-8">{error}</div>
    );
  }

  return (
    <div className="space-y-4 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#f5a623]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Sales Opportunity Pipeline</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-[#5a6878]">{opportunities.length} opportunities</span>
          <span className="w-[1px] h-3 bg-[#252e3a]" />
          <span className="flex items-center gap-1"><TrendingUp size={12} className="text-[#00e676]" /><span className="text-[#00e676] font-semibold">{IND(totalValue)}</span></span>
          <span className="w-[1px] h-3 bg-[#252e3a]" />
          <span className="flex items-center gap-1"><Target size={12} className="text-[#f5a623]" /><span className="text-[#f5a623] font-semibold">{IND(totalWeighted)}</span><span className="text-[#5a6878]">weighted</span></span>
          <span className="w-[1px] h-3 bg-[#252e3a]" />
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5a623] text-[#0f1318] text-[11px] font-bold hover:bg-[#e8891a] transition-colors"><Plus size={13} /> Add Opportunity</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Win Rate</div><div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{winRate}%</div><div className="text-[9px] text-[#5a6878] mt-0.5">{wonCount} Won / {closedCount} Closed</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Weighted Pipeline</div><div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{IND(totalWeighted)}</div><div className="text-[9px] text-[#5a6878] mt-0.5">{totalValue > 0 ? ((totalWeighted / totalValue) * 100).toFixed(0) : 0}% of total value</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Active Opportunities</div><div className="text-[20px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{activeCount}</div><div className="text-[9px] text-[#5a6878] mt-0.5">{IND(activeValue)}</div></div>
        <div className="vc-stat-card relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: overdueCount > 0 ? '#ff3d3d' : '#5a6878' }} /><div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Overdue Decisions</div><div className={`text-[20px] font-bold ${overdueCount > 0 ? 'text-[#ff3d3d]' : 'text-[#5a6878]'}`} style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{overdueCount}</div><div className="text-[9px] text-[#5a6878] mt-0.5">Past due date, not won/lost</div></div>
      </div>

      {/* Pipeline Value Bar */}
      <div className="bg-[#1e2630] border border-[#252e3a] rounded-xl p-4">
        <div className="flex items-center gap-1 mb-2">
          <BarChart3 size={12} className="text-[#5a6878]" />
          <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Pipeline Value by Stage</span>
          <span className="ml-auto text-[9px] text-[#5a6878]">Bar width = total value · Colour = stage</span>
        </div>
        <div className="flex h-8 rounded-lg overflow-hidden">
          {STAGES.map(st => {
            const stageVal = opportunities.filter(o => o.stage === st).reduce((s, o) => s + o.value, 0);
            const pct = (stageVal / maxStageValue) * 100;
            if (pct < 1) return null;
            return (
              <div key={st} style={{ width: pct + '%', minWidth: '36px', backgroundColor: STAGE_COLORS[st] + '25', borderRight: '1px solid #161c24', position: 'relative' }} className="flex items-center justify-center group cursor-default">
                <div className="absolute top-0 left-0 right-0 h-[2.5px]" style={{ backgroundColor: STAGE_COLORS[st] }} />
                <span className="text-[9px] font-semibold truncate px-1" style={{ color: STAGE_COLORS[st] }}>{st}</span>
                <div className="hidden group-hover:block absolute -top-9 left-1/2 -translate-x-1/2 bg-[#0f1318] border border-[#252e3a] rounded px-2.5 py-1.5 text-[10px] text-[#e2e8f0] whitespace-nowrap z-10 shadow-lg">
                  <div className="font-semibold" style={{ color: STAGE_COLORS[st] }}>{st}</div>
                  <div className="text-[#8899aa]">{opportunities.filter(o => o.stage === st).length} opps</div>
                  <div className="text-[#f5a623]">{IND(stageVal)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1e2630] border border-[#252e3a] rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-[#5a6878]" />
          {filterSelect(sectorFilter, setSectorFilter, 'All,Power,Mining,Industrial')}
          {filterSelect(valueFilter, setValueFilter, 'All,< ₹1Cr,₹1-5Cr,₹5-10Cr,> ₹10Cr')}
          {filterSelect(ownerFilter, setOwnerFilter, 'All,' + BD_OWNERS.join(','))}
          {filterSelect(deadlineFilter, setDeadlineFilter, 'All,This Week,This Month,Next Quarter')}
          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search project/client..." className="bg-[#0f1318] border border-[#252e3a] rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-[180px]" />
            {searchText && <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0]">×</button>}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 min-h-[500px]">
        {STAGES.map(st => {
          const cards = grouped[st];
          const stageTotal = cards.reduce((s, o) => s + o.value, 0);
          const stageWeighted = cards.reduce((s, o) => s + o.value * o.winProbability / 100, 0);
          const stageCount = cards.length;
          return (
            <div
              key={st}
              className="bg-[#1e2630] border border-[#252e3a] rounded-xl flex flex-col overflow-hidden transition-colors"
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#f5a623'; (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f5a62308'; }}
              onDragLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#252e3a'; (e.currentTarget as HTMLDivElement).style.backgroundColor = ''; }}
              onDrop={(e) => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#252e3a'; (e.currentTarget as HTMLDivElement).style.backgroundColor = ''; handleDrop(st); }}
            >
              {/* Column Header */}
              <div className="p-3 pb-2 border-b border-[#252e3a]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[st] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[#e2e8f0] uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{st}</div>
                  </div>
                  <span className="text-[10px] font-mono text-[#5a6878] bg-[#0f1318] rounded px-1.5 py-0.5">{stageCount}</span>
                </div>
                <div className="text-[9px] text-[#5a6878] pl-5">
                  <span>{IND(stageTotal)}</span>
                  {st !== 'Won' && st !== 'Lost' && <span className="ml-2 text-[#f5a623]">{IND(stageWeighted)} w.</span>}
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-450px)] min-h-[180px]">
                {cards.map(opp => {
                  const isUrgent = new Date(opp.dueDate) < NOW && opp.stage !== 'Won' && opp.stage !== 'Lost';
                  return (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={() => handleDragStart(opp)}
                      onDragEnd={() => setDragSource(null)}
                      onClick={() => openDetail(opp)}
                      className="bg-[#0f1318] border border-[#252e3a] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#f5a623]/60 transition-all group relative"
                    >
                      {isUrgent && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff3d3d] rounded-full border-2 border-[#1e2630]" title="Overdue" />}
                      <div className="flex items-start gap-2">
                        <GripVertical size={12} className="text-[#3a4a5a] mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-[#e2e8f0] leading-tight line-clamp-2">{opp.projectName}</div>
                          <div className="text-[9px] text-[#5a6878] truncate mt-0.5">{opp.clientName}</div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[13px] font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#f5a623' }}>{IND(opp.value)}</span>
                            <div className="relative w-8 h-8">
                              <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#252e3a" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke={opp.winProbability >= 70 ? '#00e676' : opp.winProbability >= 40 ? '#f5a623' : '#ff3d3d'} strokeWidth="3" strokeDasharray={`${opp.winProbability}, 100`} strokeLinecap="round" />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: opp.winProbability >= 70 ? '#00e676' : opp.winProbability >= 40 ? '#f5a623' : '#ff3d3d' }}>{opp.winProbability}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: SECTOR_COLORS[opp.sector] + '20', color: SECTOR_COLORS[opp.sector] }}>{opp.sector}</span>
                            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ backgroundColor: dateColor(opp.dueDate) + '20', color: dateColor(opp.dueDate) }}><Calendar size={7} />{opp.dueDate.slice(5)}</span>
                          </div>
                          <div className="text-[9px] text-[#5a6878] mt-1.5 flex items-center gap-1 border-t border-[#252e3a] pt-1.5">
                            <User size={9} /> {opp.bdOwner}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-[10px] text-[#3a4a5a] italic border border-dashed border-[#252e3a] rounded-lg">Drop here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedOpp?.projectName || 'Opportunity Details'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {selectedOpp && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Project Name</label>
                  <input value={selectedOpp.projectName} onChange={e => updateOppField('projectName', e.target.value)} className="vc-input" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Client Name</label>
                  <input value={selectedOpp.clientName} onChange={e => updateOppField('clientName', e.target.value)} className="vc-input" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Value</label>
                  <input type="number" value={selectedOpp.value} onChange={e => updateOppField('value', Number(e.target.value))} className="vc-input" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Win Probability (%)</label>
                  <input type="number" value={selectedOpp.winProbability} onChange={e => updateOppField('winProbability', Number(e.target.value))} className="vc-input" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Due Date</label>
                  <input type="date" value={selectedOpp.dueDate?.split('T')[0] || selectedOpp.dueDate} onChange={e => updateOppField('dueDate', e.target.value)} className="vc-input" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">BD Owner</label>
                  <input value={selectedOpp.bdOwner} onChange={e => updateOppField('bdOwner', e.target.value)} className="vc-input" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Scope</label>
                  <textarea value={selectedOpp.scope} onChange={e => updateOppField('scope', e.target.value)} className="vc-input" rows={3} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setDetailOpen(false)} className="vc-btn-ghost">Cancel</button>
            <button onClick={saveDetail} className="vc-btn-primary">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
