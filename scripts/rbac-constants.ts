// Single source of truth for the Finance RBAC permission catalog's module
// list, shared between seed-fin-rbac.ts (which creates these permissions)
// and cleanup-junk-permissions.ts (which deletes anything NOT in this list).
// Keeping this in one file — rather than two copies — is what a prior bug
// this session was caused by: cleanup's own copy fell out of sync when
// 'Admin' was added here, and it deleted every Admin_* permission on next run.
export const MODULES = ['GL', 'AP', 'AR', 'PettyCash', 'Purchase', 'Payroll', 'Inventory', 'Reports', 'Admin']
