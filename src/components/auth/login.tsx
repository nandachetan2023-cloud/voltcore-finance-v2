'use client';

import { useState } from 'react';
import { LogIn, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Mail, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

type Screen = 'login' | 'forgot' | 'otp' | 'reset' | 'done'

// ── Shared card wrapper — defined OUTSIDE Login to prevent remounting ──
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#f5a623] to-[#e8891a] rounded-2xl mb-4">
            <span className="text-2xl font-extrabold text-black">VC</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">VoltCore ERP</h1>
        </div>
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-8 shadow-2xl">
          {children}
        </div>
        <div className="mt-8 text-center">
          <p className="text-xs text-[#5a6878]">© 2025 VoltCore Engineering Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function Login({ onLogin }: LoginProps) {
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Forgot password state
  const [screen, setScreen] = useState<Screen>('login');
  const [fpEmail, setFpEmail] = useState('');
  const [fpEmailError, setFpEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Email validation
  const validateEmail = (val: string): boolean => {
    if (!val) { setEmailError('Email is required'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) { setEmailError('Please enter a valid email address'); return false; }
    const suspiciousDomains = ['gmial.com', 'gmai.com', 'yahooo.com', 'outlok.com'];
    const domain = val.split('@')[1]?.toLowerCase();
    if (suspiciousDomains.includes(domain)) { setEmailError('Check your email spelling'); return false; }
    setEmailError('');
    return true;
  };

  const validateFpEmail = (val: string): boolean => {
    if (!val) { setFpEmailError('Email is required'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) { setFpEmailError('Please enter a valid email address'); return false; }
    setFpEmailError('');
    return true;
  };

  // ── Login submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess(false);
    if (!validateEmail(email)) return;
    if (!password) { setLoginError('Password is required'); return; }
    if (password.length < 6) { setLoginError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const success = await onLogin(email, password);
      if (success) {
        setLoginSuccess(true);
        setLoginError('');
      } else {
        setLoginError('Invalid email or password. Please check your credentials and try again.');
      }
    } catch {
      setLoginError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ──────────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!validateFpEmail(fpEmail)) return;
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setScreen('otp');
        toast.success('OTP sent! Check your email.');
        // Start 60s resend cooldown
        setResendCooldown(60);
        const interval = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        setFpEmailError(data.error || 'Failed to send OTP');
      }
    } catch {
      setFpEmailError('Unable to connect. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) { setOtpError('Enter the 6-digit OTP'); return; }
    setOtpError('');
    setScreen('reset');
  };

  // ── Reset Password ────────────────────────────────────────────
  const handleResetPassword = async () => {
    setResetError('');
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, otp, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setScreen('done');
        toast.success('Password reset successfully!');
      } else {
        setResetError(data.error || 'Failed to reset password');
        if (data.error?.includes('OTP')) setScreen('otp');
      }
    } catch {
      setResetError('Unable to connect. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Shared card wrapper ───────────────────────────────────────
  // (defined outside this component — see top of file)

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
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(''); setLoginError(''); }}
            onBlur={() => email && validateEmail(email)}
            placeholder="admin@voltcore.com"
            className={`w-full px-4 py-3 bg-[#0d1117] border rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 transition-all ${emailError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-[#2e3a48] focus:ring-[#f5a623] focus:border-transparent'}`}
            disabled={loading}
          />
          {emailError && <p className="mt-2 flex items-center gap-2 text-xs text-red-400"><AlertCircle size={14} />{emailError}</p>}
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
          <button type="button" onClick={() => { setScreen('forgot'); setFpEmail(email); }}
            className="text-xs text-[#f5a623] hover:text-[#e8891a] transition-colors">
            Forgot password?
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

  // ── Screen: Forgot Password (enter email) ─────────────────────
  if (screen === 'forgot') return (
    <Card>
      <button onClick={() => setScreen('login')} className="flex items-center gap-2 text-sm text-[#5a6878] hover:text-[#e2e8f0] transition-colors mb-6">
        <ArrowLeft size={16} /> Back to login
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#f5a623]/10 rounded-lg flex items-center justify-center">
          <Mail className="text-[#f5a623]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Reset Password</h2>
          <p className="text-xs text-[#5a6878]">We'll send a 6-digit OTP to your email</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Email Address</label>
          <input
            type="email"
            value={fpEmail}
            onChange={e => { setFpEmail(e.target.value); setFpEmailError(''); }}
            onBlur={() => fpEmail && validateFpEmail(fpEmail)}
            placeholder="your@email.com"
            className={`w-full px-4 py-3 bg-[#0d1117] border rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 transition-all ${fpEmailError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-[#2e3a48] focus:ring-[#f5a623] focus:border-transparent'}`}
            disabled={fpLoading}
          />
          {fpEmailError && <p className="mt-2 flex items-center gap-2 text-xs text-red-400"><AlertCircle size={14} />{fpEmailError}</p>}
        </div>

        <button onClick={handleSendOTP} disabled={fpLoading}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {fpLoading ? (
            <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /><span>Sending OTP...</span></>
          ) : (
            <><Mail size={18} /><span>Send OTP</span></>
          )}
        </button>
      </div>
    </Card>
  );

  // ── Screen: Enter OTP ─────────────────────────────────────────
  if (screen === 'otp') return (
    <Card>
      <button onClick={() => setScreen('forgot')} className="flex items-center gap-2 text-sm text-[#5a6878] hover:text-[#e2e8f0] transition-colors mb-6">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#f5a623]/10 rounded-lg flex items-center justify-center">
          <KeyRound className="text-[#f5a623]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Enter OTP</h2>
          <p className="text-xs text-[#5a6878]">Sent to <span className="text-[#f5a623]">{fpEmail}</span></p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">6-Digit OTP</label>
          <input
            type="text"
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
            placeholder="000000"
            maxLength={6}
            className={`w-full px-4 py-3 bg-[#0d1117] border rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 transition-all text-center text-2xl tracking-[0.5em] font-mono ${otpError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-[#2e3a48] focus:ring-[#f5a623] focus:border-transparent'}`}
          />
          {otpError && <p className="mt-2 flex items-center gap-2 text-xs text-red-400"><AlertCircle size={14} />{otpError}</p>}
          <p className="mt-2 text-xs text-[#5a6878]">⏱ OTP expires in 10 minutes</p>
        </div>

        <button onClick={handleVerifyOTP} disabled={otp.length !== 6}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <KeyRound size={18} /><span>Verify OTP</span>
        </button>

        <button onClick={handleSendOTP} disabled={resendCooldown > 0 || fpLoading}
          className="w-full flex items-center justify-center gap-2 text-sm text-[#5a6878] hover:text-[#e2e8f0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed py-2">
          <RefreshCw size={14} />
          {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </Card>
  );

  // ── Screen: Set New Password ──────────────────────────────────
  if (screen === 'reset') return (
    <Card>
      <button onClick={() => setScreen('otp')} className="flex items-center gap-2 text-sm text-[#5a6878] hover:text-[#e2e8f0] transition-colors mb-6">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#f5a623]/10 rounded-lg flex items-center justify-center">
          <KeyRound className="text-[#f5a623]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#e2e8f0]">Set New Password</h2>
          <p className="text-xs text-[#5a6878]">Choose a strong password</p>
        </div>
      </div>

      {resetError && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-red-400">{resetError}</p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setResetError(''); }}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-3 pr-12 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
              disabled={fpLoading}
            />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Password strength indicator */}
          {newPassword && (
            <div className="mt-2 flex gap-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  newPassword.length >= i * 3
                    ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-500' : 'bg-green-500'
                    : 'bg-[#252e3a]'
                }`} />
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#e2e8f0] mb-2">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setResetError(''); }}
              placeholder="Re-enter password"
              className={`w-full px-4 py-3 pr-12 bg-[#0d1117] border rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 transition-all ${
                confirmPassword && confirmPassword !== newPassword
                  ? 'border-red-500/50 focus:ring-red-500/50'
                  : confirmPassword && confirmPassword === newPassword
                  ? 'border-green-500/50 focus:ring-green-500/50'
                  : 'border-[#2e3a48] focus:ring-[#f5a623] focus:border-transparent'
              }`}
              disabled={fpLoading}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors">
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && confirmPassword === newPassword && (
            <p className="mt-2 flex items-center gap-2 text-xs text-green-400"><CheckCircle2 size={14} />Passwords match</p>
          )}
        </div>

        <button onClick={handleResetPassword} disabled={fpLoading || !newPassword || !confirmPassword}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {fpLoading ? (
            <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /><span>Resetting...</span></>
          ) : (
            <><CheckCircle2 size={18} /><span>Reset Password</span></>
          )}
        </button>
      </div>
    </Card>
  );

  // ── Screen: Done ──────────────────────────────────────────────
  return (
    <Card>
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-green-500" size={36} />
        </div>
        <h2 className="text-xl font-semibold text-[#e2e8f0] mb-2">Password Reset!</h2>
        <p className="text-sm text-[#5a6878] mb-8">Your password has been updated successfully. You can now login with your new password.</p>
        <button onClick={() => { setScreen('login'); setEmail(fpEmail); setPassword(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
          className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2">
          <LogIn size={18} /><span>Back to Login</span>
        </button>
      </div>
    </Card>
  );
}