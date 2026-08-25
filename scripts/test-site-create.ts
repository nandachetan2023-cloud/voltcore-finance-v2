import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

async function main() {
  // Simulate what the frontend does: parse workbook, then POST each sheet
  const filePath = 'C:/work/erp/fnancialappdata/testing/site-expenses-2026-07.xlsx'
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  
  for (const sheetName of wb.SheetNames) {
    if (['final sheet','summary','sheet1'].some(s => sheetName.toLowerCase().includes(s))) continue
    
    const ws = wb.Sheets[sheetName]
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    
    // Find header row
    let headerIdx = -1
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const row = (rawRows[i] || []).map((c: any) => String(c).toLowerCase().trim())
      if (row[0] === 'date' || row[0] === 's no' || row[0] === 's.no') {
        headerIdx = i
        break
      }
    }
    if (headerIdx === -1) continue
    
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '', range: headerIdx })
    console.log(`Sheet "${sheetName}": ${rows.length} rows, headers:`, Object.keys(rows[0] || {}))
    if (rows.length > 0) console.log('Sample:', JSON.stringify(rows[0]))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
