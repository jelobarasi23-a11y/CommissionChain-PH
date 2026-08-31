"use client";

import * as React from "react";
import { useWallet } from "./WalletProvider";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import { Wallet2, Info } from "lucide-react";

type Status = "checking" | "needs-setup" | "ready";

/**
 * Shown to a business viewer before/around approving a referral. Stellar
 * requires an account to explicitly open a trustline before it can hold a
 * non-native asset (the commission token) — real testers hit this as a
 * confusing on-chain error on their very first approval. This turns that
 * into one guided button: sign a change_trust operation, and the app
 * auto-funds a starting test balance from the issuer right after — no
 * CLI, no docs, no asset codes or issuer addresses to copy by hand.
 *
 * Renders exactly one of two states, never both: the setup CTA while the
 * wallet still needs it, or a short informational disclaimer once it's
 * ready (approving is the business's own confirmation, not the chain's).
 */
export function ApprovalGuidance() {
  const { address, signXdr } = useWallet();
  const { showToast } = useToast();
  const [status, setStatus] = React.useState<Status>("checking");
  const [settingUp, setSettingUp] = React.useState(false);

  const checkStatus = React.useCallback(async () => {
    if (!address) return;
    setStatus("checking");
    try {
      const res = await fetch(`/api/trustline?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (!res.ok) {
        // Surface the real reason in the console instead of silently
        // guessing — this is exactly the kind of failure that was
        // previously hidden by failing open to "ready".
        console.error("Trustline status check failed:", data.error ?? data);
        setStatus("needs-setup");
        return;
      }
      setStatus(data.hasTrustline && parseFloat(data.balance) > 0 ? "ready" : "needs-setup");
    } catch (err) {
      // If the check itself couldn't even complete, fail toward the
      // SAFER assumption. Defaulting to "ready" here previously masked
      // real wallets that still needed setup — showing one extra button
      // to someone who's actually fine is a much smaller cost than
      // hiding the setup step from someone who isn't.
      console.error("Trustline status check threw:", err);
      setStatus("needs-setup");
    }
  }, [address]);

  React.useEffect(() => { checkStatus(); }, [checkStatus]);

  async function handleSetup() {
    if (!address) return;
    setSettingUp(true);
    try {
      const buildRes = await fetch("/api/trustline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "build", sourcePublicKey: address }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) throw new Error(buildData.error ?? "Failed to prepare wallet setup.");

      const signedXdr = await signXdr(buildData.xdr);

      const submitRes = await fetch("/api/trustline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "submit", signedXdr, publicKey: address }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error ?? "Failed to finish wallet setup.");

      showToast("Wallet ready — you can now approve referrals.", "success");
      setStatus("ready");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Wallet setup failed. Try again.", "error");
    } finally {
      setSettingUp(false);
    }
  }

  if (status === "checking" || !address) return null;

  if (status === "needs-setup") {
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-foreground">
          <Wallet2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" aria-hidden />
          <p>
            One-time step before you can approve referrals: this wallet needs to be set up to
            receive the commission token. Click below and sign once — takes a few seconds.
          </p>
        </div>
        <Button onClick={handleSetup} disabled={settingUp} size="sm" className="shrink-0">
          {settingUp ? "Setting up..." : "Set up wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-faint" aria-hidden />
      <p>
        Approving a referral is your confirmation that this sale actually happened — the
        blockchain escrows the payout, but it can&apos;t verify the sale itself. This business
        profile has not been independently verified by CommissionChain PH.
      </p>
    </div>
  );
}
