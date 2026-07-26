'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Upload, Pencil, Trash2, Search, Loader2, X,
  ChevronDown, ChevronRight, Download, FileSpreadsheet,
  CheckSquare, Square, Send, CheckCircle2, XCircle,
  Banknote, Printer, BarChart3, List, RefreshCw, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Site { id: number; name: string; siteCode: string; }

interface ExpenseItem {
  id?: number;
  itemDate: string;
  category: string;
  name: string;
  description: string;
  amount: number;
  remark: string;
}

interface ExpenseClaim {
  id: number;
  claimNo: string;
  siteId: number;
  expenseType: string;
  submittedBy: string;
  date: string;
  receivedAmount: number;
  totalAmount: number;
  status: string;
  approvalStatus: string;
  remarks: string | null;
  postedAt: string | null;
  approvedBy: string | null;
  site?: Site | null;
  items?: ExpenseItem[];
  approvals?: any[];
}

interface FormState {
  claimNo: string;
  siteId: string;
  expenseType: string;
  submittedBy: string;
  date: string;
  receivedAmount: string;
  remarks: string;
  items: ExpenseItem[];
}

interface ParsedSheet {
  name: string;
  items: ExpenseItem[];
  total: number;
  receivedAmount: number;
  selected: boolean;
  receivedBy: string;
  receivedDate: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_ITEM: ExpenseItem = { itemDate: '', category: '', name: '', description: '', amount: 0, remark: '' };
const EMPTY_FORM: FormState = {
  claimNo: '', siteId: '', expenseType: '', submittedBy: '',
  date: new Date().toISOString().split('T')[0], receivedAmount: '0', remarks: '',
  items: [{ ...EMPTY_ITEM }],
};
const EXPENSE_TYPES = ['GAP FOODING','BIKE Maintanance','Sattionary GAP','ABF','Advance','LAPANGA PROJECT HOUSE','PROJECT EXPENSES','Fuel','Other'];
const SUMMARY_SHEETS = ['final sheet','summary','sheet1'];
const STATUS_FLOW: Record<string, string> = { Draft:'Pending', Pending:'Approved', Approved:'Posted' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const statusCls = (s: string) => ({
  Draft:'bg-[#252e3a] text-[#8899aa]', Pending:'bg-[#f5a623]/15 text-[#f5a623]',
  Approved:'bg-[#00e676]/15 text-[#00e676]', Rejected:'bg-[#ff3d3d]/15 text-[#ff3d3d]', Posted:'bg-[#00d4ff]/15 text-[#00d4ff]',
} as Record<string,string>)[s] ?? 'bg-[#252e3a] text-[#8899aa]';

const cellCls = 'w-full bg-[#0d1117] border border-[#252e3a] rounded px-1.5 py-1 text-[11px] text-[#e2e8f0] outline-none focus:border-[#f5a623] placeholder:text-[#3a4858]';

function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1 block">
      {children}{req && <span className="text-[#ff3d3d] ml-0.5">*</span>}
    </label>
  );
}

function StatCard({ color, label, value, sub }: { color: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="vc-stat-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold mb-1">{label}</div>
      <div className="text-[20px] font-bold leading-none" style={{ color, fontFamily:"'Barlow Condensed',sans-serif" }}>{value}</div>
      {sub && <div className="text-[10px] text-[#5a6878] mt-0.5">{sub}</div>}
    </div>
  );
}

function parseExcelDate(v: any): string {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[.,/](\d{1,2})[.,/](\d{2,4})$/);
  if (m) { const [,dd,mm,yy]=m; return `${yy.length===2?'20'+yy:yy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`; }
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

