'use client';

import { useState } from 'react';
import { LogIn, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface LoginProps {
  onLogin: (employeeCode: string, password: string) => Promise<boolean>;
}

type Screen = 'login' | 'change-password' | 'change-done'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#f5a623] rounded-2xl mb-4">
            <span className="text-2xl font-bold text-[#1a1206]">VC</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2 tracking-tight">VoltCore ERP</h1>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-8 dark-shadow-lg">
          {children}
        </div>
        <div className="mt-8 text-center">
          <p className="text-xs text-[#5a6878]">© 2025 VoltCore Engineering Pvt. Ltd. All rights reserved.</p>
          <div className="mt-3 flex justify-center">
            <ThemeToggle compact />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login({ onLogin }: LoginProps) {
  // Login state
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Change password state
  const [screen, setScreen] = useState<Screen>('login');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  // ── Login submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess(false);
    if (!userId) { setLoginError('User ID is required'); return; }
    if (!password) { setLoginError('Password is required'); return; }

    setLoading(true);
    try {
      // Normalize: uppercase the userId for consistency
      const normalizedId = userId.trim().toUpperCase();
      const success = await onLogin(normalizedId, password);
      if (success) {
        setLoginSuccess(true);
        setLoginError('');
      } else {
        setLoginError('Invalid User ID or password. Please check your credentials and try again.');
      }
    } catch {
      setLoginError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ── Change Password ───────────────────────────────────────────
  const handleChangePassword = async () => {
    setCpError('');
    if (!oldPw) { setCpError('Current password is required'); return; }
    if (!newPw || newPw.length < 8) { setCpError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setCpError('Passwords do not match'); return; }
    if (oldPw === newPw) { setCpError('New password must be different from current password'); return; }

    const normalizedId = userId.trim().toUpperCase();
    if (!normalizedId) { setCpError('Please enter your User ID first on the login screen.'); return; }

    setCpLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: normalizedId, oldPassword: oldPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        setScreen('change-done');
        toast.success('Password changed successfully!');
      } else {
        setCpError(data.error || 'Failed to change password');
      }
    } catch {
      setCpError('Unable to connect. Please try again.');
    } finally {
      setCpLoading(false);
    }
  };

  // ── Screen: Login ─────────────────────────────────────────────
  if (screen === 'login') return (
    <Card>
      <p className="text-sm text-[#5a6878] text-center mb-6">Sign in to your account</p>

      {loginSuccess && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-green-500">Login Successful!</p>
            <p className="text-xs text-green-400/80 mt-1">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {loginError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-red-500">Login Failed</p>
            <p className="text-xs text-red-400/80 mt-1">{loginError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={e => { setUserId(e.target.value); setLoginError(''); }}
            placeholder="UA0001"
            className="w-full px-4 py-3 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginError(''); }}
              placeholder="Enter your password"
              className="w-full px-4 py-3 pr-12 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => { setScreen('change-password'); setOldPw(''); setNewPw(''); setConfirmPw(''); setCpError(''); }}
            className="text-xs text-[#f5a623] hover:text-[#e8891a] transition-colors">
            Change password
          </button>
        </div>

        <button type="submit" disabled={loading || loginSuccess}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /><span>Signing in...</span></>
          ) : loginSuccess ? (
            <><CheckCircle2 size={18} /><span>Success!</span></>
          ) : (
            <><LogIn size={18} /><span>Sign In</span></>
          )}
        </button>
      </form>
    </Card>
  );

  // ── Screen: Change Password ───────────────────────────────────
  if (screen === 'change-password') return (
    <Card>
      <button onClick={() => setScreen('login')} className="flex items-center gap-2 text-sm text-[#5a6878] hover:text-[#e2e8f0] transition-colors mb-6">
        <ArrowLeft size={16} /> Back to login
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#f5a623]/10 rounded-lg flex items-center justify-center">
          <KeyRound className="text-[#f5a623]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Change Password</h2>
          <p className="text-xs text-[#5a6878]">Enter your current password and choose a new one</p>
        </div>
      </div>

      {cpError && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-red-400">{cpError}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Current Password</label>
          <div className="relative">
            <input
              type={showOldPw ? 'text' : 'password'}
              value={oldPw}
              onChange={e => { setOldPw(e.target.value); setCpError(''); }}
              placeholder="Enter current password"
              className="w-full px-4 py-3 pr-12 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
              disabled={cpLoading}
            />
            <button type="button" onClick={() => setShowOldPw(!showOldPw)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              {showOldPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">New Password</label>
          <div className="relative">
            <input
              type={showNewPw ? 'text' : 'password'}
              value={newPw}
              onChange={e => { setNewPw(e.target.value); setCpError(''); }}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 pr-12 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
              disabled={cpLoading}
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPw && (
            <div className="mt-2 flex gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  newPw.length >= i * 3
                    ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-500' : 'bg-green-500'
                    : 'bg-[#252e3a]'
                }`} />
              ))}
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setCpError(''); }}
              placeholder="Re-enter new password"
              className={`w-full px-4 py-3 pr-12 bg-[#0d1117] border rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 transition-all ${
                confirmPw && confirmPw !== newPw
                  ? 'border-red-500/50 focus:ring-red-500/50'
                  : confirmPw && confirmPw === newPw
                  ? 'border-green-500/50 focus:ring-green-500/50'
                  : 'border-[#2e3a48] focus:ring-[#f5a623] focus:border-transparent'
              }`}
              disabled={cpLoading}
            />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPw && confirmPw === newPw && (
            <p className="mt-2 flex items-center gap-2 text-xs text-green-400"><CheckCircle2 size={14} />Passwords match</p>
          )}
        </div>

        <button onClick={handleChangePassword} disabled={cpLoading || !oldPw || !newPw || !confirmPw}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {cpLoading ? (
            <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /><span>Changing...</span></>
          ) : (
            <><KeyRound size={18} /><span>Change Password</span></>
          )}
        </button>
      </div>
    </Card>
  );

  // ── Screen: Change Done ───────────────────────────────────────
  return (
    <Card>
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-green-500" size={36} />
        </div>
        <h2 className="text-xl font-semibold text-[#e2e8f0] mb-2">Password Changed!</h2>
        <p className="text-sm text-[#5a6878] mb-8">Your password has been updated successfully. You can now login with your new password.</p>
        <button onClick={() => { setScreen('login'); setPassword(''); setOldPw(''); setNewPw(''); setConfirmPw(''); }}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2">
          <LogIn size={18} /><span>Back to Login</span>
        </button>
      </div>
    </Card>
  );
}
