'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, FileText, Loader2, Send, CircleDot } from 'lucide-react';
import { toast } from 'sonner';

interface JournalLine {
  id: number;
  lineNo: number;
  account: string;
  accountName: string;
  description: string;
  costCenter: string;
  debitAmount: number;
  creditAmount: number;
}

interface LedgerAccount {
  id: number;
  accountCode: string;
  name: string;
  group: string;
  type: string;
}

export default function CreateJournalEntry() {
  const [entryNo, setEntryNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherType, setVoucherType] = useState('Journal');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: 1, lineNo: 1, account: '', accountName: '', description: '', costCenter: '', debitAmount: 0, creditAmount: 0 },
    { id: 2, lineNo: 2, account: '', accountName: '', description: '', costCenter: '', debitAmount: 0, creditAmount: 0 },
  ]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger');
      const json = await res.json();
      if (json.success) setAccounts(json.data);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    const now = new Date();
    setEntryNo(`JE-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`);
  }, []);

  const addLine = () => {
    setLines([...lines, {
      id: Date.now(),
      lineNo: lines.length + 1,
      account: '', accountName: '', description: '', costCenter: '',
      debitAmount: 0, creditAmount: 0,
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) { toast.error('Minimum 2 lines required'); return; }
    const updated = lines.filter((_, i) => i !== index);
    updated.forEach((line, i) => { line.lineNo = i + 1; });
    setLines(updated);
  };

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'account') {
      const acc = accounts.find(a => a.accountCode === value);
      if (acc) updated[index].accountName = acc.name;
    }
    setLines(updated);
  };

  const totals = lines.reduce((acc, line) => ({
    debit: acc.debit + (line.debitAmount || 0),
    credit: acc.credit + (line.creditAmount || 0),
  }), { debit: 0, credit: 0 });

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const handleSubmit = async (status: 'Draft' | 'Posted') => {
    if (!date) { toast.error('Date is required'); return; }
    if (lines.some(l => !l.account)) { toast.error('All lines must have an account'); return; }
    if (lines.every(l => l.debitAmount === 0 && l.creditAmount === 0)) { toast.error('Enter debit/credit amounts'); return; }
    if (!isBalanced) { toast.error('Debit and Credit must be equal'); return; }

    setSaving(true);
    try {
      const promises = lines.filter(l => l.debitAmount > 0 || l.creditAmount > 0).map(line =>
        fetch('/api/journal-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryNo, date: new Date(date), account: line.account, accountName: line.accountName,
            debit: line.debitAmount, credit: line.creditAmount,
            description: line.description || description, reference: '', voucherType, status,
          }),
        })
      );
      const results = await Promise.all(promises);
      if (results.every(r => r.ok)) {
        toast.success(`Journal Entry ${entryNo} ${status === 'Draft' ? 'saved as draft' : 'posted'}`);
        setDescription('');
        setLines([
          { id: Date.now(), lineNo: 1, account: '', accountName: '', description: '', costCenter: '', debitAmount: 0, creditAmount: 0 },
          { id: Date.now() + 1, lineNo: 2, account: '', accountName: '', description: '', costCenter: '', debitAmount: 0, creditAmount: 0 },
        ]);
        setEntryNo(`JE-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-4)}`);
      } else { toast.error('Some entries failed to save'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#f5a623]" size={24} /></div>;

  return (
    <div className="space-y-5">
      {/* ── Header with breadcrumb and action buttons ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-[#f5a623] mb-1">Journal Entries › <span className="text-[#e2e8f0]">New Entry</span></div>
          <h2 className="text-[24px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Journal Entry
          </h2>
          <p className="text-[11px] text-[#5a6878] mt-0.5">Distribute amounts across accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit('Draft')}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[#f5a623] text-[#f5a623] text-[12px] font-semibold hover:bg-[#f5a623]/10 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit('Posted')}
            disabled={saving || !isBalanced}
            className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Post Entry
          </button>
        </div>
      </div>

      {/* ── Header Fields Row ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Reference #</label>
            <input
              type="text"
              value={entryNo}
              onChange={e => setEntryNo(e.target.value)}
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none transition-colors"
              placeholder="JE-XXXX"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Voucher Type</label>
            <select
              value={voucherType}
              onChange={e => setVoucherType(e.target.value)}
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none transition-colors"
            >
              <option value="Journal">Journal</option>
              <option value="Payment">Payment</option>
              <option value="Receipt">Receipt</option>
              <option value="Contra">Contra</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold mb-1.5 block">Entity / Site</label>
            <input
              type="text"
              value="VoltCore Engineering"
              readOnly
              className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#8899aa] opacity-70"
            />
          </div>
        </div>

        {/* Narration */}
        <div className="mt-4">
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Memo for this journal voucher..."
            className="w-full bg-[#0a0d12] border border-[#252e3a] rounded-lg px-3 py-2.5 text-[12px] text-[#e2e8f0] placeholder:text-[#5a6878] focus:border-[#f5a623] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── Line Items Table ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl overflow-hidden">
        {/* Add Line button */}
        <div className="flex items-center justify-end px-5 py-3 border-b border-[#252e3a]">
          <button onClick={addLine} className="flex items-center gap-1.5 text-[#f5a623] text-[12px] font-semibold hover:text-[#e8991a] transition-colors">
            <Plus size={14} className="border border-[#f5a623] rounded-full" /> Add Line Row
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#252e3a] bg-[#0a0d12]">
                <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[30%]">Account / Description</th>
                <th className="text-left py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[20%]">Project/Cost Center</th>
                <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[18%]">Debit</th>
                <th className="text-right py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[18%]">Credit</th>
                <th className="text-center py-3 px-4 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px] w-[5%]"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className="border-b border-[#1a2028] hover:bg-[#141920] transition-colors">
                  <td className="py-3 px-4">
                    <select
                      value={line.account}
                      onChange={e => updateLine(index, 'account', e.target.value)}
                      className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none mb-1"
                    >
                      <option value="" className="bg-[#161c24]">Select account...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.accountCode} className="bg-[#161c24]">
                          {acc.accountCode} - {acc.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={line.description}
                      onChange={e => updateLine(index, 'description', e.target.value)}
                      placeholder="Line description..."
                      className="w-full bg-transparent text-[11px] text-[#8899aa] placeholder:text-[#5a6878] focus:outline-none mt-1"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={line.costCenter}
                      onChange={e => updateLine(index, 'costCenter', e.target.value)}
                      className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[12px] text-[#e2e8f0] focus:border-[#f5a623] focus:outline-none appearance-none"
                    >
                      <option value="" className="bg-[#161c24]">None</option>
                      <option value="CC-101" className="bg-[#161c24]">CC-101 - Operations</option>
                      <option value="CC-102" className="bg-[#161c24]">CC-102 - Maintenance</option>
                      <option value="CC-201" className="bg-[#161c24]">CC-201 - Projects</option>
                      <option value="CC-301" className="bg-[#161c24]">CC-301 - Admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={line.debitAmount || ''}
                      onChange={e => updateLine(index, 'debitAmount', Number(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={line.creditAmount || ''}
                      onChange={e => updateLine(index, 'creditAmount', Number(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent border-b border-[#252e3a] pb-1 text-[13px] text-right text-[#e2e8f0] font-mono focus:border-[#f5a623] focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => removeLine(index)}
                      className="p-1.5 rounded text-[#5a6878] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-all"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* ── Totals Row ── */}
              <tr className="bg-[#0a0d12] border-t border-[#252e3a]">
                <td colSpan={2} className="py-3 px-4 text-right">
                  <span className="text-[10px] uppercase tracking-[1.5px] text-[#5a6878] font-semibold">Total Journal Balance</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-[14px] font-bold text-[#e2e8f0] font-mono">
                    {totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-[14px] font-bold text-[#e2e8f0] font-mono">
                    {totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer Status Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161c24] border border-[#252e3a] rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#e2e8f0]">
            Total: <span className="text-[#f5a623]">₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#5a6878]">
          <div className="flex items-center gap-1.5">
            <CircleDot size={12} className={isBalanced ? 'text-[#00e676]' : 'text-[#ff3d3d]'} />
            {isBalanced ? 'Balanced' : `Difference: ₹${Math.abs(totals.debit - totals.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
          <span>Period Open</span>
        </div>
      </div>
    </div>
  );
}
