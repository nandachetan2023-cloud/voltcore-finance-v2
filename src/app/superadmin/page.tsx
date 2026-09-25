'use client';

import { useState, useEffect } from 'react';
import SuperAdminDashboard from '@/components/superadmin/dashboard';

export default function SuperAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sa = localStorage.getItem('sa_auth');
    if (sa) setAuthed(true);
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/superadmin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('sa_auth', JSON.stringify(data.user));
        setAuthed(true);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sa_auth');
    setAuthed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#f5a623] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0d12] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#ff3d3d] to-[#cc0000] rounded-2xl mb-4 shadow-lg shadow-[#ff3d3d]/20">
              <span className="text-white text-xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>SA</span>
            </div>
            <h1 className="text-[28px] font-black text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              SUPER ADMIN
            </h1>
            <p className="text-[12px] text-[#5a6878] tracking-widest uppercase mt-1">VoltCore ERP Control Panel</p>
          </div>

          {/* Login card */}
          <form onSubmit={handleLogin} className="bg-[#161c24] border border-[#252e3a] rounded-2xl p-6 space-y-4">
            {error && (
              <div className="px-3 py-2 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg text-[12px] text-[#ff3d3d]">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@voltcore.in"
                className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2.5 text-[13px] text-[#e2e8f0] outline-none focus:border-[#ff3d3d]/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d1117] border border-[#2e3a48] rounded-lg px-3 py-2.5 text-[13px] text-[#e2e8f0] outline-none focus:border-[#ff3d3d]/60 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-[#ff3d3d] to-[#cc0000] text-white text-[13px] font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[11px] text-[#5a6878] mt-4">
            <a href="/" className="hover:text-[#e2e8f0] transition-colors">← Back to ERP Login</a>
          </p>
        </div>
      </div>
    );
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}
