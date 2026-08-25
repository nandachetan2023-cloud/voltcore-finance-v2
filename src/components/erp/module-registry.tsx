'use client';

import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';

// Map of module key to import path — compiled ONLY when the module is rendered
const MODULE_PATHS: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  dashboard: () => import('@/components/erp/dashboard'),
  employees: () => import('@/components/erp/employees'),
  departments: () => import('@/components/erp/departments'),
  designations: () => import('@/components/erp/designations'),
  holidays: () => import('@/components/erp/holidays'),
  'leave-policies': () => import('@/components/erp/leave-policies'),
  'attendance-rules': () => import('@/components/erp/attendance-rules'),
  attendance: () => import('@/components/erp/attendance'),
  leave: () => import('@/components/erp/leave'),
  'tour-requests': () => import('@/components/erp/tour-requests'),
  shift: () => import('@/components/erp/shift-roster'),
  training: () => import('@/components/erp/training'),
  recruitment: () => import('@/components/erp/recruitment'),
  purchases: () => import('@/components/erp/purchases'),
  'procurement-pr': () => import('@/components/erp/procurement-pr'),
  'procurement-rfq': () => import('@/components/erp/procurement-rfq'),
  'procurement-po-register': () => import('@/components/erp/procurement-po-register'),
  'procurement-vendors': () => import('@/components/erp/procurement-vendors'),
  'procurement-material-tracking': () => import('@/components/erp/procurement-material-tracking'),
  'procurement-subcontracts': () => import('@/components/erp/procurement-subcontracts'),
  'po-approval-stepper': () => import('@/components/erp/po-approval-stepper'),
  'rfq-comparison-matrix': () => import('@/components/erp/rfq-comparison-matrix'),
  'grn-3way-match': () => import('@/components/erp/grn-3way-match'),
  'stock-ledger': () => import('@/components/erp/stock-ledger'),
  'material-issue-wip': () => import('@/components/erp/material-issue-wip'),
  'scrap-entry': () => import('@/components/erp/scrap-entry'),
  'site-store': () => import('@/components/erp/site-store'),
  'ra-work-slider': () => import('@/components/erp/ra-work-slider'),
  'boq-entry': () => import('@/components/erp/boq-entry'),
  'job-progress': () => import('@/components/erp/job-progress'),
  'report-drilldown': () => import('@/components/erp/report-drilldown'),
  'po-cost-tree': () => import('@/components/erp/po-cost-tree'),
  'customer-profitability': () => import('@/components/erp/customer-profitability'),
  expenses: () => import('@/components/erp/expenses'),
  payroll: () => import('@/components/erp/payroll-unified'),
  'payroll-generate': () => import('@/components/erp/payroll-generate'),
  invoices: () => import('@/components/erp/invoices'),
  projects: () => import('@/components/erp/projects'),
  sites: () => import('@/components/erp/sites'),
  equipment: () => import('@/components/erp/equipment'),
  permits: () => import('@/components/erp/permits'),
  safety: () => import('@/components/erp/safety'),
  subcontractors: () => import('@/components/erp/subcontractors'),
  reports: () => import('@/components/erp/reports'),
  settings: () => import('@/components/erp/settings'),
  organization: () => import('@/components/erp/organization'),
  'employee-analytics': () => import('@/components/erp/employee-analytics'),
  timesheet: () => import('@/components/erp/timesheet'),
  'finance-dashboard': () => import('@/components/erp/finance-dashboard'),
  'create-journal-entry': () => import('@/components/erp/create-journal-entry'),
  'fin-sites': () => import('@/components/erp/fin-sites'),
  'fin-jobs': () => import('@/components/erp/fin-jobs'),
  'fin-parties': () => import('@/components/erp/fin-parties'),
  'fin-invoices': () => import('@/components/erp/fin-invoices'),
  'fin-purchase-orders': () => import('@/components/erp/fin-purchase-orders'),
  'fin-work-orders': () => import('@/components/erp/fin-work-orders'),
  'fin-petty-cash': () => import('@/components/erp/fin-petty-cash'),
  'fin-user-management': () => import('@/components/erp/fin-user-management'),
  'fin-petty-cash-custodian': () => import('@/components/erp/fin-petty-cash-custodian'),
  'fin-petty-cash-approval-queue': () => import('@/components/erp/fin-petty-cash-approval-queue'),
  'fin-petty-cash-replenishment': () => import('@/components/erp/fin-petty-cash-replenishment'),
  'fin-payment-advices': () => import('@/components/erp/fin-payment-advices'),
  'fin-payments': () => import('@/components/erp/fin-payments'),
  'fin-assets': () => import('@/components/erp/fin-assets'),
  'fin-profit-loss': () => import('@/components/erp/fin-profit-loss'),
  'fin-expense-claims': () => import('@/components/erp/fin-expense-claims'),
  'fin-site-expenses': () => import('@/components/erp/fin-site-expenses'),
  'fin-credit-notes': () => import('@/components/erp/fin-credit-notes'),
  'fin-bank-reconciliation': () => import('@/components/erp/fin-bank-reconciliation'),
  'sales-tax-invoices': () => import('@/components/erp/sales-tax-invoices'),
  'sales-opportunity-pipeline': () => import('@/components/erp/sales-opportunity-pipeline'),
  'sales-tender-register': () => import('@/components/erp/sales-tender-register'),
  'sales-revenue-forecast': () => import('@/components/erp/sales-revenue-forecast'),
  'sales-client-accounts': () => import('@/components/erp/sales-client-accounts'),
  'sales-orders': () => import('@/components/erp/sales-orders'),
  'sales-quotations': () => import('@/components/erp/sales-quotations'),
  'receipt-entry': () => import('@/components/erp/receipt-entry'),
  'material-receipt': () => import('@/components/erp/material-receipt'),
  ledger: () => import('@/components/erp/ledger'),
  'chart-of-accounts': () => import('@/components/erp/chart-of-accounts'),
  'accounts-payable': () => import('@/components/erp/accounts-payable'),
  'accounts-receivable': () => import('@/components/erp/accounts-receivable'),
  'journal-entries': () => import('@/components/erp/journal-entries'),
  'bank-cash': () => import('@/components/erp/bank-cash'),
  taxation: () => import('@/components/erp/taxation'),
  budget: () => import('@/components/erp/budget'),
  'financial-reports': () => import('@/components/erp/financial-reports'),
  'fin-client-follow-up': () => import('@/components/erp/fin-client-follow-up'),
  'project-list': () => import('@/components/erp/projects'),
  'project-hierarchy': () => import('@/components/erp/project-hierarchy'),
  biometric: () => import('@/components/erp/biometric'),
  trash: () => import('@/components/erp/trash'),
  'user-management': () => import('@/components/erp/user-management'),
  'onboarding-approvals': () => import('@/components/erp/onboarding-approvals'),
  'my-attendance': () => import('@/components/erp/my-attendance'),
  'my-leave': () => import('@/components/erp/my-leave'),
  'my-tours': () => import('@/components/erp/my-tours'),
  'my-requests': () => import('@/components/erp/my-requests'),
  'requests': () => import('@/components/erp/admin-requests'),
  'checklist-templates': () => import('@/components/erp/checklist-templates'),
  'onboarding': () => import('@/components/erp/onboarding'),
  'offboarding': () => import('@/components/erp/offboarding'),
  'exit-management': () => import('@/components/erp/exit-management'),
  'employee-documents': () => import('@/components/erp/employee-documents'),
  'notice-board':  () => import('@/components/erp/notice-board'),
  'my-profile':    () => import('@/components/erp/my-profile'),
  'my-notices':    () => import('@/components/erp/my-notices'),
  'my-payslips':   () => import('@/components/erp/my-payslips'),
  'my-documents':  () => import('@/components/erp/my-documents'),
  'my-shifts':     () => import('@/components/erp/my-shifts'),
  'report-manpower':   () => import('@/components/erp/report-manpower'),
  'report-attendance': () => import('@/components/erp/report-attendance'),
  'report-payroll':    () => import('@/components/erp/report-payroll'),
  'report-leave':      () => import('@/components/erp/report-leave'),
  'report-late-fine':  () => import('@/components/erp/report-late-fine'),
  'report-onboarding': () => import('@/components/erp/report-onboarding'),
  'report-turnover':   () => import('@/components/erp/report-turnover'),
  'report-training':   () => import('@/components/erp/report-training'),
  'report-notices':    () => import('@/components/erp/report-notices'),
  'report-dispatch':   () => import('@/components/erp/report-dispatch'),
};

// Cache React.lazy components to prevent re-creation on re-renders
const lazyCache = new Map<string, React.LazyExoticComponent<React.ComponentType>>();

function getLazyComponent(moduleKey: string): React.LazyExoticComponent<React.ComponentType> | null {
  if (lazyCache.has(moduleKey)) return lazyCache.get(moduleKey)!;
  const loader = MODULE_PATHS[moduleKey];
  if (!loader) return null;
  const LazyComp = React.lazy(loader);
  lazyCache.set(moduleKey, LazyComp);
  return LazyComp;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
        <span className="text-[11px] text-[#5a6878]">Loading module...</span>
      </div>
    </div>
  );
}

export const ModuleRenderer = React.memo(function ModuleRenderer({ moduleKey }: { moduleKey: string }) {
  const LazyComp = getLazyComponent(moduleKey);

  if (!LazyComp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="text-[12px] text-[#5a6878]">Module not found: {moduleKey}</span>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComp />
    </Suspense>
  );
});