async function parseWorkbook(file: File): Promise<ParsedSheet[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const result: ParsedSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    if (SUMMARY_SHEETS.some(s => sheetName.toLowerCase().includes(s))) continue;
    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find the data header row (col A = "Date" or "Received Date" or "S No")
    let headerIdx = -1;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
      const col0 = String(rawRows[i][0] ?? '').trim().toLowerCase();
      if (col0 === 'date' || col0 === 'received date' || col0 === 's no' || col0 === 's.no') {
        headerIdx = i; headers = rawRows[i].map((h:any) => String(h).trim()); break;
      }
    }
    if (headerIdx === -1) continue;

    // Extract header-section metadata by scanning all cells before the data header row
    let receivedBy = '', receivedDate = '', receivedAmt = 0;
    for (let i = 0; i < headerIdx; i++) {
      const row = rawRows[i];
      for (let j = 0; j < row.length; j++) {
        const label = String(row[j] ?? '').trim().toLowerCase();

        // "Incurred Amount" or "Received Amount" — value is same-row next cell,
        // OR next row same column if current cell is 0
        if (label.includes('incurred amount') || label.includes('received amount')) {
          const sameRow = Number(row[j + 1] ?? 0);
          const nextRow = i + 1 < headerIdx ? Number(rawRows[i + 1]?.[j + 1] ?? 0) : 0;
          const v = sameRow > 0 ? sameRow : nextRow;
          if (v > 0 && !receivedAmt) receivedAmt = v;
        }

        // "Received Date" label — value is next cell
        if (label === 'received date' && !receivedDate) {
          receivedDate = parseExcelDate(row[j + 1]);
        }

        // "Paid To" / "Received By" / "Given To" label — value is next cell;
        // if blank, look down the same column across subsequent rows
        if ((label === 'paid to' || label === 'received by' || label === 'given to') && !receivedBy) {
          const sameCell = String(row[j + 1] ?? '').trim();
          if (sameCell) {
            receivedBy = sameCell;
          } else {
            // look at the next rows, same column position
            for (let k = i + 1; k < headerIdx; k++) {
              const v = String(rawRows[k]?.[j + 1] ?? '').trim();
              if (v) { receivedBy = v; break; }
            }
          }
        }
      }

      // ABF-style: rows with a date in col A and a name in col B are receipt entries
      const col0 = String(row[0] ?? '').trim();
      const col1 = String(row[1] ?? '').trim();
      if (!receivedDate && parseExcelDate(col0) && col1 && !col1.toLowerCase().includes('amount') && !col1.toLowerCase().includes('date') && !col1.toLowerCase().includes('by')) {
        receivedDate = parseExcelDate(col0);
        receivedBy = receivedBy || col1;
      }
    }

    // Column detection (using detected headers array)
    const hi = (label: string) => headers.findIndex(h => h.toLowerCase().replace(/[.\s]/g,'') === label.toLowerCase().replace(/[.\s]/g,''));
    const hiC = (sub: string) => headers.findIndex(h => h.toLowerCase().includes(sub.toLowerCase()));

    const idxArea = hi('Area'); const idxReNo = hiC('Re.');
    const idxName = hi('Name') >= 0 ? hi('Name') : (hiC('Paid To') >= 0 ? hiC('Paid To') : (hiC('Given To') >= 0 ? hiC('Given To') : hiC('Received By')));
    const idxRecBy = hiC('Given To') >= 0 ? hiC('Given To') : hiC('Received By');
    const idxDesc = hi('Description') >= 0 ? hi('Description') : (hiC('Detais') >= 0 ? hiC('Detais') : hiC('Details'));
    const idxDetails = hi('Details');
    const idxFood = hiC('Fooding'); const idxAdvance = hi('Advance');
    const idxIncurred = hiC('Incurred'); const idxRemark = hiC('Remark');

    // *** THE FIX: use range: headerIdx so sheet_to_json uses the correct header row ***
    const dataRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', range: headerIdx });
    const items: ExpenseItem[] = [];

    // Build a helper that reads a row value by header index (handles duplicate/empty header names)
    const rowVal = (row: any, idx: number): string => {
      if (idx < 0) return '';
      const key = headers[idx];
      if (!key) return '';
      // If the key appears once, use it directly; if empty/duplicate, use __EMPTY_N fallback
      const directVal = row[key];
      if (directVal !== undefined && directVal !== '') return String(directVal).trim();
      // xlsx uses __EMPTY, __EMPTY_1, __EMPTY_2 … for blank header cells
      const emptyKey = idx === 0 ? '__EMPTY' : `__EMPTY_${idx - 1}`;
      return String(row[emptyKey] ?? '').trim();
    };

    for (const row of dataRows) {
      const c0 = String(Object.values(row)[0] ?? '').trim().toLowerCase();
      if (c0.includes('total') || c0.includes('grand')) continue;

      // Amount — prefer 'Advance', then 'Incurred Price ', then generic 'Amount'
      let amount = 0;
      if (idxAdvance >= 0) amount = Number(rowVal(row, idxAdvance)) || 0;
      if (!amount && idxIncurred >= 0) amount = Number(rowVal(row, idxIncurred)) || 0;
      if (!amount) amount = Number(row['Amount'] ?? row['amount'] ?? 0);

      const dateVal = rowVal(row, 0) || row['Date'] || row['date'];
      if (!amount && !dateVal) continue;

      // Area
      let area = idxArea >= 0 ? rowVal(row, idxArea) : '';
      if (!area && idxReNo >= 0) area = rowVal(row, idxReNo);

      // Name
      let name = idxName >= 0 ? rowVal(row, idxName) : '';
      if (!name && idxRecBy >= 0) name = rowVal(row, idxRecBy);

      // Description — when both Description + Details exist: Description = who, Details = what
      let description = '';
      if (idxDetails >= 0 && idxDesc >= 0) {
        name = name || rowVal(row, idxDesc);
        description = rowVal(row, idxDetails);
      } else if (idxDetails >= 0) {
        description = rowVal(row, idxDetails);
      } else if (idxDesc >= 0) {
        description = rowVal(row, idxDesc);
      }
      if (!description && idxFood >= 0) description = rowVal(row, idxFood);
      if (!description) description = String(row['Description'] ?? row['Detais'] ?? row['description'] ?? '').trim();

      const remark = idxRemark >= 0 ? rowVal(row, idxRemark) : '';
      const itemDate = parseExcelDate(dateVal);

      if (!amount && !description && !name) continue;
      items.push({ itemDate, category: area, name, description, amount, remark });
    }
    if (!items.length) continue;

    result.push({
      name: sheetName,
      items,
      total: items.reduce((s, i) => s + i.amount, 0),
      receivedAmount: receivedAmt,
      selected: true,
      receivedBy,
      receivedDate,
    });
  }
  return result;
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function printClaim(claim: ExpenseClaim) {
  const items = claim.items ?? [];
  const balance = claim.receivedAmount - claim.totalAmount;
  const rows = items.map(it => `
    <tr>
      <td>${(it as any).itemDate?.split?.('T')[0] ?? ''}</td>
      <td>${it.category}</td>
      <td>${(it as any).name ?? ''}</td>
      <td>${it.description}</td>
      <td class="num">${it.amount > 0 ? it.amount.toLocaleString('en-IN') : ''}</td>
      <td>${(it as any).remark ?? ''}</td>
    </tr>`).join('');

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${claim.claimNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff;padding:20px}
    @media print{.no-print{display:none}body{padding:0}}
    .header{display:grid;grid-template-columns:1fr auto;align-items:start;padding:10px 14px;border-bottom:2px solid #1a1a1a;background:rgba(245,166,35,0.15);gap:10px;margin-bottom:12px}
    .header h1{font-size:20px;font-weight:bold;letter-spacing:1px;margin:0 0 2px}
    .header h2{font-size:13px;font-weight:600;color:#666;margin:0}
    .meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;font-size:10px}
    .meta-box{border:1px solid #e5e5e5;border-radius:4px;padding:6px 8px;background:#fafafa}
    .meta-box label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:bold;margin-bottom:2px}
    .meta-box span{font-size:12px;font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:10px}
    thead tr{background:rgba(245,166,35,0.15)}
    th{padding:5px 6px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd;font-weight:700}
    td{padding:4px 6px;border:1px solid #eee}
    .num{text-align:right;font-weight:600}
    .total-row td{font-weight:bold;background:#fafafa;border-top:2px solid #1a1a1a}
    .balance-section{margin-top:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:11px}
    .bal-box{border:1px solid #ddd;border-radius:4px;padding:8px;text-align:center}
    .bal-box label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:bold;margin-bottom:3px}
    .bal-box .val{font-size:16px;font-weight:bold}
    .green{color:#059669}.red{color:#dc2626}.amber{color:#d97706}
    .footer{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:24px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;text-align:center}
    .footer div{border-top:1px solid #1a1a1a;padding-top:4px;margin-top:20px}
    .btn-row{display:flex;gap:8px;margin-bottom:16px}
    button{padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
  </style></head><body>
  <div class="no-print btn-row">
    <button onclick="window.print()" style="background:#f5a623;color:#0a0d12">Print / Save PDF</button>
    <button onclick="window.close()" style="background:#252e3a;color:#e2e8f0">Close</button>
  </div>
  <div class="header">
    <div>
      <h1>UAPASANA ASSOCIATE</h1>
      <h2>${claim.expenseType || 'Site Expense'} — ${claim.site?.name ?? ''}</h2>
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px">Claim No</div>
      <div style="font-size:18px;font-weight:bold">${claim.claimNo}</div>
      <div style="font-size:10px;color:#666">Date: ${claim.date?.split('T')[0]}</div>
    </div>
  </div>
  <div class="meta">
    <div class="meta-box"><label>Received By / Paid To</label><span>${claim.submittedBy}</span></div>
    <div class="meta-box"><label>Month</label><span>${new Date(claim.date).toLocaleString('en-IN',{month:'long',year:'numeric'})}</span></div>
    <div class="meta-box"><label>Status</label><span>${claim.status}</span></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Area</th><th>Name</th><th>Description</th><th style="text-align:right">Advance (₹)</th><th>Remark</th></tr></thead>
    <tbody>${rows}</tbody>
    <tr class="total-row"><td colspan="4" style="text-align:right">Total Incurred</td><td class="num">₹${claim.totalAmount.toLocaleString('en-IN',{maximumFractionDigits:2})}</td><td></td></tr>
  </table>
  <div class="balance-section">
    <div class="bal-box"><label>Received Amount</label><div class="val amber">₹${claim.receivedAmount.toLocaleString('en-IN',{maximumFractionDigits:2})}</div></div>
    <div class="bal-box"><label>Incurred Amount</label><div class="val amber">₹${claim.totalAmount.toLocaleString('en-IN',{maximumFractionDigits:2})}</div></div>
    <div class="bal-box"><label>Balance</label><div class="val ${balance >= 0 ? 'green' : 'red'}">₹${Math.abs(balance).toLocaleString('en-IN',{maximumFractionDigits:2})}${balance < 0 ? ' (Due)' : ''}</div></div>
  </div>
  ${claim.remarks ? `<p style="margin-top:10px;font-size:10px;color:#666">Remarks: ${claim.remarks}</p>` : ''}
  <div class="footer">
    <div>Prepared By</div><div>Checked By</div><div>Authorized By</div><div>Approved By</div>
  </div>
  </body></html>`);
  win.document.close();
}

function printSummary(records: ExpenseClaim[], month: string, siteName: string) {
  // Group by expense type
  const grouped: Record<string, { received: number; incurred: number; claims: number; status: string }> = {};
  for (const r of records) {
    const k = r.expenseType || 'Other';
    if (!grouped[k]) grouped[k] = { received: 0, incurred: 0, claims: 0, status: r.status };
    grouped[k].received += r.receivedAmount;
    grouped[k].incurred += r.totalAmount;
    grouped[k].claims++;
    if (r.status !== 'Posted' && r.status !== 'Approved') grouped[k].status = r.status;
  }
  const totalReceived = Object.values(grouped).reduce((s, g) => s + g.received, 0);
  const totalIncurred = Object.values(grouped).reduce((s, g) => s + g.incurred, 0);
  const rows = Object.entries(grouped).map(([type, g]) => `
    <tr>
      <td>${type}</td>
      <td class="num">${g.received > 0 ? '₹'+g.received.toLocaleString('en-IN',{maximumFractionDigits:2}) : '—'}</td>
      <td class="num">₹${g.incurred.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
      <td class="num ${g.received - g.incurred >= 0 ? 'green' : 'red'}">₹${Math.abs(g.received - g.incurred).toLocaleString('en-IN',{maximumFractionDigits:2})}${g.received - g.incurred < 0 ? ' (Due)' : ''}</td>
      <td>${g.status}</td>
    </tr>`).join('');
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Monthly Summary</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:20px}
    @media print{.no-print{display:none}body{padding:0}}
    .header{padding:10px 14px;border-bottom:2px solid #1a1a1a;background:rgba(245,166,35,0.15);margin-bottom:14px}
    .header h1{font-size:22px;font-weight:bold}.header h2{font-size:13px;color:#555;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead tr{background:rgba(245,166,35,0.15)}
    th{padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px;border:1px solid #ddd;font-weight:700}
    td{padding:5px 8px;border:1px solid #eee}
    .num{text-align:right;font-weight:600}.green{color:#059669}.red{color:#dc2626}
    .total-row td{font-weight:bold;background:#fafafa;border-top:2px solid #1a1a1a}
    .footer{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:28px;padding-top:8px;border-top:1px solid #ddd;font-size:9px;text-align:center}
    .footer div{border-top:1px solid #1a1a1a;padding-top:4px;margin-top:20px}
    .btn-row{display:flex;gap:8px;margin-bottom:16px}
    button{padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
  </style></head><body>
  <div class="no-print btn-row">
    <button onclick="window.print()" style="background:#f5a623;color:#0a0d12">Print / Save PDF</button>
    <button onclick="window.close()" style="background:#252e3a;color:#e2e8f0">Close</button>
  </div>
  <div class="header">
    <h1>UAPASANA ASSOCIATE</h1>
    <h2>Monthly Site Expense Summary — ${month}${siteName ? ' | ' + siteName : ''}</h2>
  </div>
  <table>
    <thead><tr><th>Expense Type</th><th style="text-align:right">Received Amount</th><th style="text-align:right">Incurred Amount</th><th style="text-align:right">Balance</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="num">₹${totalReceived.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
      <td class="num">₹${totalIncurred.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
      <td class="num ${totalReceived - totalIncurred >= 0 ? 'green' : 'red'}">₹${Math.abs(totalReceived - totalIncurred).toLocaleString('en-IN',{maximumFractionDigits:2})}${totalReceived - totalIncurred < 0 ? ' (Due)' : ''}</td>
      <td></td>
    </tr>
  </table>
  <div class="footer">
    <div>Prepared By</div><div>Checked By</div><div>Authorized By</div><div>Approved By</div>
  </div>
  </body></html>`);
  win.document.close();
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FinSiteExpenses() {
  const [records, setRecords] = useState<ExpenseClaim[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [view, setView] = useState<'claims' | 'summary'>('claims');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // month filter — default to current month
  const [monthFilter, setMonthFilter] = useState('');

  // form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // import
  const [showImport, setShowImport] = useState(false);
  const [importSiteId, setImportSiteId] = useState('');
  const [importSheets, setImportSheets] = useState<ParsedSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // action loading
  const [actionId, setActionId] = useState<number | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (siteFilter) p.set('siteId', siteFilter);
      if (statusFilter !== 'All') p.set('status', statusFilter);
      if (search) p.set('search', search);
      if (monthFilter) p.set('month', monthFilter);
      const res = await fetch('/api/fin/site-expenses?' + p);
      const json = await res.json();
      if (json.success) { setRecords(json.data); setSites(json.sites); }
    } catch { /* handled below */ }
    finally { setLoading(false); }
  }, [siteFilter, statusFilter, search, monthFilter]);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/fin/sites');
      const json = await res.json();
      if (json.success) setSites(json.data);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); fetchSites(); }, [fetchData, fetchSites]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalReceived = records.reduce((s, r) => s + r.receivedAmount, 0);
  const totalIncurred = records.reduce((s, r) => s + r.totalAmount, 0);
  const balance = totalReceived - totalIncurred;

  // ── Workflow ──────────────────────────────────────────────────────────────

  const doAction = async (id: number, action: string, extra?: any) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/fin/site-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const labels: Record<string,string> = { submit:'Submitted for approval', approve:'Approved', reject:'Rejected', pay:'Marked as Paid' };
      toast.success(labels[action] ?? 'Updated');
      setRecords(prev => prev.map(r => r.id === id ? json.data : r));
    } catch (e: any) { toast.error(e.message || 'Action failed'); }
    finally { setActionId(null); }
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0], items: [{ ...EMPTY_ITEM }] });
    setShowForm(true);
  };

  const openEdit = (r: ExpenseClaim) => {
    setEditId(r.id);
    setForm({
      claimNo: r.claimNo, siteId: String(r.siteId),
      expenseType: r.expenseType ?? '', submittedBy: r.submittedBy,
      date: r.date?.split('T')[0] ?? '',
      receivedAmount: String(r.receivedAmount ?? 0),
      remarks: r.remarks ?? '',
      items: r.items?.length
        ? r.items.map(i => ({
            id: i.id,
            itemDate: (i as any).itemDate?.split?.('T')[0] ?? '',
            category: i.category ?? '', name: (i as any).name ?? '',
            description: i.description ?? '', amount: i.amount, remark: (i as any).remark ?? '',
          }))
        : [{ ...EMPTY_ITEM }],
    });
    setShowForm(true);
  };

  const patchItem = (i: number, p: Partial<ExpenseItem>) =>
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...p } : it) }));

  const addRow = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeRow = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) }));

  const save = async () => {
    if (!form.siteId) { toast.error('Site is required'); return; }
    setSaving(true);
    try {
      const body = { ...form, siteId: Number(form.siteId), receivedAmount: Number(form.receivedAmount) || 0,
        items: form.items.filter(it => it.description || it.name || it.amount > 0) };
      const url = editId ? `/api/fin/site-expenses/${editId}` : '/api/fin/site-expenses';
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(editId ? 'Updated' : 'Created');
      setShowForm(false); fetchData();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteRecord = async (id: number) => {
    if (!confirm('Delete this expense claim?')) return;
    try {
      await fetch(`/api/fin/site-expenses/${id}`, { method: 'DELETE' });
      toast.success('Deleted'); fetchData();
    } catch { toast.error('Delete failed'); }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows: any[] = [];
    for (const r of records) {
      const base = { 'Claim No':r.claimNo, 'Expense Type':r.expenseType??'', 'Site':r.site?.name??'',
        'Received Date':r.date?.split('T')[0]??'', 'Received By':r.submittedBy,
        'Received Amount':r.receivedAmount, 'Status':r.status };
      if (!r.items?.length) { rows.push({ ...base, Date:'', Area:'', Name:'', Description:'', Advance:r.totalAmount, Remark:'' }); }
      else { for (const it of r.items) rows.push({ ...base, Date:(it as any).itemDate?.split?.('T')[0]??'', Area:it.category, Name:(it as any).name??'', Description:it.description, Advance:it.amount, Remark:(it as any).remark??'' }); }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Site Expenses');
    XLSX.writeFile(wb, `site-expenses-${monthFilter}.xlsx`); toast.success('Exported');
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleFile = async (f: File) => {
    try {
      const sheets = await parseWorkbook(f);
      if (!sheets.length) { toast.error('No valid expense data found'); return; }
      setImportSheets(sheets); setActiveSheet(0);
    } catch (e: any) { toast.error('Parse error: ' + (e.message ?? '')); }
  };

  const submitImport = async () => {
    if (!importSiteId) { toast.error('Select a site'); return; }
    const selected = importSheets.filter(s => s.selected);
    if (!selected.length) { toast.error('Select at least one sheet'); return; }
    setImporting(true);
    let created = 0;
    try {
      for (const sheet of selected) {
        const res = await fetch('/api/fin/site-expenses', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId: Number(importSiteId), expenseType: sheet.name,
            submittedBy: sheet.receivedBy || 'Import',
            date: sheet.receivedDate || new Date().toISOString().split('T')[0],
            receivedAmount: sheet.receivedAmount,
            items: sheet.items,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(`"${sheet.name}": ${json.error}`);
        created++;
      }
      toast.success(`Imported ${created} claim${created !== 1 ? 's' : ''}`);
      setShowImport(false); setImportSheets([]); fetchData();
    } catch (e: any) { toast.error(e.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  // ── Summary computation ───────────────────────────────────────────────────

  const summaryByType = (() => {
    const m: Record<string, { received: number; incurred: number; claims: ExpenseClaim[] }> = {};
    for (const r of records) {
      const k = r.expenseType || 'Other';
      if (!m[k]) m[k] = { received: 0, incurred: 0, claims: [] };
      m[k].received += r.receivedAmount;
      m[k].incurred += r.totalAmount;
      m[k].claims.push(r);
    }
    return m;
  })();

  // ── Grouped Claims view ───────────────────────────────────────────────────

  const filteredRecords = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.claimNo.toLowerCase().includes(q) || r.submittedBy.toLowerCase().includes(q) ||
      (r.expenseType ?? '').toLowerCase().includes(q) || (r.site?.name ?? '').toLowerCase().includes(q);
  });

  const groupedByType = (() => {
    const m: Record<string, ExpenseClaim[]> = {};
    for (const r of filteredRecords) {
      const k = r.expenseType || 'Other';
      if (!m[k]) m[k] = [];
      m[k].push(r);
    }
    return m;
  })();

  const toggleType = (t: string) => setExpandedTypes(s => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const toggleRow = (id: number) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const monthLabel = (() => {
    const [y,m] = monthFilter.split('-');
    return new Date(Number(y), Number(m)-1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  })();

  const selSite = sites.find(s => String(s.id) === siteFilter);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0d1117] p-4 space-y-4">

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard color="#f5a623" label="Claims" value={records.length} sub={monthLabel} />
        <StatCard color="#00d4ff" label="Received" value={fmt(totalReceived)} />
        <StatCard color="#f5a623" label="Incurred" value={fmt(totalIncurred)} />
        <StatCard color={balance >= 0 ? '#00e676' : '#ff3d3d'} label="Balance" value={fmt(Math.abs(balance))} sub={balance < 0 ? 'Due to HO' : 'Surplus'} />
      </div>

      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <div className="vc-panel">
        {/* Toolbar */}
        <div className="vc-panel-header px-4 py-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* View tabs */}
            <div className="flex items-center gap-1 bg-[#0d1117] rounded-lg p-1">
              <button onClick={() => setView('claims')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${view === 'claims' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'text-[#5a6878] hover:text-[#e2e8f0]'}`}>
                <List size={12} /> Claims
              </button>
              <button onClick={() => setView('summary')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${view === 'summary' ? 'bg-[#f5a623]/15 text-[#f5a623]' : 'text-[#5a6878] hover:text-[#e2e8f0]'}`}>
                <BarChart3 size={12} /> Summary
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => { setShowImport(true); setImportSheets([]); }} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
                <Upload size={13} /> Import
              </button>
              <button onClick={exportExcel} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
                <Download size={13} /> Export
              </button>
              {view === 'summary' && (
                <button onClick={() => printSummary(records, monthLabel, selSite?.name ?? '')} className="vc-btn-ghost flex items-center gap-1.5 text-[11px]">
                  <Printer size={13} /> Print Summary
                </button>
              )}
              <button onClick={openCreate} className="vc-btn-primary flex items-center gap-1.5 text-[11px]">
                <Plus size={13} /> New Expense
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="vc-input py-1.5 text-[12px] w-36"
            />
            <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="vc-input py-1.5 text-[12px] w-40">
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="vc-input py-1.5 text-[12px] w-28">
              {['All','Draft','Pending','Approved','Rejected','Posted'].map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5a6878] pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="vc-input pl-8 py-1.5 text-[12px] w-44" />
            </div>
            <button onClick={fetchData} className="p-1.5 text-[#5a6878] hover:text-[#f5a623]" title="Refresh">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── CLAIMS VIEW ──────────────────────────────────────────────── */}
        {view === 'claims' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-[#5a6878]"><Loader2 size={20} className="animate-spin inline mr-2" />Loading…</div>
            ) : Object.keys(groupedByType).length === 0 ? (
              <div className="py-16 text-center text-[#5a6878]">No expenses found for {monthLabel}.</div>
            ) : Object.entries(groupedByType).map(([type, claims]) => {
              const typeTotal = claims.reduce((s, r) => s + r.totalAmount, 0);
              const typeReceived = claims.reduce((s, r) => s + r.receivedAmount, 0);
              const isOpen = expandedTypes.has(type);
              return (
                <div key={type} className="border-t border-[#1a2028]">
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 bg-[#0f1318] hover:bg-[#141920] cursor-pointer"
                    onClick={() => toggleType(type)}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={14} className="text-[#f5a623]" /> : <ChevronRight size={14} className="text-[#5a6878]" />}
                      <span className="text-[12px] font-semibold text-[#f5a623]">{type}</span>
                      <span className="text-[10px] text-[#5a6878]">{claims.length} claim{claims.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      {typeReceived > 0 && <span className="text-[#8899aa]">Recv: <span className="text-[#00d4ff] font-semibold">{fmt(typeReceived)}</span></span>}
                      <span className="text-[#8899aa]">Incurred: <span className="text-[#f5a623] font-semibold">{fmt(typeTotal)}</span></span>
                    </div>
                  </div>

                  {/* Claims under this type */}
                  {isOpen && (
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#0d1117] text-[#5a6878] text-[10px] uppercase tracking-[1px]">
                          <th className="px-3 py-1.5 w-8" />
                          <th className="px-3 py-1.5 text-left">Claim No</th>
                          <th className="px-3 py-1.5 text-left">Site</th>
                          <th className="px-3 py-1.5 text-left">Date</th>
                          <th className="px-3 py-1.5 text-left">Received By</th>
                          <th className="px-3 py-1.5 text-right">Received</th>
                          <th className="px-3 py-1.5 text-right">Incurred</th>
                          <th className="px-3 py-1.5 text-right">Balance</th>
                          <th className="px-3 py-1.5 text-center">Status</th>
                          <th className="px-3 py-1.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claims.map(r => {
                          const bal = r.receivedAmount - r.totalAmount;
                          const isExp = expanded.has(r.id);
                          return (
                            <React.Fragment key={r.id}>
                              <tr className="border-t border-[#1a2028] hover:bg-[#141920] transition-colors">
                                <td className="px-3 py-2">
                                  <button onClick={() => toggleRow(r.id)} className="text-[#5a6878] hover:text-[#f5a623]">
                                    {isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                  </button>
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px] text-[#e2e8f0]">{r.claimNo}</td>
                                <td className="px-3 py-2 text-[#e2e8f0]">{r.site?.name ?? '—'}</td>
                                <td className="px-3 py-2 text-[#8899aa]">{r.date?.split('T')[0]}</td>
                                <td className="px-3 py-2 text-[#e2e8f0]">{r.submittedBy}</td>
                                <td className="px-3 py-2 text-right text-[#00d4ff] font-medium">{r.receivedAmount > 0 ? fmt(r.receivedAmount) : '—'}</td>
                                <td className="px-3 py-2 text-right text-[#f5a623] font-semibold">{fmt(r.totalAmount)}</td>
                                <td className={`px-3 py-2 text-right font-semibold text-[11px] ${bal >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                                  {bal < 0 ? '-' : ''}{fmt(Math.abs(bal))}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${statusCls(r.status)}`}>{r.status}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    {/* Workflow buttons */}
                                    {r.status === 'Draft' && (
                                      <button onClick={() => doAction(r.id, 'submit')} disabled={actionId === r.id} title="Submit for Approval" className="p-1 text-[#f5a623] hover:bg-[#f5a623]/15 rounded">
                                        {actionId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                      </button>
                                    )}
                                    {r.status === 'Pending' && (<>
                                      <button onClick={() => doAction(r.id, 'approve', { role: 'finance' })} disabled={actionId === r.id} title="Approve" className="p-1 text-[#00e676] hover:bg-[#00e676]/15 rounded">
                                        {actionId === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                      </button>
                                      <button onClick={() => doAction(r.id, 'reject', { role: 'finance' })} disabled={actionId === r.id} title="Reject" className="p-1 text-[#ff3d3d] hover:bg-[#ff3d3d]/15 rounded">
                                        <XCircle size={12} />
                                      </button>
                                    </>)}
                                    {r.status === 'Approved' && (
                                      <button onClick={() => doAction(r.id, 'pay')} disabled={actionId === r.id} title="Mark as Paid" className="p-1 text-[#00d4ff] hover:bg-[#00d4ff]/15 rounded">
                                        {actionId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Banknote size={12} />}
                                      </button>
                                    )}
                                    <button onClick={() => printClaim(r)} title="Print" className="p-1 text-[#5a6878] hover:text-[#f5a623]"><Printer size={12} /></button>
                                    <button onClick={() => openEdit(r)} title="Edit" className="p-1 text-[#5a6878] hover:text-[#f5a623]"><Pencil size={12} /></button>
                                    <button onClick={() => deleteRecord(r.id)} title="Delete" className="p-1 text-[#5a6878] hover:text-[#ff3d3d]"><Trash2 size={12} /></button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded items */}
                              {isExp && (
                                <tr className="bg-[#0d1117]">
                                  <td colSpan={10} className="px-8 py-3">
                                    {r.items?.length ? (
                                      <div className="overflow-x-auto rounded border border-[#252e3a]">
                                        <table className="w-full text-[11px]">
                                          <thead>
                                            <tr className="bg-[#0f1318] text-[#5a6878] uppercase text-[9px] tracking-[1px]">
                                              <th className="px-2 py-1.5 text-left">Date</th>
                                              <th className="px-2 py-1.5 text-left">Area</th>
                                              <th className="px-2 py-1.5 text-left">Name</th>
                                              <th className="px-2 py-1.5 text-left">Description</th>
                                              <th className="px-2 py-1.5 text-right">Advance</th>
                                              <th className="px-2 py-1.5 text-left">Remark</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {r.items.map((it, i) => (
                                              <tr key={i} className="border-t border-[#1a2028]">
                                                <td className="px-2 py-1.5 text-[#8899aa]">{(it as any).itemDate?.split?.('T')[0] ?? ''}</td>
                                                <td className="px-2 py-1.5 text-[#e2e8f0]">{it.category}</td>
                                                <td className="px-2 py-1.5 text-[#e2e8f0]">{(it as any).name ?? ''}</td>
                                                <td className="px-2 py-1.5 text-[#e2e8f0]">{it.description}</td>
                                                <td className="px-2 py-1.5 text-right text-[#f5a623] font-semibold">{fmt(it.amount)}</td>
                                                <td className="px-2 py-1.5 text-[#8899aa]">{(it as any).remark ?? ''}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot>
                                            <tr className="border-t-2 border-[#252e3a] bg-[#0f1318]">
                                              <td colSpan={4} className="px-2 py-1.5 text-right text-[9px] text-[#5a6878] font-bold uppercase tracking-[1px]">Total</td>
                                              <td className="px-2 py-1.5 text-right font-bold text-[#f5a623]">{fmt(r.totalAmount)}</td>
                                              <td />
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    ) : <p className="text-[11px] text-[#5a6878]">No items.</p>}
                                    {r.remarks && <p className="mt-1.5 text-[10px] text-[#5a6878]">Remarks: {r.remarks}</p>}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── SUMMARY VIEW ─────────────────────────────────────────────── */}
        {view === 'summary' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-[#5a6878]"><Loader2 size={20} className="animate-spin inline mr-2" />Loading…</div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#0f1318] text-[#5a6878] uppercase text-[10px] tracking-[1px]">
                    <th className="px-4 py-2.5 text-left">Expense Type</th>
                    <th className="px-4 py-2.5 text-center">Claims</th>
                    <th className="px-4 py-2.5 text-right">Received Amount</th>
                    <th className="px-4 py-2.5 text-right">Incurred Amount</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summaryByType).length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-[#5a6878]">No data for {monthLabel}.</td></tr>
                  ) : Object.entries(summaryByType).map(([type, g]) => {
                    const bal = g.received - g.incurred;
                    const allStatus = g.claims.every(c => c.status === g.claims[0].status) ? g.claims[0].status : 'Mixed';
                    return (
                      <tr key={type} className="border-t border-[#1a2028] hover:bg-[#141920]">
                        <td className="px-4 py-3 font-semibold text-[#e2e8f0]">{type}</td>
                        <td className="px-4 py-3 text-center text-[#8899aa]">{g.claims.length}</td>
                        <td className="px-4 py-3 text-right text-[#00d4ff] font-semibold">{g.received > 0 ? fmt(g.received) : '—'}</td>
                        <td className="px-4 py-3 text-right text-[#f5a623] font-semibold">{fmt(g.incurred)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${bal >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                          {bal < 0 ? '−' : ''}{fmt(Math.abs(bal))}{bal < 0 ? ' (Due)' : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${statusCls(allStatus)}`}>{allStatus}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => { setView('claims'); setExpandedTypes(new Set([type])); }} className="text-[#5a6878] hover:text-[#f5a623]" title="View claims">
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#252e3a] bg-[#0f1318]">
                    <td className="px-4 py-3 text-right text-[10px] text-[#5a6878] font-bold uppercase tracking-[1px]" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right font-bold text-[#00d4ff]">{fmt(totalReceived)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#f5a623]">{fmt(totalIncurred)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${balance >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                      {balance < 0 ? '−' : ''}{fmt(Math.abs(balance))}{balance < 0 ? ' (Due)' : ''}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-6 px-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl w-full max-w-5xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#252e3a]">
              <h2 className="text-[14px] font-semibold text-[#e2e8f0]">{editId ? 'Edit Expense Claim' : 'New Expense Claim'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#5a6878] hover:text-[#e2e8f0]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Header fields */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Lbl>Claim No</Lbl>
                  <input value={form.claimNo} onChange={e => setForm(f => ({...f, claimNo: e.target.value}))} placeholder="Auto-generated" className="vc-input text-[12px] py-1.5 w-full" />
                </div>
                <div>
                  <Lbl req>Site</Lbl>
                  <select value={form.siteId} onChange={e => setForm(f => ({...f, siteId: e.target.value}))} className="vc-input text-[12px] py-1.5 w-full">
                    <option value="">Select Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Expense Type</Lbl>
                  <input list="et-list" value={form.expenseType} onChange={e => setForm(f => ({...f, expenseType: e.target.value}))} placeholder="e.g. GAP FOODING" className="vc-input text-[12px] py-1.5 w-full" />
                  <datalist id="et-list">{EXPENSE_TYPES.map(t => <option key={t} value={t} />)}</datalist>
                </div>
                <div>
                  <Lbl>Received Date</Lbl>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="vc-input text-[12px] py-1.5 w-full" />
                </div>
                <div>
                  <Lbl>Received By / Paid To</Lbl>
                  <input value={form.submittedBy} onChange={e => setForm(f => ({...f, submittedBy: e.target.value}))} placeholder="Name" className="vc-input text-[12px] py-1.5 w-full" />
                </div>
                <div>
                  <Lbl>Received Amount (₹)</Lbl>
                  <input type="number" value={form.receivedAmount} onChange={e => setForm(f => ({...f, receivedAmount: e.target.value}))} placeholder="0" className="vc-input text-[12px] py-1.5 w-full" />
                </div>
                <div className="md:col-span-3">
                  <Lbl>Remarks</Lbl>
                  <input value={form.remarks} onChange={e => setForm(f => ({...f, remarks: e.target.value}))} placeholder="Optional" className="vc-input text-[12px] py-1.5 w-full" />
                </div>
              </div>

              {/* Items grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] uppercase tracking-[1.5px] text-[#5a6878] font-bold">Expense Items</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-[#8899aa]">Received: <span className="text-[#00d4ff] font-semibold">{fmt(Number(form.receivedAmount) || 0)}</span></span>
                    <span className="text-[#8899aa]">Incurred: <span className="text-[#f5a623] font-semibold">{fmt(form.items.reduce((s,i) => s + (Number(i.amount)||0), 0))}</span></span>
                    <span className={`font-semibold ${(Number(form.receivedAmount)||0) - form.items.reduce((s,i) => s+(Number(i.amount)||0),0) >= 0 ? 'text-[#00e676]' : 'text-[#ff3d3d]'}`}>
                      Balance: {fmt(Math.abs((Number(form.receivedAmount)||0) - form.items.reduce((s,i) => s+(Number(i.amount)||0),0)))}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded border border-[#252e3a]">
                  <table className="w-full" style={{ minWidth: 720 }}>
                    <thead>
                      <tr className="bg-[#0f1318] text-[#5a6878] uppercase text-[9px] tracking-[1px]">
                        <th className="px-2 py-2 w-6 text-center">#</th>
                        <th className="px-1 py-2 text-left" style={{width:108}}>Date</th>
                        <th className="px-1 py-2 text-left" style={{width:90}}>Area</th>
                        <th className="px-1 py-2 text-left" style={{width:110}}>Name</th>
                        <th className="px-1 py-2 text-left">Description</th>
                        <th className="px-1 py-2 text-right" style={{width:88}}>Advance (₹)</th>
                        <th className="px-1 py-2 text-left" style={{width:110}}>Remark</th>
                        <th className="px-1 py-2 w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, i) => (
                        <tr key={i} className="border-t border-[#1a2028] bg-[#0d1117]">
                          <td className="px-2 py-1 text-center text-[9px] text-[#5a6878]">{i+1}</td>
                          <td className="px-1 py-1"><input type="date" value={it.itemDate} onChange={e => patchItem(i,{itemDate:e.target.value})} className={cellCls} /></td>
                          <td className="px-1 py-1"><input value={it.category} onChange={e => patchItem(i,{category:e.target.value})} placeholder="Area" className={cellCls} /></td>
                          <td className="px-1 py-1"><input value={it.name} onChange={e => patchItem(i,{name:e.target.value})} placeholder="Name" className={cellCls} /></td>
                          <td className="px-1 py-1"><input value={it.description} onChange={e => patchItem(i,{description:e.target.value})} placeholder="Description" className={cellCls} /></td>
                          <td className="px-1 py-1"><input type="number" value={it.amount||''} onChange={e => patchItem(i,{amount:Number(e.target.value)})} placeholder="0" className={cellCls+' text-right'} /></td>
                          <td className="px-1 py-1"><input value={it.remark} onChange={e => patchItem(i,{remark:e.target.value})} placeholder="Remark" className={cellCls} /></td>
                          <td className="px-1 py-1 text-center">
                            {form.items.length > 1 && <button onClick={() => removeRow(i)} className="text-[#5a6878] hover:text-[#ff3d3d]"><X size={12} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addRow} className="mt-2 vc-btn-ghost flex items-center gap-1.5 text-[11px]">
                  <Plus size={12} /> Add Row
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#252e3a]">
              <button onClick={() => setShowForm(false)} className="vc-btn-ghost text-[12px]">Cancel</button>
              <button onClick={save} disabled={saving} className="vc-btn-primary flex items-center gap-1.5 text-[12px]">
                {saving && <Loader2 size={13} className="animate-spin" />}{editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-6 px-4">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-xl w-full max-w-5xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#252e3a]">
              <h2 className="text-[14px] font-semibold text-[#e2e8f0]">Import Excel — Site Expenses</h2>
              <button onClick={() => setShowImport(false)} className="text-[#5a6878] hover:text-[#e2e8f0]"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-end gap-4">
                <div className="w-48">
                  <Lbl req>Site</Lbl>
                  <select value={importSiteId} onChange={e => setImportSiteId(e.target.value)} className="vc-input text-[12px] py-1.5 w-full">
                    <option value="">Select Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <p className="text-[11px] text-[#8899aa] pb-1">Each sheet becomes one expense claim. Columns: <span className="text-[#f5a623] font-mono">Date | Area | Name | Description | Advance | Remark</span></p>
              </div>

              {!importSheets.length ? (
                <div className="border-2 border-dashed border-[#252e3a] rounded-lg p-10 text-center cursor-pointer hover:border-[#f5a623]/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
                  <FileSpreadsheet size={32} className="mx-auto mb-3 text-[#5a6878]" />
                  <p className="text-[13px] text-[#e2e8f0] font-medium mb-1">Click or drag & drop Excel file</p>
                  <p className="text-[11px] text-[#5a6878]">Supports .xlsx, .xls, .csv</p>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Sheet tabs */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {importSheets.map((sh, i) => (
                      <button key={i} onClick={() => setActiveSheet(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${activeSheet === i ? 'bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30' : 'bg-[#0f1318] text-[#8899aa] border border-[#252e3a] hover:text-[#e2e8f0]'}`}>
                        <span onClick={e => { e.stopPropagation(); setImportSheets(s => s.map((x,idx) => idx===i ? {...x,selected:!x.selected} : x)); }}>
                          {sh.selected ? <CheckSquare size={12} className="text-[#00e676]" /> : <Square size={12} className="text-[#5a6878]" />}
                        </span>
                        {sh.name}
                        <span className="text-[9px] text-[#5a6878]">({sh.items.length})</span>
                      </button>
                    ))}
                    <button onClick={() => fileRef.current?.click()} className="px-2 py-1.5 text-[11px] text-[#5a6878] hover:text-[#e2e8f0] border border-[#252e3a] rounded">
                      Change file
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
                  </div>

                  {/* Active sheet preview */}
                  {importSheets[activeSheet] && (
                    <div className="rounded border border-[#252e3a]">
                      <div className="flex items-center justify-between px-3 py-2 bg-[#0f1318] border-b border-[#252e3a]">
                        <div className="flex items-center gap-4">
                          <span className="text-[11px] font-semibold text-[#e2e8f0]">{importSheets[activeSheet].name}</span>
                          {importSheets[activeSheet].receivedBy && <span className="text-[10px] text-[#8899aa]">By: {importSheets[activeSheet].receivedBy}</span>}
                          {importSheets[activeSheet].receivedDate && <span className="text-[10px] text-[#8899aa]">Date: {importSheets[activeSheet].receivedDate}</span>}
                          {importSheets[activeSheet].receivedAmount > 0 && <span className="text-[10px] text-[#00d4ff]">Recv: {fmt(importSheets[activeSheet].receivedAmount)}</span>}
                        </div>
                        <span className="text-[11px] font-bold text-[#f5a623]">Incurred: {fmt(importSheets[activeSheet].total)}</span>
                      </div>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead className="sticky top-0">
                            <tr className="bg-[#0f1318] text-[#5a6878] uppercase tracking-[1px]">
                              <th className="px-2 py-1.5 text-left">Date</th>
                              <th className="px-2 py-1.5 text-left">Area</th>
                              <th className="px-2 py-1.5 text-left">Name</th>
                              <th className="px-2 py-1.5 text-left">Description</th>
                              <th className="px-2 py-1.5 text-right">Advance</th>
                              <th className="px-2 py-1.5 text-left">Remark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importSheets[activeSheet].items.map((it, i) => (
                              <tr key={i} className="border-t border-[#1a2028]">
                                <td className="px-2 py-1 text-[#8899aa]">{it.itemDate}</td>
                                <td className="px-2 py-1 text-[#e2e8f0]">{it.category}</td>
                                <td className="px-2 py-1 text-[#e2e8f0]">{it.name}</td>
                                <td className="px-2 py-1 text-[#e2e8f0]">{it.description}</td>
                                <td className="px-2 py-1 text-right text-[#f5a623] font-medium">{it.amount > 0 ? it.amount : ''}</td>
                                <td className="px-2 py-1 text-[#8899aa]">{it.remark}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-[#252e3a] bg-[#0f1318]">
                              <td colSpan={4} className="px-2 py-1.5 text-right text-[9px] text-[#5a6878] font-bold uppercase tracking-[1px]">Total</td>
                              <td className="px-2 py-1.5 text-right font-bold text-[#f5a623]">{fmt(importSheets[activeSheet].total)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-[#8899aa]">
                    <span><span className="text-[#00e676] font-semibold">{importSheets.filter(s=>s.selected).length}</span> sheet{importSheets.filter(s=>s.selected).length!==1?'s':''} selected</span>
                    <span>·</span>
                    <span><span className="text-[#f5a623] font-semibold">{fmt(importSheets.filter(s=>s.selected).reduce((s,sh)=>s+sh.total,0))}</span> total incurred</span>
                    <span>·</span>
                    <span><span className="text-[#00d4ff] font-semibold">{fmt(importSheets.filter(s=>s.selected).reduce((s,sh)=>s+sh.receivedAmount,0))}</span> received</span>
                    <span>·</span>
                    <span>{importSheets.filter(s=>s.selected).reduce((s,sh)=>s+sh.items.length,0)} rows</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#252e3a]">
              <button onClick={() => setShowImport(false)} className="vc-btn-ghost text-[12px]">Cancel</button>
              <button onClick={submitImport} disabled={importing || !importSheets.some(s=>s.selected)} className="vc-btn-primary flex items-center gap-1.5 text-[12px]">
                {importing && <Loader2 size={13} className="animate-spin" />}
                Import {importSheets.filter(s=>s.selected).length > 0 ? `${importSheets.filter(s=>s.selected).length} Sheet${importSheets.filter(s=>s.selected).length!==1?'s':''}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
