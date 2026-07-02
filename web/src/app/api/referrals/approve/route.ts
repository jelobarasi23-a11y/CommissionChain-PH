import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isLikelyStellarPublicKey, mapReferralRow, REFERRAL_SELECT, type ReferralRow } from "@/lib/db-helpers";
import { buildApproveReferralXdr, submitSignedTransaction } from "@/lib/stellar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, onChainId, businessPublicKey } = body;

    if (!Number.isInteger(onChainId)) {
      return NextResponse.json({ error: "onChainId must be an integer." }, { status: 400 });
    }
    if (!isLikelyStellarPublicKey(businessPublicKey)) {
      return NextResponse.json({ error: "Invalid business public key." }, { status: 400 });
    }

    const { data: referral, error: findError } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("on_chain_id", onChainId)
      .single();
    if (findError || !referral) {
      return NextResponse.json({ error: `No referral found with onChainId ${onChainId}.` }, { status: 404 });
    }
    if (referral.status !== "PENDING") {
      return NextResponse.json(
        { error: `Referral is already ${referral.status.toLowerCase()}, cannot approve.` },
        { status: 409 }
      );
    }

    if (step === "build") {
      const xdr = await buildApproveReferralXdr({ businessPublicKey, onChainId });
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
        .update({ status: "APPROVED" })
        .eq("id", referral.id);
      if (updateError) {
        return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 });
      }

      const { error: txError } = await supabase.from("transactions").insert({
        tx_hash: result.hash,
        type: "APPROVE_REFERRAL",
        status: "SUCCESS",
        source_key: businessPublicKey,
        referral_id: referral.id,
      });
      if (txError) {
        return NextResponse.json({ error: `Database insert failed: ${txError.message}` }, { status: 500 });
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
    console.error("POST /api/referrals/approve failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error approving referral." },
      { status: 500 }
    );
  }
}
