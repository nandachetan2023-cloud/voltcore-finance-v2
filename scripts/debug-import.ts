import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const pdb = new PrismaClient();

async function main() {
  const filePath = 'C:/work/erp/fnancialappdata/Copy of Jan 2026 Site Expenses.xlsx';
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    console.log(`\n=== ${sheetName} === (${rawRows.length} rows)`);
    for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
      if (rawRows[i].some((c: any) => c !== '' && c != null)) {
        console.log(`  Row ${i}:`, JSON.stringify(rawRows[i]));
      }
    }
  }
  await pdb.$disconnect();
}
main().catch(e => { console.error('Error:', e); process.exit(1); });
