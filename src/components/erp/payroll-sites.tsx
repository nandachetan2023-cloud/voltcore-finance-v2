'use client';

import { useState, useEffect, useCallback } from 'react';
import { Timer, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Branch {
  id: number;
  name: string;
  address?: string | null;
  monthlyWorkingDays: number;
  otType1Divisor: number;
  otType2Divisor: number;
}

const inputCls = "w-full bg-[#1a2332] border-[1.5px] border-[#2e3a48] rounded-lg px-3.5 py-2.5 text-[13px] text-[#e2e8f0] outline-none transition-all duration-200 placeholder:text-[#5a6878] hover:border-[#3a4858] hover:bg-[#1e2838] focus:border-[#f5a623] focus:bg-[#1e2838] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.15)]";

// Global OT Settings — per-site payroll divisors. Branches are auto-synced from
// the biometric site config in superadmin, so this only edits the divisors:
//   Monthly Working Days → Fixed employees' earn-wages divisor.
//   OT Type 1 / OT Type 2 Divisor → Non-fixed employees' earn-wages + OT rate
//   divisor, by their OT type. All default to 26.
export default function GlobalOtSettingsModule() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [workingDays, setWorkingDays] = useState('26');
  const [ot1, setOt1] = useState('26');
  const [ot2, setOt2] = useState('26');
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/branches');
      const json = await res.json();
      if (json.success) setBranches(json.data);
    } catch { toast.error('Failed to load sites'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const openEdit = (b: Branch) => {
    setSelectedId(b.id);
    setWorkingDays(String(b.monthlyWorkingDays));
    setOt1(String(b.otType1Divisor));
    setOt2(String(b.otType2Divisor));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (selectedId == null) return;
    const days = parseInt(workingDays), d1 = parseInt(ot1), d2 = parseInt(ot2);
    for (const [v, name] of [[days, 'Monthly working days'], [d1, 'OT Type 1 divisor'], [d2, 'OT Type 2 divisor']] as const) {
      if (!v || v < 1 || v > 31) { toast.error(`${name} must be between 1 and 31`); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, monthlyWorkingDays: days, otType1Divisor: d1, otType2Divisor: d2 }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('OT settings updated');
        setEditOpen(false);
        fetchBranches();
      } else { toast.error(json.error || 'Failed to update site'); }
    } catch { toast.error('Failed to update site'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="vc-panel">
        <div className="vc-panel-header">
          <Timer size={16} className="text-[#f5a623]" />
          <span className="text-[14px] font-bold text-[#e2e8f0]">Global OT Settings</span>
          <span className="ml-auto text-[11px] text-[#5a6878]">{branches.length} sites · synced from biometric</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1a2332] z-10">
              <tr className="border-b border-[#2e3a48]">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Site</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Working Days<br/><span className="text-[8px] font-medium normal-case text-[#5a6878]">Fixed</span></th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">OT Type 1<br/><span className="text-[8px] font-medium normal-case text-[#5a6878]">divisor</span></th>
                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">OT Type 2<br/><span className="text-[8px] font-medium normal-case text-[#5a6878]">divisor</span></th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#8899aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-[#5a6878] text-[12px]">Loading…</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-[#5a6878] text-[12px]">No sites found — configure biometric sites in superadmin</td></tr>
              ) : branches.map((b) => (
                <tr key={b.id} className="border-b border-[#1e252e] hover:bg-[#1a2028] transition-colors group">
                  <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{b.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#00e676]/10 text-[#00e676] text-[11px] font-semibold">{b.monthlyWorkingDays}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] text-[11px] font-semibold">{b.otType1Divisor}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#ffab40]/10 text-[#ffab40] text-[11px] font-semibold">{b.otType2Divisor}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Site OT Settings</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1.5">Monthly Working Days (Fixed employees)</label>
              <input className={inputCls} type="number" min="1" max="31" value={workingDays} onChange={e => setWorkingDays(e.target.value)} placeholder="26" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1.5">OT Type 1 Divisor</label>
              <input className={inputCls} type="number" min="1" max="31" value={ot1} onChange={e => setOt1(e.target.value)} placeholder="26" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8899aa] mb-1.5">OT Type 2 Divisor</label>
              <input className={inputCls} type="number" min="1" max="31" value={ot2} onChange={e => setOt2(e.target.value)} placeholder="26" />
            </div>
            <p className="text-[11px] text-[#5a6878]">Working Days is the earn-wages divisor for Fixed employees. The OT divisors set the earn-wages and OT hourly-rate base for Non-Fixed employees of that OT type (e.g. 26).</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#1a2332] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
