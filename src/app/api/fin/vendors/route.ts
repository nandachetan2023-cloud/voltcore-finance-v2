import { NextRequest, NextResponse } from 'next/server'
import { getDbForRequest } from '@/lib/db'

export const dynamic = 'force-dynamic'

/* ── Contractor master validation ───────────────────────────────────────────
   The Contractors Management wizard is the only place contractor records are
   created or edited, so the rules live with the data: every other module
   reads these rows through the dropdowns and must not be able to smuggle in
   a half-filled contractor.

   The same rules run on create (all fields required to be present where
   required) and on update (only the fields actually sent are checked), so a
   partial update — say, flipping a contractor to "blacklisted" — cannot be
   rejected for missing fields it was never asked to change.
   ─────────────────────────────────────────────────────────────────────────── */

const VENDOR_TYPES = ['Contractor', 'Supplier', 'Service Provider', 'Consultant', 'Material Supplier']
const VENDOR_STATUSES = ['preferred', 'standard', 'blacklisted']

type Errors = Record<string, string>

function trim(v: unknown): string {
  return v === undefined || v === null ? '' : String(v).trim()
}

function validate(body: Record<string, any>, mode: 'create' | 'update'): Errors {
  const e: Errors = {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined && body[k] !== null && body[k] !== ''

  if (mode === 'create' || has('name')) {
    const name = trim(body.name)
    if (!name) e.name = 'Contractor name is required'
    else if (name.length < 2) e.name = 'Contractor name is too short'
    else if (name.length > 160) e.name = 'Contractor name is too long'
  }

  if (mode === 'create' || has('region')) {
    const region = trim(body.region)
    if (!region) e.region = 'Region is required'
  }

  if (has('categories')) {
    if (!Array.isArray(body.categories)) e.categories = 'Categories must be a list'
    else if (body.categories.some((c: unknown) => typeof c !== 'string' || !c.trim()))
      e.categories = 'Categories must be non-empty text'
  }

  if (has('vendorType') && !VENDOR_TYPES.includes(String(body.vendorType))) {
    e.vendorType = `Must be one of: ${VENDOR_TYPES.join(', ')}`
  }

  if (has('status') && !VENDOR_STATUSES.includes(String(body.status))) {
    e.status = `Must be one of: ${VENDOR_STATUSES.join(', ')}`
  }

  if (has('rating')) {
    const r = Number(body.rating)
    if (Number.isNaN(r) || r < 0 || r > 5) e.rating = 'Rating must be between 0 and 5'
  }

  if (has('email')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(body.email))) e.email = 'Enter a valid email address'
  }

  for (const key of ['phone', 'alternatePhone']) {
    if (!has(key)) continue
    const digits = trim(body[key]).replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) e[key] = 'Phone must have 7–15 digits'
  }

  if (has('gstin') && !/^[0-9A-Z]{15}$/i.test(trim(body.gstin))) e.gstin = 'GSTIN must be 15 characters'
  if (has('pan') && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(trim(body.pan))) e.pan = 'PAN must be 10 characters (e.g. ABCDE1234F)'
  if (has('tan') && !/^[0-9A-Z]{10}$/i.test(trim(body.tan))) e.tan = 'TAN must be 10 characters'
  if (has('pincode') && !/^[0-9]{6}$/.test(trim(body.pincode))) e.pincode = 'PIN code must be 6 digits'

  if (has('bankIfsc') && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(trim(body.bankIfsc))) e.bankIfsc = 'Enter a valid IFSC code'

  if (has('bankAccountNumber') && !/^[0-9]{6,20}$/.test(trim(body.bankAccountNumber).replace(/\s/g, '')))
    e.bankAccountNumber = 'Account number must be 6–20 digits'

  if (has('creditDays')) {
    const d = Number(body.creditDays)
    if (!Number.isInteger(d) || d < 0 || d > 365) e.creditDays = 'Credit days must be 0–365'
  }

  if (has('certificates')) {
    if (!Array.isArray(body.certificates)) e.certificates = 'Certificates must be a list'
    else {
      body.certificates.forEach((c: any, i: number) => {
        if (!c || typeof c !== 'object') { e.certificates = `Certificate ${i + 1} is invalid`; return }
        if (!trim(c.name)) e.certificates = `Certificate ${i + 1} needs a name`
        if (c.issueDate && c.expiryDate && new Date(c.expiryDate) < new Date(c.issueDate))
          e.certificates = `Certificate ${i + 1} expires before it is issued`
      })
    }
  }

  if (has('metrics') && body.metrics && typeof body.metrics === 'object') {
    const m = body.metrics
    for (const k of ['onTimeDelivery', 'qualityRating', 'priceCompetitiveness']) {
      if (m[k] === undefined || m[k] === null || m[k] === '') continue
      const v = Number(m[k])
      if (Number.isNaN(v) || v < 0 || v > 100) e.metrics = 'Metrics must be between 0 and 100'
    }
  }

  if (has('registeredOn') && Number.isNaN(new Date(body.registeredOn).getTime())) e.registeredOn = 'Enter a valid date'

  return e
}

