"use client";

import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWallet } from "@/components/WalletProvider";
import { useReferrals } from "@/lib/use-referrals";
import { formatAmount, formatDate, explorerTxUrl } from "@/lib/format";
import { Wallet, Banknote, ExternalLink, Inbox, TrendingUp } from "lucide-react";

export default function CommissionsPage() {
  const { address, connect } = useWallet();
  const { referrals, isLoading, error } = useReferrals(address ? { agentPublicKey: address } : undefined);

  const claimed     = referrals.filter((r) => r.status === "CLAIMED");
  const totalEarned = claimed.reduce((sum, r) => sum + Number(r.commissionAmount), 0);

  return (
    <main className="container py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Commission history</h1>
        <p className="mt-1 text-muted-foreground">
          Commissions paid directly to your wallet — each with on-chain proof you can verify.
        </p>
      </div>

      {!address ? (
        <div className="flex items-center gap-4 rounded-xl border border-[hsl(var(--gold)/_0.2)] bg-[hsl(var(--gold)/_0.05)] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold)/_0.12)]">
            <Wallet className="h-5 w-5 text-[hsl(var(--gold))]" />
          </div>
          <div>
            <p className="text-sm font-medium">Connect your wallet to see your commission history.</p>
            <button onClick={() => connect('freighter')} className="mt-0.5 text-xs font-semibold text-primary hover:underline">
              Connect now →
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-8 flex items-center gap-4 rounded-xl border border-[hsl(var(--coral)/_0.2)] bg-[hsl(var(--coral)/_0.05)] px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--coral)/_0.12)]">
                <Wallet className="h-5 w-5 text-[hsl(var(--coral))]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[hsl(var(--coral))]">Couldn't load your commission history</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Total claimed"
              value={totalEarned}
              format={formatAmount}
              description="Paid directly to your wallet."
              icon={Banknote}
              accent="teal"
            />
            <StatCard
              label="Commissions claimed"
              value={claimed.length}
              description="Referrals you've successfully been paid for."
              icon={TrendingUp}
              accent="gold"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Claimed commissions</CardTitle>
              <CardDescription>Most recent first. Every row links to the blockchain record.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 w-full rounded-lg animate-shimmer" />
                  ))}
                </div>
              ) : claimed.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
                    <Inbox className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No commissions claimed yet</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Once a business approves a referral you submitted, come back here to claim it.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/6 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">Client</th>
                      <th className="py-3 pr-4 font-medium">Business</th>
                      <th className="py-3 pr-4 font-medium">Amount</th>
                      <th className="py-3 pr-4 font-medium">Claimed</th>
                      <th className="py-3 pr-4 font-medium">Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimed.map((r, i) => (
                      <tr
                        key={r.id}
                        style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                        className="animate-in fade-in slide-in-from-bottom-1 border-b border-white/4 duration-300 last:border-0 hover:bg-surface-raised/40 transition-colors"
                      >
                        <td className="py-3.5 pr-4 font-medium">{r.clientName}</td>
                        <td className="py-3.5 pr-4 text-muted-foreground">{r.businessName}</td>
                        <td className="py-3.5 pr-4 font-mono font-semibold text-primary tabular-nums">
                          {formatAmount(r.commissionAmount)}
                        </td>
                        <td className="py-3.5 pr-4 text-muted-foreground">
                          {r.commission ? formatDate(r.commission.claimedAt) : "—"}
                        </td>
                        <td className="py-3.5 pr-4">
                          {r.commission?.txHash ? (
                            <a
                              href={explorerTxUrl(r.commission.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={r.commission.txHash}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              View proof
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
