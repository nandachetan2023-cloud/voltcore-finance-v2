'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, MapPin, Globe } from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   RoleScopeIndicator — persistent top-right indicator showing the
   logged-in user's role and site scope. Reads erp_auth_user for the
   identity/role and resolves site scope from the user's RBAC
   assignments (site-scoped access) when available.
   ════════════════════════════════════════════════════════════════ */

interface AuthUser {
  name?: string;
  email?: string;
  role?: string;
  orgRoleName?: string;
  allowedModules?: string;
  employeeCode?: string;
}

interface Assignment {
  siteCode?: string | null;
  site?: { siteCode?: string | null; name?: string | null } | null;
}

export function RoleScopeIndicator() {
  const [user] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('erp_auth_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  const [scope, setScope] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parsed = user;
    const resolveScope = async () => {
      try {
        const res = await fetch('/api/fin/rbac/assignments');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const email = parsed?.email?.toLowerCase();
          const mine = (json.data as Assignment[]).filter(
            (a) => a.siteCode || a.site?.siteCode
          );
          const scopedForMe = email
            ? mine.filter((a) => (a.site?.siteCode ?? a.siteCode)?.length)
            : mine;
          if (scopedForMe.length) {
            const codes = [...new Set(scopedForMe.map((a) => a.site?.siteCode ?? a.siteCode).filter(Boolean))];
            setScope(codes.length > 1 ? `${codes.length} sites` : codes[0] as string);
          } else {
            setScope(null); // all-sites
          }
        }
      } catch { setScope(null); }
      setLoading(false);
    };
    resolveScope();
  }, []);

  const roleLabel = user?.orgRoleName || (user?.role === 'admin' ? 'ADMIN' : user?.role?.toUpperCase() || 'USER');
  const roleTone = user?.role === 'superadmin' ? '#ff3d3d' : user?.role === 'admin' ? '#00e676' : '#f5a623';

  return (
    <div className="hidden sm:flex items-center gap-2 shrink-0">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#252e3a] bg-[#0f1318]"
        title="Logged-in role"
      >
        <ShieldCheck size={13} style={{ color: roleTone }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: roleTone }}>{roleLabel}</span>
      </div>
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#252e3a] bg-[#0f1318]"
        title="Site scope"
      >
        {scope ? <MapPin size={13} className="text-[#00d4ff]" /> : <Globe size={13} className="text-[#8899aa]" />}
        <span className="text-[10px] font-semibold text-[#8899aa]">{loading ? '…' : (scope ? scope : 'All Sites')}</span>
      </div>
    </div>
  );
}
