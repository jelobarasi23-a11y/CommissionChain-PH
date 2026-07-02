"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useWallet } from "./WalletProvider";
import { WalletSelectModal } from "./WalletSelectModal";
import { Button } from "./ui/button";
import { CopyableAddress } from "./CopyableAddress";
import { Wallet, LogOut, Send, Zap, ChevronDown } from "lucide-react";
import Link from "next/link";

const WALLET_LABEL: Record<string, string> = { freighter: "Freighter", albedo: "Albedo" };

/**
 * Connected-state trigger + dropdown panel. Collapses what used to be four
 * separate top-bar pills (balance, address, Send XLM, Disconnect) into one
 * compact button that reveals everything in a small anchored panel —
 * this is what actually fixes top-bar crowding, more than moving the nav
 * links out on its own would have.
 *
 * The panel is portaled to document.body and positioned from the trigger's
 * own bounding rect rather than relying on CSS position:absolute, since
 * the top bar has backdrop-filter on it — the same kind of stacking
 * context that trapped the wallet-select modal earlier — and an
 * absolutely-positioned panel would also risk being clipped by the
 * top bar's horizontal scroll container.
 */
function ConnectedWalletMenu() {
  const { address, xlmBalance, walletType, disconnect } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; right: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setOpen((v) => !v);
  }

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function onScroll() { setOpen(false); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (!address) return null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className="flex items-center gap-2 rounded-lg border border-white/8 bg-surface px-3 py-2 text-sm transition-colors hover:border-white/16"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {walletType && (
          <span className="hidden text-[10px] font-semibold text-muted-foreground sm:inline">
            {WALLET_LABEL[walletType]}
          </span>
        )}
        <span className="font-mono text-xs font-medium">
          {address.slice(0, 4)}...{address.slice(-4)}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[95]" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="menu"
              style={{ top: coords.top, right: coords.right }}
              className="fixed z-[96] w-72 rounded-xl border border-white/10 bg-[hsl(226_32%_12%)] p-4 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center gap-2 text-xs text-white/50">
                {walletType && <span className="font-semibold text-white/70">{WALLET_LABEL[walletType]}</span>}
                <span>connected</span>
              </div>

              <div className="mt-2">
                <CopyableAddress address={address} chars={14} className="text-white" />
              </div>

              <div className="mt-4 rounded-lg border border-white/8 bg-black/30 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">XLM balance</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-primary">
                  {xlmBalance !== null
                    ? parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : "—"}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-1.5">
                <Link href="/xlm" onClick={() => setOpen(false)}>
                  <Button size="sm" variant="secondary" className="w-full justify-start">
                    <Send className="h-3.5 w-3.5" /> Send XLM
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => { disconnect(); setOpen(false); }}
                >
                  <LogOut className="h-3.5 w-3.5" /> Disconnect
                </Button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function WalletConnectButton() {
  const { address, isConnecting, error, connect } = useWallet();
  const [modalOpen, setModalOpen] = React.useState(false);

  if (address) return <ConnectedWalletMenu />;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={() => setModalOpen(true)} disabled={isConnecting} size="sm">
        {isConnecting ? (
          <><Zap className="h-3.5 w-3.5 animate-pulse" />Connecting...</>
        ) : (
          <><Wallet className="h-3.5 w-3.5" />Connect Wallet</>
        )}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-[hsl(var(--coral))]">{error}</p>}
      <WalletSelectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
