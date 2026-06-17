'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT_MS  = 30 * 60 * 1000; // 30 minutes
const WARN_BEFORE_MS   =  1 * 60 * 1000; // show warning 1 minute before logout

// Activity events that reset the idle timer
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
];

interface UseIdleLogoutOptions {
  /** Called when the session has been idle for 30 min and the warning was ignored. */
  onLogout: () => void;
  /** Set to false when the user is not authenticated — disables the timer entirely. */
  enabled?: boolean;
}

export function useIdleLogout({ onLogout, enabled = true }: UseIdleLogoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLogoutRef  = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearTimers = useCallback(() => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current);
    if (warnTimer.current)    clearTimeout(warnTimer.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const showWarningRef = useRef(showWarning);
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  const startTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    // Show warning 1 minute before logout
    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    // Logout after full idle timeout
    logoutTimer.current = setTimeout(() => {
      setShowWarning(false);
      onLogoutRef.current();
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers]);

  // "Stay logged in" — user clicked the warning button
  const stayLoggedIn = useCallback(() => {
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    startTimers();

    const handleActivity = () => {
      // Only reset if the warning isn't showing — if it is, the user must
      // explicitly click "Stay logged in" (prevents accidental resets from
      // background events while the warning is visible).
      if (!showWarningRef.current) startTimers();
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, startTimers, clearTimers]);

  return { showWarning, secondsLeft, stayLoggedIn };
}
