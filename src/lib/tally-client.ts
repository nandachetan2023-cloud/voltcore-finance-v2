// ── Tally HTTP Client ──────────────────────────────────────────────────
// Sends XML to Tally ERP 9's built-in HTTP server (default port 9000)
// and parses the response.

export interface TallyConnection {
  host: string
  port: number
  timeout: number
}

export interface TallyResponse {
  success: boolean
  rawXml: string
  message: string
}

export const DEFAULT_TALLY_CONNECTION: TallyConnection = {
  host: 'localhost',
  port: 9000,
  timeout: 30000,
}

// ── Send XML to Tally ─────────────────────────────────────────────────

export async function sendToTally(
  xml: string,
  connection: TallyConnection = DEFAULT_TALLY_CONNECTION,
): Promise<TallyResponse> {
  const { host, port, timeout } = connection
  const url = `http://${host}:${port}`

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

    const success = !rawXml.includes('<LINEERROR>') && !rawXml.includes('ERROR')
    const message = extractMessage(rawXml)

    return { success, rawXml, message }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, rawXml: '', message: msg }
  } finally {
    clearTimeout(timer)
  }
}

// ── Parse Tally XML response ──────────────────────────────────────────

function extractMessage(xml: string): string {
  const match = xml.match(/<LINEERROR>([^<]+)<\/LINEERROR>/)
  if (match) return match[1]

  const okMatch = xml.match(/<IMPORTRESULT[^>]*>([^<]+)<\/IMPORTRESULT>/i)
  if (okMatch) return okMatch[1]

  const cntMatch = xml.match(/<CREATEDCOUNT[^>]*>(\d+)<\/CREATEDCOUNT>/i)
  if (cntMatch) return `Created: ${cntMatch[1]} records`

  return 'Sent to Tally'
}

// ── Test connection ────────────────────────────────────────────────────

export async function testTallyConnection(
  connection: TallyConnection = DEFAULT_TALLY_CONNECTION,
): Promise<{ alive: boolean; message: string }> {
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
  if (result.success) {
    return { alive: true, message: result.message || 'Tally is reachable' }
  }
  return { alive: false, message: result.message }
}
