import { NextRequest, NextResponse } from "next/server";
import { buildXlmPaymentXdr, submitClassicTransaction } from "@/lib/stellar";

/**
 * Two-phase XLM payment endpoint — same build/submit pattern as the
 * contract action routes, satisfying the Level 1 "sends XLM transaction
 * on Stellar Testnet" requirement.
 *
 * step "build"  → builds unsigned classic payment XDR, returns it for
 *                 the sender's Freighter wallet to sign.
 * step "submit" → accepts the signed XDR, submits to Horizon, returns
 *                 the transaction hash for the success screen.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, sourcePublicKey, destinationPublicKey, amount } = body;

    if (!step) {
      return NextResponse.json({ error: "step is required ('build' or 'submit')." }, { status: 400 });
    }

    if (step === "build") {
      if (!sourcePublicKey || !destinationPublicKey || !amount) {
        return NextResponse.json(
          { error: "sourcePublicKey, destinationPublicKey and amount are required." },
          { status: 400 }
        );
      }
      const parsedAmount = parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: "amount must be a positive number." }, { status: 400 });
      }

      const xdr = await buildXlmPaymentXdr({
        sourcePublicKey,
        destinationPublicKey,
        amount: parsedAmount.toFixed(7),
      });
      return NextResponse.json({ xdr });
    }

    if (step === "submit") {
      const { signedXdr } = body;
      if (!signedXdr) {
        return NextResponse.json({ error: "signedXdr is required for step=submit." }, { status: 400 });
      }
      const result = await submitClassicTransaction(signedXdr);
      return NextResponse.json({ txHash: result.hash });
    }

    return NextResponse.json({ error: "step must be 'build' or 'submit'." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/xlm/send failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error sending XLM." },
      { status: 500 }
    );
  }
}
