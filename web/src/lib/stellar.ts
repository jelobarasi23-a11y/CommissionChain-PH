import {
  rpc,
  Horizon,
  TransactionBuilder,
  Contract,
  Address,
  Operation,
  Asset,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  type xdr,
} from "@stellar/stellar-sdk";

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";
const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const REFERRAL_CONTRACT_ID = process.env.NEXT_PUBLIC_REFERRAL_CONTRACT_ID ?? "";

function getServer(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL);
}

function addressScVal(publicKeyOrContractId: string): xdr.ScVal {
  return new Address(publicKeyOrContractId).toScVal();
}

function u32ScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

function i128ScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

/**
 * Build an unsigned, network-ready (simulated + fee/footprint-assembled)
 * transaction invoking one function on the referral contract. Returns the
 * XDR string for the frontend to hand to Freighter for signing — this app
 * never holds a user's secret key, so every state-changing call goes
 * through this build -> sign-in-wallet -> submit pipeline.
 */
async function buildInvokeXdr(
  sourcePublicKey: string,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  const server = getServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);
  const contract = new Contract(REFERRAL_CONTRACT_ID);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(120)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

export async function buildCreateReferralXdr(opts: {
  agentPublicKey: string;
  businessPublicKey: string;
  commission: bigint;
}): Promise<string> {
  return buildInvokeXdr(opts.agentPublicKey, "create_referral", [
    addressScVal(opts.agentPublicKey),
    addressScVal(opts.businessPublicKey),
    i128ScVal(opts.commission),
  ]);
}

export async function buildApproveReferralXdr(opts: {
  businessPublicKey: string;
  onChainId: number;
}): Promise<string> {
  return buildInvokeXdr(opts.businessPublicKey, "approve_referral", [
    addressScVal(opts.businessPublicKey),
    u32ScVal(opts.onChainId),
  ]);
}

export async function buildRejectReferralXdr(opts: {
  businessPublicKey: string;
  onChainId: number;
}): Promise<string> {
  return buildInvokeXdr(opts.businessPublicKey, "reject_referral", [
    addressScVal(opts.businessPublicKey),
    u32ScVal(opts.onChainId),
  ]);
}

export async function buildClaimCommissionXdr(opts: {
  agentPublicKey: string;
  onChainId: number;
}): Promise<string> {
  return buildInvokeXdr(opts.agentPublicKey, "claim_commission", [
    addressScVal(opts.agentPublicKey),
    u32ScVal(opts.onChainId),
  ]);
}

export type SubmitResult = {
  hash: string;
  status: "SUCCESS" | "FAILED";
  returnValue?: unknown;
};

/**
 * Submit a Freighter-signed transaction XDR to Soroban RPC and wait for it
 * to land. Used by every /api/referrals/* route after the frontend posts
 * back the signed XDR it got from Freighter.
 */
export async function submitSignedTransaction(signedXdr: string): Promise<SubmitResult> {
  const server = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sendResponse = await server.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    throw new Error(
      `Stellar network rejected the transaction: ${JSON.stringify(sendResponse.errorResult)}`
    );
  }

  const finalStatus = await server.pollTransaction(sendResponse.hash, {
    attempts: 20,
  });

  if (finalStatus.status === "SUCCESS") {
    const returnValue = finalStatus.returnValue
      ? scValToNative(finalStatus.returnValue)
      : undefined;
    return { hash: sendResponse.hash, status: "SUCCESS", returnValue };
  }

  throw new Error(
    `Transaction ${sendResponse.hash} did not succeed (status: ${finalStatus.status}). ` +
      `Check it on Stellar Expert: https://stellar.expert/explorer/testnet/tx/${sendResponse.hash}`
  );
}

/** Read-only contract calls (get_referral / get_all_referrals) go through
 * simulation only — no signing, no fees, no network submission needed,
 * since nothing is being written on-chain.
 *
 * Soroban still requires a transaction shell with a real, existing
 * account as its source even for a call that's only ever simulated, so
 * `sourcePublicKey` must be a funded testnet account (e.g. the public key
 * of whichever agent or business is currently viewing the page — any
 * funded account works equally well here since the source account's
 * identity has no bearing on a read-only call's result). */
export async function simulateReadOnlyCall(
  sourcePublicKey: string,
  method: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const server = getServer();
  const contract = new Contract(REFERRAL_CONTRACT_ID);
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
    return scValToNative(sim.result.retval);
  }
  return undefined;
}

export { u32ScVal, i128ScVal, addressScVal, NETWORK_PASSPHRASE, SOROBAN_RPC_URL };

// ── Classic Stellar (Horizon) helpers ─────────────────────────────────────
// These use the classic payment operation rather than Soroban contract calls,
// which satisfies the Level 1 checklist requirement for "sends XLM transaction
// on Stellar Testnet" alongside the Soroban-based commission escrow flow.

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

function getHorizonServer(): Horizon.Server {
  return new Horizon.Server(HORIZON_URL);
}

/**
 * Build an unsigned classic XLM payment transaction XDR using
 * Operation.payment. Returns the XDR string for Freighter to sign —
 * the same build → sign → submit pattern as the Soroban contract calls.
 */
export async function buildXlmPaymentXdr(opts: {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
}): Promise<string> {
  const server  = getHorizonServer();
  const account = await server.loadAccount(opts.sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: opts.destinationPublicKey,
        asset:       Asset.native(),
        amount:      opts.amount,
      })
    )
    .setTimeout(120)
    .build();

  return tx.toXDR();
}

/**
 * Submit a Freighter-signed classic Horizon transaction (e.g. XLM payment).
 * Distinct from `submitSignedTransaction` which uses Soroban RPC — classic
 * transactions go through Horizon's REST API instead.
 */
export async function submitClassicTransaction(signedXdr: string): Promise<{ hash: string }> {
  const server = getHorizonServer();
  const tx     = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(tx);
  return { hash: result.hash };
}
