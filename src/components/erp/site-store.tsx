'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Warehouse, Plus, X, Loader2, RefreshCw, Truck, ClipboardList, PackageCheck, PackageX,
  Wrench, IdCard, Forklift, Recycle, ClipboardCheck, FileBarChart, Check, Ban, Trash2,
  Package, Fuel, Flame,
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
interface SiteRef { id: number; name: string; siteCode: string; location?: string | null; }
interface JobRef { id: number; jobCode: string; description: string | null; siteId: number | null; projectName?: string | null; }
interface ItemRef { id: number; sku: string; name: string; }
interface PoRef { id: number; poNo: string; vendorName: string; }
// Contractor master (Contractors Management) — served at /api/fin/vendors.
interface VendorRef { id: number; name: string; vendorCode: string | null; }

function useLookups() {
  const [sites, setSites] = useState<SiteRef[]>([]);
  const [jobs, setJobs] = useState<JobRef[]>([]);
  const [items, setItems] = useState<ItemRef[]>([]);
  const [pos, setPos] = useState<PoRef[]>([]);
  const [vendors, setVendors] = useState<VendorRef[]>([]);
  // Live stock position per item (opening/received/issued/closing) — used by
  // the MRS slip (Current Stock / Minimum Stock columns) and the Stock Register.
  const [stockIndex, setStockIndex] = useState<Record<string, { balance: number; reorderLevel: number; unit: string; belowMin: boolean }>>({});
  useEffect(() => {
    fetch('/api/fin/sites').then(r => r.json()).then(j => { if (j.success) setSites(j.data); }).catch(() => {});
    fetch('/api/fin/jobs').then(r => r.json()).then(j => { if (j.success) setJobs(j.data.map((x: any) => ({ id: x.id, jobCode: x.jobCode, description: x.description, siteId: x.siteId, projectName: x.project?.name ?? null }))); }).catch(() => {});
    fetch('/api/items').then(r => r.json()).then(j => { if (j.success) setItems(j.data.map((x: any) => ({ id: x.id, sku: x.sku, name: x.name }))); }).catch(() => {});
    fetch('/api/fin/purchase-orders').then(r => r.json()).then(j => { if (j.success) setPos(j.data.map((x: any) => ({ id: x.id, poNo: x.poNo, vendorName: x.vendorName }))); }).catch(() => {});
    fetch('/api/fin/vendors').then(r => r.json()).then(j => { if (j.success && Array.isArray(j.data)) setVendors(j.data.map((x: any) => ({ id: x.id, name: x.name, vendorCode: x.vendorCode ?? null }))); }).catch(() => {});
    fetch('/api/store/stock-register').then(r => r.json()).then(j => { if (j.success) setStockIndex(Object.fromEntries(j.data.map((x: any) => [x.itemCode, { balance: x.balance, reorderLevel: x.reorderLevel, unit: x.unit, belowMin: x.belowMin }]))); }).catch(() => {});
  }, []);
  return { sites, jobs, items, pos, vendors, stockIndex };
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
  { id: 'stock', label: 'Stock Register', icon: Package },
  { id: 'diesel', label: 'Diesel Register', icon: Fuel },
  { id: 'gas', label: 'Gas Cylinder Register', icon: Flame },
  { id: 'daily', label: 'Daily Issue Register', icon: ClipboardList },
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
      {tab === 'stock' && <StockRegisterTab lookups={lookups} />}
      {tab === 'diesel' && <DieselTab lookups={lookups} />}
      {tab === 'gas' && <GasCylinderTab lookups={lookups} />}
      {tab === 'daily' && <DailyIssueTab lookups={lookups} />}
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
  const [f, setF] = useState({ siteId: '', jobId: '', poId: '', vendorName: '', dcNo: '', invoiceNo: '', status: 'Posted', remarks: '', timeOfReceipt: '', projectName: '', siteLocation: '', gateEntryNo: '', vehicleNo: '', lrDetails: '', storeLocation: 'Main Store', receivedBy: '' });
  const [lines, setLines] = useState([{ itemId: '', qtyReceived: '', rate: '', materialCategory: 'CONSUMABLE ITEM', batchHeatNo: '', damageTransit: 'No', inspectionStatus: 'Accepted' }]);
  const [step, setStep] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/grn').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load GRNs'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', poId: '', vendorName: '', dcNo: '', invoiceNo: '', status: 'Posted', remarks: '', timeOfReceipt: '', projectName: '', siteLocation: '', gateEntryNo: '', vehicleNo: '', lrDetails: '', storeLocation: 'Main Store', receivedBy: '' }); setLines([{ itemId: '', qtyReceived: '', rate: '', materialCategory: 'CONSUMABLE ITEM', batchHeatNo: '', damageTransit: 'No', inspectionStatus: 'Accepted' }]); setStep(0); setFormOpen(true); };
  const addLine = () => setLines([...lines, { itemId: '', qtyReceived: '', rate: '', materialCategory: 'CONSUMABLE ITEM', batchHeatNo: '', damageTransit: 'No', inspectionStatus: 'Accepted' }]);
  const removeLine = (i: number) => { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); };
  const goNext = () => { if (!f.siteId) { toast.error('Site is required'); return; } setStep(1); };

  const save = async () => {
    if (!f.siteId) { toast.error('Site is required'); return; }
    const validLines = lines.filter(l => l.itemId && l.qtyReceived);
    if (!validLines.length) { toast.error('Add at least one item line'); return; }
    setSaving(true);
    try {
      const body = { ...f, siteId: Number(f.siteId), jobId: f.jobId || null, poId: f.poId || null, grnDate: new Date().toISOString(), actor: getCurrentUserEmail(), lines: validLines.map(l => ({ itemId: Number(l.itemId), qtyReceived: Number(l.qtyReceived), qtyAccepted: Number(l.qtyReceived), rate: Number(l.rate) || 0, materialCategory: l.materialCategory, batchHeatNo: l.batchHeatNo, damageTransit: l.damageTransit, inspectionStatus: l.inspectionStatus })) };
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
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['GRN No', 'Date', 'Time', 'Site', 'Vendor', 'PO', 'Challan', 'Items', 'Accepted', 'Value', 'Store', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.grnNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.grnDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.timeOfReceipt || '—'}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.vendorName || r.po?.vendorName || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.po?.poNo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.dcNo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.lines?.length ?? 0}</td>
                <td className="py-2 px-3 text-[#00e676] font-mono">{r.lines?.reduce((s: number, l: any) => s + (l.qtyAccepted ?? 0), 0) ?? 0}</td>
                <td className="py-2 px-3 text-[#e2e8f0] font-mono">{fmt(r.lines?.reduce((s: number, l: any) => s + l.amount, 0) ?? 0)}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.storeLocation || '—'}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Posted' ? 'ok' : r.status === 'Rejected' ? 'bad' : 'muted'} /></td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={13} className="py-8 text-center text-[#5a6878]">No GRNs yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Goods Receipt Note" onClose={() => setFormOpen(false)} wide>
          <Stepper steps={['Basics', 'Items']} current={step} />
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => { const s = lookups.sites.find(x => String(x.id) === e.target.value); setF({ ...f, siteId: e.target.value, siteLocation: s?.location ?? f.siteLocation }); }}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
              <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => { const j = lookups.jobs.find(x => String(x.id) === e.target.value); setF({ ...f, jobId: e.target.value, projectName: j?.projectName ?? f.projectName }); }}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
              <div><label className={lbl}>Purchase Order</label><select className={inp} value={f.poId} onChange={e => { const p = lookups.pos.find(x => String(x.id) === e.target.value); setF({ ...f, poId: e.target.value, vendorName: p?.vendorName || f.vendorName }); }}><option value="">— None —</option>{lookups.pos.map(p => <option key={p.id} value={p.id}>{p.poNo} — {p.vendorName}</option>)}</select></div>
              <div><label className={lbl}>Supplier / Vendor (Contractors)</label><select className={inp + ' appearance-none'} value={f.vendorName} onChange={e => setF({ ...f, vendorName: e.target.value })}><option value="">— Select contractor —</option>{lookups.vendors.map(v => <option key={v.id} value={v.name}>{v.vendorCode ? `${v.vendorCode} — ` : ''}{v.name}</option>)}{f.vendorName && !lookups.vendors.some(v => v.name === f.vendorName) && <option value={f.vendorName}>{f.vendorName} (existing)</option>}</select></div>
              <div><label className={lbl}>Challan/Invoice No</label><input className={inp} value={f.dcNo} onChange={e => setF({ ...f, dcNo: e.target.value })} placeholder="DC-0813" /></div>
              <div><label className={lbl}>Invoice No</label><input className={inp} value={f.invoiceNo} onChange={e => setF({ ...f, invoiceNo: e.target.value })} /></div>
              <div><label className={lbl}>Time of Receipt</label><input className={inp} value={f.timeOfReceipt} onChange={e => setF({ ...f, timeOfReceipt: e.target.value })} placeholder="e.g. 05:30 PM" /></div>
              <div><label className={lbl}>Store Location</label><select className={inp} value={f.storeLocation} onChange={e => setF({ ...f, storeLocation: e.target.value })}>{['Main Store', 'PPEs Store', 'Power & Machine Store', 'Tools & Tackles Store'].map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className={lbl}>Gate Entry No</label><input className={inp} value={f.gateEntryNo} onChange={e => setF({ ...f, gateEntryNo: e.target.value })} placeholder="GE-10125" /></div>
              <div><label className={lbl}>Vehicle No</label><input className={inp} value={f.vehicleNo} onChange={e => setF({ ...f, vehicleNo: e.target.value })} placeholder="OD23U4075" /></div>
              <div><label className={lbl}>LR / Transporter</label><input className={inp} value={f.lrDetails} onChange={e => setF({ ...f, lrDetails: e.target.value })} placeholder="Lorry receipt details" /></div>
              <div><label className={lbl}>Received By</label><input className={inp} value={f.receivedBy} onChange={e => setF({ ...f, receivedBy: e.target.value })} placeholder="Store Keeper" /></div>
              <div><label className={lbl}>Project Name</label><input className={inp} value={f.projectName} onChange={e => setF({ ...f, projectName: e.target.value })} placeholder="e.g. AAP Gap AMC" /></div>
              <div><label className={lbl}>Site Location</label><input className={inp} value={f.siteLocation} onChange={e => setF({ ...f, siteLocation: e.target.value })} placeholder="e.g. Lapanga OD" /></div>
              <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
            </div>
          )}
          {step === 1 && <GrnLinesEditor lines={lines} setLines={setLines} items={lookups.items} addLine={addLine} removeLine={removeLine} />}
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
  const [f, setF] = useState({ siteId: '', jobId: '', requestedBy: '', department: '', purpose: '', requiredByDate: '', reasonForRequirement: 'New Work' });
  const [lines, setLines] = useState([{ itemId: '', qtyRequested: '' }]);
  const [issueForm, setIssueForm] = useState({ issuedTo: '', issuedBy: '' });
  const [step, setStep] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/mrs').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load MRS'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', requestedBy: '', department: '', purpose: '', requiredByDate: '', reasonForRequirement: 'New Work' }); setLines([{ itemId: '', qtyRequested: '' }]); setStep(0); setFormOpen(true); };
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
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['MRS No', 'Date', 'Required By', 'Site', 'Requested By', 'Reason', 'Purpose', 'Items', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.mrsNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.mrsDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.requiredByDate ? new Date(r.requiredByDate).toISOString().split('T')[0] : '—'}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.requestedBy || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[150px] truncate">{r.reasonForRequirement || '—'}</td>
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
            {records.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-[#5a6878]">No requisitions yet</td></tr>}
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
              <div><label className={lbl}>Required On-Site By</label><input type="date" className={inp} value={f.requiredByDate} onChange={e => setF({ ...f, requiredByDate: e.target.value })} /></div>
              <div><label className={lbl}>Reason for Requirement</label><select className={inp + ' appearance-none'} value={f.reasonForRequirement} onChange={e => setF({ ...f, reasonForRequirement: e.target.value })}>{['New Work', 'Stock Replenishment', 'Emergency Requirement', 'Replacement of Damaged Material', 'Additional Scope of Work', 'Regular Requirement'].map(r => <option key={r}>{r}</option>)}</select></div>
              <div className="col-span-2"><label className={lbl}>Purpose</label><input className={inp} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} placeholder="Purpose of issue / Work location / Area" /></div>
            </div>
          )}
          {step === 1 && <LinesEditor lines={lines} setLines={setLines} items={lookups.items} addLine={addLine} removeLine={removeLine} qtyKey="qtyRequested" stockIndex={lookups.stockIndex} />}
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
  const [f, setF] = useState({ siteId: '', jobId: '', returnedBy: '', receivedBy: '', remarks: '' });
  const [lines, setLines] = useState([{ itemId: '', qty: '', condition: 'Good' }]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/returns').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load returns'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', returnedBy: '', receivedBy: '', remarks: '' }); setLines([{ itemId: '', qty: '', condition: 'Good' }]); setFormOpen(true); };
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
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Return No', 'Date', 'Site', 'Returned By', 'Received By', 'Items', 'Condition', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.returnNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.returnDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.returnedBy || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.receivedBy || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.lines?.length ?? 0}</td>
                <td className="py-2 px-3 text-[#5a6878]">{r.lines?.map((l: any) => l.condition).includes('Damaged') ? <Badge text="Has damaged items" tone="warn" /> : <Badge text="Good" tone="ok" />}</td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No returns yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Material Return" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => setF({ ...f, jobId: e.target.value })}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
            <div><label className={lbl}>Returned By</label><input className={inp} value={f.returnedBy} onChange={e => setF({ ...f, returnedBy: e.target.value })} placeholder="Who returned the material" /></div>
            <div><label className={lbl}>Received By</label><input className={inp} value={f.receivedBy} onChange={e => setF({ ...f, receivedBy: e.target.value })} placeholder="Store keeper who received it" /></div>
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
  const [returnTarget, setReturnTarget] = useState<{ tool: any; log: any } | null>(null);
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

  // Flat issue-log register (client Excel "Tool box Register" format):
  // Issue No | Date | Tool Name | Tool ID | Issued To | Qty | Issue Date | Return Date | Condition | Remarks
  const registerRows = records
    .flatMap(r => (r.logs ?? []).map((l: any) => ({ tool: r, log: l })))
    .sort((a, b) => new Date(b.log.issueDate).getTime() - new Date(a.log.issueDate).getTime());

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
    const { tool, log } = returnTarget;
    setSaving(true);
    try {
      const j = await fetch('/api/store/tools', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tool.id, actor: getCurrentUserEmail(), issueLog: { returnLogId: log.id, condition: returnCondition } }) }).then(r => r.json());
      if (j.success) { toast.success('Tool returned'); setReturnTarget(null); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <TableHeader title="Tool Box Register (Issue Log)" count={registerRows.length} onNew={openNew} newLabel="New Tool" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Issue No', 'Issue Date', 'Tool Name', 'Tool ID', 'Issued To', 'Qty', 'Return Date', 'Condition', 'Remarks', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {registerRows.map(({ tool, log }) => (
              <tr key={log.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{log.issueNo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{log.issueDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{tool.name}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{tool.toolCode}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{log.issuedTo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{log.qty ?? 1}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{log.returnDate ? String(log.returnDate).split('T')[0] : '— (open)'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{log.condition || '—'}</td>
                <td className="py-2 px-3 text-[#5a6878] max-w-[160px] truncate">{log.remarks || '—'}</td>
                <td className="py-2 px-3">
                  {!log.returnDate && <button onClick={() => setReturnTarget({ tool, log })} className="px-2 py-1 rounded bg-[#00d4ff]/15 text-[#00d4ff] text-[10px] font-semibold hover:bg-[#00d4ff]/25">Return</button>}
                </td>
              </tr>
            ))}
            {registerRows.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-[#5a6878]">No tools issued yet — register a tool and click Issue</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-[#252e3a] text-[11px] font-bold text-[#e2e8f0]">Tool Master ({records.length})</div>
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
            <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
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
        <Modal title={`Return Tool — ${returnTarget.tool.toolCode}`} onClose={() => setReturnTarget(null)}>
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
  const [f, setF] = useState({ siteId: '', type: 'Outward', itemDescription: '', itemCode: '', qty: '', vehicleNo: '', driverName: '', purpose: '', authorizedBy: '', outwardGpNo: '', outwardDate: '', remarks: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/gate-pass').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load gate passes'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', type: 'Outward', itemDescription: '', itemCode: '', qty: '', vehicleNo: '', driverName: '', purpose: '', authorizedBy: '', outwardGpNo: '', outwardDate: '', remarks: '' }); setFormOpen(true); };
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
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['GP No', 'Date', 'Direction', 'Site', 'Item Code', 'Material', 'Qty', 'Vehicle', 'Purpose', 'Authorized By', 'Outward GP', 'Remarks', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.gatePassNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.gatePassDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.type}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.itemCode || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[160px] truncate">{r.itemDescription}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.qty}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.vehicleNo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[140px] truncate">{r.purpose || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.authorizedBy || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.outwardGpNo ? `${r.outwardGpNo}${r.outwardDate ? ' · ' + String(r.outwardDate).split('T')[0] : ''}` : '—'}</td>
                <td className="py-2 px-3 text-[#5a6878] max-w-[160px] truncate">{r.remarks || '—'}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Open' ? 'warn' : 'ok'} /></td>
                <td className="py-2 px-3">
                  <div className="flex gap-1.5 items-center">
                    {r.status === 'Open' && <button onClick={() => closeGatePass(r.id)} className="px-2 py-1 rounded bg-[#5a6878]/15 text-[#8899aa] text-[10px] font-semibold hover:bg-[#5a6878]/25">Close</button>}
                    <DeleteButton onClick={() => remove(r.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={14} className="py-8 text-center text-[#5a6878]">No gate passes yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Gate Pass" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Type</label><select className={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['Outward', 'Inward', 'Returnable', 'Non-Returnable'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Item Code (from item master)</label><select className={inp + ' appearance-none'} value={f.itemCode} onChange={e => { const it = lookups.items.find(i => i.sku === e.target.value); setF({ ...f, itemCode: e.target.value, itemDescription: f.itemDescription || (it ? `${it.sku} — ${it.name}` : f.itemDescription) }); }}><option value="">— Free text (unregistered material) —</option>{lookups.items.map(i => <option key={i.id} value={i.sku}>{i.sku} — {i.name}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Material / Item Description *</label><input className={inp} value={f.itemDescription} onChange={e => setF({ ...f, itemDescription: e.target.value })} placeholder="e.g. Welding Rod 7018 x 3.15" /></div>
            <div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div>
            <div><label className={lbl}>Vehicle No</label><input className={inp} value={f.vehicleNo} onChange={e => setF({ ...f, vehicleNo: e.target.value })} /></div>
            <div><label className={lbl}>Driver Name</label><input className={inp} value={f.driverName} onChange={e => setF({ ...f, driverName: e.target.value })} /></div>
            <div><label className={lbl}>Authorized By</label><input className={inp} value={f.authorizedBy} onChange={e => setF({ ...f, authorizedBy: e.target.value })} /></div>
            <div><label className={lbl}>Outward GP No (for returnable)</label><input className={inp} value={f.outwardGpNo} onChange={e => setF({ ...f, outwardGpNo: e.target.value })} placeholder="GP/…" /></div>
            <div><label className={lbl}>Outward Date</label><input type="date" className={inp} value={f.outwardDate} onChange={e => setF({ ...f, outwardDate: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Purpose</label><input className={inp} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
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
  const [f, setF] = useState({ name: '', type: '', siteId: '', operatorName: '', make: '', srNo: '', capacity: '', location: '', validityDate: '', lastService: '', nextService: '', remarks: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/equipment').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load equipment'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ name: '', type: '', siteId: '', operatorName: '', make: '', srNo: '', capacity: '', location: '', validityDate: '', lastService: '', nextService: '', remarks: '' }); setFormOpen(true); };
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
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Equipment ID', 'Equipment Name', 'Make', 'Sr. No', 'Capacity', 'Location', 'Site', 'Validity', 'Last Service', 'Next Service', 'Operator', 'Status', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.equipmentCode}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.name}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.make || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.srNo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.capacity || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.location || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.validityDate ? String(r.validityDate).split('T')[0] : '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.lastService ? String(r.lastService).split('T')[0] : '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.nextService ? String(r.nextService).split('T')[0] : '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.operatorName || '—'}</td>
                <td className="py-2 px-3"><Badge text={r.status} tone={r.status === 'Active' ? 'ok' : r.status === 'Under Maintenance' ? 'warn' : 'muted'} /></td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={13} className="py-8 text-center text-[#5a6878]">No equipment registered yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="Register New Equipment" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lbl}>Equipment Name *</label><input className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Farana Crane" /></div>
            <div><label className={lbl}>Make</label><input className={inp} value={f.make} onChange={e => setF({ ...f, make: e.target.value })} placeholder="e.g. ElectroMech" /></div>
            <div><label className={lbl}>Sr. No</label><input className={inp} value={f.srNo} onChange={e => setF({ ...f, srNo: e.target.value })} /></div>
            <div><label className={lbl}>Capacity</label><input className={inp} value={f.capacity} onChange={e => setF({ ...f, capacity: e.target.value })} placeholder="e.g. 50 Ton" /></div>
            <div><label className={lbl}>Type</label><input className={inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })} placeholder="e.g. Crane" /></div>
            <div><label className={lbl}>Location</label><input className={inp} value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="e.g. Main Store / Yard" /></div>
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Validity</label><input type="date" className={inp} value={f.validityDate} onChange={e => setF({ ...f, validityDate: e.target.value })} /></div>
            <div><label className={lbl}>Last Service</label><input type="date" className={inp} value={f.lastService} onChange={e => setF({ ...f, lastService: e.target.value })} /></div>
            <div><label className={lbl}>Next Service</label><input type="date" className={inp} value={f.nextService} onChange={e => setF({ ...f, nextService: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Operator</label><input className={inp} value={f.operatorName} onChange={e => setF({ ...f, operatorName: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
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
  const [f, setF] = useState({ siteId: '', jobId: '', itemId: '', description: '', qty: '', unit: 'Nos', estimatedValue: '', scrapType: 'Scrap', location: '' });
  const [disposing, setDisposing] = useState<number | null>(null);
  const [disposedTo, setDisposedTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/scrap').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load scrap register'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ siteId: '', jobId: '', itemId: '', description: '', qty: '', unit: 'Nos', estimatedValue: '', scrapType: 'Scrap', location: '' }); setFormOpen(true); };
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
      const j = await fetch('/api/store/scrap', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, disposalStatus: 'Disposed', disposedTo: disposedTo || null, actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success('Marked disposed'); setDisposing(null); setDisposedTo(''); await fetchData(); } else toast.error(j.error || 'Failed');
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
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Scrap No', 'Date', 'Site', 'Type', 'Material', 'Location', 'Qty', 'Est. Value', 'Status', 'Disposed To', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.scrapNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.scrapDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.site?.siteCode}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.scrapType || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[160px] truncate">{r.description}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.location || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.qty} {r.unit}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{fmt(r.estimatedValue)}</td>
                <td className="py-2 px-3"><Badge text={r.disposalStatus} tone={r.disposalStatus === 'Disposed' ? 'ok' : r.disposalStatus === 'Sold' ? 'ok' : 'warn'} /></td>
                <td className="py-2 px-3 text-[#8899aa]">{r.disposedTo || '—'}</td>
                <td className="py-2 px-3">
                  <div className="flex gap-1.5 items-center">
                    {r.disposalStatus === 'Pending' && <button onClick={() => { setDisposing(r.id); setDisposedTo(''); }} className="px-2 py-1 rounded bg-[#5a6878]/15 text-[#8899aa] text-[10px] font-semibold hover:bg-[#5a6878]/25">Mark Disposed</button>}
                    <DeleteButton onClick={() => remove(r.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No scrap entries yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Scrap Entry" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Job</label><select className={inp} value={f.jobId} onChange={e => setF({ ...f, jobId: e.target.value })}><option value="">— None —</option>{lookups.jobs.filter(j => !f.siteId || j.siteId === Number(f.siteId)).map(j => <option key={j.id} value={j.id}>{j.jobCode}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Description (Material) *</label><input className={inp} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="e.g. Cut-offs from fabrication" /></div>
            <div><label className={lbl}>Type</label><select className={inp + ' appearance-none'} value={f.scrapType} onChange={e => setF({ ...f, scrapType: e.target.value })}>{['Scrap', 'Damaged', 'Lost'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className={lbl}>Location</label><input className={inp} value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="e.g. Yard / Main Store" /></div>
            <div><label className={lbl}>Related Item</label><select className={inp} value={f.itemId} onChange={e => setF({ ...f, itemId: e.target.value })}><option value="">— None —</option>{lookups.items.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2"><div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div><div><label className={lbl}>Unit</label><input className={inp} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /></div></div>
            <div><label className={lbl}>Estimated Value (₹)</label><input type="number" className={inp} value={f.estimatedValue} onChange={e => setF({ ...f, estimatedValue: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Record Scrap" />
        </Modal>
      )}
      {disposing !== null && (
        <Modal title="Mark as Disposed/Sold" onClose={() => setDisposing(null)}>
          <div><label className={lbl}>Disposed To</label><input autoFocus className={inp} value={disposedTo} onChange={e => setDisposedTo(e.target.value)} placeholder="e.g. Vendor name / scrap dealer / site disposal" /></div>
          <ModalFooter onCancel={() => setDisposing(null)} onSave={() => markDisposed(disposing)} saving={saving} label="Confirm Disposed" />
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

// ── Stock Register (per-item, with running balance + min stock) ──────
function StockRegisterTab({ lookups }: { lookups: Lookups }) {
  const [index, setIndex] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadIndex = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/stock-register').then(r => r.json()); if (j.success) setIndex(j.data); } catch { toast.error('Failed to load stock register'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadIndex(); }, [loadIndex]);
  useEffect(() => {
    if (!selected) { setData(null); return; }
    setLoadingDetail(true);
    fetch(`/api/store/stock-register?itemCode=${encodeURIComponent(selected)}`).then(r => r.json()).then(j => { if (j.success) setData(j.data); else toast.error(j.error || 'Failed'); }).catch(() => toast.error('Network error')).finally(() => setLoadingDetail(false));
  }, [selected]);

  const lowStock = index.filter(i => i.belowMin);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-[12px] font-semibold text-[#e2e8f0]">Stock Register <span className="text-[#5a6878] font-normal">({index.length} items)</span></div>
        <select className={inp + ' !w-[280px] ml-auto appearance-none'} value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">— Select item —</option>
          {index.map(i => <option key={i.itemCode} value={i.itemCode}>{i.itemCode} — {i.itemName}</option>)}
        </select>
        <button onClick={loadIndex} className="p-1.5 text-[#5a6878] hover:text-[#e2e8f0]" title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg px-3 py-2 text-[10px] text-[#ff9c9c]">
          <span className="font-bold text-[#ff3d3d]">Below minimum stock:</span> {lowStock.map(i => `${i.itemCode} (${i.balance} < ${i.reorderLevel})`).join(' · ')}
        </div>
      )}

      {!selected ? (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[#252e3a] text-[11px] font-bold text-[#e2e8f0]">Index (all items)</div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12] sticky top-0">{['Item Code', 'Item Details', 'Unit', 'Received', 'Issued', 'Closing Stock', 'Min Stock', 'Status'].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {index.map(i => (
                  <tr key={i.itemCode} className="hover:bg-[#141920] cursor-pointer" onClick={() => setSelected(i.itemCode)}>
                    <td className="py-2 px-3 text-[#f5a623] font-mono">{i.itemCode}</td>
                    <td className="py-2 px-3 text-[#e2e8f0]">{i.itemName}</td>
                    <td className="py-2 px-3 text-[#8899aa]">{i.unit}</td>
                    <td className="py-2 px-3 text-[#00e676] font-mono">{i.totalIn}</td>
                    <td className="py-2 px-3 text-[#ff3d3d] font-mono">{i.totalOut}</td>
                    <td className="py-2 px-3 text-[#e2e8f0] font-mono font-bold">{i.balance}</td>
                    <td className="py-2 px-3 text-[#8899aa] font-mono">{i.reorderLevel}</td>
                    <td className="py-2 px-3">{i.belowMin ? <Badge text="Below Min" tone="bad" /> : <Badge text="OK" tone="ok" />}</td>
                  </tr>
                ))}
                {index.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[#5a6878]">No stock movements yet — post a GRN or issue to build the register</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : loadingDetail ? <Spinner /> : !data ? <div className="text-[12px] text-[#5a6878] text-center py-8">No data</div> : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Current Balance" value={`${data.totals.balance} ${data.item.unit}`} sub={data.belowMin ? 'Below minimum stock' : 'Above minimum stock'} />
            <StatCard label="Min Stock" value={`${data.reorderLevel} ${data.item.unit}`} sub={`Reorder level`} />
            <StatCard label="Total Received" value={String(data.totals.received)} sub="GRN receipts" />
            <StatCard label="Total Returned" value={String(data.totals.returned ?? 0)} sub="Returns from issue" />
            <StatCard label="Total Issued" value={String(data.totals.issued)} sub="Issues" />
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#252e3a]">
              <div className="text-[11px] font-bold text-[#e2e8f0] truncate">{data.item.itemCode} — {data.item.name} <span className="text-[#5a6878] font-normal">({data.entries.length} entries)</span></div>
              <button onClick={() => setSelected('')} className="text-[10px] text-[#5a6878] hover:text-[#e2e8f0]">← Index</button>
            </div>
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12] sticky top-0">{['Date', 'Reference', 'PO Number', 'Job Code', 'Site', 'Opening', 'Received', 'Issued', 'Closing', 'Remarks'].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {data.entries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-[#141920]">
                      <td className="py-2 px-3 text-[#8899aa] font-mono">{String(e.date).split('T')[0]}</td>
                      <td className="py-2 px-3 text-[#f5a623] font-mono">{e.referenceNo}<span className="text-[#5a6878]"> · {e.referenceType}</span></td>
                      <td className="py-2 px-3 text-[#8899aa] font-mono">{e.poNo || '—'}</td>
                      <td className="py-2 px-3 text-[#8899aa] font-mono">{e.jobCode || '—'}</td>
                      <td className="py-2 px-3 text-[#8899aa]">{e.siteCode || '—'}</td>
                      <td className="py-2 px-3 text-[#8899aa] font-mono">{e.opening}</td>
                      <td className="py-2 px-3 text-[#00e676] font-mono">{e.received > 0 ? `+${e.received}` : '—'}</td>
                      <td className="py-2 px-3 text-[#ff3d3d] font-mono">{e.issued > 0 ? `-${e.issued}` : '—'}</td>
                      <td className="py-2 px-3 text-[#e2e8f0] font-mono font-bold">{e.closing}</td>
                      <td className="py-2 px-3 text-[#5a6878] max-w-[220px] truncate">{e.remarks || '—'}</td>
                    </tr>
                  ))}
                  {data.entries.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-[#5a6878]">No movements for this item yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Diesel Register ─────────────────────────────────────────────────
function DieselTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ logDate: new Date().toISOString().split('T')[0], vehicle: '', siteId: '', opening: '', received: '', consumed: '', operatorName: '', remarks: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/diesel').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load diesel log'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const closing = (Number(f.opening) || 0) + (Number(f.received) || 0) - (Number(f.consumed) || 0);

  const openNew = () => { setF({ logDate: new Date().toISOString().split('T')[0], vehicle: '', siteId: '', opening: '', received: '', consumed: '', operatorName: '', remarks: '' }); setFormOpen(true); };
  const save = async () => {
    if (!f.siteId || !f.vehicle.trim()) { toast.error('Site and Vehicle/Equipment are required'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/diesel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, siteId: Number(f.siteId), opening: Number(f.opening) || 0, received: Number(f.received) || 0, consumed: Number(f.consumed) || 0, actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`Diesel log ${j.data.logNo} recorded`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/diesel', id, 'diesel log entry')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Diesel Register" count={records.length} onNew={openNew} newLabel="New Entry" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Log No', 'Date', 'Vehicle/Equipment', 'Opening', 'Received', 'Consumed', 'Closing', 'Operator', 'Remarks', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.logNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.logDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.vehicle}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.opening}</td>
                <td className="py-2 px-3 text-[#00e676] font-mono">+{r.received}</td>
                <td className="py-2 px-3 text-[#ff3d3d] font-mono">-{r.consumed}</td>
                <td className="py-2 px-3 text-[#e2e8f0] font-mono font-bold">{r.closing}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.operatorName || '—'}</td>
                <td className="py-2 px-3 text-[#5a6878] max-w-[160px] truncate">{r.remarks || '—'}</td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-[#5a6878]">No diesel entries yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Diesel Log Entry" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date *</label><input type="date" className={inp} value={f.logDate} onChange={e => setF({ ...f, logDate: e.target.value })} /></div>
            <div><label className={lbl}>Vehicle / Equipment *</label><input className={inp} value={f.vehicle} onChange={e => setF({ ...f, vehicle: e.target.value })} placeholder="e.g. Hydra, Pickup, Excavator" /></div>
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Operator</label><input className={inp} value={f.operatorName} onChange={e => setF({ ...f, operatorName: e.target.value })} /></div>
            <div><label className={lbl}>Opening (L)</label><input type="number" className={inp} value={f.opening} onChange={e => setF({ ...f, opening: e.target.value })} /></div>
            <div><label className={lbl}>Received (L)</label><input type="number" className={inp} value={f.received} onChange={e => setF({ ...f, received: e.target.value })} /></div>
            <div><label className={lbl}>Consumed (L)</label><input type="number" className={inp} value={f.consumed} onChange={e => setF({ ...f, consumed: e.target.value })} /></div>
            <div><label className={lbl}>Closing (L) <span className="text-[#00e676]">auto</span></label><input type="number" className={inp} value={closing} readOnly /></div>
            <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Save Entry" />
        </Modal>
      )}
    </div>
  );
}

// ── Gas Cylinder Register ───────────────────────────────────────────
const GAS_TYPES = ['O2', 'DA', 'Argon', 'CO2', 'N2', 'Acetylene', 'LPG'];
function GasCylinderTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { logDate: new Date().toISOString().split('T')[0], siteId: '', gasType: 'O2', cylinderNo: '', direction: 'Received', qty: '1', issuedTo: '', condition: 'Good', emptyReturnDate: '', returnChallanNo: '', remarks: '' };
  const [f, setF] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/gas-cylinders').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load gas cylinder log'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ ...emptyForm, logDate: new Date().toISOString().split('T')[0] }); setFormOpen(true); };
  const save = async () => {
    if (!f.siteId) { toast.error('Site is required'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/gas-cylinders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, siteId: Number(f.siteId), qty: Number(f.qty) || 1, actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`Entry ${j.data.logNo} recorded`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/gas-cylinders', id, 'gas cylinder entry')) await fetchData(); };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Gas Cylinder Register" count={records.length} onNew={openNew} newLabel="New Entry" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Log No', 'Date', 'Gas Type', 'Cylinder No', 'Direction', 'Qty', 'Issued To', 'Condition', 'Empty Return', 'Challan No', 'Remarks', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.logNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.logDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.gasType}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.cylinderNo || '—'}</td>
                <td className="py-2 px-3"><Badge text={r.direction} tone={r.direction === 'Received' ? 'ok' : 'warn'} /></td>
                <td className="py-2 px-3 text-[#e2e8f0] font-mono">{r.qty}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.issuedTo || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.condition || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.emptyReturnDate ? String(r.emptyReturnDate).split('T')[0] : '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.returnChallanNo || '—'}</td>
                <td className="py-2 px-3 text-[#5a6878] max-w-[160px] truncate">{r.remarks || '—'}</td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={12} className="py-8 text-center text-[#5a6878]">No gas cylinder entries yet</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Gas Cylinder Entry" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date *</label><input type="date" className={inp} value={f.logDate} onChange={e => setF({ ...f, logDate: e.target.value })} /></div>
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div><label className={lbl}>Gas Type *</label><select className={inp + ' appearance-none'} value={f.gasType} onChange={e => setF({ ...f, gasType: e.target.value })}>{GAS_TYPES.map(g => <option key={g}>{g}</option>)}</select></div>
            <div><label className={lbl}>Cylinder No</label><input className={inp} value={f.cylinderNo} onChange={e => setF({ ...f, cylinderNo: e.target.value })} placeholder="10804" /></div>
            <div><label className={lbl}>Direction</label><select className={inp + ' appearance-none'} value={f.direction} onChange={e => setF({ ...f, direction: e.target.value })}>{['Received', 'Issued'].map(d => <option key={d}>{d}</option>)}</select></div>
            <div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div>
            {f.direction === 'Issued' && <div className="col-span-2"><label className={lbl}>Issued To</label><input className={inp} value={f.issuedTo} onChange={e => setF({ ...f, issuedTo: e.target.value })} placeholder="Name of the person taking the cylinder" /></div>}
            <div><label className={lbl}>Condition</label><select className={inp + ' appearance-none'} value={f.condition} onChange={e => setF({ ...f, condition: e.target.value })}>{['Good', 'Empty', 'Damaged'].map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className={lbl}>Empty Return Date</label><input type="date" className={inp} value={f.emptyReturnDate} onChange={e => setF({ ...f, emptyReturnDate: e.target.value })} /></div>
            <div><label className={lbl}>Return Challan No</label><input className={inp} value={f.returnChallanNo} onChange={e => setF({ ...f, returnChallanNo: e.target.value })} /></div>
            <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Save Entry" />
        </Modal>
      )}
    </div>
  );
}

// ── Daily Issue Register ────────────────────────────────────────────
function DailyIssueTab({ lookups }: { lookups: Lookups }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { issueDate: new Date().toISOString().split('T')[0], siteId: '', itemName: '', itemCode: '', qty: '1', unit: 'Nos', receiverName: '', mobileNumber: '', purposeLocation: '', returned: false, remarks: '' };
  const [f, setF] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const j = await fetch('/api/store/daily-issues').then(r => r.json()); if (j.success) setRecords(j.data); } catch { toast.error('Failed to load daily issues'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setF({ ...emptyForm, issueDate: new Date().toISOString().split('T')[0] }); setFormOpen(true); };
  const save = async () => {
    if (!f.siteId || !f.itemName.trim() || !f.receiverName.trim()) { toast.error('Site, Item Name and Receiver Name are required'); return; }
    setSaving(true);
    try {
      const j = await fetch('/api/store/daily-issues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, siteId: Number(f.siteId), qty: Number(f.qty) || 0, actor: getCurrentUserEmail() }) }).then(r => r.json());
      if (j.success) { toast.success(`Entry ${j.data.issueNo} recorded`); setFormOpen(false); await fetchData(); } else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); } finally { setSaving(false); }
  };
  const remove = async (id: number) => { if (await deleteRecord('/api/store/daily-issues', id, 'daily issue entry')) await fetchData(); };
  const toggleReturn = async (r: any) => {
    try {
      const j = await fetch('/api/store/daily-issues', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, returned: !r.returned, actor: getCurrentUserEmail() }) }).then(x => x.json());
      if (j.success) await fetchData(); else toast.error(j.error || 'Failed');
    } catch { toast.error('Network error'); }
  };

  if (loading) return <Spinner />;
  return (
    <div>
      <TableHeader title="Daily Issue Register" count={records.length} onNew={openNew} newLabel="New Entry" />
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Issue No', 'Date', 'Item Code', 'Item Name', 'Qty', 'Receiver', 'Mobile', 'Purpose/Location', 'Return', 'Remarks', ''].map(h => <th key={h} className="text-left py-2.5 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-[#141920]">
                <td className="py-2 px-3 text-[#f5a623] font-mono">{r.issueNo}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.issueDate?.split('T')[0]}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.itemCode || '—'}</td>
                <td className="py-2 px-3 text-[#e2e8f0]">{r.itemName}</td>
                <td className="py-2 px-3 text-[#e2e8f0] font-mono">{r.qty} {r.unit || ''}</td>
                <td className="py-2 px-3 text-[#8899aa]">{r.receiverName}</td>
                <td className="py-2 px-3 text-[#8899aa] font-mono">{r.mobileNumber || '—'}</td>
                <td className="py-2 px-3 text-[#8899aa] max-w-[180px] truncate">{r.purposeLocation || '—'}</td>
                <td className="py-2 px-3"><button onClick={() => toggleReturn(r)} className={`px-2 py-0.5 rounded text-[9px] font-semibold ${r.returned ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#f5a623]/15 text-[#f5a623]'}`}>{r.returned ? 'Returned' : 'Pending'}</button></td>
                <td className="py-2 px-3 text-[#5a6878] max-w-[160px] truncate">{r.remarks || '—'}</td>
                <td className="py-2 px-3"><DeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No entries yet today</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {formOpen && (
        <Modal title="New Daily Issue Entry" onClose={() => setFormOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date *</label><input type="date" className={inp} value={f.issueDate} onChange={e => setF({ ...f, issueDate: e.target.value })} /></div>
            <div><label className={lbl}>Site *</label><select className={inp} value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}><option value="">— Select —</option>{lookups.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.name}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Item (from master)</label><select className={inp + ' appearance-none'} value={f.itemCode} onChange={e => { const it = lookups.items.find(i => i.sku === e.target.value); setF({ ...f, itemCode: e.target.value, itemName: it ? it.name : f.itemName }); }}><option value="">— Free text —</option>{lookups.items.map(i => <option key={i.id} value={i.sku}>{i.sku} — {i.name}</option>)}</select></div>
            <div className="col-span-2"><label className={lbl}>Item Name *</label><input className={inp} value={f.itemName} onChange={e => setF({ ...f, itemName: e.target.value })} placeholder="Item name" /></div>
            <div><label className={lbl}>Qty</label><input type="number" className={inp} value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div>
            <div><label className={lbl}>Unit</label><input className={inp} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} placeholder="Nos" /></div>
            <div><label className={lbl}>Receiver Name *</label><input className={inp} value={f.receiverName} onChange={e => setF({ ...f, receiverName: e.target.value })} placeholder="Who received it" /></div>
            <div><label className={lbl}>Mobile Number</label><input className={inp} value={f.mobileNumber} onChange={e => setF({ ...f, mobileNumber: e.target.value })} placeholder="+91-…" /></div>
            <div className="col-span-2"><label className={lbl}>Purpose / Location</label><input className={inp} value={f.purposeLocation} onChange={e => setF({ ...f, purposeLocation: e.target.value })} placeholder="e.g. Welding bay 3 / AAP issue" /></div>
            <div className="col-span-2"><label className={lbl}>Remarks</label><input className={inp} value={f.remarks} onChange={e => setF({ ...f, remarks: e.target.value })} /></div>
          </div>
          <ModalFooter onCancel={() => setFormOpen(false)} onSave={save} saving={saving} label="Save Entry" />
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
            <StatCard label="Material Received" value={fmt(data.summary.materialReceived.value)} sub={`${data.summary.materialReceived.count} GRN(s)`} />
            <StatCard label="Material Issued" value={fmt(data.summary.materialIssued.value)} sub={`${data.summary.materialIssued.count} issue(s)`} />
            <StatCard label="Material Returned" value={String(data.summary.materialReturned.count)} sub="return notes" />
            <StatCard label="Scrap Generated" value={`${data.summary.scrap.qty ?? data.summary.scrap.count}`} sub={`${fmt(data.summary.scrap.value)} · ${data.summary.scrap.count} entries (incl. ${data.summary.scrap.damagedLostQty ?? 0} damaged/lost)`} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[11px] font-bold text-[#e2e8f0] mb-3">Pending Material (MRS)</div>
              <Row k="Pending" v={data.summary.mrs.pending} /><Row k="Approved / Issued" v={data.summary.mrs.approved} /><Row k="Rejected" v={data.summary.mrs.rejected} />
            </div>
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[11px] font-bold text-[#e2e8f0] mb-3">Tools &amp; Equipment Status</div>
              <Row k="Tools Issued" v={data.summary.tools.issued} /><Row k="Tools Available" v={data.summary.tools.available} /><Row k="Under Repair / Lost" v={data.summary.tools.underRepair + data.summary.tools.lost} />
            </div>
            <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="text-[11px] font-bold text-[#e2e8f0] mb-3">Gate Passes &amp; Verification</div>
              <Row k="Gate Passes (Open)" v={`${data.summary.gatePasses.count} (${data.summary.gatePasses.open})`} /><Row k="Verifications" v={data.summary.physicalVerification.count} /><Row k="Items with Variance" v={data.summary.physicalVerification.itemsWithVariance} />
            </div>
          </div>
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#252e3a] text-[11px] font-bold text-[#e2e8f0]">Item-wise Monthly Report — {month}</div>
            <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-[#252e3a] bg-[#0a0d12]">{['Sl.No', 'Item Code', 'Item Details', 'Opening Stock', 'Material Received', 'Material Issued', 'Material Returned', 'Closing Stock', 'Scrap', 'Damaged/Lost', 'Variance', 'Stock Value'].map(h => <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {data.items.map((r: any, i: number) => (
                  <tr key={r.itemCode} className="hover:bg-[#141920]">
                    <td className="py-2 px-3 text-[#5a6878] font-mono">{i + 1}</td>
                    <td className="py-2 px-3 text-[#f5a623] font-mono">{r.itemCode}</td>
                    <td className="py-2 px-3 text-[#e2e8f0]">{r.itemName}</td>
                    <td className="py-2 px-3 text-[#8899aa] font-mono">{r.opening}</td>
                    <td className="py-2 px-3 text-[#00e676] font-mono">{r.received}</td>
                    <td className="py-2 px-3 text-[#ff3d3d] font-mono">{r.issued}</td>
                    <td className="py-2 px-3 text-[#00d4ff] font-mono">{r.returned}</td>
                    <td className="py-2 px-3 text-[#e2e8f0] font-mono font-bold">{r.closing}</td>
                    <td className="py-2 px-3 text-[#8899aa] font-mono">{r.scrapQty}</td>
                    <td className="py-2 px-3 text-[#8899aa] font-mono">{r.damagedLostQty}</td>
                    <td className="py-2 px-3 text-[#8899aa] font-mono">{r.varianceCount || '—'}</td>
                    <td className="py-2 px-3 text-[#e2e8f0] font-mono">{fmt(r.stockValue)}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={12} className="py-6 text-center text-[#5a6878]">No movement this month</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
          <p className="text-[10px] text-[#5a6878]">Opening/Received/Issued/Returned/Closing come straight from the stock ledger; closing = opening + received + returns − issued. Damaged/Lost counts scrap entries of type Damaged or Lost. Minimum-stock position is on the Stock Register tab.</p>
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

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`bg-[#161c24] border border-[#f5a623]/25 rounded-xl p-4 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
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

function GrnLinesEditor({ lines, setLines, items, addLine, removeLine }: { lines: any[]; setLines: (l: any[]) => void; items: ItemRef[]; addLine: () => void; removeLine: (i: number) => void }) {
  const update = (i: number, patch: Record<string, any>) => { const u = [...lines]; u[i] = { ...u[i], ...patch }; setLines(u); };
  const ordered = (l: any) => Number(l.qtyOrdered) || 0;
  const received = (l: any) => Number(l.qtyReceived) || 0;
  const accepted = (l: any) => Number(l.qtyAccepted ?? l.qtyReceived) || 0;
  const shortExcess = (l: any) => received(l) - ordered(l);
  const totals = lines.reduce((s, l) => ({ ordered: s.ordered + ordered(l), received: s.received + received(l), accepted: s.accepted + accepted(l) }), { ordered: 0, received: 0, accepted: 0 });
  const cell = 'bg-[#0a0d12] border border-[#252e3a] rounded px-1.5 py-1 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none';
  const th = 'py-2 px-2 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] text-left';
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <label className={lbl}>Items (GRN Soft-Copy format)</label>
        <button onClick={addLine} className="text-[11px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={12} /> Add line</button>
      </div>
      <div className="overflow-x-auto border border-[#252e3a] rounded-lg">
        <table className="w-full text-[11px] whitespace-nowrap">
          <thead><tr className="bg-[#0a0d12]">
            <th className={th}>Category</th><th className={th}>Item</th><th className={th}>Ordered</th><th className={th}>Received</th><th className={th}>Accepted</th><th className={th}>Short/Excess</th><th className={th}>Rate</th><th className={th}>Batch/Heat</th><th className={th}>Damage (Y/N)</th><th className={th}>Inspection</th><th className={th}></th>
          </tr></thead>
          <tbody className="divide-y divide-[#1a2028]">
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1.5 px-2"><select className={cell + ' w-[150px] appearance-none'} value={l.materialCategory} onChange={e => update(i, { materialCategory: e.target.value })}>{['CONSUMABLE ITEM', 'TOOLS & TACKLES', "PPE'S", 'POWER & MACHINE'].map(c => <option key={c}>{c}</option>)}</select></td>
                <td className="py-1.5 px-2"><select className={cell + ' w-[220px] appearance-none'} value={l.itemId} onChange={e => update(i, { itemId: e.target.value })}><option value="">— Item —</option>{items.map(it => <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>)}</select></td>
                <td className="py-1.5 px-2"><input type="number" className={cell + ' w-[70px]'} placeholder="0" value={l.qtyOrdered ?? ''} onChange={e => update(i, { qtyOrdered: e.target.value })} /></td>
                <td className="py-1.5 px-2"><input type="number" className={cell + ' w-[70px]'} placeholder="0" value={l.qtyReceived ?? ''} onChange={e => update(i, { qtyReceived: e.target.value, qtyAccepted: l.qtyAccepted ?? e.target.value })} /></td>
                <td className="py-1.5 px-2"><input type="number" className={cell + ' w-[70px]'} placeholder="0" value={l.qtyAccepted ?? l.qtyReceived ?? ''} onChange={e => update(i, { qtyAccepted: e.target.value })} /></td>
                <td className="py-1.5 px-2 text-[#8899aa] font-mono">{shortExcess(l) >= 0 ? `+${shortExcess(l)}` : shortExcess(l)}</td>
                <td className="py-1.5 px-2"><input type="number" className={cell + ' w-[80px]'} placeholder="0.00" value={l.rate ?? ''} onChange={e => update(i, { rate: e.target.value })} /></td>
                <td className="py-1.5 px-2"><input className={cell + ' w-[90px]'} placeholder="HN-12345" value={l.batchHeatNo ?? ''} onChange={e => update(i, { batchHeatNo: e.target.value })} /></td>
                <td className="py-1.5 px-2"><select className={cell + ' w-[110px] appearance-none'} value={l.damageTransit ?? 'No'} onChange={e => update(i, { damageTransit: e.target.value })}>{['No', 'Yes'].map(c => <option key={c}>{c}</option>)}</select></td>
                <td className="py-1.5 px-2"><select className={cell + ' w-[110px] appearance-none'} value={l.inspectionStatus ?? 'Accepted'} onChange={e => update(i, { inspectionStatus: e.target.value })}>{['Accepted', 'Pending', 'Rejected'].map(c => <option key={c}>{c}</option>)}</select></td>
                <td className="py-1.5 px-2"><button onClick={() => removeLine(i)} className="text-[#ff3d3d] hover:opacity-80"><X size={14} /></button></td>
              </tr>
            ))}
            {lines.length === 0 && <tr><td colSpan={11} className="py-6 text-center text-[#5a6878]">No items — click “Add line”</td></tr>}
          </tbody>
          <tfoot><tr className="bg-[#0a0d12] border-t border-[#252e3a]"><td className={th} colSpan={2}>Totals</td><td className="py-2 px-2 text-[#e2e8f0] font-mono">{totals.ordered}</td><td className="py-2 px-2 text-[#e2e8f0] font-mono">{totals.received}</td><td className="py-2 px-2 text-[#00e676] font-mono">{totals.accepted}</td><td className="py-2 px-2" colSpan={6}></td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

function LinesEditor({ lines, setLines, items, addLine, removeLine, qtyKey, withCondition, stockIndex }: { lines: any[]; setLines: (l: any[]) => void; items: ItemRef[]; addLine: () => void; removeLine: (i: number) => void; qtyKey: string; withCondition?: boolean; stockIndex?: Record<string, { balance: number; reorderLevel: number; unit: string; belowMin: boolean }> }) {
  const grid = stockIndex ? (withCondition ? 'grid-cols-[1fr_70px_100px_130px_78px_28px]' : 'grid-cols-[1fr_70px_130px_78px_28px]') : (withCondition ? 'grid-cols-[1fr_90px_110px_28px]' : 'grid-cols-[1fr_90px_28px]');
  return (
    <div className="mt-3">
      <label className={lbl}>Item Lines{stockIndex ? ' (Current Stock / Min Stock from ledger)' : ''}</label>
      {lines.map((l, i) => {
        const item = items.find(it => String(it.id) === String(l.itemId));
        const stock = item && stockIndex ? stockIndex[item.sku] : undefined;
        return (
        <div key={i} className={`grid ${grid} gap-2 mb-2 items-end`}>
          <select className={inp} value={l.itemId} onChange={e => { const u = [...lines]; u[i] = { ...u[i], itemId: e.target.value }; setLines(u); }}><option value="">— Item —</option>{items.map(it => <option key={it.id} value={it.id}>{it.sku} — {it.name}</option>)}</select>
          <input type="number" className={inp} placeholder="Qty" value={l[qtyKey]} onChange={e => { const u = [...lines]; u[i] = { ...u[i], [qtyKey]: e.target.value }; setLines(u); }} />
          {withCondition && <select className={inp} value={l.condition} onChange={e => { const u = [...lines]; u[i] = { ...u[i], condition: e.target.value }; setLines(u); }}>{['Good', 'Damaged'].map(c => <option key={c}>{c}</option>)}</select>}
          {stockIndex && (
            <div className="text-[11px] font-mono text-[#8899aa] text-center leading-tight">
              <div className={stock?.belowMin ? 'text-[#ff3d3d] font-bold' : 'text-[#00e676]'}>{stock ? `Current: ${stock.balance} ${stock.unit}` : 'Current: —'}</div>
              <div>{stock ? `Min: ${stock.reorderLevel} ${stock.unit}` : 'Min: —'}</div>
            </div>
          )}
          {stockIndex && <div className="text-center">{stock?.belowMin && <span className="vc-badge bg-[#ff3d3d]/15 text-[#ff3d3d]">Below min</span>}</div>}
          <button onClick={() => removeLine(i)} className="text-[#ff3d3d] hover:opacity-80"><X size={14} /></button>
        </div>
        );
      })}
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
