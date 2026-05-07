'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="p-1.5 rounded-lg text-[#5a6878] hover:text-[#f5a623] transition-colors"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#1a2028] dark:hover:bg-[#1a2028] light:hover:bg-[#e8eaed]"
      style={{ color: 'var(--vc-text2)' }}
    >
      <div
        className="w-8 h-4 rounded-full relative transition-colors duration-300 flex-shrink-0"
        style={{ background: isDark ? '#252e3a' : '#d1d9e0' }}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 flex items-center justify-center"
          style={{
            left: isDark ? '17px' : '2px',
            background: isDark ? '#f5a623' : '#718096',
          }}
        />
      </div>
      <span style={{ color: 'var(--vc-text2)' }}>
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
      {isDark ? (
        <Moon size={12} className="ml-auto" style={{ color: '#f5a623' }} />
      ) : (
        <Sun size={12} className="ml-auto" style={{ color: '#718096' }} />
      )}
    </button>
  );
}
