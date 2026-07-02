"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { TransactionOverlay, type TxStage } from "./TransactionOverlay";
import { Send, Info } from "lucide-react";


export function ReferralForm() {
  const { address, connect, signXdr } = useWallet();
  const router = useRouter();

  const [businessPublicKey, setBusinessPublicKey] = React.useState("");
  const [businessName, setBusinessName]           = React.useState("");
  const [clientName, setClientName]               = React.useState("");
  const [commissionAmount, setCommissionAmount]   = React.useState("");

  const [error, setError]         = React.useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [stage, setStage]         = React.useState<TxStage>("building");
  const [txError, setTxError]     = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address) {
      setError("Connect your wallet first — the referral is submitted as the connected agent.");
      return;
    }

    const shared = {
      agentPublicKey: address,
      businessPublicKey,
      clientName,
      businessName,
      commissionAmount: Number(commissionAmount),
    };

    setOverlayOpen(true);
    setStage("building");
    setTxError(null);

    try {
      const buildRes  = await fetch("/api/referrals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "build", ...shared }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) throw new Error(buildData.error ?? "Failed to build transaction.");

      setStage("awaiting-signature");
      const signedXdr = await signXdr(buildData.xdr);

      setStage("submitting");
      const submitRes  = await fetch("/api/referrals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "submit", signedXdr, ...shared }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error ?? "Failed to submit transaction.");

      setStage("success");
      window.setTimeout(() => router.push("/referrals"), 1200);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Something went wrong submitting the referral.");
      setStage("error");
    }
  }

  return (
    <>
      <div className="max-w-lg">
        {!address && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[hsl(var(--gold)/_0.2)] bg-[hsl(var(--gold)/_0.05)] p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--gold))]" />
            <p className="leading-snug text-muted-foreground">
              You need a connected wallet to submit a referral.{" "}
              <button type="button" onClick={() => connect('freighter')} className="font-semibold text-primary hover:underline">
                Connect Freighter
              </button>{" "}
              — a free browser extension at{" "}
              <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                freighter.app
              </a>
              .
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Maria Santos"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Pinnacle Insurance Agency"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessPublicKey">Business wallet address</Label>
            <Input
              id="businessPublicKey"
              value={businessPublicKey}
              onChange={(e) => setBusinessPublicKey(e.target.value)}
              placeholder="G..."
              className="font-mono"
              required
            />
            <p className="text-xs leading-snug text-muted-foreground">
              The business uses this to approve the referral and release the commission — ask them for it, the same way you'd ask for a bank account number.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commissionAmount">Commission amount (USDC)</Label>
            <Input
              id="commissionAmount"
              type="number"
              min="0"
              step="0.01"
              value={commissionAmount}
              onChange={(e) => setCommissionAmount(e.target.value)}
              placeholder="500.00"
              required
            />
            <p className="text-xs leading-snug text-muted-foreground">
              When the business approves this, this exact amount moves into escrow immediately — it's locked in, not a promise.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-[hsl(var(--coral)/_0.2)] bg-[hsl(var(--coral)/_0.05)] px-3 py-2 text-sm text-[hsl(var(--coral))]">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={overlayOpen} className="mt-1">
            <Send className="h-4 w-4" />
            Submit referral
          </Button>
        </form>
      </div>

      <TransactionOverlay
        open={overlayOpen}
        stage={stage}
        title="Recording your referral"
        errorMessage={txError}
        onClose={() => setOverlayOpen(false)}
      />
    </>
  );
}
