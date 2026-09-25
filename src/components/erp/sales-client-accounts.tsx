'use client';
import { useState, useEffect, Fragment } from 'react';
import { Building2, Plus, Pencil, Trash2, Search, UserPlus, Phone, Mail, MapPin, Target, Clock, DollarSign, Briefcase, CalendarDays, ChevronDown, ChevronRight, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

type Sector = 'Power' | 'Mining' | 'Industrial';
type Strength = 'Strong' | 'Medium' | 'Weak';

interface Contact {
  id: number; name: string; role: string; phone: string; email: string; notes: string; strength: Strength;
}

interface Project {
  id: number; name: string; value: number; startDate: string; endDate: string; sector: Sector;
}

interface Opportunity {
  id: number; name: string; stage: string; value: number; winProbability: number; expectedClose: string; bdOwner: string;
}

interface Client {
  id: number; name: string; sector: Sector; strength: Strength; website: string; industry: string; notes: string;
  contacts: Contact[]; projects: Project[]; opportunities: Opportunity[];
}

const CLIENT_COLUMNS: ExportColumn<Client>[] = [
  { header: 'Client Name', accessor: 'name' },
  { header: 'Sector', accessor: 'sector' },
  { header: 'Industry', accessor: 'industry' },
  { header: 'Strength', accessor: 'strength' },
  { header: 'Website', accessor: 'website' },
  { header: 'Contacts', accessor: (r) => r.contacts?.length ?? 0 },
  { header: 'Projects', accessor: (r) => r.projects?.length ?? 0 },
  { header: 'Opportunities', accessor: (r) => r.opportunities?.length ?? 0 },
];

const CLIENT_IMPORT_FIELDS: ImportField[] = [
  { key: 'name', label: 'Client Name', required: true },
  { key: 'sector', label: 'Sector' },
  { key: 'strength', label: 'Strength' },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'notes', label: 'Notes' },
];
const CLIENT_SAMPLE_ROW = { name: 'L&T Construction', sector: 'Power', strength: 'Large', website: 'www.lnt.com', industry: 'Infrastructure', notes: 'Key strategic client' };

