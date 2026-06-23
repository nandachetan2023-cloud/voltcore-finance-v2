'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ERPLayout from '@/components/erp/erp-layout';
import Login from '@/components/auth/login';
import OnboardingForm from '@/components/auth/onboarding-form';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { clearTenantBrandingCache } from '@/hooks/use-tenant-branding';
import { useIdleLogout } from '@/hooks/use-idle-logout';

export default function ERPPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<string>('none');
  const { setUserRole, setAllowedModules } = useERPStore();
  const router = useRouter();

  useEffect(() => {
    const authUser = localStorage.getItem('erp_auth_user');
    if (authUser) {
      try {
        const user = JSON.parse(authUser);
        // Only redirect to superadmin if we're NOT already coming from there
        // (i.e. don't redirect if the user explicitly navigated to /)
        if (user.role === 'superadmin') {
          // Don't auto-redirect — just show the ERP login
          // Superadmin must log in separately via /superadmin
          localStorage.removeItem('erp_auth_user');
          setIsLoading(false);
          return;
        }
        setUserRole(user.role);
        setAllowedModules(user.allowedModules || 'all');
        setOnboardingStatus(user.onboardingStatus || 'none');
        setIsAuthenticated(true);
      } catch {}
    }
    setIsLoading(false);
  }, [setUserRole, setAllowedModules, router]);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.user.role === 'superadmin') {
          // Store in sa_auth (superadmin session), not erp_auth_user
          localStorage.setItem('sa_auth', JSON.stringify(data.user));
          router.replace('/superadmin');
          return true;
        }

        localStorage.setItem('erp_auth_user', JSON.stringify(data.user));
        // Also store employeeId if present (for self-service modules)
        if (data.user.employeeId) {
          localStorage.setItem('erp_employee_id', String(data.user.employeeId));
        }
        clearTenantBrandingCache();
        setUserRole(data.user.role);
        setAllowedModules(data.user.allowedModules || 'all');
        setOnboardingStatus(data.user.onboardingStatus || 'none');
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${data.user.name}!`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('erp_auth_user');
    clearTenantBrandingCache();
    setUserRole('admin');
    setAllowedModules('all');
    setOnboardingStatus('none');
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const handleOnboardingSubmit = () => {
    // Update local state after form submission
    setOnboardingStatus('submitted');
    const authUser = localStorage.getItem('erp_auth_user');
    if (authUser) {
      const user = JSON.parse(authUser);
      user.onboardingStatus = 'submitted';
      localStorage.setItem('erp_auth_user', JSON.stringify(user));
    }
  };

  // ── Idle auto-logout (30 min inactivity) ──────────────────────
  const { showWarning, secondsLeft, stayLoggedIn } = useIdleLogout({
    onLogout: handleLogout,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#f5a623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Gate: show onboarding form if status is pending, submitted, or rejected (admin asked to resubmit)
  if (onboardingStatus === 'pending' || onboardingStatus === 'submitted' || onboardingStatus === 'rejected') {
    return <OnboardingForm status={onboardingStatus} onSubmit={handleOnboardingSubmit} onLogout={handleLogout} />;
  }

  return (
    <>
      <ERPLayout onLogout={handleLogout} />

      {/* ── Idle session warning overlay ── */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161c24] border border-[#252e3a] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#ffab40]/10 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffab40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#e2e8f0]">Still there?</h3>
              <p className="text-[12px] text-[#8899aa] mt-1">
                You&apos;ve been inactive for a while. For your security, you&apos;ll be logged out in
              </p>
              <div className="text-[36px] font-black text-[#ffab40] mt-2 leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {secondsLeft}s
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={stayLoggedIn}
                className="flex-1 vc-btn-primary text-[13px]"
              >
                Stay logged in
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 vc-btn-ghost text-[13px]"
              >
                Log out now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
