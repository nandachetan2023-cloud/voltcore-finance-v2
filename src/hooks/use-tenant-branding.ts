'use client';

import { useEffect, useState } from 'react';

interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

let cached: TenantBranding | null = null;
let cachePromise: Promise<TenantBranding | null> | null = null;

async function fetchBranding(): Promise<TenantBranding | null> {
  try {
    const res = await fetch('/api/tenant/branding');
    const data = await res.json();
    if (data.success && data.data) {
      cached = data.data;
      return data.data;
    }
  } catch {}
  return null;
}

export function useTenantBranding(): TenantBranding | null {
  const [branding, setBranding] = useState<TenantBranding | null>(cached);

  useEffect(() => {
    if (cached) {
      setBranding(cached);
      return;
    }
    if (!cachePromise) {
      cachePromise = fetchBranding();
    }
    cachePromise.then(b => {
      if (b) setBranding(b);
    });
  }, []);

  return branding;
}

// Call this after login to refresh the cache
export function clearTenantBrandingCache() {
  cached = null;
  cachePromise = null;
}