function generateMockClients(): Client[] {
  return [
    { id:1, name:'NTPC Limited', sector:'Power', strength:'Strong', website:'www.ntpc.co.in', industry:'Power Generation', notes:'Largest power utility in India. Key strategic account.',
      contacts:[{ id:101, name:'Rajiv Mehta', role:'Chief Procurement Officer', phone:'+91-9876543101', email:'rajiv.mehta@ntpc.co.in', notes:'Decision maker for electrical packages.', strength:'Strong' }],
      projects:[{ id:201, name:'Barh STPP Stage II Electrical Package', value:450000000, startDate:'2024-06-01', endDate:'2026-03-15', sector:'Power' }],
      opportunities:[{ id:301, name:'NTPC Dadri FGD Electrical Works', stage:'Proposal', value:180000000, winProbability:60, expectedClose:'2026-08-30', bdOwner:'Amit Sharma' }] },
    { id:2, name:'Coal India Limited', sector:'Mining', strength:'Strong', website:'www.coalindia.in', industry:'Mining', notes:'Largest coal producer. Multiple ongoing projects.',
      contacts:[{ id:102, name:'Suresh Pandey', role:'GM - Projects', phone:'+91-9876543102', email:'suresh.pandey@coalindia.in', notes:'Oversees electrical contracts for mine development.', strength:'Strong' }],
      projects:[{ id:202, name:'Jharia Mine Electrification', value:285000000, startDate:'2023-11-01', endDate:'2025-12-31', sector:'Mining' }],
      opportunities:[{ id:302, name:'CIL Talcher Coal Handling Plant E&I', stage:'Qualification', value:320000000, winProbability:40, expectedClose:'2026-10-15', bdOwner:'Rohit Joshi' }] },
    { id:3, name:'Hindalco Industries Ltd', sector:'Industrial', strength:'Medium', website:'www.hindalco.com', industry:'Aluminium & Copper', notes:'Part of Aditya Birla Group.',
      contacts:[{ id:103, name:'Vikram Agarwal', role:'VP - Projects', phone:'+91-9876543103', email:'vikram.agarwal@hindalco.com', notes:'Key contact for smelter expansion projects.', strength:'Medium' }],
      projects:[{ id:203, name:'Mahan Smelter Electrical BOP', value:620000000, startDate:'2024-01-15', endDate:'2026-06-30', sector:'Industrial' }],
      opportunities:[{ id:303, name:'Hindalco Renukoot Rectifier Upgrade', stage:'Negotiation', value:95000000, winProbability:75, expectedClose:'2026-07-01', bdOwner:'Priya Verma' }] },
    { id:4, name:'BALCO (Vedanta Group)', sector:'Power', strength:'Strong', website:'www.balcoindia.com', industry:'Power & Aluminium', notes:'Strategic partner for captive power projects.',
      contacts:[{ id:104, name:'Anil Dubey', role:'Head - Electrical', phone:'+91-9876543104', email:'anil.dubey@balco.in', notes:'Directly oversees electrical contracts.', strength:'Strong' }],
      projects:[{ id:204, name:'BALCO CPP 540 MW BOP', value:390000000, startDate:'2024-08-01', endDate:'2026-05-15', sector:'Power' }],
      opportunities:[{ id:304, name:'BALCO CPP Phase II EPC', stage:'Proposal', value:520000000, winProbability:50, expectedClose:'2026-09-30', bdOwner:'Amit Sharma' }] },
    { id:5, name:'JSW Steel Limited', sector:'Industrial', strength:'Medium', website:'www.jsw.in', industry:'Steel Manufacturing', notes:'Fast-growing steel major.',
      contacts:[{ id:105, name:'Kiran Shetty', role:'DGM - Electrical', phone:'+91-9876543105', email:'kiran.shetty@jsw.in', notes:'Handles cable and electrical infrastructure contracts.', strength:'Medium' }],
      projects:[{ id:205, name:'Vijayanagar Expansion Phase III - Cabling', value:175000000, startDate:'2025-03-01', endDate:'2026-08-31', sector:'Industrial' }],
      opportunities:[{ id:305, name:'JSW Dolvi Blast Furnace E&I', stage:'Identification', value:410000000, winProbability:25, expectedClose:'2026-12-31', bdOwner:'Sneha Patel' }] },
    { id:6, name:'Tata Power Company Ltd', sector:'Power', strength:'Weak', website:'www.tatapower.com', industry:'Power Generation & Distribution', notes:'New engagement, building relationship.',
      contacts:[{ id:106, name:'Rohan Desai', role:'Manager - Electrical', phone:'+91-9876543106', email:'rohan.desai@tatapower.com', notes:'Initial contact, exploring opportunities.', strength:'Weak' }],
      projects:[],
      opportunities:[{ id:306, name:'Tata Power Mundra FGD Electrical', stage:'Qualification', value:340000000, winProbability:30, expectedClose:'2026-08-15', bdOwner:'Vikram Singh' }] },
    { id:7, name:'NLC India Limited', sector:'Mining', strength:'Medium', website:'www.nlcindia.com', industry:'Lignite Mining & Power', notes:'Government enterprise, growing pipeline.',
      contacts:[{ id:107, name:'Mohan Krishnan', role:'GM - E&M', phone:'+91-9876543107', email:'mohan.krishnan@nlcindia.in', notes:'Key decision maker for mining electricals.', strength:'Medium' }],
      projects:[],
      opportunities:[{ id:307, name:'Neyveli Lignite Handling System E&I', stage:'Bid Prep', value:510000000, winProbability:45, expectedClose:'2026-11-30', bdOwner:'Rohit Joshi' }] },
  ];
}

const SECTOR_COLORS: Record<Sector, string> = { Power: '#00e676', Mining: '#f5a623', Industrial: '#ff6b6b' };
const STRENGTH_COLORS: Record<Strength, string> = { Strong: '#00e676', Medium: '#f5a623', Weak: '#ff3d3d' };

