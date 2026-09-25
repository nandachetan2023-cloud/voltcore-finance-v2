import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

async function main() {
  const filePath = 'C:/work/erp/fnancialappdata/testing/site-expenses-2026-07.xlsx'
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  console.log('Sheet names:', wb.SheetNames.join(', '))
  
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    console.log(`\nSheet "${sheetName}": ${rows.length} rows`)
    if (rows.length > 0) {
      console.log('Row 0:', JSON.stringify(rows[0]))
      console.log('Row 1:', JSON.stringify(rows[1]))
    }
  }
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
