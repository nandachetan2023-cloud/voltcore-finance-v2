import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

const buf = readFileSync('C:/work/erp/fnancialappdata/Copy of Jan 2026 Site Expenses.xlsx')
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
console.log('Sheets:', JSON.stringify(wb.SheetNames))
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  console.log('Sheet "' + name + '":', raw.length, 'rows')
  for (let i = 0; i < Math.min(8, raw.length); i++) {
    console.log('  [' + i + ']', JSON.stringify(raw[i]))
  }
}
