'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Landmark, Loader2, BookOpen, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface BankAccount { id: number; accountName: string; bankName: string; branch: string | null; accountNo: string; ifsc: string | null; type: string; balance: number; currency: string; status: string; }
interface BankTransaction { id: number; bankAccountId: number; date: string; type: string | null; transactionType: string | null; amount: number; balance: number; reference: string | null; party: string | null; description: string | null; category: string | null; status: string; reconciled: boolean; siteCode: string | null; jobCode: string | null; poNo: string | null; department: string | null; projectManager: string | null; }
interface CashRecord { id: number; voucherNo: string; date: string; description: string | null; amount: number; type: string | null; category: string | null; balance: number; paymentMode: string | null; party?: { name: string } | null; }

type ReportTab = 'transactions' | 'bank-book' | 'cash-book';

const TRANSACTION_TYPES = ['Payment', 'Receipt', 'Contra', 'Transfer', 'Charges', 'Interest'];

const typeColor = (t: string | null) => {
  if (t === 'Receipt') return 'bg-[#00e676]/15 text-[#00e676]';
  if (t === 'Payment' || t === 'Charges') return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
  if (t === 'Contra' || t === 'Transfer') return 'bg-[#00d4ff]/15 text-[#00d4ff]';
  if (t === 'Interest') return 'bg-[#ffab40]/15 text-[#ffab40]';
  return 'bg-[#5a6878]/15 text-[#5a6878]';
};

