import { NextRequest, NextResponse } from 'next/server';
import { getDbForRequest } from '@/lib/db';
import { nextItemCode } from '@/lib/auto-number';

export const dynamic = 'force-dynamic';

/**
 * Preview of the item code the server will assign next.
 *
 * The Item Code Generator never types a code: the user picks a Category and
 * the server generates <PREFIX>-<NNN> (CON-001, P&M-001, T&T-001 …) from the
 * category's prefix. This endpoint only *previews* that number so the form
 * can show it before saving — the code is still assigned on the server at
 * create time (highest suffix + 1, never reused, retried on a race).
 */

export async function GET(request: NextRequest) {
  try {
    const pdb = getDbForRequest(request);
    const raw = request.nextUrl.searchParams.get('categoryId');

    let categoryId: number | null = null;
    let categoryCode: string | null = null;
    let categoryName: string | null = null;

    if (raw !== null && String(raw).trim() !== '') {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        return NextResponse.json({ success: false, error: 'categoryId must be a number' }, { status: 400 });
      }
      const cat = await pdb.finItemCategory.findUnique({ where: { id: n } });
      if (!cat) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
      }
      categoryId = cat.id;
      categoryCode = cat.code;
      categoryName = cat.name;
    }

    const code = await nextItemCode(pdb, categoryCode);
    const prefix = code.replace(/\d+$/, '');

    return NextResponse.json({
      success: true,
      data: { code, prefix, categoryId, categoryCode, categoryName },
    });
  } catch (error) {
    console.error('Error generating next item code:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate item code' }, { status: 500 });
  }
}
