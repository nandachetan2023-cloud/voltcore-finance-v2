// SaaS tenant helper — additive, non-breaking.
// Step 1: add Tenant model (see prisma/tenancy-addon.prisma), migrate.
// Step 2: use requireTenant() in every API route to scope by tenantId.
// Works with next-auth (voltcore_erp uses next-auth v4).

import { getServerSession } from "next-auth";

export type TenantSession = {
  tenantId: string;
  userId: string;
  email?: string;
};

export async function requireTenant(): Promise<string> {
  const session: any = await getServerSession();
  const tenantId =
    session?.user?.tenantId ||
    (session?.user as any)?.tenant_id ||
    process.env.DEFAULT_TENANT_ID ||
    "demo-erp";
  if (!tenantId) throw new Error("No tenant in session");
  return tenantId as string;
}

// Resolve tenant from subdomain: client1.domain.com -> client1
// Fallback to session tenantId for localhost/dev.
export function tenantFromHost(host: string | null): string | null {
  if (!host) return null;
  const h = host.split(":")[0].toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return null;
  const parts = h.split(".");
  // demo-erp.yourdomain.com -> demo-erp (skip www)
  if (parts.length >= 3 && parts[0] !== "www") return parts[0];
  return null;
}

// Guard: ensure a DB record belongs to current tenant before read/write.
export function assertSameTenant(recordTenantId: string, currentTenantId: string) {
  if (recordTenantId !== currentTenantId) {
    throw new Error("Cross-tenant access denied");
  }
}

// Helper to inject tenantId into Prisma where/create clauses.
export function withTenant<T extends object>(tenantId: string, data: T): T & { tenantId: string } {
  return { ...data, tenantId };
}
