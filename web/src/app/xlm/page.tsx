"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionOverlay, type TxStage } from "@/components/TransactionOverlay";
import { useWallet } from "@/components/WalletProvider";
import { explorerTxUrl } from "@/lib/format";
import { Send, ExternalLink, CheckCircle2, Wallet, RefreshCw } from "lucide-react";
import Link from "next/link";


export default function SendXlmPage() {
  const { address, xlmBalance, connect, refreshBalance, signXdr } = useWallet();

  const [destination, setDestination] = React.useState("");
  const [amount, setAmount]           = React.useState("");
  const [error, setError]             = React.useState<string | null>(null);
  const [stage, setStage]             = React.useState<TxStage>("building");
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [txError, setTxError]         = React.useState<string | null>(null);
  const [txHash, setTxHash]           = React.useState<string | null>(null);
  const [refreshing, setRefreshing]   = React.useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!address) {
      setError("Connect your wallet first.");
      return;
    }

    const parsedAmt = parseFloat(amount);
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    if (!/^G[A-Z2-7]{55}$/.test(destination)) {
      setError("Enter a valid Stellar public key (starts with G, 56 characters).");
      return;
    }
    if (destination === address) {
      setError("You can't send XLM to yourself.");
      return;
    }

    setOverlayOpen(true);
    setStage("building");
    setTxError(null);

    try {
      // Build
      const buildRes  = await fetch("/api/xlm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "build", sourcePublicKey: address, destinationPublicKey: destination, amount }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) throw new Error(buildData.error ?? "Failed to build XLM payment transaction.");

      // Sign
      setStage("awaiting-signature");
      const signedXdr = await signXdr(buildData.xdr);

      // Submit
      setStage("submitting");
      const submitRes  = await fetch("/api/xlm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "submit", signedXdr }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error ?? "Failed to submit XLM payment.");

      setStage("success");
      setTxHash(submitData.txHash);
      setAmount("");
      setDestination("");
      await refreshBalance();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Something went wrong sending XLM.");
      setStage("error");
    }
  }

  async function handleRefreshBalance() {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  }

  return (
    <>
      <main className="container py-10">
        <div className="mb-2">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to dashboard
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Send XLM</h1>
          <p className="mt-1 text-muted-foreground">
            Send XLM to any Stellar testnet address — a classic Horizon payment
            transaction, separate from the Soroban commission escrow flow.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Balance card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Your XLM balance
              </CardTitle>
              <CardDescription>Connected wallet on Stellar Testnet</CardDescription>
            </CardHeader>
            <CardContent>
              {!address ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">Connect your wallet to see your balance.</p>
                  <Button onClick={() => connect('freighter')} size="sm" className="w-fit">
                    <Wallet className="h-3.5 w-3.5" />
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-end gap-2">
                    <span className="font-display text-4xl font-bold tabular-nums text-primary">
                      {xlmBalance !== null
                        ? parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })
                        : "—"}
                    </span>
                    <span className="mb-1 text-lg font-semibold text-muted-foreground">XLM</span>
                  </div>
                  <p className="text-xs text-muted-foreground break-all font-mono">{address}</p>
                  <Button
                    onClick={handleRefreshBalance}
                    size="sm"
                    variant="outline"
                    disabled={refreshing}
                    className="w-fit"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh balance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send payment
              </CardTitle>
              <CardDescription>
                Signed by your Freighter wallet and submitted to Stellar Testnet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="destination">Recipient address</Label>
                  <Input
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="G..."
                    className="font-mono text-xs"
                    required
                    disabled={!address}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Amount (XLM)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.0000001"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10.00"
                    required
                    disabled={!address}
                  />
                  {xlmBalance && (
                    <p className="text-xs text-muted-foreground">
                      Available:{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary hover:underline"
                        onClick={() => setAmount((Math.max(0, parseFloat(xlmBalance) - 1)).toFixed(7))}
                      >
                        {parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} XLM
                      </button>
                      {" "}(click to use max, keeping 1 XLM for fees)
                    </p>
                  )}
                </div>

                {error && (
                  <p className="rounded-lg border border-[hsl(var(--coral)/_0.2)] bg-[hsl(var(--coral)/_0.05)] px-3 py-2 text-sm text-[hsl(var(--coral))]">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!address || overlayOpen}
                >
                  <Send className="h-4 w-4" />
                  Send XLM
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Success result */}
        {txHash && !overlayOpen && (
          <Card className="mt-6 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold">Transaction confirmed on Stellar Testnet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  XLM payment submitted successfully. Transaction hash:
                </p>
                <a
                  href={explorerTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary hover:underline"
                >
                  {txHash}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <TransactionOverlay
        open={overlayOpen}
        stage={stage}
        title="Sending XLM"
        errorMessage={txError}
        onClose={() => setOverlayOpen(false)}
      />
    </>
  );
}