/** Build a Prisma create payload from a validated body. */
function createData(body: Record<string, any>) {
  const t = (v: unknown) => (trim(v) === '' ? null : trim(v))
  return {
    name: trim(body.name),
    categories: Array.isArray(body.categories) ? body.categories : [],
    region: trim(body.region),
    status: body.status || 'standard',
    rating: Number(body.rating) || 3.0,
    contactPerson: t(body.contactPerson),
    phone: t(body.phone),
    email: t(body.email),
    address: t(body.address),
    notes: t(body.notes),
    certificates: Array.isArray(body.certificates) ? body.certificates : [],
    metrics: body.metrics && typeof body.metrics === 'object' ? body.metrics : {},
    blacklistLog: Array.isArray(body.blacklistLog) ? body.blacklistLog : [],

    legalName: t(body.legalName),
    tradeName: t(body.tradeName),
    vendorCode: t(body.vendorCode),
    vendorType: body.vendorType || 'Contractor',
    registeredOn: body.registeredOn ? new Date(body.registeredOn) : null,
    gstin: t(body.gstin)?.toUpperCase() ?? null,
    pan: t(body.pan)?.toUpperCase() ?? null,
    tan: t(body.tan)?.toUpperCase() ?? null,
    msmeRegistered: Boolean(body.msmeRegistered),
    taxDeduction: t(body.taxDeduction),
    contactDesignation: t(body.contactDesignation),
    alternatePhone: t(body.alternatePhone),
    website: t(body.website),
    country: trim(body.country) || 'India',
    state: t(body.state),
    city: t(body.city),
    pincode: t(body.pincode),
    bankName: t(body.bankName),
    bankAccountName: t(body.bankAccountName),
    bankAccountNumber: t(body.bankAccountNumber),
    bankIfsc: t(body.bankIfsc)?.toUpperCase() ?? null,
    paymentTerms: t(body.paymentTerms),
    creditDays: body.creditDays === undefined || body.creditDays === null || body.creditDays === '' ? null : Number(body.creditDays),
  }
}

