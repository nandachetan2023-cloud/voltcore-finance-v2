import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

async function main() {
  // Simulate the full frontend import flow
  const filePath = 'C:/work/erp/fnancialappdata/Copy of Jan 2026 Site Expenses.xlsx'
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  
  const SUMMARY_SHEETS = ['final sheet', 'summary', 'sheet1']
  let created = 0
  let errors = 0

  for (const sheetName of wb.SheetNames) {
    if (SUMMARY_SHEETS.some(s => sheetName.toLowerCase().includes(s))) {
      console.log(`Skipping summary sheet: "${sheetName}"`)
      continue
    }
    
    const ws = wb.Sheets[sheetName]
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    
    // Find header row
    let headerIdx = -1
    for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
      const col0 = String(rawRows[i][0] ?? '').trim().toLowerCase()
      if (col0 === 'date' || col0 === 'received date' || col0 === 's no' || col0 === 's.no') {
        headerIdx = i
        break
      }
    }
    
    if (headerIdx === -1) {
      console.log(`No header found for "${sheetName}", skipping`)
      continue
    }

    const headers = rawRows[headerIdx].map((h: any) => String(h).trim())
    console.log(`\nSheet "${sheetName}": headerIdx=${headerIdx}, headers=`, JSON.stringify(headers))
    console.log(`  Row count: ${rawRows.length}`)

    // Extract metadata from rows before header
    for (let i = 0; i < Math.min(headerIdx, rawRows.length); i++) {
      if (rawRows[i].length > 0) {
        console.log(`  Meta row ${i}:`, JSON.stringify(rawRows[i]))
      }
    }

    // Get data rows
    const dataRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', range: headerIdx })
    console.log(`  Data rows: ${dataRows.length}`)
    if (dataRows.length > 0) {
      console.log(`  First data row keys:`, JSON.stringify(Object.keys(dataRows[0])))
      console.log(`  First data row vals:`, JSON.stringify(dataRows[0]))
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
