"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { MessageSquarePlus, Star, X } from "lucide-react";

type Role = "agent" | "business" | "other";

/**
 * Floating feedback button + modal, mounted once in AppShell so it's
 * available on every page. Basic user feedback collection (Level 4
 * requirement) — a 1-5 star rating plus an optional comment, submitted to
 * /api/feedback and stored in the `feedback` table. Attaches the
 * connected wallet address and current page automatically when available,
 * so responses can be cross-referenced against real wallet interactions
 * without asking the person to type anything extra.
 */
function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const { showToast } = useToast();
  const pathname = usePathname();

  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [role, setRole] = React.useState<Role>("other");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleSubmit() {
    if (rating === 0) {
      setError("Pick a star rating first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message, role, publicKey: address, page: pathname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit feedback.");

      setSubmitted(true);
      showToast("Thanks for the feedback!", "success");
      window.setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Share feedback"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[hsl(226_32%_12%)] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in duration-200">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Share feedback</h2>
            <p className="mt-0.5 text-xs text-white/50">Takes 10 seconds — helps us fix what's rough.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/8 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-primary">
            Got it — thank you!
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <Label>How's your experience so far?</Label>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className="p-0.5 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        n <= (hoverRating || rating)
                          ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]"
                          : "fill-transparent text-white/25"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>You're using this as</Label>
              <div className="mt-2 flex gap-2">
                {(["agent", "business", "other"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      role === r
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-white/8 bg-black/30 text-white/50 hover:border-white/16 hover:text-white/80"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="feedback-message">Anything specific? (optional)</Label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What worked, what didn't, what you'd want next..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-white/8 bg-night/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-150 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-white/14"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[hsl(var(--coral)/_0.2)] bg-[hsl(var(--coral)/_0.05)] px-3 py-2 text-sm text-[hsl(var(--coral))]">
                {error}
              </p>
            )}

            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting ? "Sending..." : "Send feedback"}
            </Button>
          </div>
        )}
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