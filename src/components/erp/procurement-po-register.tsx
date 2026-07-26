'use client';
import { useState, useMemo } from 'react';
import { FileText, Plus, Pencil, Trash2, Search, X, Calendar, Package, CheckCircle, Circle, Printer, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableControls, SearchInput, PaginationBar } from './_table-controls';

interface LineItem {
  id: number;
  itemDesc: string;
  qtyOrdered: number;
  qtyReceived: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface PORecord {
  id: number;
  poNo: string;
  vendor: string;
  project: string;
  projectShort: string;
  totalValue: number;
  deliveryAddress: string;
  requiredDate: string;
  actualDeliveryDate: string;
  lineItems: LineItem[];
  status: 'Open' | 'Partially Received' | 'Completed' | 'Overdue';
  poIssueDate: string;
  grnDate: string | null;
  invoiceMatchDate: string | null;
  poIssued: boolean;
  grnCompleted: boolean;
  invoiceMatched: boolean;
}

const VENDORS = ['SteelMech India Pvt Ltd', 'PowerCables Ltd', 'Transformers & Co', 'Elecon Engineering', 'Kirloskar Brothers', 'Siemens India', 'BHEL', 'ABB India'];
const PROJECTS = ['BALCO', 'NTPC', 'Hindalco', 'Coal India', 'JSW'];
const STATUSES: PORecord['status'][] = ['Open', 'Partially Received', 'Completed', 'Overdue'];

const STATUS_STYLES: Record<PORecord['status'], string> = {
  'Open': 'bg-[#00d4ff]/15 text-[#00d4ff]',
  'Partially Received': 'bg-[#f5a623]/15 text-[#f5a623]',
  'Completed': 'bg-[#00e676]/15 text-[#00e676]',
  'Overdue': 'bg-[#ff3d3d]/15 text-[#ff3d3d]',
};

const LINE_ITEM_TEMPLATES: Array<{ desc: string; unit: string; qty: number; price: number }> = [
  { desc: 'Structural Steel (ISMB 300)', unit: 'MT', qty: 500, price: 72000 },
  { desc: 'HV Power Cable 33kV 3Cx400sqmm', unit: 'm', qty: 2000, price: 4850 },
  { desc: 'Power Transformer 50 MVA 132/33kV', unit: 'Nos', qty: 2, price: 38500000 },
  { desc: 'Centrifugal Pump 5000 LPM', unit: 'Nos', qty: 6, price: 1250000 },
  { desc: 'DCS Control System Panel', unit: 'Nos', qty: 3, price: 8900000 },
  { desc: 'CT Bushing 245kV Oil-Impregnated', unit: 'Nos', qty: 12, price: 185000 },
  { desc: 'Cooling Tower Fan Blade FRP 3m', unit: 'Nos', qty: 8, price: 340000 },
  { desc: 'Switchgear 11kV Panel Inddor', unit: 'Nos', qty: 5, price: 2750000 },
  { desc: 'Pipeline CS ERW 12" Sch40', unit: 'm', qty: 1500, price: 8200 },
  { desc: 'Conveyor Belt 1200mm EP630/4', unit: 'm', qty: 800, price: 14500 },
];

const now = new Date();
const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysDiff = (d: Date) => Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

const pickItems = (count: number) => {
  const shuffled = [...LINE_ITEM_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((t, i) => ({
    id: i + 1,
    itemDesc: t.desc,
    qtyOrdered: t.qty,
    qtyReceived: 0,
    unit: t.unit,
    unitPrice: t.price,
    total: t.qty * t.price,
  }));
};

const genPO = (id: number, poNo: string, vendor: string, project: string, projectShort: string, address: string, reqDate: Date, status: PORecord['status'], lineCount: number, receivedRatio: number, grnDate: string | null, invDate: string | null): PORecord => {
  const items = pickItems(lineCount).map(it => ({
    ...it,
    qtyReceived: status === 'Completed' ? it.qtyOrdered : status === 'Partially Received' ? Math.floor(it.qtyOrdered * receivedRatio) : status === 'Overdue' ? Math.min(Math.floor(it.qtyOrdered * receivedRatio), Math.floor(it.qtyOrdered * 0.3)) : 0,
  }));
  const total = items.reduce((s, it) => s + it.total, 0);
  const poDate = addDays(reqDate, -45 - Math.floor(Math.random() * 30));
  const poIssued = true;
  const grnCompleted = status === 'Completed' || status === 'Partially Received';
  const invoiceMatched = status === 'Completed';
  return {
    id, poNo, vendor, project, projectShort, totalValue: total, deliveryAddress: address,
    requiredDate: toDateStr(reqDate), actualDeliveryDate: status !== 'Open' ? toDateStr(addDays(reqDate, status === 'Overdue' ? 15 : -5)) : '',
    lineItems: items, status, poIssueDate: toDateStr(poDate),
    grnDate, invoiceMatchDate: invDate, poIssued, grnCompleted, invoiceMatched,
  };
};

const MOCK_POS: PORecord[] = [
  genPO(1, 'PO-2026-001', 'SteelMech India Pvt Ltd', 'BALCO Captive Power Plant 540 MW', 'BALCO', 'BALCO Site, Korba, Chhattisgarh', addDays(now, -12), 'Overdue', 4, 0.15, null, null),
  genPO(2, 'PO-2026-002', 'PowerCables Ltd', 'BALCO Captive Power Plant 540 MW', 'BALCO', 'BALCO Site, Korba, Chhattisgarh', addDays(now, 25), 'Open', 3, 0, null, null),
  genPO(3, 'PO-2026-003', 'Transformers & Co', 'NTPC Barh Super Thermal Power Plant', 'NTPC', 'NTPC Barh, Bihar', addDays(now, 60), 'Open', 2, 0, null, null),
  genPO(4, 'PO-2026-004', 'Elecon Engineering', 'NTPC Barh Super Thermal Power Plant', 'NTPC', 'NTPC Barh, Bihar', addDays(now, -5), 'Partially Received', 5, 0.6, '2026-05-20', null),
  genPO(5, 'PO-2026-005', 'Kirloskar Brothers', 'Hindalco Mahan Aluminium Smelter', 'Hindalco', 'Hindalco Mahan, Madhya Pradesh', addDays(now, 90), 'Open', 3, 0, null, null),
  genPO(6, 'PO-2026-006', 'Siemens India', 'Hindalco Mahan Aluminium Smelter', 'Hindalco', 'Hindalco Mahan, Madhya Pradesh', addDays(now, -20), 'Overdue', 4, 0.1, null, null),
  genPO(7, 'PO-2026-007', 'BHEL', 'Coal India Jharia Mine Development', 'Coal India', 'CIL Jharia, Dhanbad, Jharkhand', addDays(now, 45), 'Open', 6, 0, null, null),
  genPO(8, 'PO-2026-008', 'ABB India', 'Coal India Jharia Mine Development', 'Coal India', 'CIL Jharia, Dhanbad, Jharkhand', addDays(now, -30), 'Overdue', 3, 0.05, null, null),
  genPO(9, 'PO-2026-009', 'SteelMech India Pvt Ltd', 'JSW Steel Vijayanagar Expansion', 'JSW', 'JSW Vijayanagar, Bellary, Karnataka', addDays(now, 15), 'Partially Received', 5, 0.45, '2026-05-25', null),
  genPO(10, 'PO-2026-010', 'PowerCables Ltd', 'JSW Steel Vijayanagar Expansion', 'JSW', 'JSW Vijayanagar, Bellary, Karnataka', addDays(now, 120), 'Open', 2, 0, null, null),
  genPO(11, 'PO-2026-011', 'Transformers & Co', 'BALCO CPP Expansion Phase II', 'BALCO', 'BALCO Site, Korba, Chhattisgarh', addDays(now, 3), 'Completed', 4, 1, '2026-05-10', '2026-05-28'),
  genPO(12, 'PO-2026-012', 'Elecon Engineering', 'NTPC FGD System Dadri', 'NTPC', 'NTPC Dadri, Uttar Pradesh', addDays(now, -8), 'Partially Received', 3, 0.5, '2026-05-22', null),
  genPO(13, 'PO-2026-013', 'Kirloskar Brothers', 'Hindalco Smelter Expansion Renukoot', 'Hindalco', 'Hindalco Renukoot, Uttar Pradesh', addDays(now, 75), 'Open', 4, 0, null, null),
  genPO(14, 'PO-2026-014', 'Siemens India', 'Coal India Washery Talcher', 'Coal India', 'CIL Talcher, Odisha', addDays(now, -45), 'Overdue', 5, 0.2, null, null),
  genPO(15, 'PO-2026-015', 'BHEL', 'JSW Steel Blast Furnace Reline', 'JSW', 'JSW Bellary, Karnataka', addDays(now, 10), 'Partially Received', 6, 0.35, '2026-05-18', null),
  genPO(16, 'PO-2026-016', 'ABB India', 'BALCO Power Distribution Upgrade', 'BALCO', 'BALCO Site, Korba, Chhattisgarh', addDays(now, -60), 'Completed', 3, 1, '2026-04-15', '2026-05-05'),
  genPO(17, 'PO-2026-017', 'SteelMech India Pvt Ltd', 'NTPC Cooling Tower Retrofit Ramagundam', 'NTPC', 'NTPC Ramagundam, Telangana', addDays(now, 40), 'Open', 4, 0, null, null),
  genPO(18, 'PO-2026-018', 'PowerCables Ltd', 'Hindalco Coal Handling Plant Mahan', 'Hindalco', 'Hindalco Mahan, Madhya Pradesh', addDays(now, 5), 'Completed', 3, 1, '2026-05-30', '2026-06-04'),
];

function formatCurrency(amount: number): string {
  return '₹' + (amount ?? 0).toLocaleString('en-IN');
}

function fmtCr(amount: number): string {
  if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
  return '₹' + (amount ?? 0).toLocaleString('en-IN');
}

function isOverdue(dateStr: string): boolean {
  return daysDiff(new Date(dateStr)) < 0;
}

function overdueDays(dateStr: string): number {
  return Math.abs(daysDiff(new Date(dateStr)));
}

function deliveryStatus(item: LineItem): { label: string; color: string; dot: string } {
  if (item.qtyReceived >= item.qtyOrdered) return { label: 'Full', color: 'text-[#00e676]', dot: 'bg-[#00e676]' };
  if (item.qtyReceived > 0) return { label: 'Partial', color: 'text-[#f5a623]', dot: 'bg-[#f5a623]' };
  return { label: 'Pending', color: 'text-[#5a6878]', dot: 'bg-[#5a6878]' };
}

function grnStatus(po: PORecord): { label: string; color: string; dot: string } {
  if (po.status === 'Completed') return { label: 'Full', color: 'text-[#00e676]', dot: 'bg-[#00e676]' };
  if (po.status === 'Partially Received') return { label: 'Partial', color: 'text-[#f5a623]', dot: 'bg-[#f5a623]' };
  if (po.status === 'Overdue') return { label: overdueDays(po.requiredDate) + 'd overdue', color: 'text-[#ff3d3d]', dot: 'bg-[#ff3d3d]' };
  return { label: '—', color: 'text-[#5a6878]', dot: 'bg-[#5a6878]' };
}

const DELIVERY_STATUS_OPTIONS: Array<{ label: string; desc: string }> = [
  { label: 'Pending', desc: 'No items received' },
  { label: 'Partial', desc: 'Partial receipt' },
  { label: 'Full', desc: 'All items received' },
  { label: 'Overdue', desc: 'Past due date' },
];

export default function ProcurementPORegister() {
  const [records, setRecords] = useState<PORecord[]>(MOCK_POS);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PORecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PORecord | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<PORecord | null>(null);
  const [projectFilter, setProjectFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
const [grnEditItemId, setGrnEditItemId] = useState<number | null>(null);
const [grnEditQty, setGrnEditQty] = useState(0);
const [formOpen, setFormOpen] = useState(false);
const [formTarget, setFormTarget] = useState<PORecord | null>(null);
const [formVendor, setFormVendor] = useState(VENDORS[0]);
const [formProject, setFormProject] = useState(PROJECTS[0]);
const [formAddress, setFormAddress] = useState('');
const [formReqDate, setFormReqDate] = useState('');
const [formItems, setFormItems] = useState<(Omit<LineItem, 'id'> & { id: number })[]>([]);
const [nextFormItemId, setNextFormItemId] = useState(1);

  const filtered = useMemo(() => {
    let arr = [...records];
    if (projectFilter !== 'All') arr = arr.filter(r => r.projectShort === projectFilter);
    if (vendorFilter !== 'All') arr = arr.filter(r => r.vendor === vendorFilter);
    if (statusFilter !== 'All') arr = arr.filter(r => r.status === statusFilter);
    if (overdueOnly) arr = arr.filter(r => isOverdue(r.requiredDate) && r.status !== 'Completed');
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      arr = arr.filter(r => r.poNo.toLowerCase().includes(q));
    }
    return arr;
  }, [records, projectFilter, vendorFilter, statusFilter, overdueOnly, searchText]);

  const tc = useTableControls(filtered, (r) => r.poNo);

  const openDetail = (r: PORecord) => {
    setDetailTarget(r);
    setGrnEditItemId(null);
    setDetailOpen(true);
  };

  const openPrint = (r: PORecord) => {
    setPrintTarget(r);
    setPrintOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
    toast.success(`PO ${deleteTarget.poNo} deleted`);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleGrnUpdate = () => {
    if (!detailTarget || grnEditItemId === null) return;
    const updated = { ...detailTarget };
    updated.lineItems = updated.lineItems.map(it =>
      it.id === grnEditItemId ? { ...it, qtyReceived: Math.min(grnEditQty, it.qtyOrdered) } : it
    );
    const totalOrd = updated.lineItems.reduce((s, it) => s + it.qtyOrdered, 0);
    const totalRec = updated.lineItems.reduce((s, it) => s + it.qtyReceived, 0);
    if (totalRec >= totalOrd) {
      updated.status = 'Completed';
      updated.grnCompleted = true;
      updated.grnDate = new Date().toISOString().split('T')[0];
    } else if (totalRec > 0) {
      updated.status = 'Partially Received';
      updated.grnCompleted = true;
      updated.grnDate = updated.grnDate || new Date().toISOString().split('T')[0];
    }
    updated.actualDeliveryDate = totalRec > 0 ? new Date().toISOString().split('T')[0] : updated.actualDeliveryDate;
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setDetailTarget(updated);
    setGrnEditItemId(null);
    toast.success('GRN quantity updated');
  };

  const handleActualDeliveryEdit = (val: string) => {
    if (!detailTarget) return;
    const updated = { ...detailTarget, actualDeliveryDate: val };
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setDetailTarget(updated);
  };

  const openCreate = () => {
    setFormTarget(null);
    setFormVendor(VENDORS[0]);
    setFormProject(PROJECTS[0]);
    setFormAddress('Site Location, Korba, Chhattisgarh');
    setFormReqDate(addDays(now, 30).toISOString().split('T')[0]);
    setFormItems([
      { id: 1, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 },
      { id: 2, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 },
      { id: 3, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 },
    ]);
    setNextFormItemId(4);
    setFormOpen(true);
  };

  const openEdit = (r: PORecord) => {
    setFormTarget(r);
    setFormVendor(r.vendor);
    setFormProject(r.projectShort);
    setFormAddress(r.deliveryAddress);
    setFormReqDate(r.requiredDate);
    setFormItems(r.lineItems.map(it => ({ ...it })));
    setNextFormItemId(Math.max(...r.lineItems.map(it => it.id), 0) + 1);
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    if (!formVendor || !formReqDate) { toast.error('Vendor and Required Date are required'); return; }
    const validItems = formItems.filter(it => it.itemDesc && it.qtyOrdered > 0);
    if (validItems.length === 0) { toast.error('Add at least one line item with a description and quantity'); return; }
    const newId = formTarget ? formTarget.id : Math.max(...records.map(r => r.id)) + 1;
    const poNo = formTarget ? formTarget.poNo : 'PO-2026-' + String(newId).padStart(3, '0');
    const address = formAddress || 'Site Location, Korba, Chhattisgarh';
    const reqDate = formReqDate || toDateStr(addDays(now, 30));
    const projectFull = PROJECTS.find(p => p.startsWith(formProject)) || formProject;
    const items = validItems.map(it => ({ ...it, total: it.qtyOrdered * it.unitPrice }));
    const total = items.reduce((s, it) => s + it.total, 0);
    const poDate = toDateStr(new Date());
    const record: PORecord = {
      id: newId, poNo, vendor: formVendor, project: projectFull, projectShort: formProject,
      totalValue: total, deliveryAddress: address, requiredDate: reqDate, actualDeliveryDate: '',
      lineItems: items, status: 'Open', poIssueDate: poDate, grnDate: null, invoiceMatchDate: null,
      poIssued: true, grnCompleted: false, invoiceMatched: false,
    };
    if (formTarget) {
      setRecords(prev => prev.map(r => r.id === newId ? { ...record, status: formTarget!.status, grnCompleted: formTarget!.grnCompleted, invoiceMatched: formTarget!.invoiceMatched } : r));
      toast.success(`PO ${poNo} updated`);
    } else {
      setRecords(prev => [...prev, record]);
      toast.success(`PO ${poNo} created`);
    }
    setFormOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4 p-6">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <FileText size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Purchase Order Register</span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filtered.length}</span>
          <div className="ml-2">
            <SearchInput value={searchText} onChange={setSearchText} placeholder="Search PO#..." />
          </div>
          <button onClick={openCreate} className="ml-2 px-3 py-1.5 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[11px] font-semibold hover:bg-[#e8991a] flex items-center gap-1.5"><Plus size={13} /> New PO</button>
        </div>
        <div className="px-3 py-2 flex flex-wrap items-center gap-2 border-b border-[#252e3a]">
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
            <option value="All">All Projects</option>
            {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
            <option value="All">All Vendors</option>
            {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0f1318] border border-[#252e3a] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none">
            <option value="All">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[11px] text-[#8899aa] cursor-pointer select-none ml-1">
            <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} className="accent-[#ff3d3d] w-3 h-3" />
            Overdue Deliveries Only
          </label>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0f1318]">
                  {['PO#', 'Vendor', 'Project', 'Total Value', 'Delivery Address', 'Required Date', 'Line Items', 'GRN Status', '3-Way Match', 'Status', 'Actions'].map(h =>
                    <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                {tc.pageItems.map(r => {
                  const grn = grnStatus(r);
                  return (
                    <tr key={r.id} className="hover:bg-[#141920]">
                      <td className="py-2.5 px-3">
                        <button onClick={() => openDetail(r)} className="text-[#f5a623] font-mono hover:underline text-left">{r.poNo}</button>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{r.vendor}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.projectShort}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{formatCurrency(r.totalValue)}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[140px] truncate">{r.deliveryAddress}</td>
                      <td className={`py-2.5 px-3 font-mono ${isOverdue(r.requiredDate) && r.status !== 'Completed' ? 'text-[#ff3d3d]' : 'text-[#8899aa]'}`}>{r.requiredDate}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{r.lineItems.length} items</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${grn.dot}`} />
                          <span className={grn.color}>{grn.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${r.poIssued ? 'bg-[#00e676] text-[#0f1318]' : 'bg-[#252e3a] text-[#5a6878]'}`} style={{ fontSize: 7 }}>{r.poIssued ? '✓' : '○'}</span>
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${r.grnCompleted ? 'bg-[#00e676] text-[#0f1318]' : 'bg-[#252e3a] text-[#5a6878]'}`} style={{ fontSize: 7 }}>{r.grnCompleted ? '✓' : '○'}</span>
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center ${r.invoiceMatched ? 'bg-[#00e676] text-[#0f1318]' : 'bg-[#252e3a] text-[#5a6878]'}`} style={{ fontSize: 7 }}>{r.invoiceMatched ? '✓' : '○'}</span>
                          {r.poIssued && r.grnCompleted && r.invoiceMatched && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#00e676]/15 text-[#00e676]">Ready to Pay</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1">
                          <button onClick={() => openPrint(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Printer size={13} /></button>
                          <button onClick={() => openEdit(r)} className="p-1 rounded text-[#5a6878] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"><Pencil size={13} /></button>
                          <button onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }} className="p-1 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tc.pageItems.length === 0 && (
                  <tr><td colSpan={11} className="py-8 text-center text-[#5a6878]">No purchase orders match the current filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar page={tc.page} totalPages={tc.totalPages} pageSize={tc.pageSize} setPage={tc.setPage} setPageSize={tc.setPageSize} from={tc.from} to={tc.to} total={tc.total} />
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {detailTarget && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">PO No</label>
                    <div className="text-[#e2e8f0] font-mono">{detailTarget.poNo}</div>
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
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Total Value</label>
                    <div className="text-[#e2e8f0] font-mono">₹{detailTarget.totalValue.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Required Date</label>
                    <div className="text-[#e2e8f0]">{detailTarget.requiredDate}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8899aa] mb-1">Delivery Address</label>
                  <div className="text-[#e2e8f0]">{detailTarget.deliveryAddress}</div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setDetailOpen(false)} className="vc-btn-ghost">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-white text-[#1a1a1a] sm:max-w-[800px] max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
          <DialogHeader className="sr-only"><DialogTitle>{formTarget ? 'Edit' : 'New'} Purchase Order</DialogTitle><DialogDescription>Purchase order form</DialogDescription></DialogHeader>
          <div className="bg-white">
            {/* Company Letterhead */}
            <div className="text-center border-b-2 border-[#1a1a1a] pb-3 mb-4">
              <div className="text-[18px] font-bold">VOLTCORE ENGINEERING PVT LTD</div>
              <div className="text-[10px] text-[#555]">Registered Office: 123 Industrial Area, Korba, Chhattisgarh - 495677</div>
              <div className="text-[10px] text-[#555]">GST: 22ABCDE1234F1Z5 | PAN: ABCDE1234F</div>
            </div>

            {/* PO Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[16px] font-bold">PURCHASE ORDER</div>
                <div className="text-[10px] text-[#555]">PO No: <input value={formTarget ? formTarget.poNo : 'PO-2026-XXX'} className="font-bold text-[#1a1a1a] bg-transparent border-b border-dashed border-[#999] outline-none w-[130px] text-[10px]" readOnly={!!formTarget} /></div>
                <div className="text-[10px] text-[#555]">Date: <span className="font-bold text-[#1a1a1a]">{toDateStr(new Date())}</span></div>
              </div>
              <div className="text-right text-[10px] w-[240px]">
                <div className="font-bold text-[12px] mb-1">Vendor:</div>
                <input value={formVendor} onChange={e => setFormVendor(e.target.value)} list="form-vendors" className="w-full bg-transparent border-b border-dashed border-[#999] outline-none text-[11px] font-bold text-[#1a1a1a] text-right" />
                <datalist id="form-vendors">{VENDORS.map(v => <option key={v} value={v} />)}</datalist>
                <input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#555] text-right mt-0.5" placeholder="Delivery Address" />
              </div>
            </div>

            {/* Project & Delivery Info */}
            <div className="mb-4 text-[10px] space-y-1">
              <div className="flex items-center gap-2"><span className="font-bold">Project:</span>
                <select value={formProject} onChange={e => setFormProject(e.target.value)} className="bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#1a1a1a] appearance-none">
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2"><span className="font-bold">Delivery Address:</span>
                <input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="flex-1 bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#1a1a1a]" placeholder="Site Location, Korba, Chhattisgarh" />
              </div>
              <div className="flex items-center gap-2"><span className="font-bold">Required Date:</span>
                <input type="date" value={formReqDate} onChange={e => setFormReqDate(e.target.value)} className="bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#1a1a1a]" />
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-[10px] border-collapse mb-3">
              <thead>
                <tr className="bg-[#f0f0f0]">
                  <th className="border border-[#ccc] px-2 py-1 text-left font-bold w-6">#</th>
                  <th className="border border-[#ccc] px-2 py-1 text-left font-bold">Item Description</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[60px]">Qty</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[55px]">Unit</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[90px]">Unit Price (₹)</th>
                  <th className="border border-[#ccc] px-2 py-1 text-right font-bold w-[90px]">Total (₹)</th>
                  <th className="border border-[#ccc] px-2 py-1 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {formItems.map((it, i) => {
                  const lineTotal = it.qtyOrdered * it.unitPrice;
                  return (
                    <tr key={it.id}>
                      <td className="border border-[#ccc] px-2 py-1 text-[#555] text-center">{i + 1}</td>
                      <td className="border border-[#ccc] px-2 py-1">
                        <input value={it.itemDesc} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], itemDesc: e.target.value }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px]" placeholder="Description of item/service" />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right">
                        <input type="number" value={it.qtyOrdered || ''} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], qtyOrdered: Math.max(0, Number(e.target.value)) }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px] text-right font-mono" min={0} />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right">
                        <input value={it.unit} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], unit: e.target.value }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px] text-right" />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right">
                        <input type="number" value={it.unitPrice || ''} onChange={e => { const u = [...formItems]; u[i] = { ...u[i], unitPrice: Math.max(0, Number(e.target.value)) }; setFormItems(u); }} className="w-full bg-transparent outline-none text-[10px] text-right font-mono" min={0} />
                      </td>
                      <td className="border border-[#ccc] px-2 py-1 text-right font-mono font-bold">{(lineTotal ?? 0).toLocaleString('en-IN')}</td>
                      <td className="border border-[#ccc] px-2 py-1 text-center">
                        {formItems.length > 1 && <button onClick={() => setFormItems(prev => prev.filter((_, idx) => idx !== i))} className="text-[#ff3d3d] text-[11px] hover:underline">✕</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#f8f8f8]">
                  <td colSpan={7} className="border border-[#ccc] px-2 py-1">
                    <button onClick={() => { setFormItems(prev => [...prev, { id: nextFormItemId, itemDesc: '', qtyOrdered: 0, qtyReceived: 0, unit: 'Nos', unitPrice: 0, total: 0 }]); setNextFormItemId(n => n + 1); }} className="text-[10px] text-[#f5a623] hover:underline flex items-center gap-1"><Plus size={11} /> Add Row</button>
                  </td>
                </tr>
                <tr className="bg-[#f8f8f8]">
                  <td colSpan={5} className="border border-[#ccc] px-2 py-1 text-right font-bold text-[11px]">Grand Total</td>
                  <td className="border border-[#ccc] px-2 py-1 text-right font-bold font-mono text-[11px]">{formItems.reduce((s, it) => s + it.qtyOrdered * it.unitPrice, 0).toLocaleString('en-IN')}</td>
                  <td className="border border-[#ccc] px-2 py-1"></td>
                </tr>
              </tfoot>
            </table>

            {/* Terms & Conditions */}
            <div className="mb-3 text-[10px]">
              <div className="font-bold mb-1">Terms & Conditions:</div>
              <ol className="list-decimal pl-4 text-[#555] space-y-0.5">
                <li>Delivery must be completed by the required date specified above.</li>
                <li>Inspection at site before acceptance. Rejected materials to be replaced at vendor cost.</li>
                <li>Payment within 30 days of complete delivery & acceptance.</li>
                <li>Liquidated damages @ 0.5% per week subject to max 5% of PO value for delayed delivery.</li>
                <li>GST & other taxes as applicable will be paid extra.</li>
                <li>This PO is subject to Korba jurisdiction.</li>
              </ol>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 mt-4 text-[10px]">
              <div>
                <div className="border-t border-[#1a1a1a] pt-1 mt-8">Authorised Signatory</div>
                <div className="text-[#555]">For Voltcore Engineering Pvt Ltd</div>
              </div>
              <div>
                <div className="border-t border-[#1a1a1a] pt-1 mt-8">Accepted By</div>
                <input value={formVendor} readOnly className="bg-transparent border-b border-dashed border-[#999] outline-none text-[10px] text-[#555] w-full" placeholder="Vendor name" />
              </div>
            </div>

            {/* Footer note */}
            <div className="text-center text-[8px] text-[#999] mt-4 border-t border-[#ddd] pt-2">This is a computer-generated document. No signature is required.</div>
          </div>
          <DialogFooter className="gap-2 pt-3 border-t border-[#ddd]">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-[#ccc] text-[#555] text-[12px] font-semibold hover:bg-[#f5f5f5]">Cancel</button>
            <button onClick={handleFormSubmit} className="px-4 py-2 rounded-lg bg-[#f5a623] text-white text-[12px] font-semibold hover:bg-[#e8991a] flex items-center gap-1.5"><FileText size={13} /> {formTarget ? 'Update' : 'Create'} Purchase Order</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="bg-white text-[#1a1a1a] sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Print Purchase Order</DialogTitle><DialogDescription>Purchase order print preview</DialogDescription></DialogHeader>
          {printTarget && (() => {
            const d = printTarget;
            return (
              <div className="p-6" style={{ fontFamily: "'Times New Roman', serif" }}>
                <div className="text-center border-b-2 border-[#1a1a1a] pb-3 mb-4">
                  <div className="text-[18px] font-bold">VOLTCORE ENGINEERING PVT LTD</div>
                  <div className="text-[10px] text-[#555]">Registered Office: 123 Industrial Area, Korba, Chhattisgarh - 495677</div>
                  <div className="text-[10px] text-[#555]">GST: 22ABCDE1234F1Z5 | PAN: ABCDE1234F</div>
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[16px] font-bold">PURCHASE ORDER</div>
                    <div className="text-[10px] text-[#555]">PO No: <span className="font-bold text-[#1a1a1a]">{d.poNo}</span></div>
                    <div className="text-[10px] text-[#555]">Date: <span className="font-bold text-[#1a1a1a]">{d.poIssueDate}</span></div>
                  </div>
                  <div className="text-right text-[10px]">
                    <div className="font-bold text-[12px]">Vendor:</div>
                    <div className="font-bold">{d.vendor}</div>
                    <div className="text-[#555]">{d.deliveryAddress}</div>
                  </div>
                </div>
                <div className="mb-4 text-[10px]">
                  <div><span className="font-bold">Project:</span> {d.project}</div>
                  <div><span className="font-bold">Delivery Address:</span> {d.deliveryAddress}</div>
                  <div><span className="font-bold">Required Date:</span> {d.requiredDate}</div>
                </div>
                <table className="w-full text-[10px] border-collapse mb-4">
                  <thead>
                    <tr className="bg-[#f0f0f0]">
                      <th className="border border-[#ccc] px-2 py-1 text-left font-bold">#</th>
                      <th className="border border-[#ccc] px-2 py-1 text-left font-bold">Item Description</th>
                      <th className="border border-[#ccc] px-2 py-1 text-right font-bold">Qty</th>
                      <th className="border border-[#ccc] px-2 py-1 text-right font-bold">Unit</th>
                      <th className="border border-[#ccc] px-2 py-1 text-right font-bold">Unit Price (₹)</th>
                      <th className="border border-[#ccc] px-2 py-1 text-right font-bold">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.lineItems.map((it, i) => (
                      <tr key={it.id}>
                        <td className="border border-[#ccc] px-2 py-1 text-[#555]">{i + 1}</td>
                        <td className="border border-[#ccc] px-2 py-1">{it.itemDesc}</td>
                        <td className="border border-[#ccc] px-2 py-1 text-right font-mono">{it.qtyOrdered}</td>
                        <td className="border border-[#ccc] px-2 py-1 text-right">{it.unit}</td>
                        <td className="border border-[#ccc] px-2 py-1 text-right font-mono">{(it.unitPrice ?? 0).toLocaleString('en-IN')}</td>
                        <td className="border border-[#ccc] px-2 py-1 text-right font-mono">{(it.total ?? 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f8f8f8]">
                      <td colSpan={5} className="border border-[#ccc] px-2 py-1 text-right font-bold">Grand Total</td>
                      <td className="border border-[#ccc] px-2 py-1 text-right font-bold font-mono">{(d.totalValue ?? 0).toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
                <div className="mb-4 text-[10px]">
                  <div className="font-bold mb-1">Terms & Conditions:</div>
                  <ol className="list-decimal pl-4 text-[#555] space-y-0.5">
                    <li>Delivery must be completed by the required date specified above.</li>
                    <li>Inspection at site before acceptance. Rejected materials to be replaced at vendor cost.</li>
                    <li>Payment within 30 days of complete delivery & acceptance.</li>
                    <li>Liquidated damages @ 0.5% per week subject to max 5% of PO value for delayed delivery.</li>
                    <li>GST & other taxes as applicable will be paid extra.</li>
                    <li>This PO is subject to Korba jurisdiction.</li>
                  </ol>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-6 text-[10px]">
                  <div>
                    <div className="border-t border-[#1a1a1a] pt-1 mt-8">Authorised Signatory</div>
                    <div className="text-[#555]">For Voltcore Engineering Pvt Ltd</div>
                  </div>
                  <div>
                    <div className="border-t border-[#1a1a1a] pt-1 mt-8">Accepted By</div>
                    <div className="text-[#555]">For {d.vendor}</div>
                  </div>
                </div>
                <div className="text-center text-[8px] text-[#999] mt-4 border-t border-[#ddd] pt-2">This is a computer-generated document. No signature is required.</div>
              </div>
            );
          })()}
          <DialogFooter>
            <button onClick={() => setPrintOpen(false)} className="vc-btn-ghost text-[12px]">Close</button>
            <button onClick={() => { window.print(); }} className="vc-btn-primary flex items-center gap-1.5 text-[12px]"><Printer size={13} /> Print</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#161c24] border-[#252e3a] text-[#e2e8f0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ff3d3d]">Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8899aa]">
              Delete <strong className="text-[#f5a623]">{deleteTarget?.poNo}</strong> for <strong className="text-[#e2e8f0]">{deleteTarget?.vendor}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="vc-btn-ghost">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#ff3d3d] hover:bg-[#cc2020] text-white rounded-lg">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
