'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Plus, Upload, Pencil, Trash2, Search, Loader2, X, ChevronRight,
  CheckCircle2, XCircle, Clock, IndianRupee, Download, FileSpreadsheet, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';
import { ExportButton, type ExportColumn } from './_import-export';
import ImportWizard, { type ImportField } from './_import-wizard';

const PRINT_CSS = '@media print{@page{margin:12mm;size:A4 portrait}body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}.vc-panel,.vc-stat-card{border:1px solid #ccc!important;background:#fff!important}table{border-collapse:collapse;width:100%;font-size:10pt}th{background:#f0f0f0!important;color:#333!important;font-weight:700;padding:6px 8px;border:1px solid #ddd;text-align:left}td{padding:5px 8px;border:1px solid #ddd;color:#333!important}h1{font-size:18pt;margin:0 0 4pt;color:#111}.text-\\[#e2e8f0\\],.text-\\[#f5a623\\],.text-\\[#00e676\\],.text-\\[#ff3d3d\\],.text-\\[#00d4ff\\],.text-\\[#8899aa\\],.text-\\[#5a6878\\]{color:#333!important}.bg-\\[#0a0d12\\],.bg-\\[#0f1318\\],.bg-\\[#161c24\\],.bg-\\[#1a2028\\]{background:#fff!important}button,.vc-btn-ghost,.vc-btn-primary,[role=dialog]{overflow:visible!important}}';

/* ── Types ────────────────────────────────────────── */
interface PRLineItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  estCost: number;
  total: number;
}

interface ApprovalStep {
  id?: number;
  role: string;
  label: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  actedBy?: string | null;
  actedAt?: string | null;
  comments?: string | null;
}

interface PurchaseRequisition {
  id: string;
  prNo: string;
  date: string;
  requester: string;
  project: string;
  items: PRLineItem[];
  totalEstCost: number;
  requiredBy: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Converted to RFQ/PO';
  approvalChain: ApprovalStep[];
}

const PR_COLUMNS: ExportColumn<PurchaseRequisition>[] = [
  { header: 'PR No', accessor: 'prNo' },
  { header: 'Date', accessor: (r) => r.date?.split('T')[0] ?? '' },
  { header: 'Requester', accessor: 'requester' },
  { header: 'Project', accessor: 'project' },
  { header: 'Items', accessor: (r) => r.items.length },
  { header: 'Total Est. Cost', accessor: 'totalEstCost' },
  { header: 'Required By', accessor: (r) => r.requiredBy?.split('T')[0] ?? '' },
  { header: 'Status', accessor: 'status' },
];

const PR_IMPORT_FIELDS: ImportField[] = [
  { key: 'prNo', label: 'PR No', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'requester', label: 'Requester' },
  { key: 'project', label: 'Project' },
  { key: 'totalEstCost', label: 'Total Est. Cost', type: 'number' },
  { key: 'requiredBy', label: 'Required By', type: 'date' },
  { key: 'status', label: 'Status' },
];
const PR_SAMPLE_ROW = { prNo: 'PR-2026-001', date: '2026-01-05', requester: 'Rajesh Kumar', project: 'Godda Unit 5', totalEstCost: 250000, requiredBy: '2026-02-01', status: 'Pending Approval' };

/* ── Mock Data ────────────────────────────────────── */
const UNITS = ['pcs', 'kg', 'mtr', 'ltr', 'hr'];

const APPROVAL_TEMPLATE: ApprovalStep[] = [
  { role: 'site_engineer', label: 'Site Engineer', status: 'Pending' },
  { role: 'project_manager', label: 'Project Manager', status: 'Pending' },
  { role: 'procurement', label: 'Procurement', status: 'Pending' },
  { role: 'finance', label: 'Finance', status: 'Pending' },
];

const REQUESTERS = ['Rahul Kumar', 'Priya Singh', 'Amit Joshi', 'Suresh Patel', 'Neha Gupta'];
const PROJECTS = ['BALCO Expansion', 'NTPC Korba Stage II', 'Coal India Rajmahal', 'NTPC Ramagundam', 'BALCO Smelter', 'Coal India Dipika'];

