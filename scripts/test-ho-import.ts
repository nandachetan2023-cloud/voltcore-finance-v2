import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

async function main() {
  const filePath = 'C:/work/erp/fnancialappdata/Ho Expenses Personal 24-25 (All Month).xlsx'
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  console.log('Sheets:', JSON.stringify(wb.SheetNames))
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  console.log('Headers:', JSON.stringify(Object.keys(rows[0] || {})))
  console.log('Row count:', rows.length)
  console.log('First 2 rows:', JSON.stringify(rows.slice(0, 2), null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
