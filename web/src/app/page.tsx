"use client";

import * as React from "react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { ReferralTable } from "@/components/ReferralTable";
import { PipelineVisualizer } from "@/components/PipelineVisualizer";
import { LiveRefreshIndicator } from "@/components/LiveRefreshIndicator";
import { ContractEventFeed } from "@/components/ContractEventFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWallet } from "@/components/WalletProvider";
import { useReferrals } from "@/lib/use-referrals";
import { formatAmount } from "@/lib/format";
import {
  Clock, CheckCircle2, Wallet, PlusCircle, ArrowRight, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Words that cycle in the hero — reinforce what the product actually does
const HERO_WORDS = ["trustless", "instant", "on-chain", "automated", "verifiable"];

function CyclingWord({ words }: { words: string[] }) {
  const [idx, setIdx]       = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % words.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => window.clearInterval(id);
  }, [words.length]);

  return (
    <span
      className={cn(
        "gradient-text inline-block transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
    >
      {words[idx]}
    </span>
  );
}

export default function DashboardPage() {
  const { address } = useWallet();
  const { referrals, isLoading, error, refresh } = useReferrals();

  const pendingCount  = referrals.filter((r) => r.status === "PENDING").length;
  const approvedCount = referrals.filter((r) => r.status === "APPROVED").length;
  const claimedTotal  = referrals
    .filter((r) => r.status === "CLAIMED")
    .reduce((sum, r) => sum + Number(r.commissionAmount), 0);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute -top-40 -left-32 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-[hsl(var(--gold)/_0.04)] blur-[90px]" />

        <div className="container relative py-14">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3 w-3" />
            Live on Stellar Testnet
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Commission payouts,{" "}
            <CyclingWord words={HERO_WORDS} />
          </h1>

          <p className="mt-3 max-w-xl text-base text-muted-foreground leading-relaxed">
            No spreadsheets or chasing payments — commissions are locked in escrow
            the moment a referral is approved, and agents withdraw directly to their
            Stellar wallet.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/referrals/new">
              <Button size="lg">
                <PlusCircle className="h-4 w-4" />
                New Referral
              </Button>
            </Link>
            <Link href="/referrals">
              <Button size="lg" variant="secondary">
                View all referrals
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="container py-10 space-y-8">

        {/* Wallet banner */}
        {!address && (
          <div className="flex items-center gap-4 rounded-xl border border-[hsl(var(--gold)/_0.2)] bg-[hsl(var(--gold)/_0.05)] px-5 py-4 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold)/_0.12)]">
              <Wallet className="h-5 w-5 text-[hsl(var(--gold))]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Connect your wallet to get started</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install Freighter at{" "}
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                  freighter.app
                </a>
                , then click <strong>Connect Wallet</strong> in the top right.
              </p>
            </div>
          </div>
        )}

        {/* Data error banner — shown if the referrals list failed to load
            (e.g. missing/incorrect Supabase credentials in web/.env), so
            this never silently looks like "you just have zero referrals". */}
        {error && (
          <div className="flex items-center gap-4 rounded-xl border border-[hsl(var(--coral)/_0.2)] bg-[hsl(var(--coral)/_0.05)] px-5 py-4 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--coral)/_0.12)]">
              <Wallet className="h-5 w-5 text-[hsl(var(--coral))]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--coral))]">Couldn't load referrals</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Pending referrals" value={pendingCount} description="Submitted, waiting for business review." icon={Clock} accent="gold" />
          <StatCard label="Awaiting claim" value={approvedCount} description="Approved — funds escrowed, ready to withdraw." icon={CheckCircle2} accent="teal" />
          <StatCard label="Total settled" value={claimedTotal} format={formatAmount} description="Already paid out to agents." icon={Wallet} accent="teal" />
        </div>

        {/* Live pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Live pipeline</CardTitle>
            <CardDescription>Real-time view of referrals moving through the three on-chain stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineVisualizer
              pending={pendingCount}
              approved={approvedCount}
              claimed={referrals.filter((r) => r.status === "CLAIMED").length}
            />
          </CardContent>
        </Card>

        {/* Recent referrals + live event feed */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Recent referrals</CardTitle>
                  <CardDescription>Click any row to see its full transaction history.</CardDescription>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <LiveRefreshIndicator onRefresh={refresh} intervalMs={30_000} />
                  <Link href="/referrals">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 w-full rounded-lg animate-shimmer" />
                    ))}
                  </div>
                ) : (
                  <ReferralTable
                    referrals={referrals.slice(0, 5)}
                    onChanged={refresh}
                    emptyMessage="No referrals yet — submit the first one."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>On-chain events</CardTitle>
              <CardDescription>Live from Stellar RPC — emitted by the contract on every action.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContractEventFeed />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
