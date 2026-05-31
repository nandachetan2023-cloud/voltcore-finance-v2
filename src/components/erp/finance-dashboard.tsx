'use client';

import React from 'react';
import {
  DollarSign, TrendingUp, AlertCircle, TrendingDown,
  ArrowUpRight, Package, Banknote,
  Calendar, Users, FileText, PieChart, Plus
} from 'lucide-react';
import { useERPStore } from '@/store/erp-store';

/* ── Types ────────────────────────────────────────── */
interface KPI {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change: string;
  isPositive: boolean;
}

export default function FinancialHome() {
  const { setActiveModule } = useERPStore();
  const kpis: KPI[] = [
    { label: 'Total Invoices', value: '₹1.42 Cr', icon: DollarSign, change: '+12%', isPositive: true },
    { label: 'Outstanding AR', value: '₹28.4 L', icon: TrendingDown, change: '+8%', isPositive: false },
    { label: 'Payments Received', value: '₹1.14 Cr', icon: TrendingUp, change: '+15%', isPositive: true },
    { label: 'Pending Alerts', value: '3', icon: AlertCircle, change: '2 new', isPositive: false },
  ];

  return (
    <div className="text-[#e2e8f0]">
      {/* Header Banner */}
      <div className="h-32 bg-gradient-to-r from-[#f5a623]/10 to-[#e8891a]/10 border-b border-[#252e3a] relative overflow-hidden rounded-xl mb-6">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 w-64 h-64 bg-[#f5a623] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-[#e8891a] rounded-full blur-3xl" />
        </div>
        <div className="relative h-full flex items-center px-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[#f5a623] tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              FINANCIAL OVERVIEW
            </h1>
            <p className="text-[#8899aa] text-sm tracking-wider">VoltCore Engineering Pvt Ltd • Period: FY 2024-25</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="vc-stat-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: kpi.isPositive ? '#00e676' : '#ff3d3d' }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">{kpi.label}</div>
                  <div className="text-[22px] font-bold leading-none text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{kpi.value}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#f5a623]/10">
                  <Icon size={18} className="text-[#f5a623]" />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-2 text-[10px] font-medium ${kpi.isPositive ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                {kpi.isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {kpi.change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#161c24] border border-[#252e3a]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
                <FileText size={20} className="text-[#f5a623]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#e2e8f0]">Quick Actions</div>
                <div className="text-[#8899aa] text-xs">Create invoice, payment, voucher</div>
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <button onClick={() => setActiveModule('fin-invoices')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] text-sm hover:bg-[#f5a623]/20 transition-colors">
                <Plus size={16} />
                Create Invoice
              </button>
              <button onClick={() => setActiveModule('accounts-payable')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252e3a] border border-[#252e3a] text-[#e2e8f0] text-sm hover:bg-[#2a3545] transition-colors">
                <Plus size={16} />
                Payment
              </button>
              <button onClick={() => setActiveModule('create-journal-entry')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252e3a] border border-[#252e3a] text-[#e2e8f0] text-sm hover:bg-[#2a3545] transition-colors">
                <Plus size={16} />
                Voucher
              </button>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
              <PieChart size={20} className="text-[#f5a623]" />
              Financial Summary
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0d12]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#252e3a] flex items-center justify-center">
                    <Package size={20} className="text-[#8899aa]" />
                  </div>
                  <div>
                    <div className="text-sm text-[#8899aa]">Total POs Raised</div>
                    <div className="text-lg font-semibold text-[#e2e8f0]">₹84.72 L</div>
                  </div>
                </div>
                <div className="text-[#00e676] font-medium text-lg">₹35.04 L</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0d12]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#252e3a] flex items-center justify-center">
                    <Banknote size={20} className="text-[#8899aa]" />
                  </div>
                  <div>
                    <div className="text-sm text-[#8899aa]">Total Payments Made</div>
                    <div className="text-lg font-semibold text-[#e2e8f0]">₹53.01 L</div>
                  </div>
                </div>
                <div className="text-[#e2e8f0] font-medium text-lg">62%</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0d12]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#252e3a] flex items-center justify-center">
                    <Users size={20} className="text-[#8899aa]" />
                  </div>
                  <div>
                    <div className="text-sm text-[#8899aa]">Vendors with Invoices</div>
                    <div className="text-lg font-semibold text-[#e2e8f0]">10 Active</div>
                  </div>
                </div>
                <div className="text-[#f5a623] font-medium text-lg">Stable</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0d12]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#252e3a] flex items-center justify-center">
                    <Calendar size={20} className="text-[#8899aa]" />
                  </div>
                  <div>
                    <div className="text-sm text-[#8899aa]">Month-to-Date Activity</div>
                    <div className="text-lg font-semibold text-[#e2e8f0]">20 Transactions</div>
                  </div>
                </div>
                <div className="text-[#00e676] font-medium text-lg">8% above avg</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Alerts & Quick Links */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-[#f5a623]" />
                Alerts
              </div>
              <span className="text-xs bg-[#ff3d3d] text-white px-2 py-1 rounded-full">3</span>
            </h2>

            <div className="space-y-3">
              {[
                { type: 'Overdue', desc: 'JSW Steel HSM AMC payment overdue', amount: '₹25 L', urgent: true },
                { type: 'Approaching Due', desc: 'SKF India bill due in 5 days', amount: '₹8.49 L', urgent: false },
                { type: 'Payment Received', desc: 'Hindalco smelter maintenance paid', amount: '₹50 L', urgent: false },
                { type: 'Pending Approval', desc: 'ABB India switchgear bill needs review', amount: '₹20 L', urgent: false },
              ].map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${alert.urgent ? 'bg-[#ff3d3d]/10 border border-[#ff3d3d]/30' : 'bg-[#0a0d12] border border-[#252e3a]'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${alert.urgent ? 'bg-[#ff3d3d]/20 text-[#ff3d3d]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                      <AlertCircle size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${alert.urgent ? 'text-[#ff3d3d]' : 'text-[#f59e0b]'} capitalize`}>{alert.type}</span>
                        <span className="text-xs text-[#8899aa]">{alert.amount}</span>
                      </div>
                      <p className="text-xs text-[#e2e8f0] mt-1 truncate">{alert.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#f5a623]" />
              Quick Links
            </h2>

            <div className="space-y-3">
              {[
                { label: 'Accounts Payable', icon: Package, badge: 10, module: 'accounts-payable' },
                { label: 'Accounts Receivable', icon: DollarSign, badge: 10, module: 'accounts-receivable' },
                { label: 'Bank & Cash', icon: Banknote, badge: 3, module: 'bank-cash' },
                { label: 'Journal Entries', icon: FileText, badge: 20, module: 'journal-entries' },
                { label: 'Budget', icon: PieChart, badge: 8, module: 'budget' },
              ].map((link, i) => {
                const Icon = link.icon;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveModule(link.module as any)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0d12] hover:bg-[#252e3a] transition-colors group cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-lg bg-[#f5a623]/10 flex items-center justify-center group-hover:bg-[#f5a623]/20 transition-colors">
                      <Icon size={18} className="text-[#f5a623]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#e2e8f0]">{link.label}</div>
                      <div className="flex items-center gap-2 text-[#8899aa] text-xs">
                        <span>{link.badge} items</span>
                      </div>
                    </div>
                    <ArrowUpRight size={16} className="text-[#5a6878] group-hover:text-[#f5a623] transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Updated */}
          <div className="p-4 rounded-lg bg-[#161c24] border border-[#252e3a]">
            <div className="flex items-center gap-2 text-xs text-[#8899aa]">
              <Calendar size={14} />
              Last Updated: {new Date().toLocaleDateString('en-IN')}
            </div>
            <div className="text-[#00e676] text-xs mt-1">✓ Data synced successfully</div>
          </div>
        </div>
      </div>
    </div>
  );
}
