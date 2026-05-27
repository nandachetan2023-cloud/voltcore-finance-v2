'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ERPLayout from '@/components/erp/erp-layout';
import Login from '@/components/auth/login';
import OnboardingForm from '@/components/auth/onboarding-form';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';
import { clearTenantBrandingCache } from '@/hooks/use-tenant-branding';

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

  // Gate: show onboarding form if status is pending or submitted (awaiting approval)
  if (onboardingStatus === 'pending' || onboardingStatus === 'submitted') {
    return <OnboardingForm status={onboardingStatus} onSubmit={handleOnboardingSubmit} onLogout={handleLogout} />;
  }

  return <ERPLayout onLogout={handleLogout} />;
}
