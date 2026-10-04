'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Warehouse, Plus, X, Loader2, RefreshCw, Truck, ClipboardList, PackageCheck, PackageX,
  Wrench, IdCard, Forklift, Recycle, ClipboardCheck, FileBarChart, Check, Ban, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUserEmail } from '@/lib/current-user';

// Every create/update goes through the Finance RBAC gate (INVENTORY_* permissions),
// which checks this actor identity server-side — see /api/store/* + src/lib/fin-rbac.ts.
async function deleteRecord(url: string, id: number, label: string): Promise<boolean> {
  if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return false;
  try {
    const j = await fetch(`${url}?id=${id}`, { method: 'DELETE', headers: { 'x-actor-email': getCurrentUserEmail() } }).then(r => r.json());
    if (j.success) { toast.success(`${label} deleted`); return true; }
    toast.error(j.error || 'Failed to delete'); return false;
  } catch { toast.error('Network error'); return false; }
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Delete"><Trash2 size={13} /></button>;
}

// ── Shared lookups ──────────────────────────────────────────────────
interface SiteRef { id: number; name: string; siteCode: string; }
interface JobRef { id: number; jobCode: string; description: string | null; siteId: number | null; }
interface ItemRef { id: number; sku: string; name: string; }
interface PoRef { id: number; poNo: string; vendorName: string; }

function useLookups() {
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [jobs, setJobs] = useState<JobRef[]>([]);
  const [items, setItems] = useState<ItemRef[]>([]);
  const [pos, setPos] = useState<PoRef[]>([]);
  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
    fetch('/api/fin/jobs').then(r => r.json()).then(j => { if (j.success) setJobs(j.data.map((x: any) => ({ id: x.id, jobCode: x.jobCode, description: x.description, siteId: x.siteId }))); }).catch(() => {});
    fetch('/api/items').then(r => r.json()).then(j => { if (j.success) setItems(j.data.map((x: any) => ({ id: x.id, sku: x.sku, name: x.name }))); }).catch(() => {});
    fetch('/api/fin/purchase-orders').then(r => r.json()).then(j => { if (j.success) setPos(j.data.map((x: any) => ({ id: x.id, poNo: x.poNo, vendorName: x.vendorName }))); }).catch(() => {});
  }, []);
  return { sites, jobs, items, pos };
}

