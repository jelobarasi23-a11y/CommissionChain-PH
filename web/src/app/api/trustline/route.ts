import { NextRequest, NextResponse } from "next/server";
import {
  checkTrustlineStatus,
  buildChangeTrustXdr,
  submitClassicTransaction,
  fundNewTrustline,
} from "@/lib/stellar";

/**
 * GET /api/trustline?address=G...
 *
 * Checks whether a wallet already trusts (and holds some of) the
 * commission token, so the UI knows whether to show the one-time
 * "set up wallet" step before Approve/Reject/Claim actions.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address query parameter is required." }, { status: 400 });
  }
  try {
    const status = await checkTrustlineStatus(address);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check trustline status." },
      { status: 502 }
    );
  }
}

/**
 * Two-phase trustline setup — same build/submit shape as every other
 * transaction in this app.
 *
 * step "build"  → unsigned change_trust XDR for the wallet to sign.
 * step "submit" → submits the signed trustline transaction, then
 *                 immediately sends a starting test balance from the
 *                 issuer, so the whole one-time setup is a single guided
 *                 click + one Freighter signature — no CLI, no docs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step } = body;

    if (step === "build") {
      const { sourcePublicKey } = body;
      if (!sourcePublicKey) {
        return NextResponse.json({ error: "sourcePublicKey is required." }, { status: 400 });
      }
      const xdr = await buildChangeTrustXdr(sourcePublicKey);
      return NextResponse.json({ xdr });
    }

    if (step === "submit") {
      const { signedXdr, publicKey } = body;
      if (!signedXdr || !publicKey) {
        return NextResponse.json(
          { error: "signedXdr and publicKey are required for step=submit." },
          { status: 400 }
        );
      }
      const { hash: trustlineHash } = await submitClassicTransaction(signedXdr);
      const funding = await fundNewTrustline(publicKey);
      return NextResponse.json({ trustlineHash, funding });
    }

    return NextResponse.json({ error: "step must be 'build' or 'submit'." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/trustline failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error setting up the wallet." },
      { status: 500 }
    );
  }
}
