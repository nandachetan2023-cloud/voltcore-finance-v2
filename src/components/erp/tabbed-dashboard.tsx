'use client';

import React, { useState } from 'react';
import {
  LogIn, Layers, ShoppingCart, Package, BadgePercent, Landmark, Wallet,
  FolderKanban, ShieldCheck, PieChart,
} from 'lucide-react';
import { useERPStore, isModuleAllowed } from '@/store/erp-store';
import { ModuleRenderer } from '@/components/erp/module-registry';

interface ScreenRef { key: string; label: string; }
interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  screens: ScreenRef[];
}

// NOTE: HRMS / Organization / Settings modules are intentionally excluded per scope.
const CATEGORIES: Category[] = [
  {
    id: 'login-role', label: 'Login & Role', icon: LogIn,
    screens: [
      { key: 'finance-dashboard', label: 'Dashboard' },
    ],
  },
  {
    id: 'masters', label: 'Master Setup', icon: Layers,
    screens: [
      { key: 'fin-sites', label: 'Sites' },
      { key: 'fin-jobs', label: 'Jobs (PO-wise)' },
      { key: 'fin-parties', label: 'Clients & Vendors' },
      { key: 'procurement-vendors', label: 'Vendor Management' },
      { key: 'chart-of-accounts', label: 'Chart of Accounts' },
    ],
  },
  {
    id: 'purchase', label: 'Purchase', icon: ShoppingCart,
    screens: [
      { key: 'procurement-pr', label: 'Purchase Requisition' },
      { key: 'procurement-rfq', label: 'RFQ Management' },
      { key: 'rfq-comparison-matrix', label: 'Quotation Comparison' },
      { key: 'procurement-po-register', label: 'PO Register' },
      { key: 'po-approval-stepper', label: 'PO Approval' },
      { key: 'grn-3way-match', label: 'GRN 3-Way Match' },
      { key: 'accounts-payable', label: 'Purchase Bills (AP)' },
    ],
  },
  {
    id: 'inventory', label: 'Inventory', icon: Package,
    screens: [
      { key: 'site-store', label: 'Site Store Management' },
      { key: 'material-receipt', label: 'Material Receipt' },
      { key: 'material-issue-wip', label: 'Material Issue → WIP' },
      { key: 'stock-ledger', label: 'Stock Ledger' },
      { key: 'scrap-entry', label: 'Scrap Entry' },
    ],
  },
  {
    id: 'sales', label: 'Sales & Billing', icon: BadgePercent,
    screens: [
      { key: 'sales-orders', label: 'Sales Orders' },
      { key: 'sales-quotations', label: 'Quotations' },
      { key: 'ra-work-slider', label: 'RA %-Work Billing' },
      { key: 'sales-tax-invoices', label: 'Tax Invoices' },
      { key: 'receipt-entry', label: 'Receipt Entry' },
    ],
  },
  {
    id: 'finance', label: 'Finance & Accounts', icon: Landmark,
    screens: [
      { key: 'ledger', label: 'Ledger' },
      { key: 'accounts-payable', label: 'Accounts Payable' },
      { key: 'accounts-receivable', label: 'Accounts Receivable' },
      { key: 'bank-cash', label: 'Bank & Cash' },
      { key: 'fin-bank-reconciliation', label: 'Bank Reconciliation' },
      { key: 'journal-entries', label: 'Journal Entries' },
      { key: 'taxation', label: 'GST / TDS' },
      { key: 'fin-profit-loss', label: 'Profit & Loss' },
      { key: 'financial-reports', label: 'Balance Sheet / Reports' },
    ],
  },
  {
    id: 'petty-cash', label: 'Petty Cash', icon: Wallet,
    screens: [
      { key: 'fin-petty-cash-custodian', label: 'Custodian Dashboard' },
      { key: 'fin-petty-cash', label: 'Vouchers' },
      { key: 'fin-petty-cash-approval-queue', label: 'Approval Queue' },
      { key: 'fin-petty-cash-replenishment', label: 'Replenishment' },
    ],
  },
  {
    id: 'project', label: 'Project / Job', icon: FolderKanban,
    screens: [
      { key: 'budget', label: 'Budget vs Actual' },
      { key: 'boq-entry', label: 'BOQ' },
      { key: 'job-progress', label: 'Job Progress' },
    ],
  },
  {
    id: 'rbac', label: 'RBAC / Admin', icon: ShieldCheck,
    screens: [
      { key: 'role-management', label: 'Role Management' },
      { key: 'fin-user-management', label: 'User Management' },
      { key: 'audit-trail-viewer', label: 'Audit Trail' },
    ],
  },
  {
    id: 'mis', label: 'MIS', icon: PieChart,
    screens: [
      { key: 'report-drilldown', label: 'Site / Job P&L Drill-down' },
      { key: 'po-cost-tree', label: 'PO Cost Tree' },
      { key: 'customer-profitability', label: 'Customer Profitability' },
      { key: 'financial-reports', label: 'Financial Reports' },
    ],
  },
];

export default function TabbedDashboard() {
  const { allowedModules } = useERPStore();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);

  // Filter categories and their screens by access. The Finance Dashboard tab
  // used to be exempt ("always keep Dashboard"), which kept Finance figures on
  // the home screen even after Finance was hidden for the role/tenant — it now
  // follows the same access rules as every other screen.
  const visibleCategories = CATEGORIES
    .map((cat) => {
      const screens = cat.screens.filter((s) => isModuleAllowed(s.key, allowedModules));
      return { ...cat, screens };
    })
    .filter((cat) => cat.screens.length > 0);

  const current = visibleCategories.find((c) => c.id === activeCategory) || visibleCategories[0];
  const currentScreenKey = activeScreen
    && current?.screens.some((s) => s.key === activeScreen)
    ? activeScreen
    : current?.screens[0]?.key;

  const selectCategory = (id: string) => {
    setActiveCategory(id);
    setActiveScreen(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Category tab bar */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-2 flex items-center gap-1 overflow-x-auto">
        {visibleCategories.map((cat) => {
          const Icon = cat.icon;
          const active = cat.id === current?.id;
          return (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              className={`flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                active ? 'bg-[#f5a623] text-black' : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1a2028]'
              }`}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab bar (screens within the active category) */}
      {current && (
        <div className="flex items-center gap-1 flex-wrap">
          {current.screens.map((s) => {
            const active = s.key === currentScreenKey;
            return (
              <button
                key={s.key}
                onClick={() => setActiveScreen(s.key)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors border ${
                  active
                    ? 'bg-[#f5a623]/10 border-[#f5a623]/40 text-[#f5a623]'
                    : 'border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0] hover:border-[#3a4656]'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Active screen body */}
      <div className="bg-[#12161d] border border-[#252e3a] rounded-xl p-2 min-h-[60vh]">
        {currentScreenKey ? (
          <ModuleRenderer key={currentScreenKey} moduleKey={currentScreenKey} />
        ) : (
          <div className="flex items-center justify-center h-40 text-[12px] text-[#5a6878]">
            No screens available in this category.
          </div>
        )}
      </div>
    </div>
  );
}
