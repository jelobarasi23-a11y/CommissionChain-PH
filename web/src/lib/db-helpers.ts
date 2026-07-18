import { supabase } from "./supabase";
import type { Referral, Commission, Transaction } from "./types";

/** Agents and businesses authenticate purely by wallet (public key) — there
 * is no separate signup form, so the first time a public key shows up
 * attached to a referral, we create its row on the fly. */
export async function findOrCreateUser(publicKey: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("users")
    .upsert({ public_key: publicKey }, { onConflict: "public_key" })
    .select("id")
    .single();
  if (error) throw new Error(`findOrCreateUser failed: ${error.message}`);
  return data;
}

export async function findOrCreateBusiness(
  publicKey: string,
  name: string
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("businesses")
    .upsert({ public_key: publicKey, name }, { onConflict: "public_key" })
    .select("id")
    .single();
  if (error) throw new Error(`findOrCreateBusiness failed: ${error.message}`);
  return data;
}

export function isLikelyStellarPublicKey(value: unknown): value is string {
  return typeof value === "string" && /^G[A-Z2-7]{55}$/.test(value);
}

/**
 * Shape of a row returned by the `referrals` select used throughout the
 * API routes — `*` plus the embedded agent/business/commission/
 * transactions relations. Supabase/PostgREST returns snake_case columns
 * and, for embedded resources, exactly the columns you asked for; this
 * type describes that raw shape before `mapReferralRow` below converts it
 * into the camelCase `Referral` type the frontend already expects.
 */
export type ReferralRow = {
  id: string;
  on_chain_id: number;
  client_name: string;
  business_name: string;
  commission_amount: string | number;
  status: Referral["status"];
  created_at: string;
  agent: { public_key: string; display_name: string | null } | null;
  business: { public_key: string; name: string } | null;
  commission: {
    id: string;
    amount: string | number;
    claimed_at: string;
    tx_hash: string | null;
  } | null;
  transactions:
    | {
        id: string;
        tx_hash: string;
        type: Transaction["type"];
        status: Transaction["status"];
        created_at: string;
      }[]
    | null;
};

/** Converts one raw Supabase referral row (snake_case, as returned by
 * PostgREST) into the camelCase `Referral` shape the frontend was already
 * built against — this is the only place that translation happens, so
 * none of the page/component code needed to change when the data layer
 * moved off Prisma. */
export function mapReferralRow(row: ReferralRow): Referral {
  const commission: Commission | null = row.commission
    ? {
        id: row.commission.id,
        amount: String(row.commission.amount),
        claimedAt: row.commission.claimed_at,
        txHash: row.commission.tx_hash,
      }
    : null;

  const transactions: Transaction[] = (row.transactions ?? []).map((t) => ({
    id: t.id,
    txHash: t.tx_hash,
    type: t.type,
    status: t.status,
    createdAt: t.created_at,
  }));

  return {
    id: row.id,
    onChainId: row.on_chain_id,
    clientName: row.client_name,
    businessName: row.business_name,
    commissionAmount: String(row.commission_amount),
    status: row.status,
    createdAt: row.created_at,
    agent: {
      publicKey: row.agent?.public_key ?? "",
      displayName: row.agent?.display_name ?? null,
    },
    business: {
      publicKey: row.business?.public_key ?? "",
      name: row.business?.name ?? "",
    },
    commission,
    transactions,
  };
}

/** The `select()` fragment used by every route that needs a full referral
 * back (agent/business/commission/transactions embedded) — kept in one
 * place so all five routes stay in sync if the shape ever changes. */
export const REFERRAL_SELECT = `
  *,
  agent:users(public_key, display_name),
  business:businesses(public_key, name),
  commission:commissions(*),
  transactions(*)
`;
