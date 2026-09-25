// Current logged-in user's identity, read from the same localStorage key
// erp-layout.tsx already uses for notifications. Used as the `actor` for
// petty-cash approval actions so the server-side Segregation-of-Duties
// self-approval check (see /api/fin/petty-cash/approve) has something to
// compare the submitter against.
export function getCurrentUserEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('erp_auth_user');
    if (!raw) return '';
    return JSON.parse(raw)?.email || '';
  } catch { return ''; }
}