const STRENGTH_ORDER: Record<Strength, number> = { Strong: 0, Medium: 1, Weak: 2 };
const STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const SECTORS: Sector[] = ['Power', 'Mining', 'Industrial'];

function fmtCurrency(n: number) {
  return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function sortContacts(contacts: Contact[]) {
  return [...contacts].sort((a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength]);
}

export default function SalesClientAccounts() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'projects' | 'opportunities'>('contacts');
  const [clientSearch, setClientSearch] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{ clientIdx: number; contact: Contact | null } | null>(null);
  const [deleteContactTarget, setDeleteContactTarget] = useState<{ clientIdx: number; contactId: number } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedOpp, setExpandedOpp] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/sales/clients');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (json.success) {
        if (json.data && json.data.length > 0) {
          setClients(json.data);
        } else {
          setClients(generateMockClients());
          toast.info('Showing sample data — API unavailable');
        }
      } else {
        setClients(generateMockClients());
        toast.info('Showing sample data — API unavailable');
      }
    } catch {
      setClients(generateMockClients());
      toast.info('Showing sample data — API unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  const handleSelect = (c: Client) => {
    setSelected(c);
    setActiveTab('contacts');
    setExpandedOpp(null);
  };

  const handleAddContact = (clientIdx: number) => {
    setEditingContact({ clientIdx, contact: null });
    setContactDialogOpen(true);
  };

  const handleEditContact = (clientIdx: number, contact: Contact) => {
    setEditingContact({ clientIdx, contact });
    setContactDialogOpen(true);
  };

  const handleDeleteContact = async () => {
    if (!deleteContactTarget) return;
    setDeleteOpen(false);
    try {
      const res = await fetch(`/api/sales/clients/${deleteContactTarget.clientIdx}/contacts/${deleteContactTarget.contactId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      const json = await res.json();
      if (json.success) {
        toast.success('Contact deleted');
        await fetchClients();
      } else {
        toast.error('Failed to delete contact');
      }
    } catch {
      toast.error('Failed to delete contact');
    }
    setDeleteContactTarget(null);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const body = {
      name: data.get('name') as string,
      role: data.get('role') as string,
      phone: data.get('phone') as string,
      email: data.get('email') as string,
      notes: data.get('notes') as string,
    };
    try {
      if (editingContact?.contact) {
        const res = await fetch(`/api/sales/clients/${editingContact.clientIdx}/contacts/${editingContact.contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update');
        const json = await res.json();
        if (json.success) {
          toast.success('Contact updated');
          await fetchClients();
        } else {
          toast.error('Failed to update contact');
        }
      } else {
        const res = await fetch(`/api/sales/clients/${editingContact!.clientIdx}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to add');
        const json = await res.json();
        if (json.success) {
          toast.success('Contact added');
          await fetchClients();
        } else {
          toast.error('Failed to add contact');
        }
      }
    } catch {
      toast.error(editingContact?.contact ? 'Failed to update contact' : 'Failed to add contact');
    }
    setContactDialogOpen(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const body = {
      name: data.get('name') as string,
      sector: data.get('sector') as string,
      strength: data.get('strength') as string,
      website: data.get('website') as string,
      industry: data.get('industry') as string,
      notes: data.get('notes') as string,
    };
    try {
      const res = await fetch('/api/sales/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create');
      const json = await res.json();
      if (json.success) {
        toast.success('Client account created');
        await fetchClients();
      } else {
        toast.error('Failed to create client');
      }
    } catch {
      toast.error('Failed to create client');
    }
    setNewDialogOpen(false);
  };

  const colHeaderClass = 'text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]';

  const sectorBadge = (sector: Sector) => (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: SECTOR_COLORS[sector] + '20', color: SECTOR_COLORS[sector] }}>
      {sector}
    </span>
  );

  const strengthDot = (strength: Strength) => (
    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: STRENGTH_COLORS[strength] }} />
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 bg-[#1e2630] rounded-lg" />)}
        </div>
        <Skeleton className="h-96 bg-[#1e2630] rounded-lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[#ff3d3d] text-[14px] font-semibold mb-2">{fetchError}</p>
          <button onClick={fetchClients} className="vc-btn-primary text-[11px]">Retry</button>
        </div>
      </div>
    );
  }

  if (importOpen) {
    return (
      <ImportWizard
        title="Client Accounts"
        fields={CLIENT_IMPORT_FIELDS}
        keyField="name"
        existingKeys={new Set(clients.map(r => r.name))}
        commitEndpoint="/api/sales/client-accounts/import"
        sampleRow={CLIENT_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={fetchClients}
      />
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Client List Panel */}
        <div className="vc-panel w-full lg:w-96 shrink-0">
          <div className="vc-panel-header">
            <Building2 size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Clients</span>
            <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{clients.length}</span>
            <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={clients} columns={CLIENT_COLUMNS} filename="sales-client-accounts" />
            <button onClick={() => setNewDialogOpen(true)} className="ml-2 p-1 rounded text-[#f5a623] hover:bg-[#f5a623]/10"><Plus size={14} /></button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients..." className="bg-[#0f1318] border border-[#252e3a] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-full" />
              {clientSearch && <button onClick={() => setClientSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] text-[12px]"><X size={12} /></button>}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-240px)]">
            {filteredClients.map(c => (
              <button key={c.id} onClick={() => handleSelect(c)}
                className={`w-full text-left px-3 py-2.5 border-l-[3px] transition-colors hover:bg-[#141920] ${
                  selected?.id === c.id ? 'border-[#f5a623] bg-[#f5a623]/5' : 'border-transparent'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-[#e2e8f0] truncate flex-1">{c.name}</span>
                  {sectorBadge(c.sector)}
                </div>
                <div className="flex items-center gap-2">
                  {strengthDot(c.strength)}
                  <span className="text-[10px] text-[#8899aa] capitalize">{c.strength}</span>
                  <span className="ml-auto text-[10px] text-[#5a6878]">{c.contacts.length} contacts</span>
                </div>
              </button>
            ))}
            {filteredClients.length === 0 && <div className="px-3 py-4 text-center text-[#5a6878] text-[11px]">No clients found</div>}
          </div>
        </div>

        {/* Main Content */}
        {selected ? (
          <div className="flex-1 space-y-4 min-w-0">
            {/* Client Header */}
            <div className="vc-panel">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{selected.name}</h2>
                    {sectorBadge(selected.sector)}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center text-[11px] text-[#8899aa]">
                      {strengthDot(selected.strength)}
                      <span style={{ color: STRENGTH_COLORS[selected.strength] }} className="font-semibold">{selected.strength}</span>
                    </div>
                    {selected.website && <div className="flex items-center gap-1 text-[11px] text-[#8899aa]"><MapPin size={11} />{selected.website}</div>}
                    <div className="text-[11px] text-[#8899aa]">{selected.industry}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-center">
                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Won Value</div>
                    <div className="text-[14px] font-bold text-[#00e676] font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{fmtCurrency(selected.projects.reduce((s, p) => s + p.value, 0))}</div>
                  </div>
                  <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-center">
                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Active Opps</div>
                    <div className="text-[14px] font-bold text-[#00d4ff] font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{selected.opportunities.length}</div>
                  </div>
                  <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-center">
                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Past Projects</div>
                    <div className="text-[14px] font-bold text-[#a78bfa] font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{selected.projects.length}</div>
                  </div>
                  <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-center">
                    <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Last Contact</div>
                    <div className="text-[14px] font-bold text-[#e2e8f0] font-mono" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{selected.projects.length > 0 ? selected.projects[selected.projects.length - 1].endDate : 'N/A'}</div>
                  </div>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex border-t border-[#252e3a] px-4">
                {(['contacts', 'projects', 'opportunities'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[1.5px] font-semibold border-b-2 transition-colors ${
                      activeTab === tab ? 'border-[#f5a623] text-[#f5a623]' : 'border-transparent text-[#5a6878] hover:text-[#8899aa]'
                    }`}>
                    {tab === 'contacts' ? `Contacts (${selected.contacts.length})` : tab === 'projects' ? `Projects (${selected.projects.length})` : `Opportunities (${selected.opportunities.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'contacts' && (
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <UserPlus size={14} className="text-[#f5a623]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Contact Directory</span>
                  <button onClick={() => handleAddContact(selected.id)} className="vc-btn-primary flex items-center gap-1.5 ml-auto"><Plus size={13} /> Add Contact</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                      <th className={colHeaderClass}>Name</th>
                      <th className={colHeaderClass}>Role</th>
                      <th className={colHeaderClass}>Phone</th>
                      <th className={colHeaderClass}>Email</th>
                      <th className={colHeaderClass}>Strength</th>
                      <th className="w-[8%]"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a2028]">
                      {sortContacts(selected.contacts).map(ct => (
                        <tr key={ct.id} className="hover:bg-[#141920]">
                          <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{ct.name}</td>
                          <td className="py-2.5 px-3 text-[#8899aa]">{ct.role}</td>
                          <td className="py-2.5 px-3 text-[#8899aa] font-mono"><div className="flex items-center gap-1.5"><Phone size={11} className="text-[#5a6878]" />{ct.phone}</div></td>
                          <td className="py-2.5 px-3 text-[#8899aa]"><div className="flex items-center gap-1.5"><Mail size={11} className="text-[#5a6878]" />{ct.email}</div></td>
                          <td className="py-2.5 px-3"><div className="flex items-center gap-1.5">{strengthDot(ct.strength)}<span style={{ color: STRENGTH_COLORS[ct.strength] }} className="text-[11px] font-medium">{ct.strength}</span></div></td>
                          <td className="py-2.5 px-3"><div className="flex gap-1">
                            <button onClick={() => handleEditContact(selected.id, ct)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                            <button onClick={() => { setDeleteContactTarget({ clientIdx: selected.id, contactId: ct.id }); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                          </div></td>
                        </tr>
                      ))}
                      {selected.contacts.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#5a6878]">No contacts</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <Briefcase size={14} className="text-[#f5a623]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Past Projects Timeline</span>
                </div>
                <div className="overflow-y-auto max-h-[480px] p-4">
                  <div className="relative">
                    <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-[#252e3a]" />
                    {selected.projects.map((p, i) => (
                      <div key={p.id} className="relative flex gap-4 pb-6 last:pb-0">
                        <div className="relative z-10 flex items-center justify-center w-8">
                          <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: SECTOR_COLORS[p.sector], backgroundColor: '#161c24' }} />
                          {i < selected.projects.length - 1 && <div className="absolute top-4 w-[2px] bg-[#252e3a]" style={{ height: 'calc(100% + 8px)' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[13px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{p.name}</span>
                            {sectorBadge(p.sector)}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#8899aa] flex-wrap">
                            <span className="text-[#00e676] font-mono font-semibold">{fmtCurrency(p.value)}</span>
                            <span className="flex items-center gap-1"><CalendarDays size={11} />{p.startDate} → {p.endDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="vc-panel">
                <div className="vc-panel-header">
                  <Target size={14} className="text-[#f5a623]" />
                  <span className="text-[12px] font-semibold text-[#e2e8f0]">Active Opportunities</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                      <th className={colHeaderClass}>Opportunity Name</th>
                      <th className={colHeaderClass}>Stage</th>
                      <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Value</th>
                      <th className="text-center py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Win Prob.</th>
                      <th className={colHeaderClass}>Expected Close</th>
                      <th className={colHeaderClass}>BD Owner</th>
                      <th className="w-[4%]"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#1a2028]">
                      {selected.opportunities.map(o => (
                          <Fragment key={o.id}>
                            <tr className="hover:bg-[#141920] cursor-pointer" onClick={() => setExpandedOpp(expandedOpp === o.id ? null : o.id)}>
                            <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{o.name}</td>
                            <td className="py-2.5 px-3"><span className={`vc-badge ${
                              o.stage === 'Negotiation' ? 'bg-[#f5a623]/15 text-[#f5a623]' :
                              o.stage === 'Proposal' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' :
                              'bg-[#5a6878]/15 text-[#5a6878]'
                            }`}>{o.stage}</span></td>
                            <td className="py-2.5 px-3 text-right text-[#00e676] font-mono font-medium">{fmtCurrency(o.value)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <div className="w-12 h-1.5 bg-[#252e3a] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${o.winProbability}%`, backgroundColor: o.winProbability >= 70 ? '#00e676' : o.winProbability >= 40 ? '#f5a623' : '#ff3d3d' }} />
                                </div>
                                <span className="text-[10px] font-mono text-[#8899aa]">{o.winProbability}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#8899aa] font-mono">{o.expectedClose}</td>
                            <td className="py-2.5 px-3 text-[#8899aa]">{o.bdOwner}</td>
                            <td className="py-2.5 px-3">{expandedOpp === o.id ? <ChevronDown size={13} className="text-[#f5a623]" /> : <ChevronRight size={13} className="text-[#5a6878]" />}</td>
                          </tr>
                          {expandedOpp === o.id && (
                            <tr key={`${o.id}-detail`} className="bg-[#0a0d12]">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Stage</span><p className="text-[12px] text-[#e2e8f0] mt-0.5">{o.stage}</p></div>
                                  <div><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Value</span><p className="text-[12px] text-[#00e676] font-mono mt-0.5">{fmtCurrency(o.value)}</p></div>
                                  <div><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Win Probability</span><p className="text-[12px] text-[#e2e8f0] mt-0.5">{o.winProbability}%</p></div>
                                  <div><span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Expected Close</span><p className="text-[12px] text-[#e2e8f0] font-mono mt-0.5">{o.expectedClose}</p></div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </Fragment>  
                      ))}
                      {selected.opportunities.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No active opportunities</td></tr>}
                    </tbody>
                  </table>
                </div>
                {selected.opportunities.length > 0 && (
                  <div className="border-t border-[#252e3a] px-4 py-3">
                    <div className="flex items-center gap-6 text-[11px]">
                      <div><span className="text-[#5a6878]">Total Active Value: </span><span className="text-[#00e676] font-mono font-semibold">{fmtCurrency(selected.opportunities.reduce((s, o) => s + o.value, 0))}</span></div>
                      <div><span className="text-[#5a6878]">Weighted Value: </span><span className="text-[#f5a623] font-mono font-semibold">{fmtCurrency(selected.opportunities.reduce((s, o) => s + Math.round(o.value * o.winProbability / 100), 0))}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Building2 size={40} className="text-[#252e3a] mx-auto mb-3" />
              <p className="text-[#5a6878] text-[13px]">Select a client to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* New Client Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClient} className="space-y-4 py-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Name</label>
              <input name="name" className="vc-input" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Sector</label>
              <select name="sector" className="vc-input">
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Strength</label>
              <select name="strength" className="vc-input">
                {(['Strong', 'Medium', 'Weak'] as const).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Website</label>
              <input name="website" className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Industry</label>
              <input name="industry" className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Notes</label>
              <textarea name="notes" className="vc-input" rows={2} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setNewDialogOpen(false)} className="vc-btn-ghost">Cancel</button>
              <button type="submit" className="vc-btn-primary">Create Client</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact?.contact ? 'Edit' : 'Add'} Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveContact} className="space-y-4 py-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Name</label>
              <input name="name" defaultValue={editingContact?.contact?.name || ''} className="vc-input" required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Role</label>
              <input name="role" defaultValue={editingContact?.contact?.role || ''} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Phone</label>
              <input name="phone" defaultValue={editingContact?.contact?.phone || ''} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Email</label>
              <input name="email" type="email" defaultValue={editingContact?.contact?.email || ''} className="vc-input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Notes</label>
              <textarea name="notes" defaultValue={editingContact?.contact?.notes || ''} className="vc-input" rows={2} />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setContactDialogOpen(false)} className="vc-btn-ghost">Cancel</button>
              <button type="submit" className="vc-btn-primary">{editingContact?.contact ? 'Update' : 'Add'} Contact</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#ff3d3d]">Delete Contact</AlertDialogTitle><AlertDialogDescription className="text-[#8899aa]">Remove this contact? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteContact} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
