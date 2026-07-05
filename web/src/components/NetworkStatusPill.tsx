"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "slow" | "offline";

async function pingRpc(): Promise<{ status: Status; ms: number }> {
  try {
    // Calls our own /api/network/health route, which does the actual
    // Soroban RPC ping server-side — see that route for why this can't
    // be a direct browser-to-Stellar fetch (CORS).
    const res = await fetch("/api/network/health", { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { status: "offline", ms: 0 };
    const data: { status: Status; ms: number } = await res.json();
    return data;
  } catch {
    return { status: "offline", ms: 0 };
  }
}

const STATUS_CONFIG: Record<Status, { label: string; dot: string; text: string }> = {
  checking: { label: "Checking…", dot: "bg-muted-foreground animate-pulse",   text: "text-muted-foreground" },
  online:   { label: "Testnet live", dot: "bg-primary animate-ping-slow",       text: "text-primary"         },
  slow:     { label: "Slow",         dot: "bg-[hsl(var(--gold))] animate-pulse", text: "text-[hsl(var(--gold))]" },
  offline:  { label: "Offline",      dot: "bg-[hsl(var(--coral))]",             text: "text-[hsl(var(--coral))]" },
};

/**
 * A small pill in the nav that pings the Stellar Soroban RPC every 60 s
 * and shows live latency — gives judges and users immediate confidence that
 * the app is actually connected to a real network, not a mock.
 */
export function NetworkStatusPill() {
  const [status, setStatus] = React.useState<Status>("checking");
  const [ms, setMs]         = React.useState<number>(0);

  React.useEffect(() => {
    let mounted = true;
    const check = async () => {
      const result = await pingRpc();
      if (mounted) { setStatus(result.status); setMs(result.ms); }
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, []);

  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-1.5 rounded-full border border-white/6 bg-surface px-2.5 py-1 text-xs font-medium",
        cfg.text
      )}
      title={ms > 0 ? `RPC latency: ${ms}ms` : "Checking Stellar RPC…"}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", cfg.dot.replace("animate-ping-slow", ""))} />
      </span>
      {cfg.label}
      {status === "online" && ms > 0 && (
        <span className="text-muted-foreground">{ms}ms</span>
      )}
    </div>
  );
}
