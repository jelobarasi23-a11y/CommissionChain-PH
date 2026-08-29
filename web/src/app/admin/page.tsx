import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AdminStats } from "@/components/AdminStats";
import { formatAmount, formatDate, shortenAddress, explorerAddressUrl } from "@/lib/format";
import { ExternalLink, LogOut } from "lucide-react";

export const dynamic = "force-dynamic"; // always show fresh data, never cache this page

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "text-[hsl(var(--gold))] bg-[hsl(var(--gold)/_0.1)] border-[hsl(var(--gold)/_0.2)]",
  APPROVED: "text-primary bg-primary/10 border-primary/20",
  CLAIMED:  "text-primary bg-primary/10 border-primary/20",
  REJECTED: "text-[hsl(var(--coral))] bg-[hsl(var(--coral)/_0.1)] border-[hsl(var(--coral)/_0.2)]",
};

async function getData() {
  const [{ data: referrals }, { data: businesses }, { data: transactions }] = await Promise.all([
    supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(25),
    supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(25),
    supabase.from("transactions").select("source_key"),
  ]);

  const referralList = referrals ?? [];
  const statusCounts = referralList.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const distinctWallets = new Set((transactions ?? []).map((t) => t.source_key)).size;

  return {
    referrals: referralList,
    businesses: businesses ?? [],
    statusCounts,
    distinctWallets,
  };
}

export default async function AdminPage() {
  const { referrals, businesses, statusCounts, distinctWallets } = await getData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin overview</h1>
          <p className="text-sm text-muted-foreground">
            Read-only snapshot of what&apos;s actually in the database — not visible to regular users.
          </p>
        </div>
        <LogoutButton />
      </div>

      <AdminStats
        businessCount={businesses.length}
        referralCount={referrals.length}
        distinctWallets={distinctWallets}
        claimedCount={statusCounts.CLAIMED ?? 0}
      />

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(["PENDING", "APPROVED", "REJECTED", "CLAIMED"] as const).map((s) => (
          <span
            key={s}
            className={`rounded-full border px-2.5 py-1 font-semibold ${STATUS_STYLES[s]}`}
          >
            {s}: {statusCounts[s] ?? 0}
          </span>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Recent referrals ({referrals.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Business</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No referrals yet.
                  </td>
                </tr>
              )}
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{r.client_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.business_name}</td>
                  <td className="px-4 py-2.5 text-foreground">{formatAmount(r.commission_amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Businesses ({businesses.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Industry</th>
                <th className="px-4 py-2.5">Wallet</th>
                <th className="px-4 py-2.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No businesses yet.
                  </td>
                </tr>
              )}
              {businesses.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{b.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{b.industry ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={explorerAddressUrl(b.public_key)}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-primary"
                    >
                      {shortenAddress(b.public_key)}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/admin/logout" method="POST">
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-active hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </form>
  );
}
