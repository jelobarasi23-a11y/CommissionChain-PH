"use client";

import * as React from "react";
import { ReferralTable } from "@/components/ReferralTable";
import { LiveRefreshIndicator } from "@/components/LiveRefreshIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { useReferrals } from "@/lib/use-referrals";
import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/lib/types";

const TABS: { label: string; value: ReferralStatus | "ALL" }[] = [
  { label: "All",      value: "ALL"      },
  { label: "Pending",  value: "PENDING"  },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Claimed",  value: "CLAIMED"  },
];

const TAB_ACTIVE: Record<string, string> = {
  ALL:      "border-primary bg-primary/10 text-primary",
  PENDING:  "border-[hsl(var(--gold))] bg-[hsl(var(--gold)/_0.1)] text-[hsl(var(--gold))]",
  APPROVED: "border-primary bg-primary/10 text-primary",
  REJECTED: "border-[hsl(var(--coral))] bg-[hsl(var(--coral)/_0.1)] text-[hsl(var(--coral))]",
  CLAIMED:  "border-primary bg-primary/10 text-primary",
};

export default function ReferralsPage() {
  const { referrals, isLoading, error, refresh } = useReferrals();
  const [tab, setTab] = React.useState<ReferralStatus | "ALL">("ALL");

  const counts = {
    ALL:      referrals.length,
    PENDING:  referrals.filter((r) => r.status === "PENDING").length,
    APPROVED: referrals.filter((r) => r.status === "APPROVED").length,
    REJECTED: referrals.filter((r) => r.status === "REJECTED").length,
    CLAIMED:  referrals.filter((r) => r.status === "CLAIMED").length,
  };

  const filtered = tab === "ALL" ? referrals : referrals.filter((r) => r.status === tab);

  return (
    <main className="container py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Referrals</h1>
          <p className="mt-1 text-muted-foreground">
            Click any row to expand its on-chain transaction history.
          </p>
        </div>
        <LiveRefreshIndicator onRefresh={refresh} intervalMs={30_000} />
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.value;
          const count  = counts[t.value];
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all duration-150",
                active
                  ? TAB_ACTIVE[t.value]
                  : "border-white/8 bg-surface text-muted-foreground hover:border-white/14 hover:text-foreground"
              )}
            >
              {t.label}
              {count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-current/20" : "bg-surface-raised text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <p className="py-6 text-center text-sm text-[hsl(var(--coral))]">{error}</p>
          )}
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 w-full rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : (
            !error && <ReferralTable referrals={filtered} onChanged={refresh} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
