import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { mapReferralRow, REFERRAL_SELECT, type ReferralRow } from "@/lib/db-helpers";

/**
 * GET /api/referrals
 * GET /api/referrals?agentPublicKey=G...
 * GET /api/referrals?businessPublicKey=G...
 *
 * Reads from the off-chain database (kept in sync by the create/approve/
 * reject/claim routes after each successful on-chain transaction) rather
 * than re-querying Soroban RPC on every page load — the chain is the
 * source of truth for fund movement, but Supabase is what the UI lists
 * and filters against, since it's far cheaper to query and already has
 * the human-readable fields (client name, business name) the contract
 * itself doesn't store.
 *
 * Filtering by agent/business public key resolves to that user's/
 * business's row id first, then filters referrals on the plain agent_id /
 * business_id columns directly — simpler and less error-prone than
 * filtering through the embedded relation in the main select.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentPublicKey = searchParams.get("agentPublicKey");
    const businessPublicKey = searchParams.get("businessPublicKey");

    let query = supabase
      .from("referrals")
      .select(REFERRAL_SELECT)
      .order("created_at", { ascending: false })
      .order("created_at", { foreignTable: "transactions", ascending: false });

    if (agentPublicKey) {
      const { data: agent, error } = await supabase
        .from("users")
        .select("id")
        .eq("public_key", agentPublicKey)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!agent) {
        return NextResponse.json({ referrals: [] });
      }
      query = query.eq("agent_id", agent.id);
    }

    if (businessPublicKey) {
      const { data: business, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("public_key", businessPublicKey)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!business) {
        return NextResponse.json({ referrals: [] });
      }
      query = query.eq("business_id", business.id);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const referrals = (data as unknown as ReferralRow[]).map(mapReferralRow);
    return NextResponse.json({ referrals });
  } catch (err) {
    console.error("GET /api/referrals failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error listing referrals." },
      { status: 500 }
    );
  }
}
