import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      invoices,
      expenses,
      payroll,
      purchaseOrders,
      accountsPayable,
      accountsReceivable,
      budgetItems,
      journalEntries,
    ] = await Promise.all([
      db.invoice.findMany({ orderBy: { createdAt: 'desc' } }),
      db.expense.findMany({ orderBy: { createdAt: 'desc' } }),
      db.payroll.findMany({ orderBy: { createdAt: 'desc' } }),
      db.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' } }),
      db.accountsPayable.findMany({ orderBy: { createdAt: 'desc' } }),
      db.accountsReceivable.findMany({ orderBy: { createdAt: 'desc' } }),
      db.budgetItem.findMany({ orderBy: { createdAt: 'desc' } }),
      db.journalEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    const parseAmount = (v: string | number) => {
      const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v;
      return isNaN(n) ? 0 : n;
    };

    const totalInvoiced = invoices.reduce((s, i) => s + parseAmount(i.amount), 0);
    const totalReceived = accountsReceivable
      .filter((a) => a.status === 'Received')
      .reduce((s, a) => s + a.amount, 0);
    const totalAPOutstanding = accountsPayable
      .filter((a) => a.status === 'Pending')
      .reduce((s, a) => s + a.amount, 0);
    const totalAROutstanding = accountsReceivable
      .filter((a) => a.status === 'Pending')
      .reduce((s, a) => s + a.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalPayroll = payroll.reduce((s, p) => s + p.netPay, 0);
    const totalPOValue = purchaseOrders.reduce((s, p) => s + p.amount, 0);
    const totalBudgetPlanned = budgetItems.reduce((s, b) => s + b.planned, 0);
    const totalBudgetActual = budgetItems.reduce((s, b) => s + b.actual, 0);

    const incomeJE = journalEntries
      .filter((j) => j.credit > 0)
      .reduce((s, j) => s + j.credit, 0);
    const expenseJE = journalEntries
      .filter((j) => j.debit > 0)
      .reduce((s, j) => s + j.debit, 0);

    const profitLoss = totalInvoiced + totalReceived - totalExpenses - totalPayroll;
    const budgetVariance = totalBudgetPlanned - totalBudgetActual;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalInvoiced,
          totalReceived,
          totalAPOutstanding,
          totalAROutstanding,
          totalExpenses,
          totalPayroll,
          totalPOValue,
          profitLoss,
        },
        budget: {
          totalPlanned: totalBudgetPlanned,
          totalActual: totalBudgetActual,
          variance: budgetVariance,
          items: budgetItems,
        },
        journalSummary: {
          totalIncome: incomeJE,
          totalExpenses: expenseJE,
          entries: journalEntries,
        },
        invoices: invoices.map((i) => ({
          id: i.id,
          invNo: i.invNo,
          client: i.client,
          project: i.project,
          amount: i.amount,
          date: i.date,
          dueDate: i.dueDate,
          status: i.status,
        })),
        expenses: expenses.map((e) => ({
          id: e.id,
          claimNo: e.claimNo,
          empId: e.empId,
          category: e.category,
          amount: e.amount,
          project: e.project,
          date: e.date,
          status: e.status,
        })),
        payable: accountsPayable,
        receivable: accountsReceivable,
      },
    });
  } catch (error) {
    console.error('[Financial Reports API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial reports' },
      { status: 500 }
    );
  }
}
