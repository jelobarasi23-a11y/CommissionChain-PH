import { NextResponse } from "next/server";

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

/**
 * GET /api/network/health
 *
 * Proxies a getHealth check to Soroban RPC from the server rather than
 * the browser. Stellar's public RPC endpoints don't send permissive CORS
 * headers for arbitrary browser origins (confirmed by Stellar's own docs
 * for the similar OpenZeppelin Relayer case) — a direct client-side fetch
 * works from some origins (e.g. localhost) but silently fails from others
 * with no useful error, just a blocked network request. Server-to-server
 * fetches are never subject to CORS at all, so routing through here makes
 * this check work identically regardless of where the frontend is hosted.
 */
export async function GET() {
  const start = Date.now();
  try {
    const res = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - start;

    if (!res.ok) {
      return NextResponse.json({ status: "offline", ms });
    }
    return NextResponse.json({ status: ms > 2000 ? "slow" : "online", ms });
  } catch {
    return NextResponse.json({ status: "offline", ms: 0 });
  }
}
