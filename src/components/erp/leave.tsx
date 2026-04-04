'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, CheckCircle2, XCircle, UserCheck,
  Loader2, AlertTriangle, CalendarDays, FileCheck,
  CalendarRange, PartyPopper, RotateCcw,
} from 'lucide-react';

interface Employee {
  id: string;
  empId: string;
  name: string;
  role: string;
  site: string;
}

interface LeaveRequest {
  id: string;
  empId: string;
  site: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
}

type TabId = 'pending' | 'all' | 'balances' | 'holidays';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'pending',
    label: 'Pending Approvals',
    icon: <Clock size={13} />,
  },
  {
    id: 'all',
    label: 'All Requests',
    icon: <FileCheck size={13} />,
  },
  {
    id: 'balances',
    label: 'Leave Balances',
    icon: <CalendarRange size={13} />,
  },
  {
    id: 'holidays',
    label: 'Holiday Calendar',
    icon: <PartyPopper size={13} />,
  },
];

export default function LeaveModule() {
  const [records, setRecords] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/leave');
      if (!res.ok) throw new Error('Failed to fetch leave data');
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      setActionLoading(id);
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Action failed');
      const json = await res.json();
      if (json.success) {
        // Refresh data after successful action
        await fetchData();
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const pendingCount = records.filter((r) => r.status === 'Pending').length;
  const approvedMTD = records.filter((r) => r.status === 'Approved').length;
  const rejectedCount = records.filter((r) => r.status === 'Rejected').length;
  const currentlyOnLeave = records.filter((r) => {
    const today = new Date().toISOString().split('T')[0];
    return r.status === 'Approved' && r.fromDate <= today && r.toDate >= today;
  }).length;

  // Filtered records
  const pendingRecords = records.filter((r) => r.status === 'Pending');
  const allRecords = records;

  // Helpers
  const typeBadge = (type: string) => {
    switch (type) {
      case 'EL': return 'bg-[#00d4ff]/15 text-[#00d4ff]';
      case 'SL': return 'bg-[#ffab40]/15 text-[#ffab40]';
      case 'ML': return 'bg-[#a78bfa]/15 text-[#a78bfa]';
      case 'CL': return 'bg-[#00e676]/15 text-[#00e676]';
      case 'Comp Off': return 'bg-[#f5a623]/15 text-[#f5a623]';
      default: return 'bg-[#5a6878]/15 text-[#5a6878]';
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-[#ffab40]/15 text-[#ffab40]';
      case 'Approved': return 'bg-[#00e676]/15 text-[#00e676]';
      case 'Rejected': return 'bg-[#ff3d3d]/15 text-[#ff3d3d]';
      case 'Cancelled': return 'bg-[#5a6878]/15 text-[#5a6878]';
      default: return 'bg-[#5a6878]/15 text-[#5a6878]';
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const avatarColor = (name: string) => {
    const colors = [
      'from-[#f5a623] to-[#e8891a]',
      'from-[#00d4ff] to-[#0098b3]',
      'from-[#00e676] to-[#00a152]',
      'from-[#a78bfa] to-[#7c5cc4]',
      'from-[#ff3d3d] to-[#cc2020]',
      'from-[#ffab40] to-[#cc8520]',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#f5a623]" size={28} />
        <span className="ml-3 text-sm text-[#8899aa]">Loading leave data...</span>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <AlertTriangle className="text-[#ff3d3d]" size={24} />
        <span className="ml-3 text-sm text-[#ff3d3d]">{error}</span>
        <button onClick={fetchData} className="ml-4 vc-btn-ghost text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error toast */}
      {error && records.length > 0 && (
        <div className="flex items-center gap-2 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg px-4 py-2.5">
          <AlertTriangle className="text-[#ff3d3d] shrink-0" size={14} />
          <span className="text-[11px] text-[#ff3d3d]">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[#ff3d3d]/60 hover:text-[#ff3d3d]">
            &times;
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="vc-stat-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ffab40]/10 flex items-center justify-center">
              <Clock className="text-[#ffab40]" size={16} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {pendingCount}
              </div>
              <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">Pending Requests</div>
            </div>
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#00e676]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#00e676]/10 flex items-center justify-center">
                <CheckCircle2 className="text-[#00e676]" size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {approvedMTD}
                </div>
                <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">Approved MTD</div>
              </div>
            </div>
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#ff3d3d]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ff3d3d]/10 flex items-center justify-center">
                <XCircle className="text-[#ff3d3d]" size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {rejectedCount}
                </div>
                <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">Rejected</div>
              </div>
            </div>
          </div>
        </div>
        <div className="vc-stat-card">
          <div className="before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#a78bfa]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#a78bfa]/10 flex items-center justify-center">
                <UserCheck className="text-[#a78bfa]" size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {currentlyOnLeave}
                </div>
                <div className="text-[10px] text-[#5a6878] uppercase tracking-wider">Currently on Leave</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#161c24] border border-[#252e3a] rounded-lg p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[11px] font-semibold
              whitespace-nowrap transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-[#f5a623] text-black shadow-sm'
                : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <Clock className="text-[#ffab40]" size={14} />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Pending Leave Approvals</span>
            <span className="ml-auto vc-badge bg-[#ffab40]/15 text-[#ffab40]">{pendingCount}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Type</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">From</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">To</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Days</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Reason</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Applied</th>
                    <th className="text-right py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {pendingRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center">
                        <CheckCircle2 className="mx-auto text-[#00e676] mb-2" size={24} />
                        <div className="text-[11px] text-[#5a6878]">No pending leave requests</div>
                      </td>
                    </tr>
                  ) : (
                    pendingRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(r.employee.name)} flex items-center justify-center text-[9px] font-bold text-black shrink-0`}>
                              {getInitials(r.employee.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#e2e8f0] font-medium truncate">{r.employee.name}</div>
                              <div className="text-[#5a6878] text-[9px]">{r.employee.empId} · {r.employee.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[100px] truncate">{r.site}</td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${typeBadge(r.type)}`}>{r.type}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{formatDate(r.fromDate)}</td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{formatDate(r.toDate)}</td>
                        <td className="py-2.5 px-3 text-[#e2e8f0] font-semibold">{r.days}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                        <td className="py-2.5 px-3 text-[#5a6878]">{formatDate(r.appliedDate)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAction(r.id, 'Approved')}
                              disabled={actionLoading === r.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#00e676]/10 text-[#00e676] hover:bg-[#00e676]/20 border border-[#00e676]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === r.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={11} />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(r.id, 'Rejected')}
                              disabled={actionLoading === r.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#ff3d3d]/10 text-[#ff3d3d] hover:bg-[#ff3d3d]/20 border border-[#ff3d3d]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === r.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <XCircle size={11} />
                              )}
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <FileCheck className="text-[#00d4ff]" size={14} />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">All Leave Requests</span>
            <span className="ml-auto text-[10px] text-[#5a6878]">{allRecords.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Employee</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Site</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Type</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">From</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">To</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Days</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Reason</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {allRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[11px] text-[#5a6878]">
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    allRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-[#141920] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(r.employee.name)} flex items-center justify-center text-[9px] font-bold text-black shrink-0`}>
                              {getInitials(r.employee.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#e2e8f0] font-medium truncate">{r.employee.name}</div>
                              <div className="text-[#5a6878] text-[9px]">{r.employee.empId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[100px] truncate">{r.site}</td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${typeBadge(r.type)}`}>{r.type}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{formatDate(r.fromDate)}</td>
                        <td className="py-2.5 px-3 text-[#8899aa]">{formatDate(r.toDate)}</td>
                        <td className="py-2.5 px-3 text-[#e2e8f0] font-semibold">{r.days}</td>
                        <td className="py-2.5 px-3 text-[#8899aa] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                        <td className="py-2.5 px-3">
                          <span className={`vc-badge ${statusBadge(r.status)}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <CalendarRange className="text-[#a78bfa]" size={14} />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Leave Balances (Current Year)</span>
          </div>
          <div className="vc-panel-body">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <BalanceCard label="Earned Leave" allocated={24} used={8} color="#00d4ff" />
              <BalanceCard label="Sick Leave" allocated={12} used={3} color="#ffab40" />
              <BalanceCard label="Casual Leave" allocated={6} used={2} color="#00e676" />
              <BalanceCard label="Maternity Leave" allocated={180} used={0} color="#a78bfa" />
              <BalanceCard label="Comp Off" allocated={2} used={1} color="#f5a623" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'holidays' && (
        <div className="vc-panel">
          <div className="vc-panel-header">
            <PartyPopper className="text-[#f5a623]" size={14} />
            <span className="text-[12px] font-semibold text-[#e2e8f0]">Holiday Calendar 2024</span>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f1318]">
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Date</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Day</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Holiday</th>
                    <th className="text-left py-2 px-3 text-[#5a6878] font-semibold uppercase tracking-wider text-[9px]">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2028]">
                  {HOLIDAYS_2024.map((h, idx) => (
                    <tr key={idx} className="hover:bg-[#141920] transition-colors">
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-mono">{h.date}</td>
                      <td className="py-2.5 px-3 text-[#8899aa]">{h.day}</td>
                      <td className="py-2.5 px-3 text-[#e2e8f0] font-medium">{h.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`vc-badge ${h.type === 'National' ? 'bg-[#ff3d3d]/15 text-[#ff3d3d]' : h.type === 'Restricted' ? 'bg-[#ffab40]/15 text-[#ffab40]' : 'bg-[#00d4ff]/15 text-[#00d4ff]'}`}>
                          {h.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Sub-components */

function BalanceCard({
  label,
  allocated,
  used,
  color,
}: {
  label: string;
  allocated: number;
  used: number;
  color: string;
}) {
  const balance = allocated - used;
  const pctUsed = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

  return (
    <div className="bg-[#0f1318] border border-[#1e2530] rounded-lg p-3">
      <div className="text-[9px] text-[#5a6878] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-bold" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {balance}
        </span>
        <span className="text-[10px] text-[#5a6878] mb-0.5">/ {allocated}</span>
      </div>
      <div className="h-[4px] bg-[#141920] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pctUsed}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#5a6878]">{used} used</span>
        <span className="text-[9px] text-[#5a6878]">{pctUsed}%</span>
      </div>
    </div>
  );
}

/* Static holiday data */
const HOLIDAYS_2024 = [
  { date: '26 Jan', day: 'Friday', name: 'Republic Day', type: 'National' },
  { date: '15 Mar', day: 'Friday', name: 'Holi', type: 'Festival' },
  { date: '25 Mar', day: 'Monday', name: 'Id-Ul-Fitr', type: 'Restricted' },
  { date: '14 Apr', day: 'Sunday', name: 'Ambedkar Jayanti', type: 'Restricted' },
  { date: '17 Apr', day: 'Wednesday', name: 'Ram Navami', type: 'Festival' },
  { date: '01 May', day: 'Wednesday', name: 'May Day', type: 'National' },
  { date: '10 Jun', day: 'Monday', name: 'Bakri Id', type: 'Restricted' },
  { date: '17 Jul', day: 'Wednesday', name: 'Muharram', type: 'Restricted' },
  { date: '15 Aug', day: 'Thursday', name: 'Independence Day', type: 'National' },
  { date: '16 Aug', day: 'Friday', name: 'Parsi New Year', type: 'Restricted' },
  { date: '07 Sep', day: 'Saturday', name: 'Janmashtami', type: 'Festival' },
  { date: '02 Oct', day: 'Wednesday', name: 'Gandhi Jayanti', type: 'National' },
  { date: '12 Oct', day: 'Saturday', name: 'Dussehra', type: 'Festival' },
  { date: '01 Nov', day: 'Friday', name: 'Diwali', type: 'Festival' },
  { date: '15 Nov', day: 'Friday', name: 'Guru Nanak Jayanti', type: 'Restricted' },
  { date: '25 Dec', day: 'Wednesday', name: 'Christmas', type: 'Festival' },
];
