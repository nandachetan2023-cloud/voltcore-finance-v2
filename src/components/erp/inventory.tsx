'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Pencil, Trash2, AlertTriangle, IndianRupee,
  TrendingDown, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Warehouse
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  warehouse: string;
  status: string;
  createdAt: string;
}

interface StockMovement {
  id: string;
  itemCode: string;
  itemName: string;
  type: string;
  quantity: number;
  fromWarehouse: string | null;
  toWarehouse: string | null;
  reference: string | null;
  date: string;
  remarks: string | null;
  createdAt: string;
}

interface InventoryData {
  items: InventoryItem[];
  movements: StockMovement[];
}

interface ItemFormData {
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: string;
  minStock: string;
  maxStock: string;
  unitCost: string;
  warehouse: string;
  status: string;
}

interface MovementFormData {
  itemCode: string;
  itemName: string;
  type: string;
  quantity: string;
  fromWarehouse: string;
  toWarehouse: string;
  reference: string;
  date: string;
  remarks: string;
}

const CATEGORIES = ['Raw Materials', 'Consumables', 'Electrical', 'Safety', 'Mechanical', 'Civil'];

const emptyItemForm: ItemFormData = {
  itemCode: '', name: '', category: '', unit: 'Nos',
  currentStock: '0', minStock: '0', maxStock: '0', unitCost: '0',
  warehouse: '', status: 'In Stock',
};

const emptyMovementForm: MovementFormData = {
  itemCode: '', itemName: '', type: 'Inward', quantity: '',
  fromWarehouse: '', toWarehouse: '', reference: '', date: new Date().toISOString().split('T')[0], remarks: '',
};

