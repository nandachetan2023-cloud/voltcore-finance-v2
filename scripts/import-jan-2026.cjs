const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const FILE = 'C:/work/erp/fnancialappdata/Copy of Jan 2026 Site Expenses.xlsx';
const SITE_ID = 5; // Aditya Birla Lapanga Project
const SUMMARY_SHEETS = ['final sheet', 'summary', 'sheet1'];

const db = new PrismaClient();

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = String(v).trim();
  // dd.mm.yyyy or dd/mm/yyyy
  const parts = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (parts) {
    const [, dd, mm, yy] = parts;
    const yyyy = yy.length === 2 ? '20' + yy : yy;
    return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const wb = XLSX.readFile(FILE, { cellDates: true });
  let totalCreated = 0;
  const now = new Date();

  for (const sheetName of wb.SheetNames) {
    if (SUMMARY_SHEETS.some(s => sheetName.toLowerCase().includes(s))) continue;
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find Date header row
    let headerIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
      if (String(rawRows[i][0] ?? '').trim() === 'Date') {
        headerIdx = i; headers = rawRows[i].map(h => String(h).trim()); break;
      }
    }
    if (headerIdx === -1) {
      console.log(`  SKIP (no Date header): ${sheetName}`);
      continue;
    }

    // Extract metadata from rows above header
    let receivedBy = '', receivedDate = '', receivedAmt = 0;
    for (let i = 0; i < headerIdx; i++) {
      const row = rawRows[i];
      for (let j = 0; j < row.length; j++) {
        const label = String(row[j] ?? '').trim().toLowerCase();
        if (label.includes('incurred amount') || label.includes('received amount')) {
          const sameRow = Number(row[j + 1] ?? 0);
          const nextRow = i + 1 < headerIdx ? Number(rawRows[i + 1]?.[j + 1] ?? 0) : 0;
          const v = sameRow > 0 ? sameRow : nextRow;
          if (v > 0 && !receivedAmt) receivedAmt = v;
        }
        if (label === 'received date' && !receivedDate) receivedDate = row[j + 1];
        if ((label === 'paid to' || label === 'received by' || label === 'given to') && !receivedBy) {
          const sameCell = String(row[j + 1] ?? '').trim();
          if (sameCell) { receivedBy = sameCell; }
          else {
            for (let k = i + 1; k < headerIdx; k++) {
              const v = String(rawRows[k]?.[j + 1] ?? '').trim();
              if (v) { receivedBy = v; break; }
            }
          }
        }
      }
      const col0 = String(row[0] ?? '').trim();
      const col1 = String(row[1] ?? '').trim();
      if (!receivedDate && parseDate(col0) && col1 &&
          !col1.toLowerCase().includes('amount') && !col1.toLowerCase().includes('date') && !col1.toLowerCase().includes('by')) {
        receivedDate = col0;
        receivedBy = receivedBy || col1;
      }
    }

    // Parse data rows
    const dataRows = XLSX.utils.sheet_to_json(ws, { defval: '', range: headerIdx });
    const items = [];

    // Column detection — get actual keys from parsed row
    const sampleRow = dataRows[0] || {};
    const colKeys = Object.keys(sampleRow);

    const findKey = (sub) => colKeys.find(k => k.toLowerCase().replace(/[.\s]/g,'').includes(sub.toLowerCase()));
    const findExact = (label) => colKeys.find(k => k.toLowerCase().replace(/[.\s]/g,'') === label.toLowerCase().replace(/[.\s]/g,''));

    const keyArea = findExact('Area') || findKey('Re.');
    const keyName = findExact('Name') || findKey('Given To') || findKey('Received By');
    const keyDesc = findExact('Description');
    const keyDetails = findExact('Details');
    const keyFood = findKey('Fooding');
    const keyAdvance = findExact('Advance');
    const keyIncurred = findKey('Incurred');
    const keyRemark = findKey('Remark');
    const keyAmount = findExact('Amount');

    // Also try lookup by column index for amounts
    let amountKey = keyAdvance || keyIncurred || keyAmount;
    // Fallback: if amountKey is still not found, check column 6 (0-indexed) in header row
    if (!amountKey && headers.length > 6 && headers[6]) {
      amountKey = colKeys.find(k => k.toLowerCase().includes(headers[6].toLowerCase().replace(/\s/g,'')));
    }

    for (const row of dataRows) {
      const c0 = String(Object.values(row)[0] ?? '').trim().toLowerCase();
      if (c0.includes('total') || c0.includes('grand')) continue;

      // Amount — try each possible key
      let amount = 0;
      if (amountKey) amount = Number(row[amountKey]) || 0;
      if (!amount && keyAdvance) amount = Number(row[keyAdvance]) || 0;
      if (!amount && keyIncurred) amount = Number(row[keyIncurred]) || 0;
      if (!amount) amount = Number(row['Amount'] ?? row['amount'] ?? 0);
      // Last resort: scan all values for a number
      if (!amount) {
        for (const v of Object.values(row)) {
          const n = Number(v);
          if (n > 0 && !String(v).toLowerCase().includes('total') && !String(v).toLowerCase().includes('grand')) { amount = n; break; }
        }
      }

      const dateVal = row[colKeys[0]] || row['Date'] || row['date'];
      if (!amount && !dateVal) continue;

      const area = keyArea ? String(row[keyArea] || '').trim() : '';
      let name = keyName ? String(row[keyName] || '').trim() : '';

      let description = '';
      if (keyDetails && keyDesc) {
        name = name || String(row[keyDesc] || '').trim();
        description = String(row[keyDetails] || '').trim();
      } else if (keyDetails) {
        description = String(row[keyDetails] || '').trim();
      } else if (keyDesc) {
        description = String(row[keyDesc] || '').trim();
      }
      if (!description && keyFood) description = String(row[keyFood] || '').trim();
      const remark = keyRemark ? String(row[keyRemark] || '').trim() : '';
      const itemDate = parseDate(dateVal);

      if (!amount && !description && !name) continue;
      items.push({ itemDate, category: String(area || '').trim(), name: String(name || '').trim(), description: String(description || '').trim(), amount: Number(amount) || 0, remark: String(remark || '').trim() });
    }

    if (!items.length) { console.log(`  SKIP (no items): ${sheetName}`); continue; }

    const totalAmount = items.reduce((s, i) => s + i.amount, 0);
    const claimNo = `SE/${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}${String(totalCreated+1).padStart(2,'0')}`;

    try {
      await db.finExpenseClaim.create({
        data: {
          claimNo,
          siteId: SITE_ID,
          siteType: 'Site',
          expenseType: sheetName,
          submittedBy: receivedBy || 'Import',
          date: receivedDate ? parseDate(receivedDate) || new Date() : new Date(),
          receivedAmount: receivedAmt || 0,
          totalAmount,
          gstAmount: 0,
          tdsAmount: 0,
          status: 'Draft',
          approvalStatus: 'Draft',
          remarks: 'Imported from Jan 2026 excel: ' + sheetName,
          items: { create: items.map(i => {
            const safeDate = i.itemDate instanceof Date && !isNaN(i.itemDate.getTime()) ? i.itemDate : null;
            return { itemDate: safeDate, category: i.category, name: i.name, description: i.description, amount: i.amount, remark: i.remark };
          }) },
        },
      });
      totalCreated++;
      console.log(`  CREATED: ${sheetName} — ${items.length} items, ₹${totalAmount}`);
    } catch (e) {
      console.log(`  ERROR: ${sheetName} — ${e.message}`);
    }
  }

  console.log(`\nDone. Created ${totalCreated} claims.`);
  await db.$disconnect();
}

main().catch(e => { console.error(e); db.$disconnect(); process.exit(1); });