const inp = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623]/60 placeholder:text-[#5a6878]';
const lbl = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';
const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function Badge({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }) {
  const cls = { ok: 'bg-[#00e676]/15 text-[#00e676]', warn: 'bg-[#ffab40]/15 text-[#ffab40]', bad: 'bg-[#ff3d3d]/15 text-[#ff3d3d]', muted: 'bg-[#5a6878]/15 text-[#8899aa]' }[tone];
  return <span className={`px-2 py-[2px] rounded-full text-[10px] font-semibold ${cls}`}>{text}</span>;
}

const TABS = [
  { id: 'grn', label: 'GRN', icon: Truck },
  { id: 'mrs', label: 'MRS & Issue', icon: ClipboardList },
  { id: 'returns', label: 'Returns', icon: PackageCheck },
  { id: 'tools', label: 'Tool Register', icon: Wrench },
  { id: 'gatepass', label: 'Gate Pass', icon: IdCard },
  { id: 'equipment', label: 'Equipment', icon: Forklift },
  { id: 'scrap', label: 'Scrap Register', icon: Recycle },
  { id: 'pv', label: 'Physical Verification', icon: ClipboardCheck },
  { id: 'report', label: 'Monthly Report', icon: FileBarChart },
] as const;
type TabId = typeof TABS[number]['id'];

export default function SiteStore() {
  const [tab, setTab] = useState<TabId>('grn');
  const lookups = useLookups();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center"><Warehouse size={18} className="text-[#f5a623]" /></div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Site Store Management</h2>
            <p className="text-[11px] text-[#5a6878]">GRN, MRS-gated issue, returns, tools, gate pass, equipment, scrap & physical verification</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1.5 flex-wrap border-b border-[#252e3a] pb-3">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[11px] font-semibold transition-all ${tab === t.id ? 'bg-[#f5a623] text-black shadow-sm' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'}`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'grn' && <GrnTab lookups={lookups} />}
      {tab === 'mrs' && <MrsTab lookups={lookups} />}
      {tab === 'returns' && <ReturnsTab lookups={lookups} />}
      {tab === 'tools' && <ToolsTab lookups={lookups} />}
      {tab === 'gatepass' && <GatePassTab lookups={lookups} />}
      {tab === 'equipment' && <EquipmentTab lookups={lookups} />}
      {tab === 'scrap' && <ScrapTab lookups={lookups} />}
      {tab === 'pv' && <PvTab lookups={lookups} />}
      {tab === 'report' && <ReportTab lookups={lookups} />}
    </div>
  );
}

type Lookups = ReturnType<typeof useLookups>;

// ── GRN ──────────────────────────────────────────────────────────────
function GrnTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ siteId: '', jobId: '', poId: '', vendorName: '', dcNo: '', invoiceNo: '', status: 'Posted', remarks: '' });
  const [lines, setLines] = useState([{ itemId: '', qtyReceived: '', rate: '' }]);
  const [step, setStep] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/grn').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load GRNs'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', poId: '', vendorName: '', dcNo: '', invoiceNo: '', status: 'Posted', remarks: '' }); setLines([{ itemId: '', qtyReceived: '', rate: '' }]); setStep(0); setFormOpen(true); };
  const addLine = () => setLines([...lines, { itemId: '', qtyReceived: '', rate: '' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };
  const goNext = () => { if (!f.siteId) { toast.error('Site is required'); return; } setStep(1); };

  const save = async () => {
    if (!f.siteId) { toast.error('Site is required'); return; }
    const validLines = lines.filter(l => l.itemId && l.qtyReceived);
    if (!validLines.length) { toast.error('Add at least one item line'); return; }
    setSaving(true);
    try {
      const body = { ...f, siteId: Number(f.siteId), jobId: f.jobId || null, poId: f.poId || null, grnDate: new Date().toISOString(), actor: getCurrentUserEmail(), lines: validLines.map(l => ({ itemId: Number(l.itemId), qtyReceived: Number(l.qtyReceived), qtyAccepted: Number(l.qtyReceived), rate: Number(l.rate) || 0 })) };
      const j = await fetch('/api/store/grn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success(`GRN ${j.data.grnNo} posted`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/grn', id, 'GRN')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Goods Receipt Notes" count={records.length} onNew={openNew} newLabel="New GRN" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['GRN No', 'Date', 'Site', 'Vendor', 'PO', 'Items', 'Value', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.grnNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.grnDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.vendorName || r.po?.vendorName || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.po?.poNo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.lines?.length ?? 0}</td>
                <td className="py-2 px-3 text-[#e2e8f0] font-mono">{fmt(r.lines?.reduce((s: number, l: any) => s + l.amount, 0) ?? 0)}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Posted' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'muted'} /></td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No GRNs yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Goods Receipt Note" onClose={() => setFormOpen(false)}>
          <Stepper steps={['Basics', 'Items']} current={step} />
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
              <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => setF({ ...f, jobId: e.target.value })}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
              <div><label className={lbl}>Purchase Order</label><select className={inp} value={f.poId} onChange={e => setF({ ...f, poId: e.target.value })}><option value="">— None —</option>{lookups.pos.map(p => <option key={p.id} value={p.id}>{p.poNo} — {p.vendorName}</option>)}</select></div>
              <div><label className={lbl}>Vendor</label><input className={inp} value={f.vendorName} onChange={e => setF({ ...f, vendorName: e.target.value })} /></div>
              <div><label className={lbl}>DC No</label><input className={inp} value={f.dcNo} onChange={e => setF({ ...f, dcNo: e.target.value })} /></div>
              <div><label className={lbl}>Invoice No</label><input className={inp} value={f.invoiceNo} onChange={e => setF({ ...f, invoiceNo: e.target.value })} /></div>
            </div>
          )}
          {step === 1 && <LinesEditor lines={lines} setLines={setLines} items={lookups.items} addLine={addLine} removeLine={removeLine} qtyKey="qtyReceived" />}
          <WizardFooter step={step} totalSteps={2} onBack={() => setStep(0)} onNext={goNext} onCancel={() => setFormOpen(false)} onFinish={save} saving={saving} finishLabel="Post GRN" />
        </Modal>
      )}
    </div>
  );
}

