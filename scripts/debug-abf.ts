import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = 'C:/work/erp/fnancialappdata/Copy of Jan 2026 Site Expenses.xlsx';
const buf = readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

const sheetName = 'ABF';
const ws = wb.Sheets[sheetName];
const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const headerIdx = 1;
const headers = rawRows[headerIdx].map((h: any) => String(h).trim());

// Use range: headerIdx (row 1 is header, data starts at row 2)
const dataRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', range: headerIdx });

console.log('Headers:', JSON.stringify(headers));
console.log('Data rows count:', dataRows.length);
console.log('First 5 data rows:');
for (let i = 0; i < Math.min(5, dataRows.length); i++) {
  const keys = Object.keys(dataRows[i]);
  const vals = keys.map(k => `${k}=${JSON.stringify(dataRows[i][k])}`).join(', ');
  console.log(`  [${i}] ${vals}`);
}

// Check if we can access fields
const hiC = (sub: string) => headers.findIndex(h => h.toLowerCase().includes(sub.toLowerCase()));
const hi = (label: string) => headers.findIndex(h => h.toLowerCase().replace(/[.\s]/g,'') === label.toLowerCase().replace(/[.\s]/g,''));

const idxDate = hiC('received date');
const idxName = hi('Name') >= 0 ? hi('Name') : (hiC('Paid To') >= 0 ? hiC('Paid To') : (hiC('Given To') >= 0 ? hiC('Given To') : hiC('Received By')));
const idxAmount = hiC('Amount');

console.log(`\nIndexes: date=${idxDate}, name=${idxName}, amount=${idxAmount}`);

// Check row 0
const row0 = dataRows[0];
console.log(`\nRow 0: firstVal=${Object.values(row0).find((v: any) => v != null && v != '')}`);
console.log(`Row 0[${headers[0]}]=${JSON.stringify(row0[headers[0]])}`);
console.log(`Row 0[${headers[1]}]=${JSON.stringify(row0[headers[1]])}`);
console.log(`Row 0[${headers[3]}]=${JSON.stringify(row0[headers[3]])}`);
console.log(`Row 0 name=${String(row0[headers[idxName]] ?? '').trim()}`);
console.log(`Row 0 amount=${parseFloat(String(row0[headers[idxAmount]] ?? '0').replace(/[^0-9.-]/g,'')) || 0}`);
