import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  findOrCreateUser,
  findOrCreateBusiness,
  isLikelyStellarPublicKey,
  mapReferralRow,
  REFERRAL_SELECT,
  type ReferralRow,
} from "@/lib/db-helpers";
import { buildCreateReferralXdr, submitSignedTransaction } from "@/lib/stellar";
import { toStroops } from "@/lib/format";

/**
 * Two-phase endpoint, distinguished by the `step` field:
 *
 *  step "build"  — server builds an unsigned Soroban transaction invoking
 *                   `create_referral` and returns its XDR for the agent's
 *                   Freighter wallet to sign. Nothing is written to the
 *                   database yet, since nothing has happened on-chain yet.
 *
 *  step "submit" — frontend posts back the Freighter-signed XDR. Server
 *                   submits it to the network, waits for confirmation,
 *                   reads the on-chain referral id the contract assigned
 *                   from the transaction's return value, and only then
 *                   creates the off-chain Referral/User/Business rows.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, agentPublicKey, businessPublicKey, clientName, businessName, commissionAmount } = body;

    if (!isLikelyStellarPublicKey(agentPublicKey) || !isLikelyStellarPublicKey(businessPublicKey)) {
      return NextResponse.json({ error: "Invalid agent or business public key." }, { status: 400 });
    }
    if (!clientName || !businessName) {
      return NextResponse.json({ error: "clientName and businessName are required." }, { status: 400 });
    }
    const amount = Number(commissionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "commissionAmount must be a positive number." }, { status: 400 });
    }

    if (step === "build") {
      const xdr = await buildCreateReferralXdr({
        agentPublicKey,
        businessPublicKey,
        commission: toStroops(amount),
      });
      return NextResponse.json({ xdr });
    }

    if (step === "submit") {
      const { signedXdr } = body;
      if (!signedXdr) {
        return NextResponse.json({ error: "signedXdr is required for step=submit." }, { status: 400 });
      }

      const result = await submitSignedTransaction(signedXdr);
      const onChainId = Number(result.returnValue);
      if (!Number.isInteger(onChainId)) {
        return NextResponse.json(
          { error: "Transaction succeeded but no referral id was returned by the contract." },
          { status: 502 }
        );
      }

      const agent = await findOrCreateUser(agentPublicKey);
      const business = await findOrCreateBusiness(businessPublicKey, businessName);

      const { data: inserted, error: insertError } = await supabase
        .from("referrals")
        .insert({
          on_chain_id: onChainId,
          client_name: clientName,
          business_name: businessName,
          commission_amount: amount,
          status: "PENDING",
          agent_id: agent.id,
          business_id: business.id,
        })
        .select("id")
        .single();
      if (insertError) {
        return NextResponse.json({ error: `Database insert failed: ${insertError.message}` }, { status: 500 });
      }

      const { error: txError } = await supabase.from("transactions").insert({
        tx_hash: result.hash,
        type: "CREATE_REFERRAL",
        status: "SUCCESS",
        source_key: agentPublicKey,
        referral_id: inserted.id,
      });
      if (txError) {
        return NextResponse.json({ error: `Database insert failed: ${txError.message}` }, { status: 500 });
      }

      const { data: full, error: fetchError } = await supabase
        .from("referrals")
        .select(REFERRAL_SELECT)
        .eq("id", inserted.id)
        .single();
      if (fetchError) {
        return NextResponse.json({ error: `Database read failed: ${fetchError.message}` }, { status: 500 });
      }

      return NextResponse.json({ referral: mapReferralRow(full as unknown as ReferralRow), txHash: result.hash });
    }

    return NextResponse.json({ error: "step must be 'build' or 'submit'." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/referrals/create failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error creating referral." },
      { status: 500 }
    );
  }
}