// ── MRS & Issue ──────────────────────────────────────────────────────
function MrsTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ siteId: '', jobId: '', requestedBy: '', department: '', purpose: '' });
  const [lines, setLines] = useState([{ itemId: '', qtyRequested: '' }]);
  const [issueForm, setIssueForm] = useState({ issuedTo: '', issuedBy: '' });
  const [step, setStep] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/mrs').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load MRS'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', requestedBy: '', department: '', purpose: '' }); setLines([{ itemId: '', qtyRequested: '' }]); setStep(0); setFormOpen(true); };
  const addLine = () => setLines([...lines, { itemId: '', qtyRequested: '' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };
  const goNext = () => { if (!f.siteId) { toast.error('Site is required'); return; } setStep(1); };

  const save = async () => {
    if (!f.siteId) { toast.error('Site is required'); return; }
    const validLines = lines.filter(l => l.itemId && l.qtyRequested);
    if (!validLines.length) { toast.error('Add at least one item line'); return; }
    setSaving(true);
    try {
      const body = { ...f, siteId: Number(f.siteId), jobId: f.jobId || null, mrsDate: new Date().toISOString(), status: 'Pending', actor: getCurrentUserEmail(), lines: validLines.map(l => ({ itemId: Number(l.itemId), qtyRequested: Number(l.qtyRequested) })) };
      const j = await fetch('/api/store/mrs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success(`MRS ${j.data.mrsNo} submitted`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };

  const runAction = async (id: number, action: string) => {
    try {
      const j = await fetch('/api/store/mrs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`MRS ${action}d`); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/mrs', id, 'MRS')) await fetchData(); };

  const doIssue = async () => {
    if (!issueTarget) return;
    setSaving(true);
    try {
      const body = {
        siteId: issueTarget.siteId, jobId: issueTarget.jobId, mrsId: issueTarget.id, issueDate: new Date().toISOString(),
        issuedTo: issueForm.issuedTo, issuedBy: issueForm.issuedBy, actor: getCurrentUserEmail(),
        lines: issueTarget.lines.map((l: any) => ({ itemId: l.itemId, qty: l.qtyRequested })),
      };
      const j = await fetch('/api/store/issue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success(`Issued as ${j.data.issueNo}`); setIssueTarget(null); setIssueForm({ issuedTo: '', issuedBy: '' }); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Material Requisition Slips" count={records.length} onNew={openNew} newLabel="New MRS" />
      <p className="text-[10px] text-[#5a6878] mb-2">Material can only be issued against an <span className="text-[#e2e8f0] font-semibold">Approved</span> MRS.</p>
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['MRS No', 'Date', 'Site', 'Requested By', 'Purpose', 'Items', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.mrsNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.mrsDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.requestedBy || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[160px] truncate">{r.purpose || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.lines?.length ?? 0}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Approved' ? 'ok' : r.status === 'Issued' ? 'muted' : r.status === 'Rejected' ? 'bad' : 'warn'} /></td>
                <td className="py-2 px-3">
                  <div className="flex gap-1.5 items-center">
                    {r.status === 'Pending' && <><button onClick={() => runAction(r.id, 'approve')} className="p-1 rounded text-[#5a6878] hover:text-[#00e676] hover:bg-[#00e676]/10" title="Approve"><Check size={13} /></button><button onClick={() => runAction(r.id, 'reject')} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10" title="Reject"><Ban size={13} /></button></>}
                    {r.status === 'Approved' && <button onClick={() => setIssueTarget(r)} className="px-2 py-1 rounded bg-[#f5a623]/15 text-[#f5a623] text-[10px] font-semibold hover:bg-[#f5a623]/25">Issue</button>}
                    {r.status !== 'Issued' && <DeleteButton onClick={() => remove(r.id)} />}
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No requisitions yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Material Requisition Slip" onClose={() => setFormOpen(false)}>
          <Stepper steps={['Basics', 'Items']} current={step} />
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
              <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => setF({ ...f, jobId: e.target.value })}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
              <div><label className={lbl}>Requested By</label><input className={inp} value={f.requestedBy} onChange={e => setF({ ...f, requestedBy: e.target.value })} /></div>
              <div><label className={lbl}>Department</label><input className={inp} value={f.department} onChange={e => setF({ ...f, department: e.target.value })} /></div>
              <div className="col-span-2"><label className={lbl}>Purpose</label><input className={inp} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></div>
            </div>
          )}
          {step === 1 && <LinesEditor lines={lines} setLines={setLines} items={lookups.items} addLine={addLine} removeLine={removeLine} qtyKey="qtyRequested" />}
          <WizardFooter step={step} totalSteps={2} onBack={() => setStep(0)} onNext={goNext} onCancel={() => setFormOpen(false)} onFinish={save} saving={saving} finishLabel="Submit for Approval" />
        </Modal>
      )}

      {issueTarget && (
        <Modal title={`Issue Material — ${issueTarget.mrsNo}`} onClose={() => setIssueTarget(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Issued To (Receiver)</label><input className={inp} value={issueForm.issuedTo} onChange={e => setIssueForm({ ...issueForm, issuedTo: e.target.value })} /></div>
            <div><label className={lbl}>Issued By</label><input className={inp} value={issueForm.issuedBy} onChange={e => setIssueForm({ ...issueForm, issuedBy: e.target.value })} /></div>
          </div>
          <div className="mt-3 text-[10px] text-[#5a6878]">Issuing all {issueTarget.lines?.length ?? 0} approved line item(s) in full.</div>
          <ModalFooter onCancel={() => setIssueTarget(null)} onSave={doIssue} saving={saving} label="Confirm Issue" />
        </Modal>
      )}
    </div>
  );
}

// ── Returns ──────────────────────────────────────────────────────────
function ReturnsTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ siteId: '', jobId: '', returnedBy: '', remarks: '' });
  const [lines, setLines] = useState([{ itemId: '', qty: '', condition: 'Good' }]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/returns').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load returns'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', returnedBy: '', remarks: '' }); setLines([{ itemId: '', qty: '', condition: 'Good' }]); setFormOpen(true); };
  const addLine = () => setLines([...lines, { itemId: '', qty: '', condition: 'Good' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };

  const save = async () => {
    if (!f.siteId) { toast.error('Site is required'); return; }
    const validLines = lines.filter(l => l.itemId && l.qty);
    if (!validLines.length) { toast.error('Add at least one item line'); return; }
    setSaving(true);
    try {
      const body = { ...f, siteId: Number(f.siteId), jobId: f.jobId || null, returnDate: new Date().toISOString(), actor: getCurrentUserEmail(), lines: validLines.map(l => ({ itemId: Number(l.itemId), qty: Number(l.qty), condition: l.condition })) };
      const j = await fetch('/api/store/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success(`Return ${j.data.returnNo} recorded`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/returns', id, 'return note')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Material Returns" count={records.length} onNew={openNew} newLabel="New Return" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Return No', 'Date', 'Site', 'Returned By', 'Items', 'Condition', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.returnNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.returnDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.returnedBy || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.lines?.length ?? 0}</td>
                <td className="py-2 px-3 text-[#5a6878]">{r.lines?.map((l: any) => l.condition).includes('Damaged') ? <Badge text="Has damaged items" tone="warn" /> : <Badge text="Good" tone="ok" />}</td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No returns yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Material Return" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => setF({ ...f, jobId: e.target.value })}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
            <div><label className={lbl}>Returned By</label><input className={inp} value={f.returnedBy} onChange={e => setF({ ...f, returnedBy: e.target.value })} /></div>
            <div><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
          </div>
          <LinesEditor lines={lines} setLines={setLines} items={lookups.items} addLine={addLine} removeLine={removeLine} qtyKey="qty" withCondition />
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Record Return" />
        </Modal>
      )}
    </div>
  );
}

// ── Tool Register ────────────────────────────────────────────────────
function ToolsTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<any | null>(null);
  const [returnTarget, setReturnTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: '', category: '', siteId: '', remarks: '' });
  const [issuedTo, setIssuedTo] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/tools').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load tools'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ name: '', category: '', siteId: '', remarks: '' }); setFormOpen(true); };
  const save = async () => {
    if (!f.name || !f.siteId) { toast.error('Name and site are required'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, siteId: Number(f.siteId), actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`Tool ${j.data.toolCode} registered`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/tools', id, 'tool')) await fetchData(); };

  const doIssue = async () => {
    if (!issueTarget || !issuedTo) { toast.error('Enter who the tool is issued to'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/tools', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: issueTarget.id, actor: getCurrentUserEmail(), issueLog: { issuedTo } }) }).then(r => r.json());
      if (j.success) { toast.success('Tool issued'); setIssueTarget(null); setIssuedTo(''); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };

  const doReturn = async () => {
    if (!returnTarget) return;
    const openLog = returnTarget.logs?.find((l: any) => !l.returnDate);
    if (!openLog) { toast.error('No open issue log for this tool'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/tools', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: returnTarget.id, actor: getCurrentUserEmail(), issueLog: { returnLogId: openLog.id, condition: returnCondition } }) }).then(r => r.json());
      if (j.success) { toast.success('Tool returned'); setReturnTarget(null); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Tool & Tackle Register" count={records.length} onNew={openNew} newLabel="New Tool" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Tool Code', 'Name', 'Category', 'Site', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.toolCode}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.name}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.category || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.site?.siteCode}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Available' ? 'ok' : r.status === 'Issued' ? 'warn' : 'bad'} /></td>
                <td className="py-2 px-3">
                  <div className="flex gap-1.5 items-center">
                    {r.status === 'Available' && <button onClick={() => setIssueTarget(r)} className="px-2 py-1 rounded bg-[#f5a623]/15 text-[#f5a623] text-[10px] font-semibold hover:bg-[#f5a623]/25">Issue</button>}
                    {r.status === 'Issued' && <button onClick={() => setReturnTarget(r)} className="px-2 py-1 rounded bg-[#00d4ff]/15 text-[#00d4ff] text-[10px] font-semibold hover:bg-[#00d4ff]/25">Return</button>}
                    {r.status !== 'Issued' && <DeleteButton onClick={() => remove(r.id)} />}
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#5a6878]">No tools registered yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="Register New Tool" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lbl}>Name *</label><input className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Grinding Machine" /></div>
            <div><label className={lbl}>Category</label><input className={inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="e.g. Welding Machine" /></div>
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Register Tool" />
        </Modal>
      )}
      {issueTarget && (
        <Modal title={`Issue Tool — ${issueTarget.toolCode}`} onClose={() => setIssueTarget(null)}>
          <div><label className={lbl}>Issued To *</label><input className={inp} value={issuedTo} onChange={e => setIssuedTo(e.target.value)} /></div>
          <ModalFooter onCancel={() => setIssueTarget(null)} onSave={doIssue} saving={saving} label="Issue Tool" />
        </Modal>
      )}
      {returnTarget && (
        <Modal title={`Return Tool — ${returnTarget.toolCode}`} onClose={() => setReturnTarget(null)}>
          <div><label className={lbl}>Condition on Return</label><select className={inp} value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>{['Good', 'Damaged', 'Lost'].map(c => <option key={c}>{c}</option>)}</select></div>
          <ModalFooter onCancel={() => setReturnTarget(null)} onSave={doReturn} saving={saving} label="Confirm Return" />
        </Modal>
      )}
    </div>
  );
}

// ── Gate Pass ────────────────────────────────────────────────────────
function GatePassTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ siteId: '', type: 'Outward', itemDescription: '', qty: '', vehicleNo: '', driverName: '', purpose: '', authorizedBy: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/gate-pass').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load gate passes'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', type: 'Outward', itemDescription: '', qty: '', vehicleNo: '', driverName: '', purpose: '', authorizedBy: '' }); setFormOpen(true); };
  const save = async () => {
    if (!f.siteId || !f.itemDescription) { toast.error('Site and item description are required'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/gate-pass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, siteId: Number(f.siteId), qty: Number(f.qty) || 0, actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`Gate pass ${j.data.gatePassNo} created`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const closeGatePass = async (id: number) => {
    try {
      const j = await fetch('/api/store/gate-pass', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'Closed', actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success('Gate pass closed'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/gate-pass', id, 'gate pass')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Gate Pass Register" count={records.length} onNew={openNew} newLabel="New Gate Pass" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Gate Pass No', 'Date', 'Type', 'Site', 'Item', 'Qty', 'Vehicle', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.gatePassNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.gatePassDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.type}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[160px] truncate">{r.itemDescription}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.qty}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.vehicleNo || '—'}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Open' ? 'warn' : 'ok'} /></td>
                <td className="py-2 px-3">
                  <div className="flex gap-1.5 items-center">
                    {r.status === 'Open' && <button onClick={() => closeGatePass(r.id)} className="px-2 py-1 rounded bg-[#5a6878]/15 text-[#8899aa] text-[10px] font-semibold hover:bg-[#5a6878]/25">Close</button>}
                    <DeleteButton onClick={() => remove(r.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[#5a6878]">No gate passes yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Gate Pass" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Type</label><select className={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['Outward', 'Inward', 'Returnable', 'Non-Returnable'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Item Description *</label><input className={inp} value={f.itemDescription} onChange={e => setF({ ...f, itemDescription: e.target.value })} /></div>
            <div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div>
            <div><label className={lbl}>Vehicle No</label><input className={inp} value={f.vehicleNo} onChange={e => setF({ ...f, vehicleNo: e.target.value })} /></div>
            <div><label className={lbl}>Driver Name</label><input className={inp} value={f.driverName} onChange={e => setF({ ...f, driverName: e.target.value })} /></div>
            <div><label className={lbl}>Authorized By</label><input className={inp} value={f.authorizedBy} onChange={e => setF({ ...f, authorizedBy: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Purpose</label><input className={inp} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Create Gate Pass" />
        </Modal>
      )}
    </div>
  );
}

// ── Equipment ────────────────────────────────────────────────────────
function EquipmentTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: '', type: '', siteId: '', operatorName: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/equipment').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load equipment'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ name: '', type: '', siteId: '', operatorName: '' }); setFormOpen(true); };
  const save = async () => {
    if (!f.name || !f.siteId) { toast.error('Name and site are required'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, siteId: Number(f.siteId), actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`Equipment ${j.data.equipmentCode} registered`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/equipment', id, 'equipment')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Equipment Register" count={records.length} onNew={openNew} newLabel="New Equipment" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Code', 'Name', 'Type', 'Site', 'Operator', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.equipmentCode}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.name}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.type || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.operatorName || '—'}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Active' ? 'ok' : r.status === 'Under Maintenance' ? 'warn' : 'muted'} /></td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[#5a6878]">No equipment registered yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="Register New Equipment" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lbl}>Name *</label><input className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Farana Crane" /></div>
            <div><label className={lbl}>Type</label><input className={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })} placeholder="e.g. Crane" /></div>
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Operator</label><input className={inp} value={f.operatorName} onChange={e => setF({ ...f, operatorName: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Register Equipment" />
        </Modal>
      )}
    </div>
  );
}

// ── Scrap Register ───────────────────────────────────────────────────
function ScrapTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ siteId: '', jobId: '', itemId: '', description: '', qty: '', unit: 'Nos', estimatedValue: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/scrap').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load scrap register'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', itemId: '', description: '', qty: '', unit: 'Nos', estimatedValue: '' }); setFormOpen(true); };
  const save = async () => {
    if (!f.siteId || !f.description) { toast.error('Site and description are required'); return; }
    setSaving(true);
    try {
      const body = { ...f, siteId: Number(f.siteId), jobId: f.jobId || null, itemId: f.itemId || null, qty: Number(f.qty) || 0, estimatedValue: Number(f.estimatedValue) || 0, actor: getCurrentUserEmail() };
      const j = await fetch('/api/store/scrap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success(`Scrap entry ${j.data.scrapNo} recorded`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const markDisposed = async (id: number) => {
    try {
      const j = await fetch('/api/store/scrap', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, disposalStatus: 'Disposed', actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success('Marked disposed'); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/scrap', id, 'scrap entry')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Scrap Register" count={records.length} onNew={openNew} newLabel="New Scrap Entry" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Scrap No', 'Date', 'Site', 'Description', 'Qty', 'Est. Value', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.scrapNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.scrapDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[160px] truncate">{r.description}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.qty} {r.unit}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{fmt(r.estimatedValue)}</td>
                <td className="py-2 px-3"><Badge text={r.disposalStatus} tone={r.disposalStatus === 'Disposed' ? 'ok' : r.disposalStatus === 'Sold' ? 'ok' : 'warn'} /></td>
                <td className="py-2 px-3">
                  <div className="flex gap-1.5 items-center">
                    {r.disposalStatus === 'Pending' && <button onClick={() => markDisposed(r.id)} className="px-2 py-1 rounded bg-[#5a6878]/15 text-[#8899aa] text-[10px] font-semibold hover:bg-[#5a6878]/25">Mark Disposed</button>}
                    <DeleteButton onClick={() => remove(r.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No scrap entries yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Scrap Entry" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => setF({ ...f, jobId: e.target.value })}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Description *</label><input className={inp} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="e.g. Cut-offs from fabrication" /></div>
            <div><label className={lbl}>Related Item</label><select className={inp} value={f.itemId} onChange={e => setF({ ...f, itemId: e.target.value })}><option value="">— None —</option>{lookups.items.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2"><div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div><div><label className={lbl}>Unit</label><input className={inp} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /></div></div>
            <div><label className={lbl}>Estimated Value (₹)</label><input type="number" className={inp} value={f.estimatedValue} onChange={e => setF({ ...f, estimatedValue: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Record Scrap" />
        </Modal>
      )}
    </div>
  );
}

// ── Physical Verification ────────────────────────────────────────────
function PvTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ siteId: '', type: 'Monthly', verifiedBy: '' });
  const [lines, setLines] = useState([{ itemId: '', bookQty: '', physicalQty: '' }]);
  const [step, setStep] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/physical-verification').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load verifications'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', type: 'Monthly', verifiedBy: '' }); setLines([{ itemId: '', bookQty: '', physicalQty: '' }]); setStep(0); setFormOpen(true); };
  const goNext = () => { if (!f.siteId) { toast.error('Site is required'); return; } setStep(1); };
  const addLine = () => setLines([...lines, { itemId: '', bookQty: '', physicalQty: '' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };

  const save = async () => {
    if (!f.siteId) { toast.error('Site is required'); return; }
    const validLines = lines.filter(l => l.itemId);
    if (!validLines.length) { toast.error('Add at least one item line'); return; }
    setSaving(true);
    try {
      const body = { ...f, siteId: Number(f.siteId), verificationDate: new Date().toISOString(), status: 'Completed', actor: getCurrentUserEmail(), lines: validLines.map(l => ({ itemId: Number(l.itemId), bookQty: Number(l.bookQty) || 0, physicalQty: Number(l.physicalQty) || 0 })) };
      const j = await fetch('/api/store/physical-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
      if (j.success) { toast.success(`Verification ${j.data.verificationNo} recorded`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/physical-verification', id, 'verification')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Physical Stock Verification" count={records.length} onNew={openNew} newLabel="New Verification" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Verification No', 'Date', 'Type', 'Site', 'Verified By', 'Items', 'Variances', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => {
              const varCount = r.lines?.filter((l: any) => l.variance !== 0).length ?? 0;
              return (
                <tr key={r.id} className="hover:bg-[#141920]">
                  <td className="py-2 px-3 text-[#f5a623] font-mono">{r.verificationNo}</td>
                  <td className="py-2 px-3 text-[#8899aa] font-mono">{r.verificationDate?.split('T')[0]}</td>
                  <td className="py-2 px-3 text-[#8899aa]">{r.type}</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                  <td className="py-2 px-3 text-[#8899aa]">{r.verifiedBy || '—'}</td>
                  <td className="py-2 px-3 text-[#8899aa]">{r.lines?.length ?? 0}</td>
                  <td className="py-2 px-3">{varCount > 0 ? <Badge text={`${varCount} variance(s)`} tone="warn" /> : <Badge text="Matched" tone="ok" />}</td>
                  <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
                </tr>
              );
            })}
            {records.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No verifications recorded yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Physical Stock Verification" onClose={() => setFormOpen(false)}>
          <Stepper steps={['Basics', 'Count Sheet']} current={step} />
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
              <div><label className={lbl}>Type</label><select className={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['Daily', 'Weekly', 'Monthly'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="col-span-2"><label className={lbl}>Verified By</label><input className={inp} value={f.verifiedBy} onChange={e => setF({ ...f, verifiedBy: e.target.value })} /></div>
            </div>
          )}
          {step === 1 && (
            <div>
              <label className={lbl}>Item Count Sheet</label>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px_28px] gap-2 mb-2 items-end">
                  <select className={inp} value={l.itemId} onChange={e => { const u = [...lines]; u[i] = { ...u[i], itemId: e.target.value }; setLines(u); }}><option value="">— Item —</option>{lookups.items.map(it => <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>)}</select>
                  <input type="number" className={inp} placeholder="Book Qty" value={l.bookQty} onChange={e => { const u = [...lines]; u[i] = { ...u[i], bookQty: e.target.value }; setLines(u); }} />
                  <input type="number" className={inp} placeholder="Physical Qty" value={l.physicalQty} onChange={e => { const u = [...lines]; u[i] = { ...u[i], physicalQty: e.target.value }; setLines(u); }} />
                  <button onClick={() => removeLine(i)} className="text-[#ff3d3d] hover:opacity-80"><X size={14} /></button>
                </div>
              ))}
              <button onClick={addLine} className="text-[11px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={12} /> Add item</button>
            </div>
          )}
          <WizardFooter step={step} totalSteps={2} onBack={() => setStep(0)} onNext={goNext} onCancel={() => setFormOpen(false)} onFinish={save} saving={saving} finishLabel="Record Verification" />
        </Modal>
      )}
    </div>
  );
}

// ── Monthly Report ───────────────────────────────────────────────────
function ReportTab({ lookups }: { lookups: Lookups }) {
  const [siteId, setSiteId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const j = await fetch(`/api/store/report?siteId=${siteId}&month=${month}`).then(r => r.json());
      if (j.success) setData(j.data); else toast.error(j.error || 'Failed to load report');
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  }, [siteId, month]);

  useEffect(() => { if (lookups.sites.length && !siteId) setSiteId(String(lookups.sites[0].id)); }, [lookups.sites, siteId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select className={inp + ' !w-auto'} value={siteId} onChange={e => setSiteId(e.target.value)}>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select>
        <input type="month" className={inp + ' !w-auto'} value={month} onChange={e => setMonth(e.target.value)} />
        <button onClick={load} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]"><RefreshCw size={14} /></button>
      </div>

      {loading ? <Spinner /> : !data ? (
        <div className="text-center py-12 text-[#5a6878] text-[12px]">Select a site to view its monthly report</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Material Received" value={fmt(data.materialReceived.value)} sub={`${data.materialReceived.count} GRN(s)`} />
            <StatCard label="Material Issued" value={fmt(data.materialIssued.value)} sub={`${data.materialIssued.count} issue(s)`} />
            <StatCard label="Scrap Value" value={fmt(data.scrap.value)} sub={`${data.scrap.count} entries`} />
            <StatCard label="Material Returned" value={String(data.materialReturned.count)} sub="return notes" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[11px] font-bold text-[#e2e8f0] mb-3">MRS Status</div>
              <Row k="Pending" v={data.mrs.pending} /><Row k="Approved" v={data.mrs.approved} /><Row k="Rejected" v={data.mrs.rejected} />
            </div>
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[11px] font-bold text-[#e2e8f0] mb-3">Tool &amp; Equipment Status</div>
              <Row k="Tools Issued" v={data.tools.issued} /><Row k="Tools Available" v={data.tools.available} /><Row k="Under Repair / Lost" v={data.tools.underRepair + data.tools.lost} />
            </div>
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[11px] font-bold text-[#e2e8f0] mb-3">Gate Passes &amp; Verification</div>
              <Row k="Gate Passes (Open)" v={`${data.gatePasses.count} (${data.gatePasses.open})`} /><Row k="Verifications" v={data.physicalVerification.count} /><Row k="Items with Variance" v={data.physicalVerification.itemsWithVariance} />
            </div>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#252e3a] text-[11px] font-bold text-[#e2e8f0]">Item-wise Movement — {month}</div>
            <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['SKU', 'Item', 'Received', 'Issued', 'Returned'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {data.itemMovement.map((r: any) => (
                  <tr key={r.itemId} className="hover:bg-[#141920]">
                    <td className="py-2 px-3 text-[#f5a623] font-mono">{r.sku}</td>
                    <td className="py-2 px-3 text-[#e2e8f0]">{r.name}</td>
                    <td className="py-2 px-3 text-[#00e676] font-mono">{r.received}</td>
                    <td className="py-2 px-3 text-[#ff3d3d] font-mono">{r.issued}</td>
                    <td className="py-2 px-3 text-[#00d4ff] font-mono">{r.returned}</td>
                  </tr>
                ))}
                {data.itemMovement.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[#5a6878]">No movement this month</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
          <p className="text-[10px] text-[#5a6878]">Note: this reports material movement for the month (received/issued/returned/scrapped). Opening/closing stock balances require a running stock ledger, which is a separate follow-up.</p>
        </div>
      )}
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────
function Spinner() { return <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#f5a623]" size={22} /></div>; }

function TableHeader({ title, count, onNew, newLabel }: { title: string; count: number; onNew: () => void; newLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[12px] font-semibold text-[#e2e8f0]">{title} <span className="text-[#5a6878] font-normal">({count})</span></span>
      <button onClick={onNew} className="vc-btn-primary flex items-center gap-1.5"><Plus size={13} /> {newLabel}</button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3"><h4 className="text-[13px] font-bold text-[#e2e8f0]">{title}</h4><button onClick={onClose}><X size={15} className="text-[#5a6878]" /></button></div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onSave, saving, label }: { onCancel: () => void; onSave: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 mt-4">
      <button onClick={onCancel} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">Cancel</button>
      <button onClick={onSave} disabled={saving} className="vc-btn-primary">{saving ? 'Saving…' : label}</button>
    </div>
  );
}

// A short, 2-step wizard: one focused screen at a time instead of every
// field crammed into one dense form. Step 1 is always "the basics",
// step 2 is always "the items" — kept to exactly two steps on purpose,
// since more than that turns a wizard into its own kind of complexity.
function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i < current ? 'bg-[#00e676] text-black' : i === current ? 'bg-[#f5a623] text-black' : 'bg-[#252e3a] text-[#5a6878]'}`}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-[11px] font-semibold whitespace-nowrap ${i <= current ? 'text-[#e2e8f0]' : 'text-[#5a6878]'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-[2px] flex-1 ${i < current ? 'bg-[#00e676]' : 'bg-[#252e3a]'}`} />}
        </div>
      ))}
    </div>
  );
}

function WizardFooter({ step, totalSteps, onBack, onNext, onCancel, onFinish, saving, finishLabel }: {
  step: number; totalSteps: number; onBack: () => void; onNext: () => void; onCancel: () => void; onFinish: () => void; saving: boolean; finishLabel: string;
}) {
  return (
    <div className="flex justify-between items-center mt-4">
      <button onClick={step === 0 ? onCancel : onBack} className="px-3 py-1.5 text-[11px] text-[#8899aa] border border-[#252e3a] rounded-lg">{step === 0 ? 'Cancel' : '← Back'}</button>
      {step < totalSteps - 1 ? (
        <button onClick={onNext} className="px-4 py-1.5 bg-[#f5a623] text-black text-[11px] font-bold rounded-lg">Next →</button>
      ) : (
        <button onClick={onFinish} disabled={saving} className="vc-btn-primary">{saving ? 'Saving…' : finishLabel}</button>
      )}
    </div>
  );
}

function LinesEditor({ lines, setLines, items, addLine, removeLine, qtyKey, withCondition }: { lines: any[]; setLines: (l: any[]) => void; items: ItemRef[]; addLine: () => void; removeLine: (i: number) => void; qtyKey: string; withCondition?: boolean }) {
  return (
    <div className="mt-3">
      <label className={lbl}>Item Lines</label>
      {lines.map((l, i) => (
        <div key={i} className={`grid ${withCondition ? 'grid-cols-[1fr_90px_110px_28px]' : 'grid-cols-[1fr_90px_28px]'} gap-2 mb-2 items-end`}>
          <select className={inp} value={l.itemId} onChange={e => { const u = [...lines]; u[i] = { ...u[i], itemId: e.target.value }; setLines(u); }}><option value="">— Item —</option>{items.map(it => <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>)}</select>
          <input type="number" className={inp} placeholder="Qty" value={l[qtyKey]} onChange={e => { const u = [...lines]; u[i] = { ...u[i], [qtyKey]: e.target.value }; setLines(u); }} />
          {withCondition && <select className={inp} value={l.condition} onChange={e => { const u = [...lines]; u[i] = { ...u[i], condition: e.target.value }; setLines(u); }}>{['Good', 'Damaged'].map(c => <option key={c}>{c}</option>)}</select>}
          <button onClick={() => removeLine(i)} className="text-[#ff3d3d] hover:opacity-80"><X size={14} /></button>
        </div>
      ))}
      <button onClick={addLine} className="text-[11px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={12} /> Add line</button>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-3">
      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-bold">{label}</div>
      <div className="text-[16px] font-bold text-[#e2e8f0] mt-1">{value}</div>
      <div className="text-[10px] text-[#5a6878] mt-0.5">{sub}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between py-1 text-[11px]"><span className="text-[#8899aa]">{k}</span><span className="text-[#e2e8f0] font-mono font-semibold">{v}</span></div>;
}
