"use client";

import * as React from "react";
import { appConfig } from "@/lib/config";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

interface UseIdleTimeoutOptions {
  enabled: boolean;
  onWarning: () => void;
  onTimeout: () => void;
  timeoutMs?: number;
  warningMs?: number;
}

export function useIdleTimeout({
  enabled,
  onWarning,
  onTimeout,
  timeoutMs = appConfig.session.idleTimeoutMs,
  warningMs = appConfig.session.idleWarningMs,
}: UseIdleTimeoutOptions): { reset: () => void } {
  const warnTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = React.useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    warnTimer.current = null;
    timeoutTimer.current = null;
  }, []);

  const reset = React.useCallback(() => {
    if (!enabled) return;
    clearTimers();
    const warningDelay = Math.max(timeoutMs - warningMs, 1_000);
    warnTimer.current = setTimeout(() => onWarning(), warningDelay);
    timeoutTimer.current = setTimeout(() => onTimeout(), timeoutMs);
  }, [enabled, clearTimers, timeoutMs, warningMs, onWarning, onTimeout]);

  React.useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }
    const handler = () => reset();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handler, { passive: true }));
    reset();
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handler));
      clearTimers();
    };
  }, [enabled, reset, clearTimers]);

  return { reset };
}
