/**
 * Light-mode patch coverage check.
 *
 * The app styles dark-mode-first with -[#hex] Tailwind classes; light mode is
 * repaired by the `html:not(.dark)` override layer in src/app/globals.css.
 * Every such class must either have an override rule or be intentionally
 * theme-independent (see INTENTIONAL below). New hexes otherwise break
 * silently in light mode.
 *
 *   node scripts/check-light-mode-coverage.mjs
 *
 * Exits 1 listing the uncovered classes.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const SRC = [join(ROOT, 'src', 'components'), join(ROOT, 'src', 'app')];
const CSS = readFileSync(join(ROOT, 'src', 'app', 'globals.css'), 'utf8');

// Hexes that are correct as-is in both themes (solid accent hover pairs stay
// vivid, print documents are white-paper with black ink, dark text sits on
// amber buttons, red text/gradients read on either background).
const INTENTIONAL = new Set([
  '1a1a1a', // print-document ink (white paper in both themes)
  'f5f5f5', 'f0f0f0', 'f8f8f8', 'e8e8e8', 'fafafa', '888', // paper grays
  '1a1206', // near-black text on amber buttons
  '00b8d6', '00b6d6', // solid cyan hover pair of 00d4ff
  '00c866', '00d45e', // solid green hover pair of 00e676
  '9a6ff5', // solid violet hover of a78bfa
  'e0961a', 'ffb84d', // solid amber hovers of f5a623
  'cc0000', 'cc2222', 'e02d2d', 'ff5555', // red solids/hovers/text, vivid either way
]);

const CLASS_RE = /((?:hover:)?(?:bg|text|border|divide|from|to|via))-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\](\/\d+)?/g;
const RULE_RE = /\[\\#([0-9a-f]{6}|[0-9a-f]{3})\\?\]/g;

const covered = new Set();
for (const m of CSS.matchAll(RULE_RE)) covered.add(m[1].toLowerCase());

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(e)) yield p;
  }
}

const missing = new Map(); // class -> Set(files)
for (const dir of SRC) {
  for (const f of walk(dir)) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(CLASS_RE)) {
      const hex = m[2].toLowerCase();
      if (covered.has(hex) || INTENTIONAL.has(hex)) continue;
      const cls = `${m[1]}-[#${hex}]${m[3] ?? ''}`;
      if (!missing.has(cls)) missing.set(cls, new Set());
      missing.get(cls).add(f.replace(ROOT + '\\', ''));
    }
  }
}

if (missing.size === 0) {
  console.log('OK: every -[#hex] class is covered by the light-mode patch or intentionally theme-independent.');
} else {
  console.log(`MISSING light-mode coverage for ${missing.size} class(es):`);
  for (const [cls, files] of [...missing.entries()].sort()) {
    console.log(`  ${cls}  (${[...files].join(', ')})`);
  }
  process.exit(1);
}
