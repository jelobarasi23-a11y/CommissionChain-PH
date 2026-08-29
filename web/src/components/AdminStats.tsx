"use client";

// Thin client-side wrapper around StatCard for the admin dashboard.
//
// admin/page.tsx is a Server Component (it awaits Supabase queries
// directly), but StatCard is a Client Component. React Server Components
// can only pass plain, serializable values across that boundary — a
// lucide-react icon is a component reference (an object with a `render`
// function), not a plain object, so passing one in as a prop from the
// server side throws. The fix is this: the server component passes down
// only plain numbers, and this client component imports the icons and
// renders <StatCard> itself, entirely on the client side of the boundary.
import { Building2, Inbox, Wallet, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";

export function AdminStats({
  businessCount,
  referralCount,
  distinctWallets,
  claimedCount,
}: {
  businessCount: number;
  referralCount: number;
  distinctWallets: number;
  claimedCount: number;
}) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard label="Businesses" value={businessCount} icon={Building2} accent="teal" />
      <StatCard label="Referrals" value={referralCount} icon={Inbox} accent="gold" />
      <StatCard
        label="Distinct wallets"
        value={distinctWallets}
        description="Real users who've signed a transaction"
        icon={Wallet}
        accent="teal"
      />
      <StatCard label="Claimed" value={claimedCount} icon={Users} accent="rust" />
    </div>
  );
}