function generateMockPRs(): PurchaseRequisition[] {
  const statuses: PurchaseRequisition['status'][] = ['Draft', 'Pending Approval', 'Approved', 'Converted to RFQ/PO'];
  const descriptions = [
    'Structural Steel Beams', 'Cable Trays 600mm', 'LT Motors 50HP', 'MS Pipes 6"', 'Gate Valves 12"',
    'Distribution Transformer 500kVA', 'Control Cables 4Cx16sqmm', 'Centrifugal Pump 25HP', 'Flanges PN16',
    'Vibration Monitor', 'Fire Hydrant System', 'Conveyor Belt 1200mm', 'Cooling Tower Fan Blades',
    'HV Switchgear Panel', 'Compressed Air Piping',
  ];

  return Array.from({ length: 18 }, (_, i) => {
    const idx = i + 1;
    const si = (i * 3 + idx) % descriptions.length;
    const li1: PRLineItem = { id: `li-${idx}-1`, description: descriptions[si], qty: 5 + (i * 3) % 45, unit: UNITS[i % UNITS.length], estCost: 1500 + (i * 280) % 12000, total: 0 };
    const li2: PRLineItem = { id: `li-${idx}-2`, description: descriptions[(si + 4) % descriptions.length], qty: 2 + i % 20, unit: UNITS[(i + 2) % UNITS.length], estCost: 800 + (i * 150) % 6000, total: 0 };
    const li3: PRLineItem = { id: `li-${idx}-3`, description: descriptions[(si + 8) % descriptions.length], qty: 1 + i % 10, unit: UNITS[(i + 1) % UNITS.length], estCost: 22000 + (i * 500) % 45000, total: 0 };
    [li1, li2, li3].forEach(l => l.total = l.qty * l.estCost);
    const items = [li1, li2, li3];
    const totalEstCost = items.reduce((s, l) => s + l.total, 0);
    const st = statuses[i % 4];
    const chain = APPROVAL_TEMPLATE.map((step, si2) => {
      if (st === 'Draft') return { ...step, status: 'Pending' as const };
      if (st === 'Pending Approval') return { ...step, status: si2 < 1 ? 'Approved' as const : 'Pending' as const };
      if (st === 'Approved') return { ...step, status: 'Approved' as const };
      return { ...step, status: 'Approved' as const };
    });
    return {
      id: `pr-${idx}`,
      prNo: `PR-${String(2025000 + idx).slice(-6)}`,
      date: new Date(2025, 0, 10 + idx).toISOString().split('T')[0],
      requester: REQUESTERS[i % REQUESTERS.length],
      project: PROJECTS[i % PROJECTS.length],
      items,
      totalEstCost,
      requiredBy: new Date(2025, 2, 15 + (i * 7) % 30).toISOString().split('T')[0],
      status: st,
      approvalChain: chain,
    };
  });
}

const MOCK_PRS = generateMockPRs();