export default function BankCash() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [cashRecords, setCashRecords] = useState<CashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [reportTab, setReportTab] = useState<ReportTab>('transactions');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bankRes, cashRes] = await Promise.all([fetch('/api/bank-cash'), fetch('/api/fin/petty-cash')]);
      const bankJson = await bankRes.json();
      const cashJson = await cashRes.json();
      if (bankJson.success) {
        setAccounts(bankJson.data.accounts || bankJson.data || []);
        setTransactions(bankJson.data.transactions || []);
      }
      if (cashJson.success && Array.isArray(cashJson.data)) setCashRecords(cashJson.data);
    } catch { toast.error('Failed to fetch bank data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const filteredTxns = useMemo(
    () => selectedAccount ? transactions.filter(t => t.bankAccountId === selectedAccount) : transactions,
    [transactions, selectedAccount]
  );

  // Bank Book: Date / Particulars / Debit / Credit with running balance (ascending by date)
  const bankBookRows = useMemo(() => {
    const rows = filteredTxns
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
      .map(t => {
        const isDebit = (t.type === 'Debit') || ['Payment', 'Transfer', 'Charges'].includes(t.transactionType || '');
        return {
          id: t.id,
          date: t.date?.split('T')[0] ?? '',
          particulars: [t.party, t.description].filter(Boolean).join(' — ') || '—',
          ref: t.reference || '—',
          debit: isDebit ? t.amount : 0,
          credit: isDebit ? 0 : t.amount,
          balance: t.balance ?? 0,
        };
      });
    let running = 0;
    return rows.map(r => ({ ...r, running: (running = running + r.credit - r.debit) }));
  }, [filteredTxns]);

  const bankBookTotalDebit = bankBookRows.reduce((s, r) => s + r.debit, 0);
  const bankBookTotalCredit = bankBookRows.reduce((s, r) => s + r.credit, 0);

  // Cash Book: daily cash movement (Date / Particulars / Debit / Credit), from petty cash
  const cashBookRows = useMemo(() => {
    const rows = cashRecords
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
      .map(c => {
        const isCredit = c.type === 'Credit' || c.paymentMode !== 'Cash';
        return {
          id: c.id,
          date: c.date?.split('T')[0] ?? '',
          voucherNo: c.voucherNo,
          particulars: c.description || c.party?.name || '—',
          debit: isCredit ? 0 : c.amount,
          credit: isCredit ? c.amount : 0,
          balance: c.balance ?? 0,
        };
      });
    return rows;
  }, [cashRecords]);

  const cashBookTotalDebit = cashBookRows.reduce((s, r) => s + r.debit, 0);
  const cashBookTotalCredit = cashBookRows.reduce((s, r) => s + r.credit, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  const accountLabel = selectedAccount ? accounts.find(a => a.id === selectedAccount)?.bankName : 'All Accounts';

  return (
    <div className="space-y-4 p-6">
      {/* Total Balance */}
      <div className="vc-stat-card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00d4ff]" />
        <div className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1">Total Bank Balance</div>
        <div className="text-[28px] font-bold text-[#00d4ff]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          ₹{(totalBalance / 10000000).toFixed(2)} Cr
        </div>
        <div className="text-[10px] text-[#5a6878] mt-1">{accounts.length} accounts</div>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {accounts.map(acc => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccount(selectedAccount === acc.id ? null : acc.id)}
            className={`bg-[#161c24] border rounded-xl p-4 cursor-pointer transition-all ${selectedAccount === acc.id ? 'border-[#00d4ff]' : 'border-[#252e3a] hover:border-[#5a6878]'}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
                <Landmark size={16} className="text-[#00d4ff]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-[#e2e8f0] font-medium truncate">{acc.bankName}</div>
                <div className="text-[9px] text-[#5a6878]">{acc.type} • {acc.accountNo.slice(-4)}</div>
              </div>
            </div>
            <div className="text-[18px] font-bold text-[#00e676]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              ₹{(acc.balance ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[9px] text-[#5a6878] mt-1">{acc.branch || ''}</div>
          </div>
        ))}
      </div>

      {/* Report tabs */}
      <div className="flex items-center gap-1.5">
        {([
          { key: 'transactions', label: 'Transactions', icon: Landmark },
          { key: 'bank-book', label: 'Bank Book', icon: BookOpen },
          { key: 'cash-book', label: 'Cash Book', icon: Wallet },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setReportTab(t.key)} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${reportTab === t.key ? 'bg-[#f5a623] text-[#0a0d12]' : 'bg-[#161c24] border border-[#252e3a] text-[#8899aa] hover:text-[#e2e8f0]'}`}><t.icon size={12} /> {t.label}</button>
        ))}
        <span className="ml-auto text-[11px] text-[#5a6878]">{accountLabel}</span>
      </div>

      {/* Bank Book */}
      {reportTab === 'bank-book' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <BookOpen size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Bank Book</span>
            <span className="text-[11px] text-[#5a6878] ml-1">Date • Particulars • Debit • Credit</span>
            <div className="ml-auto flex items-center gap-4">
              <span className="text-[11px] text-[#ff3d3d] font-mono">Dr ₹{(bankBookTotalDebit).toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-[#00e676] font-mono">Cr ₹{(bankBookTotalCredit).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                {['Date', 'Particulars', 'Ref No', 'Debit', 'Credit', 'Balance'].map(h => (
                  <th key={h} className={`text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] ${h === 'Debit' || h === 'Credit' || h === 'Balance' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {bankBookRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">No transactions found</td></tr>
                ) : bankBookRows.map(r => (
                  <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0]">{r.particulars}</td>
                    <td className="py-2.5 px-3 text-[#5a6878] font-mono">{r.ref}</td>
                    <td className="py-2.5 px-3 text-right text-[#ff3d3d] font-mono">{r.debit ? `₹${r.debit.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-[#00e676] font-mono">{r.credit ? `₹${r.credit.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-mono">₹{(r.running ?? r.balance).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </div>
      )}

      {/* Cash Book */}
      {reportTab === 'cash-book' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Wallet size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Cash Book</span>
            <span className="text-[11px] text-[#5a6878] ml-1">Daily cash movement (Petty Cash)</span>
            <div className="ml-auto flex items-center gap-4">
              <span className="text-[11px] text-[#ff3d3d] font-mono">Dr ₹{(cashBookTotalDebit).toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-[#00e676] font-mono">Cr ₹{(cashBookTotalCredit).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="overflow-x-auto"><div className="max-h-[440px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                {['Date', 'Voucher', 'Particulars', 'Debit', 'Credit', 'Balance'].map(h => (
                  <th key={h} className={`text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] ${h === 'Debit' || h === 'Credit' || h === 'Balance' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {cashBookRows.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[#5a6878]">No cash entries found</td></tr>
                ) : cashBookRows.map(r => (
                  <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                    <td className="py-2.5 px-3 text-[#8899aa] font-mono">{r.date}</td>
                    <td className="py-2.5 px-3 text-[#5a6878] font-mono">{r.voucherNo}</td>
                    <td className="py-2.5 px-3 text-[#e2e8f0]">{r.particulars}</td>
                    <td className="py-2.5 px-3 text-right text-[#ff3d3d] font-mono">{r.debit ? `₹${r.debit.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-[#00e676] font-mono">{r.credit ? `₹${r.credit.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right text-[#e2e8f0] font-mono">₹{(r.balance ?? 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </div>
      )}

      {/* Transactions */}
      {reportTab === 'transactions' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Landmark size={15} className="text-[#f5a623]" />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">
              {selectedAccount ? `Transactions — ${accountLabel}` : 'All Transactions'}
            </span>
            <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filteredTxns.length} entries</span>
          </div>
          <div className="px-4 py-3 border-b border-[#252e3a] flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mr-1">Transaction Types</span>
            {TRANSACTION_TYPES.map(tt => (
              <span key={tt} className={`vc-badge ${typeColor(tt)}`}>{tt}</span>
            ))}
          </div>
          <div className="overflow-x-auto"><div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
                {['Date', 'Type', 'Party', 'Description', 'Job Code', 'Amount', 'Balance', 'Category', 'Reconciled'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#1a2028]">
                {filteredTxns.length === 0 ? (
                  <tr><td colSpan={9} className="py-10 text-center text-[#5a6878]">No transactions found</td></tr>
                ) : filteredTxns.map(t => {
                  const isDebit = (t.type === 'Debit') || ['Payment', 'Transfer', 'Charges'].includes(t.transactionType || '');
                  return (
                    <tr key={t.id} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono">{t.date?.split('T')[0]}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1">
                          <span className={`vc-badge ${t.transactionType ? typeColor(t.transactionType) : t.type === 'Credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{t.transactionType || t.type}</span>
                          {t.transactionType && <span className={`vc-badge ${t.type === 'Credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{t.type}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0]">{t.party || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] max-w-[200px] truncate">{t.description || '—'}</td>
                      <td className="py-2.5 px-3 text-[#8899aa] font-mono">{t.jobCode || '—'}</td>
                      <td className="py-2.5 px-3 font-mono font-medium">
                        <span className={isDebit ? 'text-[#ff3d3d]' : 'text-[#00e676]'}>
                          {isDebit ? '-' : '+'}₹{(t.amount ?? 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{(t.balance ?? 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-[#5a6878]">{t.category || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`w-2 h-2 rounded-full inline-block ${t.reconciled ? 'bg-[#00e676]' : 'bg-[#5a6878]'}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div></div>
        </div>
      )}
    </div>
  );
}
