'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ERPLayout from '@/components/erp/erp-layout';
import Login from '@/components/auth/login';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

export default function ERPPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
        setUserRole(data.user.role);
        setAllowedModules(data.user.allowedModules || 'all');
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
    setUserRole('admin');
    setAllowedModules('all');
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
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

  return <ERPLayout onLogout={handleLogout} />;
}
