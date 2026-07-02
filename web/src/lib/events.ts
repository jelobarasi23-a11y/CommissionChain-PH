import { rpc, scValToNative } from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_REFERRAL_CONTRACT_ID ?? "";

function getServer(): rpc.Server { return new rpc.Server(SOROBAN_RPC_URL); }

export type ContractEvent = {
  id:        string;
  eventType: string;         // "created" | "approved" | "rejected" | "claimed"
  referralId: number | null;
  ledger:    number;
  closedAt:  string;
};

export const EVENT_LABEL: Record<string, string> = {
  created:  "Referral submitted",
  approved: "Commission escrowed",
  rejected: "Referral rejected",
  claimed:  "Commission paid out",
};

export async function fetchContractEvents(cursor?: string): Promise<{
  events: ContractEvent[];
  cursor: string;
}> {
  if (!CONTRACT_ID) return { events: [], cursor: "" };

  const server = getServer();
  const filters: rpc.Api.EventFilter[] = [{ type: "contract", contractIds: [CONTRACT_ID] }];

  let request: rpc.Api.GetEventsRequest;
  if (cursor) {
    request = { filters, cursor, limit: 20 };
  } else {
    const info = await server.getLatestLedger();
    request    = { filters, startLedger: Math.max(1, info.sequence - 120), limit: 20 };
  }

  const response = await server.getEvents(request);

  const events: ContractEvent[] = response.events
    .map((ev): ContractEvent | null => {
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
      } catch { return null; }
    })
    .filter((ev): ev is ContractEvent => ev !== null);

  return { events, cursor: response.cursor };
}