// ── Helpers ────────────────────────────────────────────
function stockStatusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'in stock': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'low stock': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40';
    case 'out of stock': return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function movementTypeColor(t: string) {
  switch (t?.toLowerCase()) {
    case 'inward': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'issue': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    case 'transfer': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function movementTypeIcon(t: string) {
  switch (t?.toLowerCase()) {
    case 'inward': return <ArrowDownToLine size={12} />;
    case 'issue': return <ArrowUpFromLine size={12} />;
    case 'transfer': return <ArrowLeftRight size={12} />;
    default: return null;
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
}

function formatCr(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${formatCurrency(val)}`;
}

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{value}</div>
          {sub && <div className="text-[10px] text-[#5a6878] mt-1">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-8 w-16 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-11 w-full bg-[#1e2630]" />)}
        </div>
      </div>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────
function FormField({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

// ── Tab Button ─────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold transition-colors ${
        active
          ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30'
          : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920] border border-transparent'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────
export default function InventoryModule() {
  const [data, setData] = useState<InventoryData>({ items: [], movements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

  // Item CRUD
  const [itemCreateOpen, setItemCreateOpen] = useState(false);
  const [itemEditOpen, setItemEditOpen] = useState(false);
  const [itemDeleteOpen, setItemDeleteOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormData>(emptyItemForm);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Movement CRUD (create only)
  const [movementCreateOpen, setMovementCreateOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementFormData>(emptyMovementForm);

  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) { if (activeTab === 'items') setItemCreateOpen(true); else setMovementCreateOpen(true); } }, [triggerCreate, activeTab]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Failed to load inventory data');
    } catch { setError('Network error fetching inventory data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed stats
  const { items, movements } = data;
  const inStockCount = items.filter(i => i.status?.toLowerCase() === 'in stock').length;
  const lowStockCount = items.filter(i => i.currentStock <= i.minStock && i.currentStock > 0).length;
  const totalValue = items.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0);

  // ── Item Handlers ──
  const openItemCreate = () => { setItemForm(emptyItemForm); setItemCreateOpen(true); };
  const openItemEdit = (item: InventoryItem) => {
    setItemForm({
      itemCode: item.itemCode, name: item.name, category: item.category, unit: item.unit,
      currentStock: String(item.currentStock), minStock: String(item.minStock), maxStock: String(item.maxStock),
      unitCost: String(item.unitCost), warehouse: item.warehouse, status: item.status,
    });
    setSelectedItemId(item.id);
    setItemEditOpen(true);
  };
  const openItemDelete = (id: string) => { setSelectedItemId(id); setItemDeleteOpen(true); };

  const handleItemSubmit = async (mode: 'create' | 'edit') => {
    if (!itemForm.itemCode.trim() || !itemForm.name.trim()) { toast.error('Item code and name are required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...itemForm,
        currentStock: parseInt(itemForm.currentStock) || 0,
        minStock: parseInt(itemForm.minStock) || 0,
        maxStock: parseInt(itemForm.maxStock) || 0,
        unitCost: parseFloat(itemForm.unitCost) || 0,
      };
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { type: 'item', id: selectedItemId, ...payload } : { type: 'item', ...payload };
      const res = await fetch('/api/inventory', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Item created successfully' : 'Item updated successfully');
        if (mode === 'create') setItemCreateOpen(false); else setItemEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode} item`); }
    } catch { toast.error(`Failed to ${mode} item`); }
    finally { setSubmitting(false); }
  };

  const handleItemDelete = async () => {
    if (!selectedItemId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'item', id: selectedItemId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Item deleted successfully');
        setItemDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete item'); }
    } catch { toast.error('Failed to delete item'); }
    finally { setSubmitting(false); }
  };

  // ── Movement Handlers ──
  const openMovementCreate = () => { setMovementForm(emptyMovementForm); setMovementCreateOpen(true); };

  const handleMovementItemChange = (itemCode: string) => {
    const item = items.find(i => i.itemCode === itemCode);
    setMovementForm(f => ({ ...f, itemCode, itemName: item?.name || '' }));
  };

  const handleMovementSubmit = async () => {
    if (!movementForm.itemCode || !movementForm.quantity) { toast.error('Item and quantity are required'); return; }
    setSubmitting(true);
    try {
      const body = {
        type: 'movement',
        ...movementForm,
        quantity: parseInt(movementForm.quantity) || 0,
      };
      const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success('Stock movement recorded successfully');
        setMovementCreateOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to record stock movement'); }
    } catch { toast.error('Failed to record stock movement'); }
    finally { setSubmitting(false); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Package size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  // ── Dialog content shared between create and edit ──
  const itemDialogContent = (mode: 'create' | 'edit') => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Item Code">
        <input className={inputCls} value={itemForm.itemCode} onChange={e => setItemForm(f => ({ ...f, itemCode: e.target.value }))} placeholder="RM-001" />
      </FormField>
      <FormField label="Item Name">
        <input className={inputCls} value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Copper Cable 3 Core" />
      </FormField>
      <FormField label="Category">
        <select className={selectCls} value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </FormField>
      <FormField label="Unit">
        <select className={selectCls} value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}>
          <option value="Nos">Nos</option>
          <option value="Kg">Kg</option>
          <option value="Meters">Meters</option>
          <option value="Litres">Litres</option>
          <option value="Pcs">Pcs</option>
          <option value="Sets">Sets</option>
          <option value="Rolls">Rolls</option>
          <option value="Boxes">Boxes</option>
        </select>
      </FormField>
      <FormField label="Current Stock">
        <input className={inputCls} type="number" value={itemForm.currentStock} onChange={e => setItemForm(f => ({ ...f, currentStock: e.target.value }))} />
      </FormField>
      <FormField label="Min Stock">
        <input className={inputCls} type="number" value={itemForm.minStock} onChange={e => setItemForm(f => ({ ...f, minStock: e.target.value }))} />
      </FormField>
      <FormField label="Max Stock">
        <input className={inputCls} type="number" value={itemForm.maxStock} onChange={e => setItemForm(f => ({ ...f, maxStock: e.target.value }))} />
      </FormField>
      <FormField label="Unit Cost (₹)">
        <input className={inputCls} type="number" value={itemForm.unitCost} onChange={e => setItemForm(f => ({ ...f, unitCost: e.target.value }))} />
      </FormField>
      <FormField label="Warehouse">
        <input className={inputCls} value={itemForm.warehouse} onChange={e => setItemForm(f => ({ ...f, warehouse: e.target.value }))} placeholder="Main Store" />
      </FormField>
      <FormField label="Status">
        <select className={selectCls} value={itemForm.status} onChange={e => setItemForm(f => ({ ...f, status: e.target.value }))}>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Items" value={items.length} color="#f5a623" sub="All inventory items" />
        <StatCard icon={Package} label="In Stock" value={inStockCount} color="#00e676" sub="Available items" />
        <StatCard icon={TrendingDown} label="Low Stock" value={lowStockCount} color="#ff3d3d" sub="Below minimum level" />
        <StatCard icon={IndianRupee} label="Total Value" value={formatCr(totalValue)} color="#00d4ff" sub="Current stock value" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2">
        <TabButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={Package} label="Items" />
        <TabButton active={activeTab === 'movements'} onClick={() => setActiveTab('movements')} icon={ArrowLeftRight} label="Stock Movements" />
      </div>

      {/* ── Items Table ── */}
      {activeTab === 'items' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Package size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-bold text-[#e2e8f0]">Inventory Items</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{items.length} items</span>
            <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openItemCreate}>
              <Plus size={13} /> New Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
              <Package size={36} className="mb-2 opacity-40" />
              <p className="text-[12px]">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                    {['Item Code', 'Name', 'Category', 'Unit', 'Current Stock', 'Min Stock', 'Unit Cost', 'Warehouse', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                    const isOut = item.currentStock === 0;
                    return (
                      <tr key={item.id} className={`border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group ${isLow ? 'bg-[#ff3d3d]/5' : ''}`}>
                        <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{item.itemCode}</td>
                        <td className={`px-3 py-[10px] whitespace-nowrap max-w-[180px] truncate font-medium ${isOut ? 'text-[#5a6878]' : isLow ? 'text-[#ff3d3d]' : 'text-[#e2e8f0]'}`}>{item.name}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{item.category}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{item.unit}</td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className={isLow ? 'text-[#ff3d3d]' : isOut ? 'text-[#5a6878]' : 'text-[#00d4ff]'}>{item.currentStock}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#5a6878]">{item.minStock}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#00e676]">₹{formatCurrency(item.unitCost)}</span>
                        </td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">
                          <div className="flex items-center gap-1"><Warehouse size={10} className="text-[#5a6878]" />{item.warehouse}</div>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap">
                          <span className={`vc-badge border ${stockStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openItemEdit(item)}><Pencil size={13} /></button>
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openItemDelete(item.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Movements Table ── */}
      {activeTab === 'movements' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <ArrowLeftRight size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-bold text-[#e2e8f0]">Stock Movements</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{movements.length} records</span>
            <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openMovementCreate}>
              <Plus size={13} /> New Movement
            </button>
          </div>

          {movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
              <ArrowLeftRight size={36} className="mb-2 opacity-40" />
              <p className="text-[12px]">No stock movements found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                    {['Item Code', 'Item Name', 'Type', 'Quantity', 'From', 'To', 'Reference', 'Date', 'Remarks'].map(h => (
                      <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors">
                      <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{mov.itemCode}</td>
                      <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[160px] truncate">{mov.itemName}</td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <span className={`vc-badge border flex items-center gap-1 w-fit ${movementTypeColor(mov.type)}`}>
                          {movementTypeIcon(mov.type)}
                          {mov.type}
                        </span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="text-[#00d4ff]">{mov.quantity}</span>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{mov.fromWarehouse || '—'}</td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{mov.toWarehouse || '—'}</td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{mov.reference || '—'}</td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(mov.date)}</td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap max-w-[140px] truncate">{mov.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Create Item Dialog ── */}
      <Dialog open={itemCreateOpen} onOpenChange={setItemCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Item</DialogTitle></DialogHeader>
          {itemDialogContent('create')}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setItemCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleItemSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Dialog ── */}
      <Dialog open={itemEditOpen} onOpenChange={setItemEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Item</DialogTitle></DialogHeader>
          {itemDialogContent('edit')}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setItemEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleItemSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Item Dialog ── */}
      <Dialog open={itemDeleteOpen} onOpenChange={setItemDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Item</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this inventory item?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated stock movement records will be preserved.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setItemDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleItemDelete}>
              {submitting ? 'Deleting...' : 'Delete Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Movement Dialog ── */}
      <Dialog open={movementCreateOpen} onOpenChange={setMovementCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Record Stock Movement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            <FormField label="Item Code">
              <select className={selectCls} value={movementForm.itemCode} onChange={e => handleMovementItemChange(e.target.value)}>
                <option value="">Select item</option>
                {items.map(i => <option key={i.id} value={i.itemCode}>{i.itemCode} — {i.name}</option>)}
              </select>
            </FormField>
            <FormField label="Item Name">
              <input className={inputCls} value={movementForm.itemName} readOnly placeholder="Auto-filled" style={{ opacity: 0.6 }} />
            </FormField>
            <FormField label="Movement Type">
              <select className={selectCls} value={movementForm.type} onChange={e => setMovementForm(f => ({ ...f, type: e.target.value }))}>
                <option value="Inward">Inward</option>
                <option value="Issue">Issue</option>
                <option value="Transfer">Transfer</option>
              </select>
            </FormField>
            <FormField label="Quantity">
              <input className={inputCls} type="number" value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
            </FormField>
            <FormField label="From Warehouse">
              <input className={inputCls} value={movementForm.fromWarehouse} onChange={e => setMovementForm(f => ({ ...f, fromWarehouse: e.target.value }))} placeholder="Vendor / Source" />
            </FormField>
            <FormField label="To Warehouse">
              <input className={inputCls} value={movementForm.toWarehouse} onChange={e => setMovementForm(f => ({ ...f, toWarehouse: e.target.value }))} placeholder="Main Store" />
            </FormField>
            <FormField label="Reference">
              <input className={inputCls} value={movementForm.reference} onChange={e => setMovementForm(f => ({ ...f, reference: e.target.value }))} placeholder="PO-0001 / GRN-001" />
            </FormField>
            <FormField label="Date">
              <input className={inputCls} type="date" value={movementForm.date} onChange={e => setMovementForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Remarks" span>
              <input className={inputCls} value={movementForm.remarks} onChange={e => setMovementForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Additional notes..." />
            </FormField>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setMovementCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={handleMovementSubmit}>
              {submitting ? 'Recording...' : 'Record Movement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
