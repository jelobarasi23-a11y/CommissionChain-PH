"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useWallet, type WalletType } from "./WalletProvider";
import { X, ExternalLink } from "lucide-react";

const WALLETS = [
  {
    id: "freighter" as WalletType,
    name: "Freighter",
    badge: "Browser extension",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    description: "Official Stellar browser extension. Install once, works across all Stellar dApps.",
    href: "https://freighter.app",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#5B60FF"/>
        <path d="M20 11L30 15.5V22.5C30 27.6 25.5 32.4 20 34C14.5 32.4 10 27.6 10 22.5V15.5L20 11Z" fill="white" fillOpacity="0.9"/>
        <path d="M15 21L19 25L26 17" stroke="#5B60FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "albedo" as WalletType,
    name: "Albedo",
    badge: "No install needed",
    badgeColor: "bg-[hsl(var(--gold)/_0.1)] text-[hsl(var(--gold))] border-[hsl(var(--gold)/_0.2)]",
    description: "Web-based wallet — no extension needed. Authorises transactions in a popup window.",
    href: "https://albedo.link",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#1a1a2e"/>
        <circle cx="20" cy="20" r="10" fill="none" stroke="#F5A623" strokeWidth="2"/>
        <circle cx="20" cy="20" r="3" fill="#F5A623"/>
        <line x1="20" y1="8" x2="20" y2="12" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="28" x2="20" y2="32" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="20" x2="12" y2="20" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
        <line x1="28" y1="20" x2="32" y2="20" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function ModalContent({ onClose }: { onClose: () => void }) {
  const { connect, isConnecting, error } = useWallet();

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function pick(type: WalletType) {
    await connect(type);
    // close if no error state was set
    if (!error) onClose();
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Choose a wallet"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden onClick={onClose}/>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[hsl(226_32%_12%)] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in duration-200">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Connect wallet</h2>
            <p className="mt-0.5 text-xs text-white/50">Choose how you want to sign transactions</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors">
            <X className="h-4 w-4"/>
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {WALLETS.map((w) => (
            <button key={w.id} onClick={() => pick(w.id)} disabled={isConnecting}
              className="flex items-start gap-4 rounded-xl border border-white/8 bg-black/30 p-4 text-left transition-all hover:border-white/20 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              <div className="shrink-0 mt-0.5">{w.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold text-white">{w.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${w.badgeColor}`}>{w.badge}</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-white/50">{w.description}</p>
                <a href={w.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  Learn more <ExternalLink className="h-2.5 w-2.5"/>
                </a>
              </div>
            </button>
          ))}
        </div>
        {error && <p className="mt-4 rounded-lg border border-[hsl(var(--coral)/_0.25)] bg-[hsl(var(--coral)/_0.07)] px-3 py-2 text-xs text-[hsl(var(--coral))]">{error}</p>}
        {isConnecting && <p className="mt-3 text-center text-xs text-white/40 animate-pulse">Connecting…</p>}
      </div>
    </div>
  );
}

export function WalletSelectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!open || !mounted) return null;
  return createPortal(<ModalContent onClose={onClose}/>, document.body);
}
