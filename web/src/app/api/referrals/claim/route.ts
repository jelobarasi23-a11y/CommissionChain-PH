import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isLikelyStellarPublicKey, mapReferralRow, REFERRAL_SELECT, type ReferralRow } from "@/lib/db-helpers";
import { buildClaimCommissionXdr, submitSignedTransaction } from "@/lib/stellar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, onChainId, agentPublicKey } = body;

    if (!Number.isInteger(onChainId)) {
      return NextResponse.json({ error: "onChainId must be an integer." }, { status: 400 });
    }
    if (!isLikelyStellarPublicKey(agentPublicKey)) {
      return NextResponse.json({ error: "Invalid agent public key." }, { status: 400 });
    }

    const { data: referral, error: findError } = await supabase
      .from("referrals")
      .select("id, status, agent_id, commission_amount")
      .eq("on_chain_id", onChainId)
      .single();
    if (findError || !referral) {
      return NextResponse.json({ error: `No referral found with onChainId ${onChainId}.` }, { status: 404 });
    }
    if (referral.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Referral must be APPROVED before it can be claimed (current status: ${referral.status}).` },
        { status: 409 }
      );
    }

    if (step === "build") {
      const xdr = await buildClaimCommissionXdr({ agentPublicKey, onChainId });
      return NextResponse.json({ xdr });
    }

    if (step === "submit") {
      const { signedXdr } = body;
      if (!signedXdr) {
        return NextResponse.json({ error: "signedXdr is required for step=submit." }, { status: 400 });
      }

      const result = await submitSignedTransaction(signedXdr);

      const { error: updateError } = await supabase
        .from("referrals")
        .update({ status: "CLAIMED" })
        .eq("id", referral.id);
      if (updateError) {
        return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 });
      }

      const { error: txError } = await supabase.from("transactions").insert({
        tx_hash: result.hash,
        type: "CLAIM_COMMISSION",
        status: "SUCCESS",
        source_key: agentPublicKey,
        referral_id: referral.id,
      });
      if (txError) {
        return NextResponse.json({ error: `Database insert failed: ${txError.message}` }, { status: 500 });
      }

      const { error: commissionError } = await supabase.from("commissions").insert({
        amount: referral.commission_amount,
        tx_hash: result.hash,
        referral_id: referral.id,
        agent_id: referral.agent_id,
      });
      if (commissionError) {
        return NextResponse.json({ error: `Database insert failed: ${commissionError.message}` }, { status: 500 });
      }

      const { data: full, error: fetchError } = await supabase
        .from("referrals")
        .select(REFERRAL_SELECT)
        .eq("id", referral.id)
        .single();
      if (fetchError) {
        return NextResponse.json({ error: `Database read failed: ${fetchError.message}` }, { status: 500 });
      }

      return NextResponse.json({ referral: mapReferralRow(full as unknown as ReferralRow), txHash: result.hash });
    }

    return NextResponse.json({ error: "step must be 'build' or 'submit'." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/referrals/claim failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error claiming commission." },
      { status: 500 }
    );
  }
}
