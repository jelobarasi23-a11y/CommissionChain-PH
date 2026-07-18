import { NextRequest, NextResponse } from "next/server";
import { rpc, scValToNative } from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_REFERRAL_CONTRACT_ID ?? "";

function getServer(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL);
}

/**
 * GET /api/events
 * GET /api/events?cursor=...
 *
 * Proxies contract event polling to Soroban RPC from the server rather
 * than the browser — same CORS reasoning as /api/network/health and
 * /api/network/balance. This is what actually backs the live "On-chain
 * events" feed on the dashboard; ContractEventFeed.tsx (client-side)
 * calls this route via src/lib/events.ts rather than touching Soroban
 * RPC directly.
 */
export async function GET(req: NextRequest) {
  if (!CONTRACT_ID) {
    return NextResponse.json({ events: [], cursor: "" });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  try {
    const server  = getServer();
    const filters: rpc.Api.EventFilter[] = [{ type: "contract", contractIds: [CONTRACT_ID] }];

    let request: rpc.Api.GetEventsRequest;
    if (cursor) {
      request = { filters, cursor, limit: 20 };
    } else {
      const info = await server.getLatestLedger();
      request    = { filters, startLedger: Math.max(1, info.sequence - 120), limit: 20 };
    }

    const response = await server.getEvents(request);

    const events = response.events
      .map((ev) => {
        try {
          const eventType  = ev.topic[1] ? String(scValToNative(ev.topic[1])) : "unknown";
          const referralId = ev.value ? Number(scValToNative(ev.value)) : null;
          return {
            id: ev.id,
            eventType,
            referralId: Number.isFinite(referralId) ? referralId : null,
            ledger:     ev.ledger,
            closedAt:   ev.ledgerClosedAt,
          };
        } catch {
          return null;
        }
      })
      .filter((ev): ev is NonNullable<typeof ev> => ev !== null);

    return NextResponse.json({ events, cursor: response.cursor });
  } catch (err) {
    // Soft-fail with an empty result — this feed is a nice-to-have, not
    // something that should surface a scary error banner if RPC hiccups.
    console.error("GET /api/events failed:", err);
    return NextResponse.json({ events: [], cursor: cursor ?? "" });
  }
}
