'use client';

import { useState } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const success = await onLogin(email, password);
      if (!success) {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#f5a623] to-[#e8891a] rounded-2xl mb-4">
            <span className="text-2xl font-extrabold text-black">VC</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">VoltCore ERP</h1>
          <p className="text-sm text-[#5a6878]">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#e2e8f0] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@voltcore.com"
                className="w-full px-4 py-3 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#e2e8f0] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-[#0d1117] border border-[#2e3a48] rounded-lg text-[#e2e8f0] placeholder:text-[#5a6878] focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0] transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#f5a623] to-[#e8891a] text-black font-semibold py-3 px-4 rounded-lg hover:from-[#e8891a] hover:to-[#f5a623] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-[#252e3a]">
            <p className="text-xs text-[#5a6878] text-center mb-2">Demo Credentials:</p>
            <div className="bg-[#0d1117] border border-[#252e3a] rounded-lg p-3 space-y-1">
              <p className="text-xs text-[#8899aa]">
                <span className="text-[#5a6878]">Email:</span> admin@voltcore.com
              </p>
              <p className="text-xs text-[#8899aa]">
                <span className="text-[#5a6878]">Password:</span> admin123
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#5a6878]">
            © 2025 VoltCore Engineering Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
