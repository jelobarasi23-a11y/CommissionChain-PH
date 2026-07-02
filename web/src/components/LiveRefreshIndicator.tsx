"use client";

import { RefreshCw } from "lucide-react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

const RADIUS = 9;
const CIRC   = 2 * Math.PI * RADIUS;

function formatTime(date: Date | null) {
  if (!date) return "--:--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * A small "live data" indicator: a circular SVG countdown ring that drains
 * from full to empty, a "last updated" timestamp, and a manual refresh
 * button — all driven by `useAutoRefresh` so the data and the indicator
 * are always in sync.
 */
export function LiveRefreshIndicator({
  onRefresh,
  intervalMs = 30_000,
}: {
  onRefresh: () => void;
  intervalMs?: number;
}) {
  const { secondsLeft, total, lastRefreshed, refresh } = useAutoRefresh(onRefresh, intervalMs);
  const pct    = secondsLeft / total;
  const offset = CIRC * (1 - pct);

  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
      {/* SVG countdown ring */}
      <div className="relative h-6 w-6 shrink-0" title={`Refreshes in ${secondsLeft}s`}>
        <svg className="-rotate-90 h-6 w-6" viewBox="0 0 24 24" aria-hidden>
          <circle
            cx="12" cy="12" r={RADIUS}
            fill="none"
            stroke="hsl(var(--edge))"
            strokeWidth="2"
          />
          <circle
            cx="12" cy="12" r={RADIUS}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] font-bold text-primary rotate-90">
          {secondsLeft}
        </span>
      </div>

      <span className="hidden sm:inline">Updated {formatTime(lastRefreshed)}</span>

      <button
        onClick={refresh}
        className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-surface-raised hover:text-foreground"
        title="Refresh now"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );
}
