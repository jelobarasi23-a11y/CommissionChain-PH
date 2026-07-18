import { ReferralForm } from "@/components/ReferralForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewReferralPage() {
  return (
    <main className="container py-10">
      <Link
        href="/referrals"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to referrals
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Submit a referral</h1>
        <p className="mt-1 max-w-xl text-muted-foreground">
          This creates a real entry on the Stellar testnet. The business reviews it
          from their own wallet — approving locks the commission in escrow immediately.
        </p>
      </div>

      <ReferralForm />
    </main>
  );
}
