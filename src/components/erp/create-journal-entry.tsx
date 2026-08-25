'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, FileText, Loader2, Send, CircleDot, Pencil, Search,
  Landmark, IndianRupee, BadgeCheck, AlertTriangle, ChevronDown, CheckCircle2, XCircle, History, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

interface JournalLine {
  id: number;
  account: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
}

interface LedgerAccount {
  id: number;
  source?: string;
  accountCode: string;
  name: string;
  group: string;
  type: string;
}

interface Site {
  id: number;
  name: string;
  siteCode: string;
}

interface Party {
  id: number;
  name: string;
  code: string | null;
  partyType: string;
}

interface JEntry {
  id: number;
  entryId?: number;
  entryNo: string;
  date: string;
  account: string;
  accountName: string | null;
  siteId: number | null;
  partyId: number | null;
  jobCode: string | null;
  poNo: string | null;
  costCenter: string | null;
  department: string | null;
  projectManager: string | null;
  debit: number;
  credit: number;
  description: string | null;
  reference: string | null;
  voucherType: string | null;
  status: string;
  attachmentPath?: string | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

const inputCls = 'w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none transition-colors';
const selectCls = inputCls + ' appearance-none';

function fmt(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function CreateJournalEntry() {
  // ── Ledger accounts ──
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // ── Parties ──
  const [parties, setParties] = useState<Party[]>([]);

  // ── Sites ──
  const [sites, setSites] = useState<Site[]>([]);

  // ── Entry list (dashboard + table) ──
  const [entries, setEntries] = useState<JEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('all');

  // ── Form state ──
  const [entryNo, setEntryNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [siteId, setSiteId] = useState<number>(0);
  const [partyId, setPartyId] = useState<number>(0);
  const [voucherType, setVoucherType] = useState('Journal');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [poNo, setPoNo] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [department, setDepartment] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [attachmentPath, setAttachmentPath] = useState('');
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const handleAttachmentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Supporting document must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachmentPath(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const [lines, setLines] = useState<JournalLine[]>([
    { id: 1, account: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 },
    { id: 2, account: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Delete ──
  const [deleteTarget, setDeleteTarget] = useState<JEntry | null>(null);

  // ── Computed ──
  const totals = lines.reduce((a, l) => ({ debit: a.debit + (l.debitAmount || 0), credit: a.credit + (l.creditAmount || 0) }), { debit: 0, credit: 0 });
  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const filtered = entries.filter(r => {
    const q = search.toLowerCase();
    const s = q === '' || r.entryNo.toLowerCase().includes(q) || (r.accountName || r.account).toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q) || (r.reference || '').toLowerCase().includes(q);
    const v = voucherFilter === 'all' || r.voucherType === voucherFilter;
    return s && v;
  });

  const totalDebit = filtered.reduce((s, r) => s + r.debit, 0);
  const totalCredit = filtered.reduce((s, r) => s + r.credit, 0);
  const isGlobalBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const voucherTypes = [...new Set(entries.map(r => r.voucherType).filter(Boolean))] as string[];

  // ── Data fetching ──
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger');
      const json = await res.json();
      if (json.success) {
        // Journal lines post into FinJournalLine.accountId, a hard FK to
        // FinAccount — the legacy LedgerAccount rows /api/ledger also
        // returns can't be resolved there, and the "x000" codes are group
        // headers (Assets/Liabilities/...), not postable leaf accounts.
        const postable = (json.data as LedgerAccount[]).filter(a => a.source === 'fin' && !a.accountCode.endsWith('000'));
        setAccounts(postable);
      }
    } catch { /* silent */ } finally { setAccountsLoading(false); }
  }, []);

  const fetchParties = useCallback(async () => {
    try {
      const res = await fetch('/api/fin/parties');
      const json = await res.json();
      if (json.success && json.data?.length) setParties(json.data);
      else setParties([
        { id: 1, name: 'Tata Steel Limited', code: 'V001', partyType: 'Customer' },
        { id: 2, name: 'Larsen & Toubro Ltd', code: 'V002', partyType: 'Customer' },
        { id: 3, name: 'NTPC Limited', code: 'V003', partyType: 'Customer' },
        { id: 4, name: 'Hindalco Industries', code: 'V004', partyType: 'Vendor' },
        { id: 5, name: 'Siemens India Ltd', code: 'V005', partyType: 'Vendor' },
      ]);
    } catch { /* silent */ }
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/fin/sites');
      const json = await res.json();
      if (json.success && json.data?.length) setSites(json.data);
      else setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]);
    } catch { setSites([{ id: 1, name: 'TPP Adani Godda', siteCode: 'SITE-001' }, { id: 2, name: 'TPP NTPC Barh', siteCode: 'SITE-002' }, { id: 3, name: 'HO Mumbai', siteCode: 'SITE-003' }]); }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      setListLoading(true);
      const res = await fetch('/api/journal-entries');
      const json = await res.json();
      if (json.success && json.data?.length) setEntries(json.data);
    } catch { /* silent */ } finally { setListLoading(false); }
  }, []);

  useEffect(() => { fetchAccounts(); fetchParties(); fetchSites(); fetchEntries(); }, [fetchAccounts, fetchParties, fetchSites, fetchEntries]);

  // Matches the server-side fallback format in src/app/api/journal-entries/route.ts
  // (JE/{year}/{seq}) so the number shown here is the number that actually gets saved.
  const generateEntryNo = useCallback(() => {
    const year = new Date().getFullYear();
    const existing = new Set(entries.map(e => e.entryNo));
    let seq = entries.length + 1;
    let candidate = `JE/${year}/${String(seq).padStart(4, '0')}`;
    while (existing.has(candidate)) { seq += 1; candidate = `JE/${year}/${String(seq).padStart(4, '0')}`; }
    return candidate;
  }, [entries]);

  useEffect(() => { if (!editMode) setEntryNo(generateEntryNo()); }, [entries, editMode, generateEntryNo]);

  const resetForm = () => {
    const now = new Date();
    setEntryNo(generateEntryNo());
    setDate(now.toISOString().split('T')[0]);
    setSiteId(0);
    setPartyId(0);
    setVoucherType('Journal');
    setDescription('');
    setReference('');
    setJobCode('');
    setPoNo('');
    setCostCenter('');
    setDepartment('');
    setProjectManager('');
    setAttachmentPath('');
    setLines([
      { id: Date.now(), account: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 },
      { id: Date.now() + 1, account: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 },
    ]);
    setEditMode(false);
    setFormError('');
  };

  const loadEntry = (e: JEntry) => {
    setEntryNo(e.entryNo);
    setDate(typeof e.date === 'string' ? e.date.split('T')[0] : '');
    setSiteId(e.siteId || 0);
    setPartyId(e.partyId || 0);
    setVoucherType(e.voucherType || 'Journal');
    setDescription(e.description || '');
    setReference(e.reference || '');
    setJobCode(e.jobCode || '');
    setPoNo(e.poNo || '');
    setCostCenter(e.costCenter || '');
    setDepartment(e.department || '');
    setProjectManager(e.projectManager || '');
    setAttachmentPath(e.attachmentPath || '');
    setLines([
      { id: 1, account: e.account, accountName: e.accountName || '', description: e.description || '', debitAmount: e.debit, creditAmount: 0 },
      { id: 2, account: '', accountName: '', description: '', debitAmount: 0, creditAmount: e.credit },
    ]);
    setEditMode(true);
    setFormError('');
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), account: '', accountName: '', description: '', debitAmount: 0, creditAmount: 0 }]);
  };

  const removeLine = (i: number) => {
    if (lines.length <= 2) { setFormError('Minimum 2 lines required'); return; }
    setLines(lines.filter((_, idx) => idx !== i));
  };

  const updateLine = (i: number, field: keyof JournalLine, value: string | number) => {
    const u = [...lines];
    u[i] = { ...u[i], [field]: value };
    if (field === 'account') {
      const acc = accounts.find(a => a.accountCode === value);
      if (acc) u[i].accountName = acc.name;
    }
    setLines(u);
  };

  const validate = (): string | null => {
    if (!date) return 'Date is required';
    if (!entryNo.trim()) return 'Reference number is required';
    if (!siteId) return 'Site is required';
    const active = lines.filter(l => l.debitAmount > 0 || l.creditAmount > 0);
    if (active.length === 0) return 'At least one line must have an amount';
    if (active.some(l => !l.account)) return 'Every line with an amount must have an account selected';
    if (!isBalanced) return 'Total Debit and Credit must be equal';
    return null;
  };

  // A journal entry always saves as Draft (see /api/journal-entries POST) —
  // there's no way to post directly, by design: Posted only happens via the
  // approval workflow (Draft -> Pending -> Posted), enforced server-side
  // with a Segregation-of-Duties check so the submitter can't also approve.
  // `submitForApproval` additionally calls that endpoint right after saving.
  const handleSubmit = async (submitForApproval: boolean) => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError('');
    setSaving(true);
    try {
      const active = lines.filter(l => l.debitAmount > 0 || l.creditAmount > 0);
      const payload = {
        entryNo,
        date: new Date(date),
        siteId: siteId || null,
        partyId: partyId || null,
        jobCode: jobCode || null,
        poNo: poNo || null,
        costCenter: costCenter || null,
        department: department || null,
        projectManager: projectManager || null,
        voucherType,
        description,
        reference,
        attachmentPath: attachmentPath || null,
        lines: active.map(l => ({
          account: l.account,
          accountName: l.accountName,
          debit: l.debitAmount,
          credit: l.creditAmount,
          description: l.description || description,
        })),
      };
      let entryId: number | null = null;
      if (editMode) {
        // Delete old lines for this entryNo, then insert new
        const res = await fetch(`/api/journal-entries/batch`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, entryNo }),
        });
        const json = await res.json();
        if (!json.success) { setFormError(json.error || 'Save failed'); setSaving(false); return; }
        entryId = json.data?.[0]?.entryId ?? null;
        toast.success(`Journal Entry ${entryNo} updated`);
      } else {
        const res = await fetch('/api/journal-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) { setFormError(json.error || 'Save failed'); setSaving(false); return; }
        entryId = json.data?.[0]?.entryId ?? null;
        toast.success(`Journal Entry ${entryNo} saved as draft`);
      }
      if (submitForApproval && entryId) {
        const subRes = await fetch('/api/journal-entries/approve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: entryId, action: 'submit', actor: getCurrentUserEmail() }),
        });
        const subJson = await subRes.json();
        if (subJson.success) toast.success('Submitted for approval');
        else toast.error(subJson.error || 'Could not submit for approval');
      }
      resetForm();
      fetchEntries();
    } catch { setFormError('Network error'); } finally { setSaving(false); }
  };

  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const runApprovalAction = async (entryId: number | undefined, action: 'submit' | 'approve' | 'reject', comments?: string) => {
    if (!entryId) return;
    setApprovalSubmitting(true);
    try {
      const r = await fetch('/api/journal-entries/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, action, comments, actor: getCurrentUserEmail() }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success(action === 'submit' ? 'Submitted for approval' : action === 'approve' ? 'Entry posted' : 'Entry rejected');
        fetchEntries();
      } else toast.error(j.error || 'Action failed');
    } catch { toast.error('Network error'); }
    finally { setApprovalSubmitting(false); }
  };
  const handleReject = (r: JEntry) => {
    const reason = window.prompt(`Reason for rejecting ${r.entryNo}:`);
    if (reason) runApprovalAction(r.entryId, 'reject', reason);
  };
  const jeStatusBadge = (s: string) => {
    if (s === 'Posted') return 'bg-[#00e676]/15 text-[#00e676]';
    if (s === 'Pending') return 'bg-[#f5a623]/15 text-[#f5a623]';
    if (s === 'Rejected') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!window.confirm(`Delete entry ${deleteTarget.entryNo}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/journal-entries?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) { fetchEntries(); setDeleteTarget(null); }
      else alert(json.error || 'Delete failed');
    } catch { alert('Network error'); }
  };

  const voucherBadge = (v: string | null) => {
    if (v === 'Payment') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
    if (v === 'Receipt') return 'bg-[#00e676]/15 text-[#00e676]';
    if (v === 'Journal') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
    if (v === 'Contra') return 'bg-[#a78bfa]/15 text-[#a78bfa]';
    return 'bg-[#5a6878]/15 text-[#5a6878]';
  };

  if (accountsLoading && listLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;
  }

  return (
    <div className="space-y-4 p-6">
      {/* ═══ Dashboard KPIs ═══ */}
      <div className="grid grid-cols-4 gap-3">
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#f5a623]" />
          <div className="flex items-center gap-2 mb-1">
            <Landmark size={14} className="text-[#f5a623]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Total Entries</span>
          </div>
          <div className="text-[20px] font-bold text-[#f5a623]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{entries.length}</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00e676]" />
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={14} className="text-[#00e676]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Total Debit</span>
          </div>
          <div className="text-[20px] font-bold text-[#00e676]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{(totalDebit / 100000).toFixed(2)}L</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#ff3d3d]" />
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee size={14} className="text-[#ff3d3d]" />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Total Credit</span>
          </div>
          <div className="text-[20px] font-bold text-[#ff3d3d]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{(totalCredit / 100000).toFixed(2)}L</div>
        </div>
        <div className="vc-stat-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck size={14} className={isGlobalBalanced ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Global Balance</span>
          </div>
          <div className={`text-[20px] font-bold ${isGlobalBalanced ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {isGlobalBalanced ? 'Balanced' : fmt(Math.abs(totalDebit - totalCredit))}
          </div>
        </div>
      </div>

      {/* ═══ Two‑column layout: Form (left) + Recent entries (right) ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Form Column ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Form panel */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] text-[#f5a623] font-medium">{editMode ? 'Edit Entry' : 'New Journal Entry'}</span>
                <h3 className="text-[18px] font-bold text-[#e2e8f0] mt-0.5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {editMode ? `Editing: ${entryNo}` : 'Create Entry'}
                </h3>
              </div>
              {editMode && (
                <button onClick={resetForm} className="text-[11px] text-[#f5a623] hover:underline px-3 py-1.5 border border-[#f5a623]/30 rounded-lg">
                  + New Entry
                </button>
              )}
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 text-[#ff3d3d] text-[12px]">
                <AlertTriangle size={14} />
                {formError}
              </div>
            )}

            {/* Header fields */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Entry No</label>
                <input type="text" value={entryNo} readOnly placeholder="Auto-generated" className={inputCls + ' opacity-60'} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Site</label>
                <div className="relative">
                  <select value={siteId} onChange={e => setSiteId(Number(e.target.value))} className={selectCls + ' pr-7'}>
                    <option value={0}>All sites...</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Party</label>
                <div className="relative">
                  <select value={partyId} onChange={e => setPartyId(Number(e.target.value))} className={selectCls + ' pr-7'}>
                    <option value={0}>All parties...</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Voucher Type</label>
                <div className="relative">
                  <select value={voucherType} onChange={e => setVoucherType(e.target.value)} className={selectCls + ' pr-7'}>
                    <option value="Journal">Journal</option>
                    <option value="Payment">Payment</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Contra">Contra</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">External Ref</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Supporting Document</label>
                {attachmentPath ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#00d4ff] flex items-center gap-1"><FileText size={12} /> Attached</span>
                    <button type="button" onClick={() => attachmentInputRef.current?.click()} className="text-[11px] text-[#5a6878] hover:text-[#e2e8f0] underline">Replace</button>
                    <button type="button" onClick={() => setAttachmentPath('')} className="text-[11px] text-[#ff3d3d] hover:underline">Remove</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => attachmentInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#252e3a] text-[#8899aa] text-[11px] hover:border-[#f5a623]/50 hover:text-[#e2e8f0] transition-colors">
                    <Upload size={12} /> Upload document
                  </button>
                )}
                <input ref={attachmentInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleAttachmentFile} />
              </div>
            </div>

            {/* Costing tags — Job/Site/PO/Cost Center/Department/PM */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Job Code</label>
                <input type="text" value={jobCode} onChange={e => setJobCode(e.target.value)} placeholder="JOB-2026-001" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">PO No</label>
                <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="PO-125" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Cost Center</label>
                <input type="text" value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="Optional" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Department</label>
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Electrical" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Project Manager</label>
                <input type="text" value={projectManager} onChange={e => setProjectManager(e.target.value)} placeholder="Optional" className={inputCls} />
              </div>
            </div>

            {/* Narration */}
            <div className="mt-4">
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Narration / Memo</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of this journal voucher..."
                className={inputCls} />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#252e3a] bg-[#0a0d12]">
              <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Line Items</span>
              <button onClick={addLine} className="flex items-center gap-1 text-[#f5a623] text-[11px] font-semibold hover:text-[#e8991a]">
                <Plus size={13} /> Add Line
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#252e3a]">
                    <th className="text-left py-2.5 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[38%]">Account</th>
                    <th className="text-left py-2.5 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Description</th>
                    <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[16%]">Debit (₹)</th>
                    <th className="text-right py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[16%]">Credit (₹)</th>
                    <th className="w-[30px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={line.id} className="border-b border-[#1a2028]/50 hover:bg-[#141920]">
                      <td className="py-2 px-4">
                        <div className="relative">
                          <select value={line.account} onChange={e => updateLine(i, 'account', e.target.value)}
                            className="w-full bg-transparent border-b border-[#252e3a] pb-1 pr-5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none">
                            <option value="" className="bg-[#161c24]">Select account...</option>
                            {accounts.map(a => (
                              <option key={`${a.source}-${a.id}`} value={a.accountCode} className="bg-[#161c24]">{a.accountCode} - {a.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input type="text" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                          placeholder="Line detail"
                          className="w-full bg-transparent text-[11px] text-[#8899aa] placeholder:text-[#5a6878] focus:outline-none" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={line.debitAmount ?? ''}
                          onChange={e => updateLine(i, 'debitAmount', Number(e.target.value) || 0)}
                          placeholder="0" min="0" step="0.01"
                          className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={line.creditAmount ?? ''}
                          onChange={e => updateLine(i, 'creditAmount', Number(e.target.value) || 0)}
                          placeholder="0" min="0" step="0.01"
                          className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none" />
                      </td>
                      <td className="py-2 text-center">
                        {lines.length > 1 && (
                          <button onClick={() => removeLine(i)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Remove">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
                    <td colSpan={2} className="py-2.5 px-4 text-right">
                      <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Total</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[14px] font-bold text-[#00e676]">
                      {fmt(totals.debit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[14px] font-bold text-[#ff3d3d]">
                      {fmt(totals.credit)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
            <div className="flex items-center gap-3 text-[11px]">
              <CircleDot size={14} className={isBalanced ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />
              <span className={isBalanced ? 'text-[#00e676] font-semibold' : 'text-[#ff3d3d] font-semibold'}>
                {isBalanced ? '✓ Balanced' : `Difference: ${fmt(Math.abs(totals.debit - totals.credit))}`}
              </span>
              <span className="text-[#5a6878]">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              {editMode && (
                <button onClick={resetForm} className="px-4 py-2 rounded-lg text-[11px] font-medium text-[#8899aa] hover:text-[#e2e8f0] bg-[#1a2028] hover:bg-[#252e3a] transition-colors">
                  Cancel
                </button>
              )}
              <button onClick={() => handleSubmit(false)} disabled={saving}
                className="px-4 py-2 rounded-lg border border-[#f5a623] text-[#f5a623] text-[11px] font-semibold hover:bg-[#f5a623]/10 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin inline mr-1" /> : null}
                Save Draft
              </button>
              <button onClick={() => handleSubmit(true)} disabled={saving || !isBalanced}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[11px] font-semibold hover:bg-[#e8991a] disabled:opacity-50 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Save &amp; Submit for Approval
              </button>
            </div>
          </div>
        </div>

        {/* ── Recent Entries Column ── */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#252e3a] bg-[#0a0d12] flex-shrink-0">
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Journal Entries</span>
            <span className="text-[#f5a623] text-[11px] font-semibold">{filtered.length}</span>
          </div>

          {/* Search + filter */}
          <div className="px-3 py-2 border-b border-[#252e3a] space-y-2 flex-shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search entries..."
                className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-7 pr-2.5 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none" />
            </div>
            <div className="flex flex-wrap gap-1">
              {['all', ...voucherTypes].map(f => (
                <button key={f} onClick={() => setVoucherFilter(f)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${voucherFilter === f ? 'bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/30' : 'text-[#5a6878] hover:text-[#e2e8f0] border border-transparent'}`}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
              {(search || voucherFilter !== 'all') &&
                <button onClick={() => { setSearch(''); setVoucherFilter('all'); }} className="text-[10px] text-[#f5a623] hover:underline ml-1">Clear</button>
              }
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-[#f5a623]" size={18} /></div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-[#5a6878] text-[11px]">No entries found</div>
            ) : (
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 z-10 bg-[#0f1318]">
                  <tr>
                    {['Entry', 'Account', 'Dr', 'Cr', 'Status', ''].map(h => (
                      <th key={h} className="text-left py-2 px-2.5 text-[#5a6878] font-semibold uppercase tracking-wider text-[8px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map(r => (
                    <tr key={r.id} className="border-b border-[#1a2028]/30 hover:bg-[#141920] transition-colors">
                      <td className="py-1.5 px-2.5 text-[#f5a623] font-mono font-medium whitespace-nowrap">{r.entryNo}</td>
                      <td className="py-1.5 px-2.5 text-[#e2e8f0] truncate max-w-[120px]">{r.accountName || r.account}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-[#00e676]">{r.debit > 0 ? fmt(r.debit) : '—'}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-[#ff3d3d]">{r.credit > 0 ? fmt(r.credit) : '—'}</td>
                      <td className="py-1.5 px-2.5"><span className={`vc-badge ${jeStatusBadge(r.status)} text-[8px]`}>{r.status}</span></td>
                      <td className="py-1.5 px-2.5 flex gap-0.5">
                        {(r.status === 'Draft' || r.status === 'Rejected') && (
                          <button onClick={() => runApprovalAction(r.entryId, 'submit')} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#f5a623] hover:bg-[#f5a623]/10 disabled:opacity-50" title="Submit for approval">
                            <Send size={11} />
                          </button>
                        )}
                        {r.status === 'Pending' && (
                          <>
                            <button onClick={() => runApprovalAction(r.entryId, 'approve')} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10 disabled:opacity-50" title="Approve &amp; Post">
                              <CheckCircle2 size={11} />
                            </button>
                            <button onClick={() => handleReject(r)} disabled={approvalSubmitting} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 disabled:opacity-50" title="Reject">
                              <XCircle size={11} />
                            </button>
                          </>
                        )}
                        <button onClick={() => loadEntry(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10" title="Edit">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => setDeleteTarget(r)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* List footer */}
          <div className="px-3 py-2 border-t border-[#252e3a] bg-[#0a0d12] flex-shrink-0 flex items-center justify-between text-[9px] text-[#5a6878]">
            <span>{filtered.length} entry{filtered.length !== 1 ? 'ies' : 'y'}</span>
            <span className={isGlobalBalanced ? 'text-[#00e676]' : 'text-[#ff3d3d]'}>
              {isGlobalBalanced ? 'Balanced' : fmt(Math.abs(totalDebit - totalCredit))}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Delete confirmation via window.confirm in handleDelete ═══ */}
    </div>
  );
}
