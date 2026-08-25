'use client';

import { Printer, X } from 'lucide-react';
import { useCompanyProfile } from '@/hooks/use-company-profile';

interface InvoiceData {
  id: number;
  invoiceNo: string;
  trackingNo?: string | null;
  poNo?: string | null;
  invoiceDate: string;
  eInvoiceDate?: string | null;
  dueDate: string;
  month?: string | null;
  area?: string | null;
  client?: string | null;
  invoiceValue: number;
  gstValue: number;
  grandTotal: number;
  balanceAmount: number;
  description?: string | null;
  remarks?: string | null;
  status: string;
  site?: { name: string; location?: string | null; state?: string | null } | null;
  party?: { name: string; gstin?: string | null; address?: string | null; state?: string | null; taxType?: string | null } | null;
}

// ── Supplier (issuer) fallback — used until Settings › Branding is configured ──
const DEFAULT_SUPPLIER = {
  name: 'M/S. UPASANA ASSOCIATE',
  address: 'AT- UPASANA VILLA, IN FRONT OF MAMTA MARBLE, BEHERAMAL, DIST- JHARSUGUDA - 768203 (ODISHA)',
  email: 'upasanassociate@gmail.com',
  phone: '9668026026',
  pan: 'EYQPS9657P',
  stateCode: '21',
  gstin: '21EYQPS9657P1Z4',
  bankName: 'BANDHAN BANK',
  accountNo: '10200003587483',
  ifsc: 'BDBL0001747',
};

// ── Declaration fallback — used until Settings › Document Header & Footer is configured ──
const DEFAULT_DECLARATION = 'CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT AND THE AMOUNT INDICATED REPRESENTS THE PRICE ACTUALLY CHARGED BY US AND THERE IS NO FLOW OF ADDITIONAL CONDITION DIRECTLY OR INDIRECTLY FROM THE BUYER. (E&O.E.)';

// ── Number to Indian words ──
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };
  return inWords(Math.round(num));
}

function fmt(n: number | undefined | null): string {
  return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  } catch { return String(d); }
}

