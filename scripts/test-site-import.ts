import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

async function main() {
  // Test the import endpoint directly
  const filePath = 'C:/work/erp/fnancialappdata/testing/site-expenses-2026-07.xlsx'
  const buf = readFileSync(filePath)
  
  const form = new FormData()
  form.append('file', new Blob([buf]), 'site-expenses-2026-07.xlsx')
  form.append('siteId', '2')

  const res = await fetch('http://localhost:3000/api/fin/site-expenses/import', {
    method: 'POST',
    body: form,
  })
  const text = await res.text()
  console.log('Status:', res.status)
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log('Raw:', text)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
