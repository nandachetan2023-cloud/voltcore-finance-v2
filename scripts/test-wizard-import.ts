import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'

async function main() {
  // Read the cleaned file and convert rows to the wizard JSON format
  const filePath = 'C:/work/erp/fnancialappdata/Ho Expenses Personal 24-25-Cleaned.xlsx'
  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets['Sheet1']
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  // Map to the field keys the wizard/import API expects
  const records = rows.map(r => ({
    totalAmount: r.TotalAmount,
    expenseType: r.Category,
    category: r.Category,
    description: r.Description,
    submittedBy: '',
    date: r.Date,
    siteType: r.SiteType,
    receivedAmount: r.ReceivedAmount || 0,
    gstAmount: r.GSTAmount || 0,
    tdsAmount: r.TDSAmount || 0,
    billNo: r.BillNo || '',
    approvalStatus: r.ApprovalStatus || 'Draft',
    remarks: r.Remarks || '',
  }))

  const res = await fetch('http://localhost:3000/api/fin/expense-claims/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
