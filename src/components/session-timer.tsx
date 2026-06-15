'use client';

import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * SessionTimer — Auto-logout after 30 minutes of inactivity.
 * Tracks mouse, keyboard, touch, and scroll events to reset the timer.
 * When the timer expires, redirects to login page.
 */
export default function SessionTimer({ onLogout }: { onLogout?: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLogout = useCallback(async () => {
    // Call the logout API to clear cookies
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}

    if (onLogout) {
      onLogout();
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }, [onLogout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(doLogout, INACTIVITY_TIMEOUT);
  }, [doLogout]);

  useEffect(() => {
    // Start the timer on mount
    resetTimer();

    // Events that count as "activity"
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => resetTimer();

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  // No UI — this is a background timer
  return null;
}
