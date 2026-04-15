'use client';

import { useState, useEffect } from 'react';
import ERPLayout from '@/components/erp/erp-layout';
import Login from '@/components/auth/login';
import { toast } from 'sonner';

export default function ERPPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const authToken = localStorage.getItem('erp_auth_token');
    const authUser = localStorage.getItem('erp_auth_user');
    
    if (authToken && authUser) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store auth token and user info
        localStorage.setItem('erp_auth_token', data.token || 'authenticated');
        localStorage.setItem('erp_auth_user', JSON.stringify(data.user));
        
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

  const handleLogout = () => {
    localStorage.removeItem('erp_auth_token');
    localStorage.removeItem('erp_auth_user');
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