export default function InvoiceDocument({ invoice, onClose }: { invoice: InvoiceData; onClose: () => void }) {
  const handlePrint = () => window.print();
  const profile = useCompanyProfile();
  const SUPPLIER = {
    name: profile.name || DEFAULT_SUPPLIER.name,
    address: profile.address || DEFAULT_SUPPLIER.address,
    email: profile.email || DEFAULT_SUPPLIER.email,
    phone: profile.phone || DEFAULT_SUPPLIER.phone,
    pan: profile.pan || DEFAULT_SUPPLIER.pan,
    stateCode: profile.stateCode || DEFAULT_SUPPLIER.stateCode,
    gstin: profile.gstin || DEFAULT_SUPPLIER.gstin,
    bankName: profile.bankName || DEFAULT_SUPPLIER.bankName,
    accountNo: profile.bankAccount || DEFAULT_SUPPLIER.accountNo,
    ifsc: profile.bankIfsc || DEFAULT_SUPPLIER.ifsc,
    logoUrl: profile.logoUrl,
  };

  // GST split — driven by the party's own Tax Type setting (Party Master),
  // so every document for that party calculates the same way. 'Auto' (the
  // default) falls back to comparing the recipient's state against the
  // supplier's; when both are unknown under Auto, default to intra-state
  // rather than guessing IGST. 'Exempt/SEZ' zeroes out GST entirely.
  const taxType = invoice.party?.taxType || 'Auto';
  const isExempt = taxType === 'Exempt/SEZ';
  const sameState = taxType === 'Intra-State (CGST+SGST)' ? true
    : taxType === 'Inter-State (IGST)' ? false
    : (!invoice.party?.state || !profile.state || invoice.party.state.trim().toLowerCase() === profile.state.trim().toLowerCase());
  const cgstAmt = isExempt ? 0 : sameState ? invoice.gstValue / 2 : 0;
  const sgstAmt = isExempt ? 0 : sameState ? invoice.gstValue / 2 : 0;
  const igstAmt = isExempt ? 0 : sameState ? 0 : invoice.gstValue;
  const showCgstSgst = !isExempt && sameState;
  const showIgst = !isExempt && !sameState;
  const recipientName = invoice.party?.name || invoice.client || 'N/A';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-8 print:bg-white print:p-0 print:block print:overflow-visible">
      <style>{`
        /* Keep everything inside the sheet on screen and in print */
        #invoice-printable, #invoice-printable * { box-sizing: border-box; }
        #invoice-printable table { table-layout: fixed; width: 100%; }
        /* Wrap at word boundaries first; only break mid-word as a last resort
           so narrow GST columns don't hyphenate headers like "Taxable Value". */
        #invoice-printable td, #invoice-printable th { overflow-wrap: break-word; word-break: normal; hyphens: none; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #invoice-printable, #invoice-printable * { visibility: visible !important; }
          #invoice-printable {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important;
            box-shadow: none !important; border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Slightly tighten table text so wide GST tables never spill past the page */
          #invoice-printable td, #invoice-printable th { font-size: 8px !important; }
          .no-print { display: none !important; }
          /* US Letter portrait; margins keep content within the printable area */
          @page { size: letter portrait; margin: 0.4in; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2">
        <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] flex items-center gap-1.5 shadow-lg">
          <Printer size={14} /> Print / Save PDF
        </button>
        <button onClick={onClose} className="px-3 py-2 rounded-lg bg-[#252e3a] text-[#e2e8f0] text-[12px] font-semibold hover:bg-[#2a3545] flex items-center gap-1.5 shadow-lg">
          <X size={14} /> Close
        </button>
      </div>

      {/* ══════════ TAX INVOICE — matches Excel layout ══════════ */}
      <div id="invoice-printable" className="bg-white text-[#1a1a1a] max-w-full shadow-2xl" style={{ fontFamily: "Arial, sans-serif", fontSize: '10px', width: 'calc(7.7in + 400px)' }}>
        <div className="border-2 border-[#1a1a1a]">

          {/* ── Title bar ── */}
          <div className="text-center border-b-2 border-[#1a1a1a] py-2 bg-[#f5a623]/15">
            <div className="text-[16px] font-bold tracking-[0.08em]">TAX INVOICE</div>
            <div className="text-[8px] text-[#555] tracking-wide mt-0.5">(ISSUED UNDER RULE 46 OF CGST/OGST RULES 2017)</div>
          </div>

          {/* ── Supplier + Invoice meta ── */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
            {/* Supplier */}
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[8px] font-bold uppercase tracking-wide text-[#777] mb-1">Name &amp; Address of Supplier</div>
              {SUPPLIER.logoUrl && <img src={SUPPLIER.logoUrl} alt="Logo" className="h-8 max-w-[100px] object-contain mb-1" />}
              <div className="text-[11px] font-bold">{SUPPLIER.name}</div>
              <div className="text-[9px] leading-snug mt-0.5">{SUPPLIER.address}</div>
              <div className="text-[9px] mt-0.5">Email: {SUPPLIER.email}</div>
              <div className="text-[9px]">Phone: {SUPPLIER.phone}</div>
              <div className="text-[9px] mt-1"><span className="font-semibold">GSTIN:</span> {SUPPLIER.gstin}</div>
              <div className="text-[9px]"><span className="font-semibold">PAN:</span> {SUPPLIER.pan} &nbsp; <span className="font-semibold">State Code:</span> {SUPPLIER.stateCode}</div>
            </div>
            {/* Invoice meta */}
            <div className="text-[9px]">
              <div className="grid grid-cols-2 border-b border-[#ccc]">
                <div className="p-1.5 border-r border-[#ccc] font-semibold">INVOICE NO</div>
                <div className="p-1.5 font-bold text-[#f5a623]">{invoice.invoiceNo}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-[#ccc]">
                <div className="p-1.5 border-r border-[#ccc] font-semibold">INVOICE DATE</div>
                <div className="p-1.5">{fmtDate(invoice.invoiceDate)}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-[#ccc]">
                <div className="p-1.5 border-r border-[#ccc] font-semibold">PO NO</div>
                <div className="p-1.5">{invoice.poNo || 'NA'}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-[#ccc]">
                <div className="p-1.5 border-r border-[#ccc] font-semibold">E-INVOICE DATE</div>
                <div className="p-1.5">{fmtDate(invoice.eInvoiceDate)}</div>
              </div>
              <div className="grid grid-cols-2 border-b border-[#ccc]">
                <div className="p-1.5 border-r border-[#ccc] font-semibold">PERIOD OF SERVICE</div>
                <div className="p-1.5">{invoice.month || '—'}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-1.5 border-r border-[#ccc] font-semibold">TRACKING NO</div>
                <div className="p-1.5">{invoice.trackingNo || 'NA'}</div>
              </div>
            </div>
          </div>

          {/* ── Billed To / Shipped To ── */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[8px] font-bold uppercase tracking-wide text-[#777] mb-1">Details of Recipient (Billed To)</div>
              <div className="text-[10px] font-bold">{recipientName}</div>
              {invoice.party?.address && <div className="text-[9px] leading-snug mt-0.5">{invoice.party.address}</div>}
              {invoice.party?.gstin && <div className="text-[9px] mt-1"><span className="font-semibold">GSTIN:</span> {invoice.party.gstin}</div>}
              {invoice.party?.state && <div className="text-[9px]"><span className="font-semibold">State:</span> {invoice.party.state}</div>}
            </div>
            <div className="p-2">
              <div className="text-[8px] font-bold uppercase tracking-wide text-[#777] mb-1">Details of Consignee (Shipped To)</div>
              <div className="text-[10px] font-bold">{recipientName}</div>
              {invoice.party?.address && <div className="text-[9px] leading-snug mt-0.5">{invoice.party.address}</div>}
              {invoice.area && <div className="text-[9px] mt-1"><span className="font-semibold">Area:</span> {invoice.area}</div>}
            </div>
          </div>

          {/* ── Line items table with GST columns ── */}
          <table className="w-full border-collapse">
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#f5a623]/15 text-[8px] uppercase leading-tight">
                <th rowSpan={2} className="border border-[#1a1a1a] p-1 text-left">Service Description</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">HSN<br />Code</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Qty</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">UOM</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Rate<br />(Rs.)</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Taxable<br />Value (Rs.)</th>
                <th colSpan={2} className="border border-[#1a1a1a] p-1">CGST</th>
                <th colSpan={2} className="border border-[#1a1a1a] p-1">SGST</th>
                <th colSpan={2} className="border border-[#1a1a1a] p-1">IGST</th>
              </tr>
              <tr className="bg-[#f5a623]/15 text-[8px] leading-tight">
                <th className="border border-[#1a1a1a] p-1">%</th>
                <th className="border border-[#1a1a1a] p-1">INR</th>
                <th className="border border-[#1a1a1a] p-1">%</th>
                <th className="border border-[#1a1a1a] p-1">INR</th>
                <th className="border border-[#1a1a1a] p-1">%</th>
                <th className="border border-[#1a1a1a] p-1">INR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[9px]">
                <td className="border border-[#1a1a1a] p-1.5 align-top">{invoice.description || 'Maintenance services rendered'}{invoice.area ? ` — ${invoice.area}` : ''}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-center align-top">998717</td>
                <td className="border border-[#1a1a1a] p-1.5 text-center align-top">1</td>
                <td className="border border-[#1a1a1a] p-1.5 text-center align-top">LOT</td>
                <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(invoice.invoiceValue)}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(invoice.invoiceValue)}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{showCgstSgst ? '9%' : '—'}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{showCgstSgst ? fmt(cgstAmt) : '—'}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{showCgstSgst ? '9%' : '—'}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{showCgstSgst ? fmt(sgstAmt) : '—'}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{showIgst ? '18%' : '—'}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{showIgst ? fmt(igstAmt) : '—'}</td>
              </tr>
              {/* spacer rows for authentic look */}
              {[0, 1, 2].map(i => (
                <tr key={i} className="text-[9px] h-5">
                  <td className="border border-[#1a1a1a] p-1.5"></td>
                  <td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td>
                  <td className="border border-[#1a1a1a] p-1.5"></td>
                  <td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="text-[9px] font-bold bg-[#fafafa]">
                <td className="border border-[#1a1a1a] p-1.5">TOTAL</td>
                <td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{fmt(invoice.invoiceValue)}</td>
                <td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{showCgstSgst ? fmt(cgstAmt) : '—'}</td>
                <td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{showCgstSgst ? fmt(sgstAmt) : '—'}</td>
                <td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{showIgst ? fmt(igstAmt) : '—'}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Totals in figures & words ── */}
          <div className="grid grid-cols-[1fr_auto] border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[9px]"><span className="font-bold">Total Invoice Value (In Figures):</span> ₹ {fmt(invoice.grandTotal)}</div>
              <div className="text-[9px] mt-1"><span className="font-bold">Total Invoice Value (In Words):</span> Rupees {numberToWords(invoice.grandTotal)} Only.</div>
            </div>
            <div className="text-[9px] min-w-[180px]">
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">Taxable Value</div><div className="p-1 text-right font-mono">{fmt(invoice.invoiceValue)}</div></div>
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">Total GST</div><div className="p-1 text-right font-mono">{fmt(invoice.gstValue)}</div></div>
              <div className="grid grid-cols-2 font-bold bg-[#f5a623]/15"><div className="p-1 border-r border-[#ccc]">Grand Total</div><div className="p-1 text-right font-mono">{fmt(invoice.grandTotal)}</div></div>
            </div>
          </div>

          {/* ── Bank details + signatory ── */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[8px] font-bold uppercase tracking-wide text-[#777] mb-1">Bank Details</div>
              <div className="text-[9px]"><span className="font-semibold">Firm Name:</span> {SUPPLIER.name}</div>
              <div className="text-[9px]"><span className="font-semibold">Bank Name:</span> {SUPPLIER.bankName}</div>
              <div className="text-[9px]"><span className="font-semibold">Account No:</span> {SUPPLIER.accountNo}</div>
              <div className="text-[9px]"><span className="font-semibold">IFSC Code:</span> {SUPPLIER.ifsc}</div>
            </div>
            <div className="p-2 flex flex-col justify-between">
              <div className="text-[9px] text-right font-semibold">For {SUPPLIER.name}</div>
              <div className="text-[9px] text-right mt-10">{profile.signatoryLabel}</div>
            </div>
          </div>

          {/* ── Declaration ── */}
          <div className="p-2 text-[8px] text-[#555] leading-snug">
            <div className="mb-1">{profile.declaration || DEFAULT_DECLARATION}</div>
            <div className="font-semibold">WHETHER THE TAX IS PAYABLE ON REVERSE CHARGE BASIS: NO</div>
            {profile.footerNote && <div className="mt-1 text-[7.5px] text-[#888]">{profile.footerNote}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
