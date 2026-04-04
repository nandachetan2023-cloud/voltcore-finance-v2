'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Plus, Pencil, Trash2, AlertTriangle, IndianRupee,
  ShoppingCart, FileText, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst: string | null;
  city: string | null;
  state: string | null;
  totalOrders: number;
  totalRevenue: number;
  status: string;
  createdAt: string;
}

interface SalesOrder {
  id: string;
  soNo: string;
  customer: string;
  project: string;
  item: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  orderDate: string;
  deliveryDate: string | null;
  status: string;
  createdAt: string;
}

interface SalesData {
  customers: Customer[];
  orders: SalesOrder[];
}

interface CustomerFormData {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gst: string;
  city: string;
  state: string;
  status: string;
}

interface OrderFormData {
  customer: string;
  project: string;
  item: string;
  quantity: string;
  unitPrice: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
}

const emptyCustomerForm: CustomerFormData = {
  code: '', name: '', contactPerson: '', email: '', phone: '',
  address: '', gst: '', city: '', state: '', status: 'Active',
};

const emptyOrderForm: OrderFormData = {
  customer: '', project: '', item: '', quantity: '',
  unitPrice: '', orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: '', status: 'Pending',
};

// ── Helpers ────────────────────────────────────────────
function customerStatusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'active': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'inactive': return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

function orderStatusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'pending': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    case 'in progress': return 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40';
    case 'completed': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'cancelled': return 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
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
export default function SalesModule() {
  const [data, setData] = useState<SalesData>({ customers: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'customers' | 'orders'>('customers');

  // Customer CRUD
  const [custCreateOpen, setCustCreateOpen] = useState(false);
  const [custEditOpen, setCustEditOpen] = useState(false);
  const [custDeleteOpen, setCustDeleteOpen] = useState(false);
  const [custForm, setCustForm] = useState<CustomerFormData>(emptyCustomerForm);
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);

  // Order CRUD
  const [orderCreateOpen, setOrderCreateOpen] = useState(false);
  const [orderEditOpen, setOrderEditOpen] = useState(false);
  const [orderDeleteOpen, setOrderDeleteOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderFormData>(emptyOrderForm);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) { if (activeTab === 'customers') setCustCreateOpen(true); else setOrderCreateOpen(true); } }, [triggerCreate, activeTab]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sales');
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Failed to load sales data');
    } catch { setError('Network error fetching sales data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed stats
  const { customers, orders } = data;
  const activeCustomers = customers.filter(c => c.status?.toLowerCase() === 'active').length;
  const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);

  const inProgressOrders = orders.filter(o => o.status?.toLowerCase() === 'in progress').length;
  const completedOrders = orders.filter(o => o.status?.toLowerCase() === 'completed').length;
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // ── Customer Handlers ──
  const openCustCreate = () => { setCustForm(emptyCustomerForm); setCustCreateOpen(true); };
  const openCustEdit = (c: Customer) => {
    setCustForm({
      code: c.code, name: c.name, contactPerson: c.contactPerson,
      email: c.email || '', phone: c.phone || '', address: c.address || '',
      gst: c.gst || '', city: c.city || '', state: c.state || '', status: c.status,
    });
    setSelectedCustId(c.id);
    setCustEditOpen(true);
  };
  const openCustDelete = (id: string) => { setSelectedCustId(id); setCustDeleteOpen(true); };

  const handleCustSubmit = async (mode: 'create' | 'edit') => {
    if (!custForm.name.trim()) { toast.error('Customer name is required'); return; }
    setSubmitting(true);
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { type: 'customer', id: selectedCustId, ...custForm } : { type: 'customer', ...custForm };
      const res = await fetch('/api/sales', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Customer created successfully' : 'Customer updated successfully');
        if (mode === 'create') setCustCreateOpen(false); else setCustEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode} customer`); }
    } catch { toast.error(`Failed to ${mode} customer`); }
    finally { setSubmitting(false); }
  };

  const handleCustDelete = async () => {
    if (!selectedCustId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/sales', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'customer', id: selectedCustId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Customer deleted successfully');
        setCustDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete customer'); }
    } catch { toast.error('Failed to delete customer'); }
    finally { setSubmitting(false); }
  };

  // ── Order Handlers ──
  const openOrderCreate = () => { setOrderForm(emptyOrderForm); setOrderCreateOpen(true); };
  const openOrderEdit = (o: SalesOrder) => {
    setOrderForm({
      customer: o.customer, project: o.project, item: o.item,
      quantity: String(o.quantity), unitPrice: String(o.unitPrice),
      orderDate: o.orderDate, deliveryDate: o.deliveryDate || '', status: o.status,
    });
    setSelectedOrderId(o.id);
    setOrderEditOpen(true);
  };
  const openOrderDelete = (id: string) => { setSelectedOrderId(id); setOrderDeleteOpen(true); };

  const handleOrderSubmit = async (mode: 'create' | 'edit') => {
    if (!orderForm.customer.trim() || !orderForm.item.trim()) { toast.error('Customer and item are required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...orderForm,
        quantity: parseInt(orderForm.quantity) || 0,
        unitPrice: parseFloat(orderForm.unitPrice) || 0,
      };
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { type: 'order', id: selectedOrderId, ...payload } : { type: 'order', ...payload };
      const res = await fetch('/api/sales', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Sales order created successfully' : 'Sales order updated successfully');
        if (mode === 'create') setOrderCreateOpen(false); else setOrderEditOpen(false);
        fetchData();
      } else { toast.error(json.error || `Failed to ${mode} sales order`); }
    } catch { toast.error(`Failed to ${mode} sales order`); }
    finally { setSubmitting(false); }
  };

  const handleOrderDelete = async () => {
    if (!selectedOrderId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/sales', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'order', id: selectedOrderId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Sales order deleted successfully');
        setOrderDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete sales order'); }
    } catch { toast.error('Failed to delete sales order'); }
    finally { setSubmitting(false); }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <TrendingUp size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  // ── Customer Dialog content shared between create and edit ──
  const custDialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Customer Name" span>
        <input className={inputCls} value={custForm.name} onChange={e => setCustForm(f => ({ ...f, name: e.target.value }))} placeholder="NTPC Limited" />
      </FormField>
      <FormField label="Contact Person">
        <input className={inputCls} value={custForm.contactPerson} onChange={e => setCustForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Ramesh Sharma" />
      </FormField>
      <FormField label="Email">
        <input className={inputCls} type="email" value={custForm.email} onChange={e => setCustForm(f => ({ ...f, email: e.target.value }))} placeholder="ramesh@ntpc.co.in" />
      </FormField>
      <FormField label="Phone">
        <input className={inputCls} value={custForm.phone} onChange={e => setCustForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
      </FormField>
      <FormField label="GST Number">
        <input className={inputCls} value={custForm.gst} onChange={e => setCustForm(f => ({ ...f, gst: e.target.value }))} placeholder="29AABCN1234A1Z5" />
      </FormField>
      <FormField label="City">
        <input className={inputCls} value={custForm.city} onChange={e => setCustForm(f => ({ ...f, city: e.target.value }))} placeholder="New Delhi" />
      </FormField>
      <FormField label="State">
        <input className={inputCls} value={custForm.state} onChange={e => setCustForm(f => ({ ...f, state: e.target.value }))} placeholder="Delhi" />
      </FormField>
      <FormField label="Status">
        <select className={selectCls} value={custForm.status} onChange={e => setCustForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </FormField>
      <FormField label="Address" span>
        <input className={inputCls} value={custForm.address} onChange={e => setCustForm(f => ({ ...f, address: e.target.value }))} placeholder="A-12 Connaught Place, New Delhi" />
      </FormField>
    </div>
  );

  // ── Order Dialog content shared between create and edit ──
  const orderDialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Customer" span>
        <select className={selectCls} value={orderForm.customer} onChange={e => setOrderForm(f => ({ ...f, customer: e.target.value }))}>
          <option value="">Select customer</option>
          {customers.filter(c => c.status?.toLowerCase() === 'active').map(c => <option key={c.id} value={c.name}>{c.code} — {c.name}</option>)}
        </select>
      </FormField>
      <FormField label="Project">
        <input className={inputCls} value={orderForm.project} onChange={e => setOrderForm(f => ({ ...f, project: e.target.value }))} placeholder="Thermal Power Plant" />
      </FormField>
      <FormField label="Item">
        <input className={inputCls} value={orderForm.item} onChange={e => setOrderForm(f => ({ ...f, item: e.target.value }))} placeholder="Boiler Tube Assembly" />
      </FormField>
      <FormField label="Quantity">
        <input className={inputCls} type="number" value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
      </FormField>
      <FormField label="Unit Price (₹)">
        <input className={inputCls} type="number" value={orderForm.unitPrice} onChange={e => setOrderForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0" />
      </FormField>
      <FormField label="Order Date">
        <input className={inputCls} type="date" value={orderForm.orderDate} onChange={e => setOrderForm(f => ({ ...f, orderDate: e.target.value }))} />
      </FormField>
      <FormField label="Delivery Date">
        <input className={inputCls} type="date" value={orderForm.deliveryDate} onChange={e => setOrderForm(f => ({ ...f, deliveryDate: e.target.value }))} />
      </FormField>
      <FormField label="Status">
        <select className={selectCls} value={orderForm.status} onChange={e => setOrderForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Tabs ── */}
      <div className="flex items-center gap-2">
        <TabButton active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={Users} label="Customers" />
        <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={ShoppingCart} label="Sales Orders" />
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* ── CUSTOMERS TAB ── */}
      {/* ════════════════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <>
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Customers" value={customers.length} color="#f5a623" sub="All customers" />
            <StatCard icon={CheckCircle} label="Active" value={activeCustomers} color="#00e676" sub="Currently active" />
            <StatCard icon={ShoppingCart} label="Total Orders" value={totalOrders} color="#00d4ff" sub="All time" />
            <StatCard icon={IndianRupee} label="Total Revenue" value={formatCr(totalRevenue)} color="#a78bfa" sub="All time revenue" />
          </div>

          <div className="vc-panel">
            <div className="vc-panel-header">
              <Users size={15} className="text-[#f5a623]" />
              <span className="text-[12px] font-bold text-[#e2e8f0]">Customers</span>
              <span className="ml-auto text-[10px] text-[#5a6878]">{customers.length} customers</span>
              <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCustCreate}>
                <Plus size={13} /> New Customer
              </button>
            </div>

            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
                <Users size={36} className="mb-2 opacity-40" />
                <p className="text-[12px]">No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                      {['Code', 'Name', 'Contact Person', 'Email', 'Phone', 'City', 'State', 'GST', 'Orders', 'Revenue', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((cust) => (
                      <tr key={cust.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                        <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{cust.code}</td>
                        <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[160px] truncate font-medium">{cust.name}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{cust.contactPerson}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[140px] truncate">{cust.email || '—'}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{cust.phone || '—'}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{cust.city || '—'}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap">{cust.state || '—'}</td>
                        <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap max-w-[120px] truncate">{cust.gst || '—'}</td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#00d4ff]">{cust.totalOrders}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#00e676]">{formatCr(cust.totalRevenue)}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap">
                          <span className={`vc-badge border ${customerStatusColor(cust.status)}`}>{cust.status}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openCustEdit(cust)}><Pencil size={13} /></button>
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openCustDelete(cust.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* ── ORDERS TAB ── */}
      {/* ════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <>
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ShoppingCart} label="Total Orders" value={orders.length} color="#f5a623" sub="All sales orders" />
            <StatCard icon={Clock} label="In Progress" value={inProgressOrders} color="#00d4ff" sub="Currently processing" />
            <StatCard icon={CheckCircle} label="Completed" value={completedOrders} color="#00e676" sub="Delivered orders" />
            <StatCard icon={IndianRupee} label="Total Value" value={formatCr(totalOrderValue)} color="#a78bfa" sub="All orders value" />
          </div>

          <div className="vc-panel">
            <div className="vc-panel-header">
              <ShoppingCart size={15} className="text-[#f5a623]" />
              <span className="text-[12px] font-bold text-[#e2e8f0]">Sales Orders</span>
              <span className="ml-auto text-[10px] text-[#5a6878]">{orders.length} orders</span>
              <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openOrderCreate}>
                <Plus size={13} /> New Order
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
                <ShoppingCart size={36} className="mb-2 opacity-40" />
                <p className="text-[12px]">No sales orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                      {['SO No', 'Customer', 'Project', 'Item', 'Qty', 'Unit Price', 'Amount', 'Order Date', 'Delivery Date', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                        <td className="px-3 py-[10px] font-semibold text-[#f5a623] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{order.soNo}</td>
                        <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[140px] truncate font-medium">{order.customer}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[130px] truncate">{order.project}</td>
                        <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[130px] truncate">{order.item}</td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#00d4ff]">{order.quantity}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#8899aa]">₹{formatCurrency(order.unitPrice)}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-[#00e676]">₹{formatCurrency(order.amount)}</span>
                        </td>
                        <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(order.orderDate)}</td>
                        <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(order.deliveryDate || '')}</td>
                        <td className="px-3 py-[10px] whitespace-nowrap">
                          <span className={`vc-badge border ${orderStatusColor(order.status)}`}>{order.status}</span>
                        </td>
                        <td className="px-3 py-[10px] whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openOrderEdit(order)}><Pencil size={13} /></button>
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openOrderDelete(order.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* ── CUSTOMER DIALOGS ── */}
      {/* ════════════════════════════════════════════════ */}

      {/* ── Create Customer Dialog ── */}
      <Dialog open={custCreateOpen} onOpenChange={setCustCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Customer</DialogTitle></DialogHeader>
          {custDialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCustCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleCustSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Customer Dialog ── */}
      <Dialog open={custEditOpen} onOpenChange={setCustEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Customer</DialogTitle></DialogHeader>
          {custDialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCustEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleCustSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Customer Dialog ── */}
      <Dialog open={custDeleteOpen} onOpenChange={setCustDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Customer</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this customer?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated sales orders will also be affected.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCustDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleCustDelete}>
              {submitting ? 'Deleting...' : 'Delete Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════ */}
      {/* ── ORDER DIALOGS ── */}
      {/* ════════════════════════════════════════════════ */}

      {/* ── Create Order Dialog ── */}
      <Dialog open={orderCreateOpen} onOpenChange={setOrderCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Sales Order</DialogTitle></DialogHeader>
          {orderDialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setOrderCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleOrderSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Order Dialog ── */}
      <Dialog open={orderEditOpen} onOpenChange={setOrderEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Sales Order</DialogTitle></DialogHeader>
          {orderDialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setOrderEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleOrderSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Order Dialog ── */}
      <Dialog open={orderDeleteOpen} onOpenChange={setOrderDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Sales Order</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this sales order?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setOrderDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleOrderDelete}>
              {submitting ? 'Deleting...' : 'Delete Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