/** Build a Prisma update payload — only the fields present in the body. */
function updateData(body: Record<string, any>) {
  const data: Record<string, any> = {}
  const set = (key: string, value: unknown) => { data[key] = value }
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const t = (v: unknown) => (trim(v) === '' ? null : trim(v))

  if (has('name')) set('name', trim(body.name))
  if (has('categories') && Array.isArray(body.categories)) set('categories', body.categories)
  if (has('region')) set('region', trim(body.region))
  if (has('status')) set('status', body.status)
  if (has('rating')) set('rating', Number(body.rating))
  if (has('contactPerson')) set('contactPerson', t(body.contactPerson))
  if (has('phone')) set('phone', t(body.phone))
  if (has('email')) set('email', t(body.email))
  if (has('address')) set('address', t(body.address))
  if (has('notes')) set('notes', t(body.notes))
  if (has('certificates') && Array.isArray(body.certificates)) set('certificates', body.certificates)
  if (has('metrics') && body.metrics && typeof body.metrics === 'object') set('metrics', body.metrics)
  if (has('blacklistLog') && Array.isArray(body.blacklistLog)) set('blacklistLog', body.blacklistLog)

  if (has('legalName')) set('legalName', t(body.legalName))
  if (has('tradeName')) set('tradeName', t(body.tradeName))
  if (has('vendorCode')) set('vendorCode', t(body.vendorCode))
  if (has('vendorType')) set('vendorType', body.vendorType)
  if (has('registeredOn')) set('registeredOn', body.registeredOn ? new Date(body.registeredOn) : null)
  if (has('gstin')) set('gstin', t(body.gstin)?.toUpperCase() ?? null)
  if (has('pan')) set('pan', t(body.pan)?.toUpperCase() ?? null)
  if (has('tan')) set('tan', t(body.tan)?.toUpperCase() ?? null)
  if (has('msmeRegistered')) set('msmeRegistered', Boolean(body.msmeRegistered))
  if (has('taxDeduction')) set('taxDeduction', t(body.taxDeduction))
  if (has('contactDesignation')) set('contactDesignation', t(body.contactDesignation))
  if (has('alternatePhone')) set('alternatePhone', t(body.alternatePhone))
  if (has('website')) set('website', t(body.website))
  if (has('country')) set('country', trim(body.country) || 'India')
  if (has('state')) set('state', t(body.state))
  if (has('city')) set('city', t(body.city))
  if (has('pincode')) set('pincode', t(body.pincode))
  if (has('bankName')) set('bankName', t(body.bankName))
  if (has('bankAccountName')) set('bankAccountName', t(body.bankAccountName))
  if (has('bankAccountNumber')) set('bankAccountNumber', t(body.bankAccountNumber))
  if (has('bankIfsc')) set('bankIfsc', t(body.bankIfsc)?.toUpperCase() ?? null)
  if (has('paymentTerms')) set('paymentTerms', t(body.paymentTerms))
  if (has('creditDays')) set('creditDays', body.creditDays === undefined || body.creditDays === null || body.creditDays === '' ? null : Number(body.creditDays))

  return data
}

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const record = await pdb.finVendor.findUnique({ where: { id: Number(id) } })
      if (!record) return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: record })
    }
    const records = await pdb.finVendor.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pdb = getDbForRequest(request)

    const errors = validate(body, 'create')
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, error: 'Please fix the highlighted fields', errors }, { status: 400 })
    }

    const name = trim(body.name)

    // A contractor is identified by name — a second record with the same name
    // (any casing) is a duplicate entry, not a new contractor.
    const dupe = await pdb.finVendor.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    })
    if (dupe) {
      const msg = 'A contractor with this name already exists'
      return NextResponse.json({ success: false, error: msg, errors: { name: msg } }, { status: 409 })
    }

    if (trim(body.vendorCode)) {
      const codeDupe = await pdb.finVendor.findFirst({
        where: { vendorCode: { equals: trim(body.vendorCode), mode: 'insensitive' } },
        select: { id: true },
      })
      if (codeDupe) {
        const msg = 'This contractor code is already in use'
        return NextResponse.json({ success: false, error: msg, errors: { vendorCode: msg } }, { status: 409 })
      }
    }

    const record = await pdb.finVendor.create({ data: createData(body) })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    const errors = validate(body, 'update')
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, error: 'Please fix the highlighted fields', errors }, { status: 400 })
    }

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const dupe = await pdb.finVendor.findFirst({
        where: { id: { not: id }, name: { equals: trim(body.name), mode: 'insensitive' } },
        select: { id: true, name: true },
      })
      if (dupe) {
        const msg = 'A contractor with this name already exists'
        return NextResponse.json({ success: false, error: msg, errors: { name: msg } }, { status: 409 })
      }
    }

    if (trim(body.vendorCode)) {
      const codeDupe = await pdb.finVendor.findFirst({
        where: { id: { not: id }, vendorCode: { equals: trim(body.vendorCode), mode: 'insensitive' } },
        select: { id: true },
      })
      if (codeDupe) {
        const msg = 'This contractor code is already in use'
        return NextResponse.json({ success: false, error: msg, errors: { vendorCode: msg } }, { status: 409 })
      }
    }

    const record = await pdb.finVendor.update({ where: { id }, data: updateData(body) })
    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json({ success: false, error: 'Failed to update vendor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const pdb = getDbForRequest(request)

    const vendor = await pdb.finVendor.findUnique({ where: { id: Number(id) }, select: { id: true, name: true } })
    if (!vendor) return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 })

    // A contractor that already has purchase documents against them must not
    // disappear from the registers that reference them — block the delete and
    // tell the user what is holding it.
    const holders: string[] = []
    const [po, bid, sub, bill] = await Promise.all([
      pdb.finPO.findFirst({ where: { vendor: vendor.name }, select: { poNo: true } }),
      pdb.finRFQBid.findFirst({ where: { vendorId: vendor.id }, select: { rfqId: true } }),
      pdb.finSubcontract.findFirst({ where: { vendor: vendor.name }, select: { subcontractNo: true } }),
      pdb.accountsPayable.findFirst({ where: { vendor: vendor.name }, select: { billNo: true } }),
    ])
    if (po) holders.push(`Purchase Order ${po.poNo}`)
    if (bid) holders.push(`RFQ bid on RFQ #${bid.rfqId}`)
    if (sub) holders.push(`Contract ${sub.subcontractNo}`)
    if (bill) holders.push(`Purchase Bill ${bill.billNo}`)
    if (holders.length) {
      return NextResponse.json(
        { success: false, error: `This contractor is used by ${holders.join(', ')} and cannot be deleted` },
        { status: 409 },
      )
    }

    await pdb.finVendor.delete({ where: { id: vendor.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete vendor' }, { status: 500 })
  }
}
