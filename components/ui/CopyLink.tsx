"use client";

import { useState } from "react";

import { trackShare } from "@/components/analytics";

/**
 * Copies the current URL — which encodes the calculator's state — so a result
 * can be handed to someone else and open exactly as it is here. This is the
 * distribution feature: it is what lets a workshop keep working after the room
 * empties.
 */
export function CopyLink({ calculator }: { calculator: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard can be blocked (permissions, insecure context). The feedback
      // still shows; there is nothing sensitive to recover here.
    }
    setCopied(true);
    trackShare(calculator);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`label-section inline-flex items-center gap-2 underline underline-offset-4 transition-colors duration-150 ${
        copied ? "text-gain" : "text-ink-muted hover:text-ink"
      }`}
    >
      {copied ? "Link copied" : "Copy link to this result"}
    </button>
  );
}
