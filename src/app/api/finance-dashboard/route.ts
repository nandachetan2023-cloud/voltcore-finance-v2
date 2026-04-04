import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      payroll,
      invoices,
      expenses,
      purchaseOrders,
      accountsPayable,
      accountsReceivable,
      budgetItems,
      bankAccounts,
      journalEntries,
    ] = await Promise.all([
      db.payroll.findMany(),
      db.invoice.findMany(),
      db.expense.findMany(),
      db.purchaseOrder.findMany(),
      db.accountsPayable.findMany(),
      db.accountsReceivable.findMany(),
      db.budgetItem.findMany(),
      db.bankAccount.findMany(),
      db.journalEntry.findMany({ orderBy: { date: 'desc' }, take: 20 }),
    ]);

    // ── KPI Calculations ──

    // Payroll
    const totalPayrollPaid = payroll
      .filter(p => p.status === 'Processed')
      .reduce((s, p) => s + p.netPay, 0);
    const totalPayrollPending = payroll
      .filter(p => p.status === 'Pending')
      .reduce((s, p) => s + p.netPay, 0);
    const totalPayrollGross = payroll.reduce((s, p) => s + p.gross, 0);

    // Invoices — parse Indian format amounts (e.g., "₹12,45,00,000")
    function parseIndianAmount(str: string): number {
      if (!str) return 0;
      const cleaned = str.replace(/[₹,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    const totalInvoiced = invoices.reduce((s, i) => s + parseIndianAmount(i.amount), 0);
    const totalReceived = accountsReceivable
      .filter(a => a.status === 'Received')
      .reduce((s, a) => s + a.amount, 0);

    // Accounts Receivable
    const arPending = accountsReceivable
      .filter(a => a.status === 'Pending')
      .reduce((s, a) => s + a.amount, 0);
    const arReceived = accountsReceivable
      .filter(a => a.status === 'Received')
      .reduce((s, a) => s + a.amount, 0);
    const arOverdue = accountsReceivable
      .filter(a => a.status === 'Pending' && new Date(a.dueDate) < new Date())
      .reduce((s, a) => s + a.amount, 0);

    // Accounts Payable
    const apPending = accountsPayable
      .filter(a => a.status === 'Pending')
      .reduce((s, a) => s + a.amount, 0);
    const apPaid = accountsPayable
      .filter(a => a.status === 'Paid')
      .reduce((s, a) => s + a.amount, 0);
    const apOverdue = accountsPayable
      .filter(a => a.status === 'Overdue' || (a.status === 'Pending' && new Date(a.dueDate) < new Date()))
      .reduce((s, a) => s + a.amount, 0);

    // Expenses
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalExpensesPending = expenses
      .filter(e => e.status === 'Pending')
      .reduce((s, e) => s + e.amount, 0);
    const totalExpensesApproved = expenses
      .filter(e => e.status === 'Approved')
      .reduce((s, e) => s + e.amount, 0);

    // Purchase Orders
    const totalPOValue = purchaseOrders.reduce((s, po) => s + po.amount, 0);
    const totalPOOpen = purchaseOrders
      .filter(po => po.status === 'Open')
      .reduce((s, po) => s + po.amount, 0);

    // Bank Balance
    const totalBankBalance = bankAccounts
      .filter(b => b.status === 'Active')
      .reduce((s, b) => s + b.balance, 0);

    // Budget
    const totalBudgetPlanned = budgetItems.reduce((s, b) => s + b.planned, 0);
    const totalBudgetActual = budgetItems.reduce((s, b) => s + b.actual, 0);
    const budgetVariance = totalBudgetPlanned - totalBudgetActual;

    // ── Monthly Trend Data (Revenue vs Expenses) ──
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Group payroll by month
    const payrollByMonth: Record<string, number> = {};
    payroll.forEach(p => {
      if (p.month) {
        const parts = p.month.split('-');
        if (parts.length === 2) {
          const mi = parseInt(parts[1], 10) - 1;
          const key = `${monthNames[mi]} ${parts[0]}`;
          payrollByMonth[key] = (payrollByMonth[key] || 0) + p.gross;
        }
      }
    });

    // Group expenses by month
    const expenseByMonth: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date) {
        const d = new Date(e.date);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        expenseByMonth[key] = (expenseByMonth[key] || 0) + e.amount;
      }
    });

    // Group AR received by month
    const arByMonth: Record<string, number> = {};
    accountsReceivable.filter(a => a.status === 'Received' && a.receivedDate).forEach(a => {
      const d = new Date(a.receivedDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      arByMonth[key] = (arByMonth[key] || 0) + a.amount;
    });

    // Group AP paid by month
    const apByMonth: Record<string, number> = {};
    accountsPayable.filter(a => a.status === 'Paid' && a.paidDate).forEach(a => {
      const d = new Date(a.paidDate);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      apByMonth[key] = (apByMonth[key] || 0) + a.amount;
    });

    // Generate last 6 months
    const now = new Date();
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyTrends.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        revenue: arByMonth[key] || 0,
        expenses: (expenseByMonth[key] || 0) + (payrollByMonth[key] || 0),
        payroll: payrollByMonth[key] || 0,
        cashIn: arByMonth[key] || 0,
        cashOut: (apByMonth[key] || 0) + (payrollByMonth[key] || 0),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalRevenue: totalReceived,
          totalInvoiced,
          accountsReceivablePending: arPending,
          accountsReceivableReceived: arReceived,
          accountsReceivableOverdue: arOverdue,
          accountsPayablePending: apPending,
          accountsPayablePaid: apPaid,
          accountsPayableOverdue: apOverdue,
          totalBankBalance,
          totalExpenses,
          totalExpensesPending,
          totalExpensesApproved,
          totalPayrollPaid,
          totalPayrollPending,
          totalPayrollGross,
          totalPOValue,
          totalPOOpen,
          totalBudgetPlanned,
          totalBudgetActual,
          budgetVariance,
        },
        monthlyTrends,
        apSummary: {
          pending: apPending,
          paid: apPaid,
          overdue: apOverdue,
          total: apPending + apPaid,
        },
        arSummary: {
          pending: arPending,
          received: arReceived,
          overdue: arOverdue,
          total: arPending + arReceived,
        },
        budgetItems,
        bankAccounts,
        recentTransactions: journalEntries,
      },
    });
  } catch (error) {
    console.error('Finance dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch finance dashboard data' },
      { status: 500 }
    );
  }
}
