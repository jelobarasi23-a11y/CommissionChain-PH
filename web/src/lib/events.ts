export type ContractEvent = {
  id:        string;
  eventType: string;         // "created" | "approved" | "rejected" | "claimed"
  referralId: number | null;
  ledger:    number;
  closedAt:  string;
};

export const EVENT_LABEL: Record<string, string> = {
  created:  "Referral submitted",
  approved: "Commission escrowed",
  rejected: "Referral rejected",
  claimed:  "Commission paid out",
};

/**
 * Fetches contract events via our own /api/events route rather than
 * calling Soroban RPC directly from the browser — see that route for
 * why (CORS on Stellar's public RPC doesn't reliably allow arbitrary
 * production origins). Kept as a same-shaped function so
 * ContractEventFeed.tsx didn't need any changes at all — only what's
 * inside this function moved, not how it's called.
 */
export async function fetchContractEvents(cursor?: string): Promise<{
  events: ContractEvent[];
  cursor: string;
}> {
  try {
    const url = cursor ? `/api/events?cursor=${encodeURIComponent(cursor)}` : "/api/events";
    const res = await fetch(url);
    if (!res.ok) return { events: [], cursor: cursor ?? "" };
    return await res.json();
  } catch {
    return { events: [], cursor: cursor ?? "" };
  }
}