/* ── Helpers ──────────────────────────────────────── */
function formatINR(n: number): string {
  return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function statusBadge(s: string): string {
  const m: Record<string, string> = {
    'Draft': 'bg-[#5a6878]/15 text-[#5a6878]',
    'Pending Approval': 'bg-[#f5a623]/15 text-[#f5a623]',
    'Approved': 'bg-[#00e676]/15 text-[#00e676]',
    'Converted to RFQ/PO': 'bg-[#00d4ff]/15 text-[#00d4ff]',
  };
  return m[s] || 'bg-[#5a6878]/15 text-[#5a6878]';
}

function statusIcon(status: string) {
  if (status === 'Approved') return <CheckCircle2 size={12} className="text-[#00e676]" />;
  if (status === 'Rejected') return <XCircle size={12} className="text-[#ff3d3d]" />;
  return <Clock size={12} className="text-[#f5a623]" />;
}

/* ── Line Item Editor ──────────────────────────── */
function LineItemsTable({ items, onChange }: {
  items: PRLineItem[];
  onChange: (items: PRLineItem[]) => void;
}) {
  const updateItem = (id: string, field: keyof PRLineItem, value: string | number) => {
    const next = items.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: field === 'description' ? value : Number(value) };
      if (field !== 'description') updated.total = updated.qty * updated.estCost;
      return updated;
    });
    onChange(next);
  };

  const addRow = () => {
    const id = `li-new-${Date.now()}`;
    onChange([...items, { id, description: '', qty: 1, unit: 'pcs', estCost: 0, total: 0 }]);
  };

  const removeRow = (id: string) => {
    if (items.length <= 1) return;
    onChange(items.filter(it => it.id !== id));
  };

  const totalSum = items.reduce((s, it) => s + it.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold">Line Items</label>
        <button onClick={addRow} className="text-[10px] text-[#f5a623] hover:underline flex items-center gap-1">
          <Plus size={11} /> Add Item
        </button>
      </div>
      <div className="overflow-x-auto border border-[#252e3a] rounded-lg">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#0a0d12]">
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold text-[9px] uppercase tracking-wider w-2/5">Item Description</th>
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold text-[9px] uppercase tracking-wider w-[60px]">Qty</th>
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold text-[9px] uppercase tracking-wider w-[70px]">Unit</th>
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold text-[9px] uppercase tracking-wider w-[100px]">Est. Cost</th>
              <th className="text-left py-2 px-3 text-[#5a6878] font-semibold text-[9px] uppercase tracking-wider w-[100px]">Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2028]">
            {items.map(it => (
              <tr key={it.id} className="hover:bg-[#141920] transition-colors">
                <td className="py-1.5 px-3">
                  <input type="text" value={it.description} onChange={e => updateItem(it.id, 'description', e.target.value)}
                    placeholder="Item description" className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none w-full" />
                </td>
                <td className="py-1.5 px-3">
                  <input type="number" value={it.qty ?? ''} onChange={e => updateItem(it.id, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none w-[50px]" min="0" step="1" />
                </td>
                <td className="py-1.5 px-3">
                  <select value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)}
                    className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none w-[60px] appearance-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td className="py-1.5 px-3">
                  <input type="number" value={it.estCost ?? ''} onChange={e => updateItem(it.id, 'estCost', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="bg-[#0a0d12] border border-[#252e3a] rounded px-2 py-1 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none w-[85px]" min="0" step="0.01" />
                </td>
                <td className="py-1.5 px-3 text-[#e2e8f0] font-medium">{formatINR(it.total)}</td>
                <td className="py-1.5 px-3">
                  <button onClick={() => removeRow(it.id)} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Remove">
                    <X size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-2 pt-2 border-t border-[#252e3a]">
        <div className="text-[12px]">
          <span className="text-[#5a6878]">Total Est. Cost: </span>
          <span className="text-[#f5a623] font-bold">{formatINR(totalSum)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Approval Chain Stepper ───────────────────── */
function ApprovalChain({ steps }: { steps: ApprovalStep[] }) {
  const statusColor = (st: string) => {
    if (st === 'Approved') return 'border-[#00e676] text-[#00e676]';
    if (st === 'Rejected') return 'border-[#ff3d3d] text-[#ff3d3d]';
    return 'border-[#252e3a] text-[#5a6878]';
  };

  const statusBg = (st: string) => {
    if (st === 'Approved') return 'bg-[#00e676]/10';
    if (st === 'Rejected') return 'bg-[#ff3d3d]/10';
    return 'bg-[#0a0d12]';
  };

  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={step.role} className="flex items-center flex-1">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium ${statusColor(step.status)} ${statusBg(step.status)} flex-1`}>
            {statusIcon(step.status)}
            <span className="truncate">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center mx-1">
              <div className={`w-6 h-px ${step.status === 'Approved' ? 'bg-[#00e676]' : 'bg-[#252e3a]'}`} />
              <ChevronRight size={10} className={`-ml-1.5 ${step.status === 'Approved' ? 'text-[#00e676]' : 'text-[#252e3a]'}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function ProcurementPR() {
  const [records, setRecords] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPR, setDetailPR] = useState<PurchaseRequisition | null>(null);
  const [editLines, setEditLines] = useState<PRLineItem[]>([]);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequisition | null>(null);

  // Fetch data on mount
  useEffect(() => {
    setLoading(true);
    setPageError(null);
    fetch('/api/procurement/requisitions')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.length > 0) {
          setRecords(json.data.map((r: any) => ({ ...r, approvalChain: r.approvals || r.approvalChain || [] })));
        } else {
          setRecords(generateMockPRs());
          toast.info('Sample purchase requisitions loaded — no server records found');
        }
      })
      .catch(() => { setRecords(generateMockPRs()); toast.info('Sample purchase requisitions loaded — server unavailable'); })
      .finally(() => setLoading(false));
  }, []);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<number | null>(null);

  // New PR form
  const [newPROpen, setNewPROpen] = useState(false);
  const [newPRSubmitting, setNewPRSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return records;
    return records.filter(r => r.status === statusFilter);
  }, [records, statusFilter]);

  const tc = useTableControls(filtered, (r) => `${r.prNo} ${r.requester} ${r.project} ${r.status}`);

  const STATUS_FILTERS = ['All', 'Draft', 'Pending Approval', 'Approved', 'Converted to RFQ/PO'];

  // Summary counts
  const summary = useMemo(() => ({
    total: records.length,
    pending: records.filter(r => r.status === 'Pending Approval').length,
    approved: records.filter(r => r.status === 'Approved').length,
    converted: records.filter(r => r.status === 'Converted to RFQ/PO').length,
    draft: records.filter(r => r.status === 'Draft').length,
    totalCost: records.reduce((s, r) => s + r.totalEstCost, 0),
  }), [records]);

  /* ── Detail handlers ── */
  const openDetail = (pr: PurchaseRequisition) => {
    setDetailPR(pr);
    setEditLines(pr.items.map(it => ({ ...it })));
    setDetailOpen(true);
  };

  const saveDetail = async () => {
    if (!detailPR) return;
    const total = editLines.reduce((s, it) => s + it.total, 0);
    try {
      const res = await fetch('/api/procurement/requisitions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailPR.id, items: editLines, totalEstCost: total }),
      });
      const json = await res.json();
      if (json.success) {
        const updated = { ...json.data, approvalChain: json.data.approvals || [] };
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        setDetailPR(updated);
        toast.success('PR updated');
      } else {
        toast.error('Failed to update PR');
      }
    } catch {
      toast.error('Failed to update PR');
    }
  };

  /* ── New PR ── */
  const [newPRForm, setNewPRForm] = useState<{ requester: string; project: string; requiredBy: string; items: PRLineItem[] }>({
    requester: '', project: '', requiredBy: '', items: [{ id: `li-new-${Date.now()}`, description: '', qty: 1, unit: 'pcs', estCost: 0, total: 0 }],
  });

  const openNewPR = () => {
    setNewPRForm({ requester: '', project: '', requiredBy: '', items: [{ id: `li-new-${Date.now()}`, description: '', qty: 1, unit: 'pcs', estCost: 0, total: 0 }] });
    setNewPROpen(true);
  };

  const handleNewPR = async () => {
    if (!newPRForm.requester.trim()) { toast.error('Requester is required'); return; }
    if (!newPRForm.project.trim()) { toast.error('Project is required'); return; }
    if (newPRForm.items.length === 0 || !newPRForm.items.some(i => i.description.trim())) { toast.error('At least one line item with a description is required'); return; }
    setNewPRSubmitting(true);
    try {
      const lines = newPRForm.items.map(i => ({ ...i, total: i.qty * i.estCost }));
      const res = await fetch('/api/procurement/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: newPRForm.requester,
          project: newPRForm.project,
          requiredBy: newPRForm.requiredBy,
          items: lines,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRecords(prev => [json.data, ...prev]);
        setNewPROpen(false);
        toast.success('New PR created as Draft');
      } else {
        toast.error('Failed to create PR');
      }
    } catch {
      toast.error('Failed to create PR');
    } finally {
      setNewPRSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/procurement/requisitions?id=${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        setDeleteOpen(false);
        setDeleteTarget(null);
        toast.success('PR deleted');
      } else {
        toast.error('Failed to delete PR');
      }
    } catch {
      toast.error('Failed to delete PR');
    }
  };

  /* ── Upload ── */
  const handleUpload = () => {
    if (!uploadFile) { toast.error('Please select a file'); return; }
    setUploadProcessing(true);
    setTimeout(() => {
      const imported = 3 + Math.floor(Math.random() * 6);
      setUploadResult(imported);
      setUploadProcessing(false);
      toast.success(`${imported} items imported`);
    }, 1200);
  };

  /* ── Approve / Reject / Submit — persisted via API ── */
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const runApprovalAction = async (action: 'submit' | 'approve' | 'reject', comments?: string) => {
    if (!detailPR) return;
    setApprovalSubmitting(true);
    try {
      const res = await fetch('/api/procurement/requisitions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailPR.id, action, comments }),
      });
      const json = await res.json();
      if (json.success) {
        const updated = { ...json.data, approvalChain: json.data.approvals || [] };
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        setDetailPR(updated);
        setRejectOpen(false);
        setRejectReason('');
        toast.success(action === 'submit' ? 'Submitted for approval' : action === 'approve' ? 'Step approved' : 'Sent back to requester');
      } else {
        toast.error(json.error || `Failed to ${action}`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  if (importOpen) {
    return (
      <ImportWizard
        title="Purchase Requisitions"
        fields={PR_IMPORT_FIELDS}
        keyField="prNo"
        existingKeys={new Set(records.map(r => r.prNo))}
        commitEndpoint="/api/procurement/requisitions/import"
        sampleRow={PR_SAMPLE_ROW}
        onClose={() => setImportOpen(false)}
        onImported={() => window.location.reload()}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-[#f5a623]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

    <div className="space-y-5 p-6">

      {/* ══════════════════════════════════════════════
          Header
         ══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f5a623]/15 flex items-center justify-center no-print">
            <FileText size={20} className="text-[#f5a623]" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Purchase Requisitions
            </h1>
            <p className="text-[11px] text-[#5a6878]">Manage and track material requisitions across projects</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap no-print">
          <button onClick={() => window.print()}
            className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] hover:border-[#3a4858] transition-all text-[11px] font-medium flex items-center gap-1.5">
            <Printer size={13} /> Print
          </button>
          <button onClick={() => setUploadOpen(true)}
            className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] hover:border-[#3a4858] transition-all text-[11px] font-medium flex items-center gap-1.5">
            <Upload size={13} /> Upload Excel
          </button>
          <button onClick={openNewPR}
            className="h-9 px-4 rounded-lg bg-[#f5a623] text-[#0a0d12] hover:bg-[#e8991a] transition-all text-[11px] font-bold flex items-center gap-1.5">
            <Plus size={13} /> New PR
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Summary Cards
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total PRs', value: summary.total, color: 'text-[#e2e8f0]', bg: 'bg-[#f5a623]/10', icon: FileText, border: 'border-[#f5a623]/20' },
          { label: 'Draft', value: summary.draft, color: 'text-[#5a6878]', bg: 'bg-[#5a6878]/10', icon: Clock, border: 'border-[#5a6878]/20' },
          { label: 'Pending Approval', value: summary.pending, color: 'text-[#f5a623]', bg: 'bg-[#f5a623]/10', icon: Clock, border: 'border-[#f5a623]/20' },
          { label: 'Approved', value: summary.approved, color: 'text-[#00e676]', bg: 'bg-[#00e676]/10', icon: CheckCircle2, border: 'border-[#00e676]/20' },
          { label: 'Converted', value: summary.converted, color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10', icon: ChevronRight, border: 'border-[#00d4ff]/20' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-[#0f1318] border ${card.border} rounded-xl p-4 hover:border-opacity-60 transition-all`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div>
                  <div className={`text-[18px] font-bold ${card.color}`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{card.value}</div>
                  <div className="text-[9px] text-[#5a6878] uppercase tracking-wider">{card.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════
          Search + Status Filters
         ══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6878]" />
          <input value={tc.search} onChange={e => tc.setSearch(e.target.value)}
            placeholder="Search PRs by number, requester, project..."
            className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg pl-9 pr-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none transition-colors" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                statusFilter === f
                  ? 'bg-[#f5a623]/15 text-[#f5a623] ring-1 ring-[#f5a623]/40 shadow-sm shadow-[#f5a623]/5'
                  : 'text-[#5a6878] hover:text-[#e2e8f0] hover:bg-[#1a2332]'
              }`}>
              {f === 'Pending Approval' ? 'Pending' : f}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          PR Table
         ══════════════════════════════════════════════ */}
      <div className="bg-[#0f1318] border border-[#252e3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#252e3a] flex items-center gap-2">
          <FileText size={14} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Requisition Register</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[9px] text-[#5a6878] font-medium">{tc.total} records</span>
            <button onClick={() => setImportOpen(true)} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]"><Upload size={13} /> Import</button><ExportButton records={records} columns={PR_COLUMNS} filename="procurement-pr" />
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#0a0d12]">
                {['PR#', 'Date', 'Requester', 'Project / WBS', 'Items', 'Total Est. Cost', 'Required By', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2028]">
              {tc.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText className="mx-auto text-[#5a6878] mb-3" size={32} />
                    <div className="text-[13px] text-[#5a6878] font-medium">No purchase requisitions found</div>
                    <div className="text-[10px] text-[#5a6878] mt-1">Create a new requisition or adjust your filters</div>
                  </td>
                </tr>
              ) : (
                tc.pageItems.map(pr => (
                  <tr key={pr.id} className="hover:bg-[#141920] transition-colors group">
                    <td className="py-3 px-4">
                      <button onClick={() => openDetail(pr)} className="text-[#f5a623] font-medium hover:underline text-[12px]">{pr.prNo}</button>
                    </td>
                    <td className="py-3 px-4 text-[#5a6878] font-mono text-[10px]">{pr.date}</td>
                    <td className="py-3 px-4 text-[#e2e8f0]">{pr.requester}</td>
                    <td className="py-3 px-4 text-[#8899aa] max-w-[180px] truncate" title={pr.project}>{pr.project}</td>
                    <td className="py-3 px-4 text-[#8899aa]">{pr.items.length} items</td>
                    <td className="py-3 px-4 text-[#e2e8f0] font-medium font-mono">{formatINR(pr.totalEstCost)}</td>
                    <td className="py-3 px-4 text-[#5a6878] font-mono text-[10px]">{pr.requiredBy}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold ${statusBadge(pr.status)}`}>
                        {statusIcon(pr.status)}
                        {pr.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setDetailPR(pr); setEditLines(pr.items.map(it => ({ ...it }))); setDetailOpen(true); }}
                          className="p-1.5 rounded-md text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-all" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { setDeleteTarget(pr); setDeleteOpen(true); }}
                          className="p-1.5 rounded-md text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize}
          setPage={tc.setPage} setPageSize={tc.setPageSize}
          from={tc.from} to={tc.to} total={tc.total} />
      </div>

      {/* ══════════════════════════════════════════════
          PR Detail / Edit Dialog
         ══════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#252e3a] pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[#f5a623] text-[16px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {detailPR ? detailPR.prNo : 'PR Details'}
              </DialogTitle>
              {detailPR && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold ${statusBadge(detailPR.status)}`}>
                  {statusIcon(detailPR.status)}
                  {detailPR.status}
                </span>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {detailPR && (
              <>
                {/* Meta Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Requester', value: detailPR.requester },
                    { label: 'Project / WBS', value: detailPR.project },
                    { label: 'Date Raised', value: detailPR.date },
                    { label: 'Required By', value: detailPR.requiredBy },
                    { label: 'Total Est. Cost', value: formatINR(detailPR.totalEstCost), highlight: true },
                    { label: 'Items Count', value: `${detailPR.items.length} line items` },
                  ].map(f => (
                    <div key={f.label} className="bg-[#0a0d12] rounded-lg p-3 border border-[#1a2028]">
                      <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1">{f.label}</div>
                      <div className={`text-[13px] ${f.highlight ? 'text-[#f5a623] font-bold font-mono' : 'text-[#e2e8f0]'}`}>{f.value}</div>
                    </div>
                  ))}
                </div>

                {/* Approval Chain */}
                <div className="bg-[#0a0d12] rounded-lg p-4 border border-[#1a2028]">
                  <div className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-3">Approval Workflow</div>
                  {detailPR.approvalChain.length > 0 ? (
                    <ApprovalChain steps={detailPR.approvalChain} />
                  ) : (
                    <div className="text-[11px] text-[#5a6878]">Not submitted yet — no approval chain started.</div>
                  )}
                  {detailPR.approvalChain.some(s => s.status === 'Rejected' && s.comments) && (
                    <div className="mt-3 bg-[#ff3d3d]/10 border border-[#ff3d3d]/25 rounded-lg p-2.5 text-[11px] text-[#ff3d3d]">
                      Rejected by {detailPR.approvalChain.find(s => s.status === 'Rejected')?.actedBy || 'approver'}: "{detailPR.approvalChain.find(s => s.status === 'Rejected')?.comments}"
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {detailPR.status === 'Draft' && (
                      <button onClick={() => runApprovalAction('submit')} disabled={approvalSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-[#f5a623]/15 text-[#f5a623] text-[10px] font-semibold hover:bg-[#f5a623]/25 transition-all flex items-center gap-1 disabled:opacity-50">
                        <ChevronRight size={11} /> {approvalSubmitting ? 'Submitting...' : 'Submit for Approval'}
                      </button>
                    )}
                    {detailPR.status === 'Pending Approval' && detailPR.approvalChain.some(s => s.status === 'Pending') && (
                      <>
                        <button onClick={() => runApprovalAction('approve')} disabled={approvalSubmitting}
                          className="px-3 py-1.5 rounded-lg bg-[#00e676]/15 text-[#00e676] text-[10px] font-semibold hover:bg-[#00e676]/25 transition-all flex items-center gap-1 disabled:opacity-50">
                          <CheckCircle2 size={11} /> Approve Next
                        </button>
                        <button onClick={() => setRejectOpen(true)} disabled={approvalSubmitting}
                          className="px-3 py-1.5 rounded-lg bg-[#ff3d3d]/15 text-[#ff3d3d] text-[10px] font-semibold hover:bg-[#ff3d3d]/25 transition-all flex items-center gap-1 disabled:opacity-50">
                          <XCircle size={11} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                <LineItemsTable items={editLines} onChange={setEditLines} />
              </>
            )}
          </div>
          <DialogFooter className="border-t border-[#252e3a] pt-4">
            <button onClick={() => setDetailOpen(false)} className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium">Cancel</button>
            <button onClick={saveDetail} className="h-9 px-4 rounded-lg bg-[#f5a623] text-[#0a0d12] hover:bg-[#e8991a] transition-all text-[11px] font-bold flex items-center gap-1.5">
              <FileText size={13} /> Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          New PR Dialog
         ══════════════════════════════════════════════ */}
      <Dialog open={newPROpen} onOpenChange={setNewPROpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#252e3a] pb-4">
            <DialogTitle className="text-[#f5a623] text-[16px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              New Purchase Requisition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1.5 block">Requester *</label>
                <input value={newPRForm.requester} onChange={e => setNewPRForm({...newPRForm, requester: e.target.value})}
                  className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none transition-colors"
                  placeholder="Enter requester name" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1.5 block">Project / WBS *</label>
                <input value={newPRForm.project} onChange={e => setNewPRForm({...newPRForm, project: e.target.value})}
                  className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none transition-colors"
                  placeholder="Enter project or WBS code" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1.5 block">Required On-Site By</label>
                <input type="date" value={newPRForm.requiredBy} onChange={e => setNewPRForm({...newPRForm, requiredBy: e.target.value})}
                  className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none transition-colors" />
              </div>
            </div>
            <LineItemsTable items={newPRForm.items} onChange={items => setNewPRForm({...newPRForm, items})} />
          </div>
          <DialogFooter className="border-t border-[#252e3a] pt-4">
            <button onClick={() => setNewPROpen(false)} className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium">Cancel</button>
            <button onClick={handleNewPR} disabled={newPRSubmitting}
              className="h-9 px-4 rounded-lg bg-[#f5a623] text-[#0a0d12] hover:bg-[#e8991a] transition-all text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
              {newPRSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create PR
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Upload Excel Dialog
         ══════════════════════════════════════════════ */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) { setUploadFile(null); setUploadResult(null); } }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader className="border-b border-[#252e3a] pb-4">
            <DialogTitle className="text-[#f5a623] text-[16px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Bulk Upload PRs via Excel
            </DialogTitle>
          </DialogHeader>
          <div className="py-5 space-y-4">
            <div className="bg-[#0a0d12] border border-[#252e3a] rounded-lg p-4 text-center">
              <FileSpreadsheet size={32} className="mx-auto text-[#00e676] mb-2" />
              <p className="text-[11px] text-[#8899aa] mb-3">Upload an Excel file (.xlsx) with PR data matching the template format.</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5a623]/15 text-[#f5a623] hover:bg-[#f5a623]/25 transition-all text-[11px] font-semibold cursor-pointer">
                <Upload size={14} />
                {uploadFile ? uploadFile.name : 'Choose File'}
                <input type="file" accept=".xlsx,.xls" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <div className="mt-2">
                <button className="text-[10px] text-[#00d4ff] hover:underline flex items-center gap-1 mx-auto">
                  <Download size={10} /> Download Template
                </button>
              </div>
            </div>
            {uploadResult !== null && (
              <div className="bg-[#00e676]/10 border border-[#00e676]/20 rounded-lg p-3 text-center">
                <CheckCircle2 size={18} className="mx-auto text-[#00e676] mb-1" />
                <div className="text-[#00e676] text-[12px] font-semibold">{uploadResult} PRs imported successfully</div>
              </div>
            )}
            {uploadProcessing && (
              <div className="flex items-center justify-center gap-2 text-[#f5a623] text-[11px]">
                <Loader2 size={14} className="animate-spin" /> Processing file...
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-[#252e3a] pt-4">
            <button onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadResult(null); }}
              className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium">Close</button>
            <button onClick={handleUpload} disabled={!uploadFile || uploadProcessing}
              className="h-9 px-4 rounded-lg bg-[#f5a623] text-[#0a0d12] hover:bg-[#e8991a] transition-all text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
              {uploadProcessing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Upload & Import
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Reject Reason Dialog
         ══════════════════════════════════════════════ */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectReason(''); }}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0] sm:max-w-md">
          <DialogHeader className="border-b border-[#252e3a] pb-4">
            <DialogTitle className="text-[#ff3d3d] text-[15px] flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <XCircle size={16} /> Reject {detailPR?.prNo}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[9px] uppercase tracking-wider text-[#5a6878] font-semibold mb-1.5 block">Reason for Rejection *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none min-h-[90px]"
              placeholder="Explain what needs to change before resubmission..." />
          </div>
          <DialogFooter className="border-t border-[#252e3a] pt-4">
            <button onClick={() => { setRejectOpen(false); setRejectReason(''); }} className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium">Cancel</button>
            <button onClick={() => runApprovalAction('reject', rejectReason)} disabled={!rejectReason.trim() || approvalSubmitting}
              className="h-9 px-4 rounded-lg bg-[#ff3d3d] hover:bg-[#cc2020] text-white transition-all text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
              <XCircle size={13} /> {approvalSubmitting ? 'Rejecting...' : 'Reject & Send Back'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Delete Confirmation
         ══════════════════════════════════════════════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d] flex items-center gap-2 text-[15px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <Trash2 size={16} /> Delete Purchase Requisition
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa] text-[12px]">
              Are you sure you want to delete <strong className="text-[#f5a623]">{deleteTarget?.prNo}</strong> raised by <strong className="text-[#e2e8f0]">{deleteTarget?.requester || 'N/A'}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-[#252e3a] pt-4">
            <AlertDialogCancel className="h-9 px-4 rounded-lg border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] transition-all text-[11px] font-medium bg-transparent hover:bg-[#1a2332]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-9 px-4 rounded-lg bg-[#ff3d3d] hover:bg-[#cc2020] text-white transition-all text-[11px] font-bold flex items-center gap-1.5">
              <Trash2 size={13} /> Delete PR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    </>
  );
}