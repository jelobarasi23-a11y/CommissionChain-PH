"use client";
import * as React from "react";
import { Loader2, Wallet, CheckCircle2, XCircle, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type TxStage = "building" | "awaiting-signature" | "submitting" | "success" | "error";

const STAGE_COPY: Record<Exclude<TxStage, "error">, { headline: string; detail: string }> = {
  building:             { headline: "Writing up the entry",  detail: "Preparing the transaction details." },
  "awaiting-signature": { headline: "Check your wallet",     detail: "Look for the Freighter or Albedo popup and approve it." },
  submitting:           { headline: "Recording on-chain",    detail: "Sending to the Stellar network — usually a few seconds." },
  success:              { headline: "Done",                  detail: "Confirmed on-chain. Updating your view now." },
};

const STEP_ORDER: TxStage[] = ["building", "awaiting-signature", "submitting"];

export function TransactionOverlay({
  open, stage, title, errorMessage, onClose, onRetry,
}: {
  open:          boolean;
  stage:         TxStage;
  title:         string;
  errorMessage?: string | null;
  onClose:       () => void;
  /** If provided, an explicit Retry button appears on the error screen
   *  so the user can re-attempt without re-filling a form. */
  onRetry?:      () => void;
}) {
  React.useEffect(() => {
    if (stage !== "success") return;
    const t = window.setTimeout(onClose, 1200);
    return () => window.clearTimeout(t);
  }, [stage, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-night/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/8 bg-surface p-8 text-center shadow-[0_24px_64px_-8px_rgba(0,0,0,0.8)] animate-in zoom-in-95 fade-in duration-200">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>

        {stage === "error" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--coral)/_0.1)]">
              <XCircle className="h-8 w-8 text-[hsl(var(--coral))]"/>
            </div>
            <p className="font-display text-xl font-bold text-[hsl(var(--coral))]">Something went wrong</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {errorMessage ?? "Please try again."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold font-display text-night transition-all hover:brightness-110 active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5"/>
                  Try again
                </button>
              )}
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/8 px-5 text-sm font-semibold font-display text-foreground transition-all hover:bg-surface-raised hover:border-white/16"
              >
                Close
              </button>
            </div>
          </>
        ) : stage === "success" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-glow">
              <CheckCircle2 className="h-8 w-8 text-primary" strokeWidth={2.5}/>
            </div>
            <p className="font-display text-xl font-bold">{STAGE_COPY.success.headline}</p>
            <p className="mt-2 text-sm text-muted-foreground">{STAGE_COPY.success.detail}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              {stage === "awaiting-signature" ? <Wallet className="h-7 w-7 animate-pulse text-primary"/>
               : stage === "submitting"       ? <Loader2 className="h-7 w-7 animate-spin text-primary"/>
               :                                <FileText className="h-7 w-7 text-primary"/>}
            </div>
            <p className="font-display text-xl font-bold">{STAGE_COPY[stage].headline}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{STAGE_COPY[stage].detail}</p>
            <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
              {STEP_ORDER.map((s) => (
                <span key={s} className={cn("h-1.5 rounded-full transition-all duration-300", s === stage ? "w-6 bg-primary" : "w-1.5 bg-white/15")}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
