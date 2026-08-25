'use client';

import { Printer, X } from 'lucide-react';
import { useCompanyProfile } from '@/hooks/use-company-profile';

interface InvoiceItem {
  id?: number;
  description: string;
  hsnSac?: string | null;
  uom: string;
  quantity: number;
  rate: number;
  taxableValue: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
}

interface SalesInvoiceData {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string | null;
  customerName: string;
  customerGstin?: string | null;
  customerAddress?: string | null;
  customerState?: string | null;
  customerStateCode?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  placeOfSupply?: string | null;
  poNo?: string | null;
  poDate?: string | null;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  amountInWords?: string | null;
  status: string;
  items?: InvoiceItem[];
}

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

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const w = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + w(n % 100) : '');
    if (n < 100000) return w(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + w(n % 1000) : '');
    if (n < 10000000) return w(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + w(n % 100000) : '');
    return w(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + w(n % 10000000) : '');
  };
  return w(Math.round(num));
}

function fmt(n: number | undefined | null): string {
  return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  } catch { return String(d); }
}

export default function SalesInvoiceDocument({ invoice, onClose }: { invoice: SalesInvoiceData; onClose: () => void }) {
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

  const items: InvoiceItem[] = invoice.items && invoice.items.length > 0 ? invoice.items : [{
    description: 'Maintenance services rendered',
    hsnSac: '998717', uom: 'LOT', quantity: 1, rate: invoice.taxableAmount,
    taxableValue: invoice.taxableAmount,
    cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    cgstAmount: invoice.cgstAmount, sgstAmount: invoice.sgstAmount, igstAmount: invoice.igstAmount,
    total: invoice.totalAmount,
  }];

  const totalGst = Number(invoice.cgstAmount) + Number(invoice.sgstAmount) + Number(invoice.igstAmount);
  const isIgst = Number(invoice.igstAmount) > 0;
  // pad to a minimum number of rows for an authentic look
  const padRows = Math.max(0, 4 - items.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-8 print:bg-white print:p-0 print:block print:overflow-visible">
      <style>{`
        /* Keep everything inside the sheet on screen and in print */
        #sales-invoice-printable, #sales-invoice-printable * { box-sizing: border-box; }
        #sales-invoice-printable table { table-layout: fixed; width: 100%; }
        #sales-invoice-printable td, #sales-invoice-printable th { overflow-wrap: anywhere; word-break: break-word; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #sales-invoice-printable, #sales-invoice-printable * { visibility: visible !important; }
          #sales-invoice-printable {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important;
            box-shadow: none !important; border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Tighten the wide 13-column GST table so it never spills past the page */
          #sales-invoice-printable td, #sales-invoice-printable th { font-size: 7.5px !important; }
          #sales-invoice-printable td, #sales-invoice-printable th { padding: 2px !important; }
          .no-print { display: none !important; }
          /* US Letter portrait; margins keep content within the printable area */
          @page { size: letter portrait; margin: 0.4in; }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2">
        <button onClick={handlePrint} className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#0a0d12] text-[12px] font-semibold hover:bg-[#e8991a] flex items-center gap-1.5 shadow-lg">
          <Printer size={14} /> Print / Save PDF
        </button>
        <button onClick={onClose} className="px-3 py-2 rounded-lg bg-[#252e3a] text-[#e2e8f0] text-[12px] font-semibold hover:bg-[#2a3545] flex items-center gap-1.5 shadow-lg">
          <X size={14} /> Close
        </button>
      </div>

      {/* ══════════ TAX INVOICE ══════════ */}
      <div id="sales-invoice-printable" className="bg-white text-[#1a1a1a] max-w-full shadow-2xl" style={{ fontFamily: "Arial, sans-serif", fontSize: '10px', width: 'calc(7.7in + 400px)' }}>
        <div className="border-2 border-[#1a1a1a]">

          <div className="text-center border-b-2 border-[#1a1a1a] py-1.5 bg-[#f5a623]/15">
            <div className="text-[15px] font-bold tracking-wide">TAX INVOICE</div>
            <div className="text-[8px] text-[#555]">(ISSUED UNDER RULE 46 OF CGST/OGST RULES 2017)</div>
          </div>

          {/* Supplier + meta */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[8px] font-bold uppercase text-[#777] mb-0.5">Name &amp; Address of Supplier</div>
              {SUPPLIER.logoUrl && <img src={SUPPLIER.logoUrl} alt="Logo" className="h-8 max-w-[100px] object-contain mb-1" />}
              <div className="text-[11px] font-bold">{SUPPLIER.name}</div>
              <div className="text-[9px] leading-snug mt-0.5">{SUPPLIER.address}</div>
              <div className="text-[9px] mt-0.5">Email: {SUPPLIER.email} &nbsp; Phone: {SUPPLIER.phone}</div>
              <div className="text-[9px] mt-1"><span className="font-semibold">GSTIN:</span> {SUPPLIER.gstin}</div>
              <div className="text-[9px]"><span className="font-semibold">PAN:</span> {SUPPLIER.pan} &nbsp; <span className="font-semibold">State Code:</span> {SUPPLIER.stateCode}</div>
            </div>
            <div className="text-[9px]">
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1.5 border-r border-[#ccc] font-semibold">INVOICE NO</div><div className="p-1.5 font-bold text-[#f5a623]">{invoice.invoiceNo}</div></div>
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1.5 border-r border-[#ccc] font-semibold">INVOICE DATE</div><div className="p-1.5">{fmtDate(invoice.invoiceDate)}</div></div>
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1.5 border-r border-[#ccc] font-semibold">PO NO</div><div className="p-1.5">{invoice.poNo || 'NA'}</div></div>
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1.5 border-r border-[#ccc] font-semibold">PO DATE</div><div className="p-1.5">{fmtDate(invoice.poDate)}</div></div>
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1.5 border-r border-[#ccc] font-semibold">PLACE OF SUPPLY</div><div className="p-1.5">{invoice.placeOfSupply || '—'}</div></div>
              <div className="grid grid-cols-2"><div className="p-1.5 border-r border-[#ccc] font-semibold">DUE DATE</div><div className="p-1.5">{fmtDate(invoice.dueDate)}</div></div>
            </div>
          </div>

          {/* Billed / Shipped */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[8px] font-bold uppercase text-[#777] mb-0.5">Details of Recipient (Billed To)</div>
              <div className="text-[10px] font-bold">{invoice.customerName}</div>
              {(invoice.billingAddress || invoice.customerAddress) && <div className="text-[9px] leading-snug mt-0.5">{invoice.billingAddress || invoice.customerAddress}</div>}
              {invoice.customerGstin && <div className="text-[9px] mt-1"><span className="font-semibold">GSTIN:</span> {invoice.customerGstin}</div>}
              {invoice.customerStateCode && <div className="text-[9px]"><span className="font-semibold">State Code:</span> {invoice.customerStateCode}</div>}
            </div>
            <div className="p-2">
              <div className="text-[8px] font-bold uppercase text-[#777] mb-0.5">Details of Consignee (Shipped To)</div>
              <div className="text-[10px] font-bold">{invoice.customerName}</div>
              {(invoice.shippingAddress || invoice.customerAddress) && <div className="text-[9px] leading-snug mt-0.5">{invoice.shippingAddress || invoice.customerAddress}</div>}
              {invoice.placeOfSupply && <div className="text-[9px] mt-1"><span className="font-semibold">Place of Supply:</span> {invoice.placeOfSupply}</div>}
            </div>
          </div>

          {/* Items table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f5a623]/15 text-[8px] uppercase">
                <th rowSpan={2} className="border border-[#1a1a1a] p-1 text-left w-[28%]">Service Description</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">HSN/SAC</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Qty</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">UOM</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Rate</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Taxable Value</th>
                <th colSpan={2} className="border border-[#1a1a1a] p-1">CGST</th>
                <th colSpan={2} className="border border-[#1a1a1a] p-1">SGST</th>
                <th colSpan={2} className="border border-[#1a1a1a] p-1">IGST</th>
                <th rowSpan={2} className="border border-[#1a1a1a] p-1">Total</th>
              </tr>
              <tr className="bg-[#f5a623]/15 text-[8px]">
                <th className="border border-[#1a1a1a] p-1">%</th><th className="border border-[#1a1a1a] p-1">INR</th>
                <th className="border border-[#1a1a1a] p-1">%</th><th className="border border-[#1a1a1a] p-1">INR</th>
                <th className="border border-[#1a1a1a] p-1">%</th><th className="border border-[#1a1a1a] p-1">INR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="text-[9px]">
                  <td className="border border-[#1a1a1a] p-1.5 align-top">{it.description}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{it.hsnSac || '—'}</td>
<td className="border border-[#1a1a1a] p-1.5 text-center align-top">{(Number(it.quantity) || 0)}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(it.rate)}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(it.taxableValue)}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{(Number(it.cgstPercent) || 0)}%</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(it.cgstAmount)}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{(Number(it.sgstPercent) || 0)}%</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(it.sgstAmount)}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-center align-top">{(Number(it.igstPercent) || 0)}%</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(it.igstAmount)}</td>
                  <td className="border border-[#1a1a1a] p-1.5 text-right align-top font-mono">{fmt(it.total)}</td>
                </tr>
              ))}
              {Array.from({ length: padRows }).map((_, i) => (
                <tr key={`pad-${i}`} className="text-[9px] h-5">
                  <td className="border border-[#1a1a1a] p-1.5"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td>
                </tr>
              ))}
              <tr className="text-[9px] font-bold bg-[#fafafa]">
                <td className="border border-[#1a1a1a] p-1.5">TOTAL</td>
                <td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td><td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{fmt(invoice.taxableAmount)}</td>
                <td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{fmt(invoice.cgstAmount)}</td>
                <td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{fmt(invoice.sgstAmount)}</td>
                <td className="border border-[#1a1a1a]"></td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{fmt(invoice.igstAmount)}</td>
                <td className="border border-[#1a1a1a] p-1.5 text-right font-mono">{fmt(invoice.totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="grid grid-cols-[1fr_auto] border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[9px]"><span className="font-bold">Total Invoice Value (In Figures):</span> ₹ {fmt(invoice.totalAmount)}</div>
              <div className="text-[9px] mt-1"><span className="font-bold">Total Invoice Value (In Words):</span> {invoice.amountInWords || `Rupees ${numberToWords(invoice.totalAmount)} Only`}</div>
            </div>
            <div className="text-[9px] min-w-[190px]">
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">Taxable Value</div><div className="p-1 text-right font-mono">{fmt(invoice.taxableAmount)}</div></div>
              {!isIgst && <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">CGST</div><div className="p-1 text-right font-mono">{fmt(invoice.cgstAmount)}</div></div>}
              {!isIgst && <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">SGST</div><div className="p-1 text-right font-mono">{fmt(invoice.sgstAmount)}</div></div>}
              {isIgst && <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">IGST</div><div className="p-1 text-right font-mono">{fmt(invoice.igstAmount)}</div></div>}
              <div className="grid grid-cols-2 border-b border-[#ccc]"><div className="p-1 border-r border-[#ccc]">Total GST</div><div className="p-1 text-right font-mono">{fmt(totalGst)}</div></div>
              <div className="grid grid-cols-2 font-bold bg-[#f5a623]/15"><div className="p-1 border-r border-[#ccc]">Grand Total</div><div className="p-1 text-right font-mono">{fmt(invoice.totalAmount)}</div></div>
            </div>
          </div>

          {/* Bank + signatory */}
          <div className="grid grid-cols-2 border-b border-[#1a1a1a]">
            <div className="p-2 border-r border-[#1a1a1a]">
              <div className="text-[8px] font-bold uppercase text-[#777] mb-0.5">Bank Details</div>
              <div className="text-[9px]"><span className="font-semibold">Firm Name:</span> {SUPPLIER.name}</div>
              <div className="text-[9px]"><span className="font-semibold">Bank Name:</span> {SUPPLIER.bankName}</div>
              <div className="text-[9px]"><span className="font-semibold">Account No:</span> {SUPPLIER.accountNo}</div>
              <div className="text-[9px]"><span className="font-semibold">IFSC Code:</span> {SUPPLIER.ifsc}</div>
            </div>
            <div className="p-2 flex flex-col justify-between">
              <div className="text-[9px] text-right font-semibold">For {SUPPLIER.name}</div>
              <div className="text-[9px] text-right mt-10">Authorized Signatory</div>
            </div>
          </div>

          <div className="p-2 text-[8px] text-[#555] leading-snug">
            <div className="mb-1">CERTIFIED THAT THE PARTICULARS GIVEN ABOVE ARE TRUE AND CORRECT AND THE AMOUNT INDICATED REPRESENTS THE PRICE ACTUALLY CHARGED BY US AND THERE IS NO FLOW OF ADDITIONAL CONDITION DIRECTLY OR INDIRECTLY FROM THE BUYER. (E&amp;O.E.)</div>
            <div className="font-semibold">WHETHER THE TAX IS PAYABLE ON REVERSE CHARGE BASIS: NO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
