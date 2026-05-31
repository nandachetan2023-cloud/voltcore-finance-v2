'use client';

import { useState, useEffect, useCallback } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BankAccount { id: number; accountName: string; bankName: string; branch: string | null; accountNo: string; ifsc: string | null; type: string; balance: number; currency: string; status: string; }
interface BankTransaction { id: number; bankAccountId: number; date: string; type: string | null; amount: number; balance: number; reference: string | null; party: string | null; description: string | null; category: string | null; status: string; reconciled: boolean; }

export default function BankCash() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bank-cash');
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data.accounts || json.data || []);
        setTransactions(json.data.transactions || []);
      }
    } catch { toast.error('Failed to fetch bank data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const filteredTxns = selectedAccount ? transactions.filter(t => t.bankAccountId === selectedAccount) : transactions;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-4">
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
              ₹{acc.balance.toLocaleString('en-IN')}
            </div>
            <div className="text-[9px] text-[#5a6878] mt-1">{acc.branch || ''}</div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Landmark size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">
            {selectedAccount ? `Transactions — ${accounts.find(a => a.id === selectedAccount)?.bankName}` : 'All Transactions'}
          </span>
          <span className="vc-badge bg-[#252e3a] text-[#8899aa] ml-auto">{filteredTxns.length} entries</span>
        </div>
        <div className="overflow-x-auto"><div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-[#0f1318]">
              {['Date', 'Type', 'Party', 'Description', 'Amount', 'Balance', 'Category', 'Reconciled'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[#1a2028]">
              {filteredTxns.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-[#5a6878]">No transactions found</td></tr>
              ) : filteredTxns.map(t => (
                <tr key={t.id} className="hover:bg-[#141920] transition-colors">
                  <td className="py-2.5 px-3 text-[#8899aa] font-mono">{t.date?.split('T')[0]}</td>
                  <td className="py-2.5 px-3">
                    <span className={`vc-badge ${t.type === 'Credit' ? 'bg-[#00e676]/15 text-[#00e676]' : 'bg-[#ff3d3d]/15 text-[#ff3d3d]'}`}>{t.type}</span>
                  </td>
                  <td className="py-2.5 px-3 text-[#e2e8f0]">{t.party || '—'}</td>
                  <td className="py-2.5 px-3 text-[#8899aa] max-w-[200px] truncate">{t.description || '—'}</td>
                  <td className="py-2.5 px-3 font-mono font-medium">
                    <span className={t.type === 'Credit' ? 'text-[#00e676]' : 'text-[#ff3d3d]'}>
                      {t.type === 'Credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">₹{t.balance.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-[#5a6878]">{t.category || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`w-2 h-2 rounded-full inline-block ${t.reconciled ? 'bg-[#00e676]' : 'bg-[#5a6878]'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      </div>
    </div>
  );
}
