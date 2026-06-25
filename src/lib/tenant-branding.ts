import type { NextRequest } from 'next/server';
import { superadminDb } from '@/lib/superadmin-db';

/**
 * Fetch the current tenant's logo (uploaded by superadmin) as a base64 data URL
 * suitable for embedding in a jsPDF document. Returns null when there is no
 * tenant context or no logo, or if a remote logo cannot be loaded.
 */
export async function getTenantLogo(request: NextRequest): Promise<string | null> {
  try {
    const tenantId = request.cookies.get('erp_tenant_id')?.value;
    if (!tenantId) return null;

    const tenant = await superadminDb.tenant.findUnique({
      where: { id: tenantId },
      select: { logoUrl: true } as any,
    });

    const logoUrl: string | null | undefined = (tenant as any)?.logoUrl;
    if (!logoUrl) return null;

    // Already a data URL — usable directly by jsPDF
    if (logoUrl.startsWith('data:')) return logoUrl;

    // Remote URL — fetch and convert to a base64 data URL
    if (/^https?:\/\//i.test(logoUrl)) {
      const res = await fetch(logoUrl);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await res.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }

    return null;
  } catch (error) {
    console.error('Failed to load tenant logo for payslip:', error);
    return null;
  }
}
