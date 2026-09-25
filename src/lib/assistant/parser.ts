/**
 * Finance Assistant — parsers
 * ───────────────────────────
 * Small deterministic parsers for amounts, dates and tokens used by the
 * form field extractors and the journal-entry builder.
 */

const AMOUNT_UNITS: [RegExp, number][] = [
  [/crore|cr\b/g, 10000000],
  [/million|mn\b/g, 1000000],
  [/lakh|lac\b/g, 100000],
  [/thousand|k\b/g, 1000],
];

/** Parse a single amount like "₹1,50,000", "1.5 lakh", "5000", "10cr". */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/[₹$]/g, '')
    .replace(/rs\.?|rupees|inr/g, '')
    .replace(/,/g, '')
    .trim();

  const match = cleaned.match(/^([\d.]+)\s*(crore|cr|million|mn|lakh|lac|thousand|k)?$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;

  let multiplier = 1;
  for (const [re, m] of AMOUNT_UNITS) {
    re.lastIndex = 0;
    if (match[2] && re.test(match[2])) {
      multiplier = m;
      break;
    }
  }
  return num * multiplier;
}

/** Find all amount-looking substrings in free text and return parsed values. */
export function extractAmounts(text: string): number[] {
  const results: number[] = [];
  // Matches: optional currency word, digits (with commas), optional unit.
  const re = /(?:₹|rs\.?|rupees|inr)?\s*\b([\d,]+(?:\.\d+)?)\s*(crore|cr|million|mn|lakh|lac|thousand|k)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // Skip pure dates like 2025-01-05 or 01/02/2025 (handled separately).
    const seg = m[0].trim();
    if (/^[\d]{4}-[\d]{2}-[\d]{2}$/.test(seg)) continue;
    const val = parseAmount(`${m[1]}${m[2] ? ' ' + m[2] : ''}`);
    if (val !== null) results.push(val);
  }
  return results;
}

/** Parse a date expression to an ISO date string (yyyy-mm-dd). */
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const t = raw.toLowerCase().trim();

  if (t === 'today') return toISODate(new Date());
  if (t === 'tomorrow') return toISODate(addDays(new Date(), 1));
  if (t === 'yesterday') return toISODate(addDays(new Date(), -1));

  // yyyy-mm-dd
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // dd/mm/yyyy or dd-mm-yyyy
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const [d, mo, y] = [m[1].padStart(2, '0'), m[2].padStart(2, '0'), m[3]];
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31) return `${y}-${mo}-${d}`;
  }

  // "5 Jan 2026" / "5th Jan 2026"
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})$/i);
  if (m) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    return `${m[3]}-${months[m[2].slice(0, 3).toLowerCase()]}-${m[1].padStart(2, '0')}`;
  }

  return null;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Generate a reference number in the pattern PREFIX/YYYY-YY/NNNN. */
export function nextRef(prefix: string, seq: number): string {
  const now = new Date();
  const fy = now.getFullYear();
  const fyLabel = `${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
  return `${prefix}/${fyLabel}/${String(seq).padStart(4, '0')}`;
}
