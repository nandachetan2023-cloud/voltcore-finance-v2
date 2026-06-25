// One-time utility: compress oversized tenant logos already stored in the
// superadmin DB. Big base64 logos bloat /api/tenant/branding and the superadmin
// tenants list, causing slow loads. Run with the superadmin DB URL:
//
//   SUPERADMIN_DATABASE_URL="postgres://..." node scripts/compress-tenant-logos.mjs
//
import pg from 'pg';
import sharp from 'sharp';

const url = process.env.SUPERADMIN_DATABASE_URL;
if (!url) {
  console.error('Set SUPERADMIN_DATABASE_URL (see your .env)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const { rows } = await client.query('SELECT id, name, "logoUrl" FROM "Tenant" WHERE "logoUrl" IS NOT NULL');
let changed = 0;

for (const r of rows) {
  const logo = r.logoUrl;
  if (typeof logo !== 'string' || !logo.startsWith('data:')) {
    console.log(`- ${r.name}: not a data-URL, skipped`);
    continue;
  }
  const base64 = logo.split(',')[1];
  if (!base64) continue;
  const buf = Buffer.from(base64, 'base64');
  if (buf.length < 40 * 1024) {
    console.log(`- ${r.name}: already small (${(buf.length / 1024).toFixed(0)} KB)`);
    continue;
  }
  try {
    const out = await sharp(buf)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    if (out.length >= buf.length) {
      console.log(`- ${r.name}: no size gain, kept original`);
      continue;
    }
    const newUrl = `data:image/png;base64,${out.toString('base64')}`;
    await client.query('UPDATE "Tenant" SET "logoUrl"=$1, "updatedAt"=now() WHERE id=$2', [newUrl, r.id]);
    console.log(`✓ ${r.name}: ${(buf.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
    changed++;
  } catch (e) {
    console.log(`✗ ${r.name}: ${e.message}`);
  }
}

console.log(`Done. ${changed} logo(s) compressed.`);
await client.end();
