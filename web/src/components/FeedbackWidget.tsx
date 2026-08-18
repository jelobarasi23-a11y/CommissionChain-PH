"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, X } from "lucide-react";

// Google Forms already gives a free "Responses" summary tab (average
// rating, per-question charts) — that's what makes it worth screenshotting
// directly for the feedback-summary submission requirement, instead of
// hand-summarizing raw rows.
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScMBI7VtYWfCOFBwbqdLqZNgxA9E1GyjXcVu3Ko2JkqcCVyLQ/viewform?embedded=true";

/**
 * Floating feedback button + modal, mounted once in AppShell so it's
 * available on every page. Basic user feedback collection (Level 4
 * requirement) — embeds the project's Google Form directly rather than a
 * custom form/table, so there's nothing extra to host or query later.
 */
function FeedbackModal({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Share feedback"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[hsl(226_32%_12%)] shadow-[0_32px_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-start justify-between border-b border-white/8 p-5">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Share feedback</h2>
            <p className="mt-0.5 text-xs text-white/50">Takes a minute — helps us fix what's rough.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/8 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <iframe
            src={GOOGLE_FORM_URL}
            title="CommissionChain PH feedback form"
            width="100%"
            height="1278"
            style={{ border: 0, display: "block" }}
          >
            Loading…
          </iframe>
        </div>
      </div>
    </div>
  );
}

export function FeedbackWidget() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-white/8 bg-surface-raised px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)] transition-colors hover:border-white/16 hover:text-foreground sm:bottom-6 sm:left-6"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>
      {open && mounted && createPortal(<FeedbackModal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}