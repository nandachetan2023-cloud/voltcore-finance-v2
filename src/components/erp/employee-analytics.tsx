'use client';

import { useState, useEffect } from 'react';
import {
  Users, Wallet, Award, CalendarOff, Ticket, Plane,
  TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts';

// ── Color palette (VoltCore dark theme) ──
const COLORS = ['#f5a623', '#00e676', '#00d4ff', '#ff3d3d', '#a78bfa', '#ffab40', '#22d3ee', '#f472b6'];

interface Employee {
  id: string;
  empId: string;
  name: string;
  role: string;
  site: string;
  type: string;
  status: string;
  trade: string;
  joiningDate: string;
  email?: string;
  phone?: string;
  certifications?: string;
}

interface Attendance {
  id: string;
  empId: string;
  date: string;
  status: string;
  site?: string;
  shift?: string;
  timeIn?: string;
  timeOut?: string;
  otHours?: number;
  // Nested from API
  employee?: { name: string; empId: string };
}

interface LeaveRequest {
  id: string;
  empId: string;
  type: string;
  status: string;
  days: number;
  fromDate: string;
  toDate: string;
}

interface Payroll {
  id: string;
  empId: string;
  gross: number;
  netPay: number;
  month: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  people: number;
}

interface SupportTicket {
  id: string;
  ticketNo: string;
  status: string;
  priority: string;
}

interface Expense {
  id: string;
  claimNo: string;
  status: string;
  amount: number;
  category: string;
}

interface KpiCardData {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function formatCurrency(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function formatCr(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

// ── Donut chart component ──
function DonutChart({ data, title }: { data: { name: string; value: number; color: string }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <PieIcon size={14} className="text-[#f5a623]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-[120px] h-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#f5a623' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-[6px]">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[8px] h-[8px] rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-[#8899aa] truncate max-w-[120px]">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{d.value}</span>
                <span className="text-[9px] text-[#5a6878]">({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal bar chart component ──
function HBarChart({ data, title, barKey, labelKey, useTotal = false }: {
  data: { name: string; value: number; color: string; fill?: string }[];
  title: string;
  barKey: string;
  labelKey: string;
  useTotal?: boolean;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const totalVal = data.reduce((sum, d) => sum + d.value, 0);
  const baseVal = useTotal ? totalVal : maxVal;
  
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} className="text-[#f5a623]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">{title}</span>
      </div>
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#8899aa]">{d.name}</span>
              <span className="text-[12px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {typeof d.value === 'number' ? d.value.toLocaleString('en-IN') : d.value}
                {d.value > 0 && <span className="text-[9px] text-[#5a6878] ml-1">({((d.value / baseVal) * 100).toFixed(0)}%)</span>}
              </span>
            </div>
            <div className="w-full h-[8px] bg-[#0a0d12] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%`,
                  backgroundColor: d.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vertical bar chart ──
function VBarChart({ data, title }: { data: { name: string; value: number; color: string }[]; title: string }) {
  return (
    <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={14} className="text-[#f5a623]" />
        <span className="text-[12px] font-semibold text-[#e2e8f0]">{title}</span>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={24} barGap={4}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8899aa', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8899aa', fontSize: 10 }}
              width={30}
            />
            <Tooltip
              contentStyle={{ background: '#1a2030', border: '1px solid #252e3a', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
              cursor={{ fill: 'rgba(245,166,35,0.05)' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Skeleton loader ──
function Skeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 h-[100px]" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 h-[200px]" />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──
export default function EmployeeAnalytics() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Safe fetch helper
  async function safeFetch(url: string): Promise<any> {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch {
      return { data: null };
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all APIs in parallel, but each is individually safe
        const [empData, attData, leaveData, payData, projData, ticketData, expData] = await Promise.all([
          safeFetch('/api/employees'),
          safeFetch('/api/attendance'),
          safeFetch('/api/leave'),
          safeFetch('/api/payroll'),
          safeFetch('/api/projects'),
          safeFetch('/api/support'),
          safeFetch('/api/expenses'),
        ]);

        // Map employee data to match expected format
        const mappedEmployees = Array.isArray(empData?.data) ? empData.data.map((e: any) => ({
          id: e.id?.toString() || '',
          empId: e.employeeCode || '',
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
          role: e.Designation?.name || 'Unassigned',
          site: e.Branch?.name || 'Unassigned',
          type: e.employmentType || 'Unknown',
          status: e.employmentStatus || 'Unknown',
          trade: e.Department?.name || 'Unassigned',
          joiningDate: e.dateOfJoining || '',
          email: e.email || '',
          phone: e.phone || '',
          certifications: '',
        })) : [];

        // Map attendance data
        const mappedAttendance = Array.isArray(attData?.data) ? attData.data.map((a: any) => ({
          id: a.id?.toString() || '',
          empId: a.employeeId?.toString() || '',
          date: new Date(a.logDate).toISOString().split('T')[0],
          status: a.status === 'present' ? 'Present' : a.status === 'absent' ? 'Absent' : 'Leave',
          site: a.biometricDeviceId || '',
          shift: '',
          timeIn: a.punchIn ? new Date(a.punchIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
          timeOut: a.punchOut ? new Date(a.punchOut).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
          otHours: a.punchIn && a.punchOut ? Math.max(0, (new Date(a.punchOut).getTime() - new Date(a.punchIn).getTime()) / (1000 * 60 * 60) - 8) : 0,
          employee: a.Employee ? {
            name: `${a.Employee.firstName} ${a.Employee.lastName}`,
            empId: a.Employee.employeeCode,
          } : undefined,
        })) : [];

        setEmployees(mappedEmployees);
        setAttendance(mappedAttendance);
        setLeaveRequests(Array.isArray(leaveData?.data) ? leaveData.data : []);
        setPayroll(Array.isArray(payData?.data) ? payData.data : []);
        setProjects(Array.isArray(projData?.data) ? projData.data : []);
        setTickets(Array.isArray(ticketData?.data) ? ticketData.data : []);
        setExpenses(Array.isArray(expData?.data) ? expData.data : []);
      } catch (e: any) {
        setError(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Computed KPIs ──
  const activeEmployees = employees.filter(e => e.status?.toLowerCase() === 'active').length;
  const totalEmployees = employees.length;
  const pendingLeave = leaveRequests.filter(l => l.status?.toLowerCase() === 'pending').length;
  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const pendingExpenses = expenses.filter(e => e.status === 'Pending').length;
  const totalPayroll = payroll.reduce((s, p) => s + (p.gross || 0), 0);

  // Today's attendance (or selected date)
  const todayAtt = attendance.filter(a => a.date === selectedDate);
  const presentToday = todayAtt.filter(a => a.status === 'Present').length;
  const leaveToday = todayAtt.filter(a => a.status === 'Leave').length;
  // Calculate absent as: active employees who are not present and not on leave
  const absentToday = Math.max(0, activeEmployees - presentToday - leaveToday);
  const totalTodayAtt = todayAtt.length;

  // Department / Role distribution
  const deptMap: Record<string, number> = {};
  const roleMap: Record<string, number> = {};
  const siteMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  employees.forEach(e => {
    deptMap[e.role || 'Unassigned'] = (deptMap[e.role || 'Unassigned'] || 0) + 1;
    roleMap[e.trade || 'Unassigned'] = (roleMap[e.trade || 'Unassigned'] || 0) + 1;
    siteMap[e.site || 'Unassigned'] = (siteMap[e.site || 'Unassigned'] || 0) + 1;
    typeMap[e.type || 'Unknown'] = (typeMap[e.type || 'Unknown'] || 0) + 1;
  });

  const deptData = Object.entries(deptMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  const roleData = Object.entries(roleMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  const siteData = Object.entries(siteMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  const typeData = Object.entries(typeMap).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

  // Attendance bars
  const attBarData = [
    { name: 'Present', value: presentToday, color: '#00e676' },
    { name: 'Absent', value: absentToday, color: '#ff3d3d' },
    { name: 'On Leave', value: leaveToday, color: '#f5a623' },
  ];

  // Project status
  const projectStatusData: Record<string, number> = {};
  projects.forEach(p => {
    projectStatusData[p.status || 'Unknown'] = (projectStatusData[p.status || 'Unknown'] || 0) + 1;
  });
  const projectBarData = Object.entries(projectStatusData).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length]
  }));

  // Leave type distribution
  const leaveTypeMap: Record<string, number> = {};
  leaveRequests.forEach(l => {
    leaveTypeMap[l.type || 'Unknown'] = (leaveTypeMap[l.type || 'Unknown'] || 0) + 1;
  });
  
  let leaveTypeData: { name: string; value: number; color: string }[] = [];
  
  if (Object.keys(leaveTypeMap).length > 0) {
    leaveTypeData = Object.entries(leaveTypeMap).map(([name, value], i) => ({
      name, value, color: COLORS[i % COLORS.length]
    }));
  } else {
    // Show placeholder data when no leave requests exist
    leaveTypeData = [
      { name: 'Sick Leave', value: 0, color: COLORS[0] },
      { name: 'Casual Leave', value: 0, color: COLORS[1] },
      { name: 'Annual Leave', value: 0, color: COLORS[2] },
      { name: 'Other', value: 0, color: COLORS[3] },
    ];
  }

  // Monthly payroll trend (last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Normalize DB month format ("2026-04") to display key ("Apr 2026")
  function normalizeMonth(m: string): string {
    const parts = m.split('-');
    if (parts.length === 2) {
      const mi = parseInt(parts[1], 10) - 1;
      return `${monthNames[mi] || m} ${parts[0]}`;
    }
    return m;
  }

  const payrollByMonth: Record<string, number> = {};
  payroll.forEach(p => {
    if (p.month) {
      const key = normalizeMonth(p.month);
      payrollByMonth[key] = (payrollByMonth[key] || 0) + (p.gross || 0);
    }
  });
  
  // Generate payroll trend from actual data months or show placeholder
  let payrollTrend: { name: string; value: number; color: string }[] = [];
  
  if (Object.keys(payrollByMonth).length > 0) {
    const sortedPayrollMonths = Object.keys(payrollByMonth).sort((a, b) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [am, ay] = a.split(' ');
      const [bm, by] = b.split(' ');
      const ai = monthNames.indexOf(am);
      const bi = monthNames.indexOf(bm);
      if (parseInt(ay) !== parseInt(by)) return parseInt(ay) - parseInt(by);
      return ai - bi;
    });
    const trendMonths = sortedPayrollMonths.slice(-6);
    payrollTrend = trendMonths.map((key, i) => {
      const monthStr = key.split(' ')[0];
      return {
        name: monthStr,
        value: payrollByMonth[key] || 0,
        color: i === trendMonths.length - 1 ? '#f5a623' : '#00d4ff',
      };
    });
  } else {
    // Show placeholder data when no payroll exists
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    payrollTrend = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return {
        name: monthNames[monthIndex],
        value: 0,
        color: i === 5 ? '#f5a623' : '#00d4ff',
      };
    });
  }

  // KPI Cards
  const kpiCards: KpiCardData[] = [
    {
      label: 'All Employees',
      value: totalEmployees,
      sub: `${activeEmployees} Active`,
      icon: Users,
      color: '#f5a623',
      trend: activeEmployees > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Total Payroll',
      value: formatCr(totalPayroll),
      sub: `${payroll.length} Records`,
      icon: Wallet,
      color: '#00e676',
      trend: totalPayroll > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Leave Requests',
      value: pendingLeave,
      sub: `${leaveRequests.length} Total`,
      icon: CalendarOff,
      color: '#ff3d3d',
      trend: pendingLeave > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Open Tickets',
      value: openTickets,
      sub: `${tickets.length} Total`,
      icon: Ticket,
      color: '#00d4ff',
      trend: openTickets > 0 ? 'down' : 'neutral',
    },
    {
      label: 'Pending Claims',
      value: pendingExpenses,
      sub: formatCurrency(expenses.filter(e => e.status?.toLowerCase() === 'pending').reduce((s, e) => s + (e.amount || 0), 0)),
      icon: Plane,
      color: '#a78bfa',
      trend: pendingExpenses > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Projects',
      value: projects.length,
      sub: `${projects.filter(p => p.status === 'On Track').length} On Track`,
      icon: Award,
      color: '#ffab40',
      trend: projects.length > 0 ? 'up' : 'neutral',
    },
  ];

  if (loading) return <Skeleton />;
  if (error) return <div className="p-4 text-center text-[#ff3d3d]">{error}</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Employee Analytics
            </h2>
            <p className="text-[11px] text-[#5a6878]">HRMS › Workforce Overview & Insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#141920] border border-[#2e3a48] rounded-lg px-3 py-2">
            <span className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[#e2e8f0] outline-none text-[11px] cursor-pointer"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            />
          </div>
          <div className="text-[10px] text-[#5a6878]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            Last updated: {new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 hover:border-[#252e3a] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${kpi.color}15` }}
                >
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
                {kpi.trend === 'up' && <TrendingUp size={12} className="text-[#00e676]" />}
                {kpi.trend === 'down' && <TrendingDown size={12} className="text-[#ff3d3d]" />}
              </div>
              <div
                className="text-[20px] font-bold text-[#e2e8f0] mb-[2px]"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              >
                {kpi.value}
              </div>
              <div className="text-[10px] text-[#5a6878]">{kpi.label}</div>
              <div className="text-[9px] text-[#f5a623]/70 mt-1">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Donut Charts — Department & Trade ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart data={deptData} title="Employees by Role" />
        <DonutChart data={roleData} title="Employees by Trade" />
      </div>

      {/* ── Row 3: Horizontal Bars — Attendance Today & Project Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HBarChart
          data={attBarData}
          title={`Attendance for ${new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — ${activeEmployees} Active Employees`}
          barKey="value"
          labelKey="name"
          useTotal={true}
        />
        <HBarChart
          data={projectBarData.length > 0 ? projectBarData : [{ name: 'No Projects', value: 0, color: '#5a6878' }]}
          title="Project Status Overview"
          barKey="value"
          labelKey="name"
        />
      </div>

      {/* ── Row 4: Donut Charts — Site Distribution & Employee Type ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart data={siteData} title="Employees by Site" />
        <DonutChart data={typeData} title="Employees by Type" />
      </div>

      {/* ── Row 5: Payroll Trend & Leave Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {payrollTrend.length > 0 ? (
          <VBarChart data={payrollTrend} title="Monthly Payroll Trend (Gross)" />
        ) : (
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Monthly Payroll Trend (Gross)</span>
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <div className="text-center">
                <Wallet size={32} className="mx-auto text-[#5a6878] mb-2" />
                <p className="text-[11px] text-[#5a6878]">No payroll data available</p>
                <p className="text-[10px] text-[#5a6878] mt-1">Run payroll to see trends</p>
              </div>
            </div>
          </div>
        )}
        
        {leaveTypeData.some(d => d.value > 0) ? (
          <DonutChart data={leaveTypeData} title="Leave by Type" />
        ) : (
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <PieIcon size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e2e8f0]">Leave by Type</span>
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <div className="text-center">
                <CalendarOff size={32} className="mx-auto text-[#5a6878] mb-2" />
                <p className="text-[11px] text-[#5a6878]">No leave requests yet</p>
                <p className="text-[10px] text-[#5a6878] mt-1">Leave data will appear here</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Row 6: Recent attendance table ── */}
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-[#f5a623]" />
          <span className="text-[12px] font-semibold text-[#e2e8f0]">Recent Attendance ({new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})</span>
        </div>
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#161c24]">
              <tr className="text-left text-[#5a6878] border-b border-[#252e3a]">
                <th className="pb-2 font-medium">Emp ID</th>
                <th className="pb-2 font-medium">Employee</th>
                <th className="pb-2 font-medium">Site</th>
                <th className="pb-2 font-medium">Shift</th>
                <th className="pb-2 font-medium">Time In</th>
                <th className="pb-2 font-medium">Time Out</th>
                <th className="pb-2 font-medium">OT</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAtt.slice(0, 10).map((a) => {
                const empName = a.employee?.name || employees.find(e => e.id === a.empId)?.name || 'Unknown';
                const empCode = a.employee?.empId || employees.find(e => e.id === a.empId)?.empId || a.empId || '—';
                const empSite = employees.find(e => e.id === a.empId)?.site || a.site || '—';
                const statusColor = a.status === 'Present' ? '#00e676' : a.status === 'Absent' ? '#ff3d3d' : '#f5a623';
                return (
                  <tr key={a.id} className="border-b border-[#252e3a]/50 hover:bg-[#141920]">
                    <td className="py-2 text-[#f5a623] font-mono">{empCode}</td>
                    <td className="py-2 text-[#e2e8f0]">{empName}</td>
                    <td className="py-2 text-[#8899aa]">{empSite}</td>
                    <td className="py-2 text-[#8899aa]">{a.shift || '—'}</td>
                    <td className="py-2 text-[#8899aa] font-mono">{a.timeIn || '—'}</td>
                    <td className="py-2 text-[#8899aa] font-mono">{a.timeOut || '—'}</td>
                    <td className="py-2 text-[#00d4ff] font-mono">{a.otHours || 0}h</td>
                    <td className="py-2">
                      <span
                        className="inline-block px-2 py-[2px] rounded text-[10px] font-semibold"
                        style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {todayAtt.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#5a6878]">No attendance records for {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
