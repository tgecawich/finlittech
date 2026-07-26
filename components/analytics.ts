"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

/**
 * Custom analytics events, and the rule that governs them: an event may carry
 * the *name* of the calculator, never a value the user typed. Someone entering
 * a real debt or salary figure must have it stay on their device.
 */

/** A share link was copied. */
export function trackShare(calculator: string): void {
  track("share-link", { calculator });
}

/**
 * Fire a single "calculator-complete" event ~1.2s after the user first changes
 * an input to a valid result — a signal of real use, deduped to once per mount,
 * carrying only the calculator name.
 *
 * `signature` is any string that changes when the inputs change; the effect
 * watches it. Nothing about the signature is ever sent.
 */
export function useCompletion(calculator: string, signature: string, ready: boolean): void {
  const isFirstRender = useRef(true);
  const hasFired = useRef(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (hasFired.current || !ready) return;
    const timer = setTimeout(() => {
      hasFired.current = true;
      track("calculator-complete", { calculator });
    }, 1200);
    return () => clearTimeout(timer);
  }, [calculator, signature, ready]);
}

/**
 * Reflect calculator state into the query string without a navigation, so every
 * result is a shareable, reloadable link. Uses replaceState so it never grows
 * the history stack as someone types.
 */
export function useUrlSync(queryString: string): void {
  useEffect(() => {
    const url = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [queryString]);
}
