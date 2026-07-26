import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const pdb = new PrismaClient();

function parseExcelDate(v: any): string {
  if (!v) return '';
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (typeof v === 'string' && v.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const [dd, mm, yyyy] = v.split('.');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) return v.substring(0, 10);
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  if (typeof v === 'string') {
    const parts = v.split(/[/-]/);
    if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return '';
}

function parseAmt(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  return parseFloat(s) || 0;
}

async function main() {
  // Delete existing
  const claims = await pdb.finExpenseClaim.findMany({ where: { claimNo: { startsWith: 'SE/' } }, select: { id: true, claimNo: true } });
  console.log(`Deleting ${claims.length} existing...`);
  for (const c of claims) {
    await pdb.finExpenseItem.deleteMany({ where: { claimId: c.id } });
    await pdb.finApprovalLog.deleteMany({ where: { finExpenseClaimId: c.id } });
    await pdb.finExpenseClaim.delete({ where: { id: c.id } });
  }

  const buf = readFileSync('C:/work/erp/fnancialappdata/Copy of Jan 2026 Site Expenses.xlsx');
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const site = await pdb.finSite.findFirst({ where: { status: 'Active' } });
  if (!site) { console.error('No active site'); process.exit(1); }
  console.log(`Site: ${site.name} (${site.id})\n`);

  const SUMMARY = ['final sheet','summary','sheet1'];
  let totalClaims = 0, totalItems = 0;

  for (const sheetName of wb.SheetNames) {
    if (SUMMARY.some(s => sheetName.toLowerCase().includes(s))) continue;

    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
      const c0 = String(rawRows[i][0] ?? '').trim().toLowerCase();
      if (c0 === 'date' || c0 === 'received date' || c0 === 's no' || c0 === 's.no') {
        headerIdx = i; break;
      }
    }
    if (headerIdx === -1) { console.log(`No header: "${sheetName}"`); continue; }

    // Extract metadata (receivedBy, receivedDate, receivedAmt) from rows before header
    let receivedBy = '', receivedDate = '', receivedAmt = 0;
    for (let i = 0; i < headerIdx; i++) {
      const row = rawRows[i];
      for (let j = 0; j < row.length; j++) {
        const label = String(row[j] ?? '').trim().toLowerCase();
        if ((label.includes('incurred amount') || label.includes('received amount')) && !receivedAmt) {
          const v = Number(row[j + 1] ?? 0) || (i + 1 < headerIdx ? Number(rawRows[i + 1]?.[j + 1] ?? 0) : 0);
          if (v > 0) receivedAmt = v;
        }
        if (label === 'received date' && !receivedDate) {
          receivedDate = parseExcelDate(row[j + 1]);
        }
        if ((label === 'paid to' || label === 'received by' || label === 'given to') && !receivedBy) {
          receivedBy = String(row[j + 1] ?? '').trim();
          if (!receivedBy) {
            for (let k = i + 1; k < headerIdx; k++) {
              const v = String(rawRows[k]?.[j + 1] ?? '').trim();
              if (v) { receivedBy = v; break; }
            }
          }
        }
      }
      const c0 = String(row[0] ?? '').trim();
      const c1 = String(row[1] ?? '').trim();
      if (!receivedDate && parseExcelDate(c0) && c1 && !c1.toLowerCase().includes('amount') && !c1.toLowerCase().includes('date') && !c1.toLowerCase().includes('by')) {
        receivedDate = parseExcelDate(c0);
        receivedBy = receivedBy || c1;
      }
    }

    // Detect columns from header row
    const headers = rawRows[headerIdx].map((h: any) => String(h).trim());
    const hi = (l: string) => headers.findIndex(h => h.toLowerCase().replace(/[.\s]/g,'') === l.toLowerCase().replace(/[.\s]/g,''));
    const hiC = (s: string) => headers.findIndex(h => h.toLowerCase().includes(s.toLowerCase()));

    const idxArea   = hi('Area');
    const idxReNo   = hiC('Re.');
    const idxName   = hi('Name') >= 0 ? hi('Name') : (hiC('Paid To') >= 0 ? hiC('Paid To') : (hiC('Given To') >= 0 ? hiC('Given To') : hiC('Received By')));
    const idxRecBy  = hiC('Given To') >= 0 ? hiC('Given To') : hiC('Received By');
    const idxDesc   = hi('Description') >= 0 ? hi('Description') : (hiC('Detais') >= 0 ? hiC('Detais') : hiC('Details'));
    const idxDtl    = hi('Details');
    const idxFood   = hiC('Fooding');
    const idxAdv    = hi('Advance');
    const idxInc    = hiC('Incurred');
    const idxRem    = hiC('Remark');

    // How many detail columns are in this sheet? (inner tables)
    // The inner table (rows after ~13) may have different column semantics.
    // We find the inner header row and its column positions, then use THOSE
    // to extract items — much more accurate.

    // Find the INNER header row (has "Date" in col A and "Description" or "Details" in col B/C)
    let innerHdrIdx = -1;
    for (let i = headerIdx + 1; i < Math.min(rawRows.length, 30); i++) {
      const r = rawRows[i];
      const c0 = String(r[0] ?? '').trim().toLowerCase();
      if (c0 !== 'date') continue;
      const c1 = String(r[1] ?? '').trim().toLowerCase();
      // Inner header: col A = "Date", col B is anything except outer header patterns
      if (!c1.includes('received') && !c1.includes('paid') && !c1.includes('given')) {
        innerHdrIdx = i; break;
      }
    }

    const items: any[] = [];

    if (innerHdrIdx >= 0) {
      // Inner table: use it to extract items
      const iHead = rawRows[innerHdrIdx].map((h: any) => String(h).trim());
      const iC = (s: string) => iHead.findIndex(h => h.toLowerCase().includes(s.toLowerCase()));
      const iAdv = iC('advance');
      const iInc = iC('incurred') >= 0 ? iC('incurred') : iC('price');
      const iDesc = iC('description') >= 0 ? iC('description') : iC('details');
      const iName = iC('details') >= 0 ? iC('details') : (iC('area') >= 0 ? iC('area') : iC('name'));
      const iRem = iC('remark');
      const iDt = 0; // always col 0

      for (let ri = innerHdrIdx + 1; ri < rawRows.length; ri++) {
        const row = rawRows[ri];
        const dateVal = String(row[iDt] ?? '').trim();
        if (!dateVal && row.every((c: any) => c == null || c === '')) continue;
        const c0 = String(row[0] ?? '').trim().toLowerCase();
        if (c0.includes('total') || c0.includes('grand')) continue;

        let amount = 0;
        if (iAdv >= 0) amount = parseAmt(row[iAdv]);
        if (!amount && iInc >= 0) amount = parseAmt(row[iInc]);
        if (!amount) amount = parseAmt(row[3]); // fallback col 3

        let name = '';
        if (iName >= 0) name = String(row[iName] ?? '').trim();
        if (!name) name = idxName >= 0 ? String(row[idxName] ?? '').trim() : '';

        let description = '';
        if (iDesc >= 0) description = String(row[iDesc] ?? '').trim();
        if (!description && iName >= 0 && iName !== iDesc) description = String(row[iName] ?? '').trim();
        if (!description && idxDesc >= 0) description = String(row[idxDesc] ?? '').trim();
        if (!description && idxDtl >= 0) description = String(row[idxDtl] ?? '').trim();

        const remark = iRem >= 0 ? String(row[iRem] ?? '').trim() : (idxRem >= 0 ? String(row[idxRem] ?? '').trim() : '');
        const itemDate = parseExcelDate(dateVal);

        if (!amount && !name && !description) continue;
        items.push({ itemDate, category: '', name, description, amount, remark });
      }
    } else {
      // No inner table: parse data rows directly
      // For ABF-style sheets where data follows outer header
      for (let ri = headerIdx + 1; ri < rawRows.length; ri++) {
        const row = rawRows[ri];
        const dateVal = String(row[0] ?? '').trim();
        if (!dateVal && row.every((c: any) => c == null || c === '')) continue;
        const c0 = dateVal.toLowerCase();
        if (c0.includes('total') || c0.includes('grand') || c0.includes('month') || c0.includes('submit')) continue;

        let amount = 0;
        if (idxAdv >= 0) amount = parseAmt(row[idxAdv]);
        if (!amount && idxInc >= 0) amount = parseAmt(row[idxInc]);
        if (!amount) amount = parseAmt(row[3]);
        if (!amount) amount = parseAmt(row[4]); // Advance/Received Amount column
        
        let name = idxName >= 0 ? String(row[idxName] ?? '').trim() : '';
        if (!name && idxRecBy >= 0) name = String(row[idxRecBy] ?? '').trim();

        let description = '';
        if (idxDesc >= 0) description = String(row[idxDesc] ?? '').trim();
        if (!description && idxDtl >= 0) description = String(row[idxDtl] ?? '').trim();
        if (!description && idxFood >= 0) description = String(row[idxFood] ?? '').trim();

        const remark = idxRem >= 0 ? String(row[idxRem] ?? '').trim() : '';
        const itemDate = parseExcelDate(dateVal);

        if (!amount && !name && !description) continue;
        items.push({ itemDate, category: '', name, description, amount, remark });
      }
    }

    if (!items.length) { console.log(`No items: "${sheetName}"`); continue; }

    // Get received amount from header row
    if (!receivedAmt) {
      for (let c = 0; c < headers.length; c++) {
        if (headers[c].toLowerCase().includes('incurred amount') || headers[c].toLowerCase().includes('received amount')) {
          for (let cc = c + 1; cc < rawRows[headerIdx].length; cc++) {
            const n = Number(rawRows[headerIdx][cc]);
            if (n > 0) { receivedAmt = n; break; }
          }
          break;
        }
      }
    }

    const claimNo = `SE/${new Date().toISOString().slice(0,10).replace(/-/g,'')}${String(totalClaims + 1).padStart(4,'0')}`;
    const totalAmt = items.reduce((s, i) => s + i.amount, 0);
    const submittedBy = receivedBy || items[0]?.name || 'Import';

    const claim = await pdb.finExpenseClaim.create({
      data: {
        claimNo,
        siteId: site.id,
        siteType: 'Site',
        expenseType: sheetName,
        submittedBy,
        date: receivedDate ? new Date(receivedDate) : new Date(),
        receivedAmount: receivedAmt || totalAmt,
        totalAmount: totalAmt,
        status: 'Draft',
        items: {
          create: items.map(it => ({
            itemDate: it.itemDate ? new Date(it.itemDate) : null,
            category: it.category,
            name: it.name,
            description: it.description,
            amount: it.amount,
            remark: it.remark,
          })),
        },
      },
    });

    totalClaims++;
    totalItems += items.length;
    console.log(`${sheetName}: ${claimNo} (${items.length} items, total=${totalAmt})`);
  }

  console.log(`\nDone. ${totalClaims} claims, ${totalItems} items.`);
  await pdb.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
