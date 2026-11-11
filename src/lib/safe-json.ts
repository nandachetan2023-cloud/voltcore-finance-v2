/**
 * Browser-side JSON reader that never throws a SyntaxError on an HTML page.
 *
 * `res.json()` on a response that is actually an HTML document (Next's 404
 * page, a login redirect, a proxy error page) blows up with
 *   SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
 * and the whole screen dies, because the failure happens inside the promise
 * chain of the fetches that were issued together.
 *
 * `readJsonSafe` reads the body as text first, checks that it really is JSON
 * and returns a result object instead of throwing. Callers get
 * `success:false` plus a readable error and can show a toast.
 */

export interface SafeJson {
  ok: boolean
  success: boolean
  status: number
  data?: any
  error?: string
  /** True when the server answered with an HTML page instead of JSON. */
  html: boolean
}

const htmlMessage = (status: number, ct: string) =>
  `Server returned ${status}${ct ? ` (${ct})` : ''} instead of JSON — the endpoint is missing or unreachable.`

/** Read a fetch Response as JSON without ever throwing on a non-JSON body. */
export async function readJsonSafe(res: Response): Promise<SafeJson> {
  const ct = res.headers.get('content-type') || ''
  let text = ''
  try {
    text = await res.text()
  } catch {
    return { ok: false, success: false, status: res.status, error: `Could not read the response (${res.status}).`, html: false }
  }

  const looksJson = ct.includes('json')
  if (!looksJson) {
    const isHtml = /^\s*<(!doctype|html)/i.test(text)
    console.warn(
      `[safe-json] ${res.status} ${res.url} answered with ${ct || (isHtml ? 'text/html' : 'an unknown content type')} instead of JSON.`,
    )
    return {
      ok: false,
      success: false,
      status: res.status,
      error: htmlMessage(res.status, ct || (isHtml ? 'text/html' : 'unknown')),
      html: isHtml,
    }
  }

  try {
    const parsed = JSON.parse(text)
    const success = typeof parsed?.success === 'boolean' ? parsed.success : res.ok
    return {
      ok: res.ok && success,
      success,
      status: res.status,
      data: parsed?.data ?? parsed,
      error: parsed?.error,
      html: false,
    }
  } catch {
    return {
      ok: false,
      success: false,
      status: res.status,
      error: `Malformed JSON response (${res.status}).`,
      html: false,
    }
  }
}

/**
 * Convenience wrapper: fetch + safe JSON read.
 * `fetcher` may return a Response or a promise of one.
 */
export async function fetchJsonSafe(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<SafeJson & { res: Response }> {
  const res = await fetch(input, init)
  const parsed = await readJsonSafe(res)
  return { ...parsed, res }
}
