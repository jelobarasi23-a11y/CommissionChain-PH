import { NextRequest, NextResponse } from "next/server";

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

/**
 * GET /api/network/balance?address=G...
 *
 * Proxies an account balance lookup to Horizon from the server rather
 * than the browser, for the same CORS reason as /api/network/health —
 * see that route's comment for the full explanation.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address query parameter is required." }, { status: 400 });
  }

  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) {
      // Includes a brand-new, unfunded account (404) — same graceful
      // "0" fallback the client-side version used, not a real error.
      return NextResponse.json({ balance: "0" });
    }
    const data: { balances?: { asset_type: string; balance: string }[] } = await res.json();
    const native = data.balances?.find((b) => b.asset_type === "native");
    return NextResponse.json({ balance: native?.balance ?? "0" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch balance." },
      { status: 502 }
    );
  }
}
