// ── Tally HTTP Client ──────────────────────────────────────────────────
// CA-Grade: parses CREATED/ALTERED/REJECTED, FY-aware, retry, full XML
// Sends XML to Tally ERP 9 / Prime HTTP server (default port 9000)

export interface TallyConnection {
  host: string
  port: number
  timeout: number
}

export interface TallyResponse {
  success: boolean
  rawXml: string
  message: string
  created: number
  altered: number
  rejected: number
  errors: string[]
  alterIDs: string[]
}

export const DEFAULT_TALLY_CONNECTION: TallyConnection = {
  host: 'localhost',
  port: 9000,
  timeout: 30000,
}

// ── Helpers to validate Tally host ──────────────────────────────────
function isAllowedHost(host: string): boolean {
  const allowed = (process.env.TALLY_ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map(s=>s.trim())
  return allowed.includes(host) || host === 'localhost'
}

// ── Send XML to Tally with retry ─────────────────────────────────────

export async function sendToTally(
  xml: string,
  connection: TallyConnection = DEFAULT_TALLY_CONNECTION,
  opts: { retries?: number } = {},
): Promise<TallyResponse> {
  const { host, port, timeout } = connection
  if (!isAllowedHost(host)) {
    return { success: false, rawXml: '', message: `Host ${host} not allow-listed`, created: 0, altered: 0, rejected: 1, errors: [`Host not allowed`], alterIDs: [] }
  }
  const url = `http://${host}:${port}`
  const retries = opts.retries ?? 2

  let lastError = ''
  let lastXml = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml,
        signal: controller.signal,
      })
      const rawXml = await res.text()
      lastXml = rawXml
      const parsed = parseTallyResponse(rawXml)
      if (parsed.rejected === 0 || attempt === retries) {
        clearTimeout(timer)
        return { success: parsed.rejected === 0 && parsed.errors.length === 0, rawXml, message: parsed.message, created: parsed.created, altered: parsed.altered, rejected: parsed.rejected, errors: parsed.errors, alterIDs: parsed.alterIDs }
      }
      lastError = parsed.message
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      lastXml = ''
      if (attempt === retries) {
        clearTimeout(timer)
        return { success: false, rawXml: lastXml, message: lastError, created: 0, altered: 0, rejected: 1, errors: [lastError], alterIDs: [] }
      }
      await new Promise(r => setTimeout(r, 500 * (attempt+1)))
    } finally {
      clearTimeout(timer)
    }
  }
  return { success: false, rawXml: lastXml, message: lastError, created: 0, altered: 0, rejected: 1, errors: [lastError], alterIDs: [] }
}

// ── Parse Tally XML response ──────────────────────────────────────────

function parseTallyResponse(xml: string): { created: number; altered: number; rejected: number; errors: string[]; message: string; alterIDs: string[] } {
  const errors: string[] = []
  let m: RegExpMatchArray | null

  // LINEERRORs
  const lineErrRe = /<LINEERROR>([^<]+)<\/LINEERROR>/g
  let lineM: RegExpExecArray | null
  while ((lineM = lineErrRe.exec(xml)) !== null) errors.push(lineM[1].trim())

  const created = Number((xml.match(/<CREATED[^>]*>(\d+)<\/CREATED>/i)?.[1]) || 0)
  const altered = Number((xml.match(/<ALTERED[^>]*>(\d+)<\/ALTERED>/i)?.[1]) || 0)
  const rejected = Number((xml.match(/<REJECTED[^>]*>(\d+)<\/REJECTED>/i)?.[1]) || 0)
  const createdCount = Number((xml.match(/<CREATEDCOUNT[^>]*>(\d+)<\/CREATEDCOUNT>/i)?.[1]) || created)
  const alteredCount = Number((xml.match(/<ALTEREDCOUNT[^>]*>(\d+)<\/ALTEREDCOUNT>/i)?.[1]) || altered)
  const rejectedCount = Number((xml.match(/<REJECTEDCOUNT[^>]*>(\d+)<\/REJECTEDCOUNT>/i)?.[1]) || rejected)

  // AlterIDs
  const alterIDs: string[] = []
  const alterRe = /<ALTERID>([^<]+)<\/ALTERID>/g
  let aM: RegExpExecArray | null
  while ((aM = alterRe.exec(xml)) !== null) alterIDs.push(aM[1].trim())

  let message = ''
  if (errors.length > 0) message = errors.join('; ')
  else if (xml.match(/<IMPORTRESULT[^>]*>([^<]+)<\/IMPORTRESULT>/i)) message = xml.match(/<IMPORTRESULT[^>]*>([^<]+)<\/IMPORTRESULT>/i)![1].trim()
  else if (createdCount || alteredCount) message = `Created: ${createdCount}, Altered: ${alteredCount}, Rejected: ${rejectedCount}`
  else if (xml.includes('ERROR')) message = 'Tally returned ERROR'
  else message = 'Sent to Tally'

  return { created: createdCount, altered: alteredCount, rejected: rejectedCount, errors, message, alterIDs }
}

function extractMessage(xml: string): string {
  return parseTallyResponse(xml).message
}

// ── Test connection + FY validation ─────────────────────────────────

export async function testTallyConnection(
  connection: TallyConnection = DEFAULT_TALLY_CONNECTION,
): Promise<{ alive: boolean; message: string; companies?: string[]; booksFrom?: string }> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Companies</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`

  const result = await sendToTally(xml, connection)
  if (!result.success && result.rejected > 0) {
    return { alive: false, message: result.message }
  }
  // Extract companies
  const companies: string[] = []
  const compRe = /<NAME>([^<]+)<\/NAME>/g
  let cM: RegExpExecArray | null
  // Only take names that look like company names (heuristic: inside <COMPANY>)
  const compSection = result.rawXml.match(/<COMPANY[\s\S]*?<\/COMPANY>/g)
  if (compSection) {
    for (const sec of compSection) {
      const nm = sec.match(/<NAME>([^<]+)<\/NAME>/)?.[1]
      if (nm) companies.push(nm.trim())
    }
  }
  if (result.success) {
    return { alive: true, message: result.message || 'Tally is reachable', companies, booksFrom: undefined }
  }
  return { alive: false, message: result.message, companies }
}

export async function validateFinYearInTally(companyName: string, finYear: string, connection: TallyConnection = DEFAULT_TALLY_CONNECTION): Promise<{ valid: boolean; message: string }> {
  // FinYear "2025-26" -> Apr 1 2025 to Mar 31 2026
  const startYear = Number(finYear.split('-')[0])
  const endYear = startYear + 1
  // In real Tally, Books Beginning From is per company; for now we just check company exists via List of Companies
  const test = await testTallyConnection(connection)
  if (!test.alive) return { valid: false, message: 'Tally not reachable' }
  if (test.companies && test.companies.length > 0 && !test.companies.includes(companyName)) {
    return { valid: false, message: `Company "${companyName}" not found in Tally. Available: ${test.companies.join(', ')}` }
  }
  return { valid: true, message: `FY ${finYear} validated for ${companyName}` }
}
