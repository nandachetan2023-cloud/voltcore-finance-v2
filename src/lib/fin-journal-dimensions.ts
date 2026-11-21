type JournalDimensionsInput = {
  siteId?: unknown
  jobCode?: unknown
  poNo?: unknown
  costCenter?: unknown
  department?: unknown
  projectManager?: unknown
}

export async function validateJournalDimensions(db: any, input: JournalDimensionsInput) {
  const missing = ['siteId', 'jobCode', 'poNo', 'costCenter', 'department', 'projectManager']
    .filter(key => input[key as keyof JournalDimensionsInput] === undefined
      || input[key as keyof JournalDimensionsInput] === null
      || String(input[key as keyof JournalDimensionsInput]).trim() === '')
  if (missing.length) return { error: `Missing required fields: ${missing.join(', ')}` } as const

  const siteId = Number(input.siteId)
  if (!Number.isInteger(siteId) || siteId <= 0) return { error: 'Select a valid site' } as const
  const site = await db.finSite.findUnique({ where: { id: siteId }, select: { id: true, siteCode: true } })
  if (!site) return { error: 'Selected site was not found' } as const

  const jobCode = String(input.jobCode).trim()
  const job = await db.finJob.findUnique({ where: { jobCode }, select: { siteId: true } })
  if (!job) return { error: 'Selected job was not found' } as const
  if (job.siteId !== siteId) return { error: 'Selected job does not belong to the selected site' } as const

  const requestedPoNo = String(input.poNo).trim()
  const poNo = requestedPoNo.toUpperCase() === 'NA' ? 'NA' : requestedPoNo
  if (poNo !== 'NA') {
    const po = await db.finPurchaseOrder.findUnique({
      where: { poNo },
      select: { siteId: true, jobCode: true },
    })
    if (!po) return { error: 'Selected purchase order was not found; enter a valid PO number or NA' } as const
    if (po.siteId !== siteId) return { error: 'Selected purchase order does not belong to the selected site' } as const
    if (po.jobCode && po.jobCode !== jobCode) return { error: 'Selected purchase order does not belong to the selected job' } as const
  }

  return {
    site,
    jobCode,
    poNo,
    costCenter: String(input.costCenter).trim(),
    department: String(input.department).trim(),
    projectManager: String(input.projectManager).trim(),
  } as const
}
