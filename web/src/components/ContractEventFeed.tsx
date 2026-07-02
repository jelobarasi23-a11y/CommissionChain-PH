"use client";
import * as React from "react";
import { fetchContractEvents, EVENT_LABEL, type ContractEvent } from "@/lib/events";
import { Zap, CheckCircle2, XCircle, Coins, FileText, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTRACT_ID = process.env.NEXT_PUBLIC_REFERRAL_CONTRACT_ID ?? "";

const ICON: Record<string, React.ElementType> = {
  created: FileText, approved: CheckCircle2, rejected: XCircle, claimed: Coins,
};
const COLOR: Record<string, string> = {
  created:  "text-primary bg-primary/10 border-primary/20",
  approved: "text-[hsl(var(--gold))] bg-[hsl(var(--gold)/_0.1)] border-[hsl(var(--gold)/_0.2)]",
  rejected: "text-[hsl(var(--coral))] bg-[hsl(var(--coral)/_0.1)] border-[hsl(var(--coral)/_0.2)]",
  claimed:  "text-primary bg-primary/10 border-primary/20",
};

function relativeTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function ContractEventFeed() {
  const [events,  setEvents]  = React.useState<ContractEvent[]>([]);
  const [cursor,  setCursor]  = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState<string | null>(null);
  const [newCount, setNewCount] = React.useState(0);
  const seen = React.useRef(new Set<string>());

  const poll = React.useCallback(async (initial = false) => {
    try {
      const res   = await fetchContractEvents(initial ? undefined : cursor);
      const fresh = res.events.filter((e) => !seen.current.has(e.id));
      fresh.forEach((e) => seen.current.add(e.id));
      if (fresh.length > 0) {
        setEvents((prev) => [...fresh.reverse(), ...prev].slice(0, 30));
        if (!initial) setNewCount((n) => n + fresh.length);
      }
      if (res.cursor) setCursor(res.cursor);
      setError(null);
    } catch (err) {
      if (initial) setError(err instanceof Error ? err.message : "Could not load events.");
    } finally { if (initial) setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  React.useEffect(() => { poll(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const id = window.setInterval(() => poll(false), 15_000);
    return () => window.clearInterval(id);
  }, [poll]);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60"/>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"/>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live on-chain</span>
          {newCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-night animate-in zoom-in duration-300">
              +{newCount}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">Every 15s</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin"/>Connecting to Stellar RPC…
        </div>
      )}
      {error && !loading && (
        <p className="py-4 text-xs text-muted-foreground">Events unavailable: {error}</p>
      )}
      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Zap className="h-6 w-6 text-muted-foreground/30"/>
          <p className="text-xs text-muted-foreground">No events yet — submit or approve a referral to see on-chain activity here.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {events.map((ev, i) => {
          const Icon   = ICON[ev.eventType] ?? Zap;
          const colors = COLOR[ev.eventType] ?? "text-muted-foreground bg-surface-raised border-white/10";
          const label  = EVENT_LABEL[ev.eventType] ?? ev.eventType;
          return (
            <div key={ev.id} style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-night/40 px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", colors)}>
                <Icon className="h-3.5 w-3.5"/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold">{label}</span>
                  {ev.referralId !== null && (
                    <span className="text-[10px] text-muted-foreground">#{ev.referralId}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(ev.closedAt)} · ledger {ev.ledger.toLocaleString()}
                </span>
              </div>
              <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID ?? ""}`}
                target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors">
                <ExternalLink className="h-3 w-3"/>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
