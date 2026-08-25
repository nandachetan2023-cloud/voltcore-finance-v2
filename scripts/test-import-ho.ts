import { readFileSync } from 'fs'

async function main() {
  const filePath = 'C:/work/erp/fnancialappdata/Ho Expenses Personal 24-25-Cleaned.xlsx'
  const buf = readFileSync(filePath)

  const form = new FormData()
  form.append('file', new Blob([buf]), 'Ho Expenses Personal 24-25-Cleaned.xlsx')
  form.append('sheet', 'Sheet1')

  const res = await fetch('http://localhost:3000/api/finance/import/expenses/commit', { method: 'POST', body: form })
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
