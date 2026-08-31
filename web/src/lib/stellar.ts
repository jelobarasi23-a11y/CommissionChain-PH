import {
  rpc,
  Horizon,
  TransactionBuilder,
  Contract,
  Address,
  Operation,
  Asset,
  Keypair,
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
    .setTimeout(300)
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
    throw new Error(friendlySorobanError(sim.error));
  }
  if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
    return scValToNative(sim.result.retval);
  }
  return undefined;
}

/**
 * Soroban simulation failures come back as a raw multi-line diagnostic
 * event dump — accurate for debugging, unreadable for an end user. This
 * translates the handful of failure modes real testers actually hit
 * (mainly: a wallet that's never opened a trustline for this project's
 * commission token) into a plain sentence, and falls back to a shorter,
 * still-honest message for anything unrecognized rather than dumping the
 * full contract-address-laden trace in someone's face.
 */
function friendlySorobanError(raw: string): string {
  if (/trustline entry is missing/i.test(raw)) {
    return "This wallet hasn't set up a trustline for this project's commission token (USDC) yet, so it can't send or hold it. Add a trustline for that asset in your wallet, make sure it actually holds some, then try again.";
  }
  if (/balance is not sufficient|insufficient.*balance/i.test(raw)) {
    return "This wallet doesn't hold enough of the commission token to cover this transaction. Get more sent to it, then try again.";
  }
  const match = raw.match(/Error\(Contract, #(\d+)\)/);
  if (match) {
    return `The contract rejected this transaction (error #${match[1]}) — usually a wallet setup issue (missing trustline or balance) rather than a bug. Check with the project owner if it persists.`;
  }
  return raw;
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
    .setTimeout(300)
    .build();

  return tx.toXDR();
}

/**
 * The Stellar SDK's classic Horizon calls (loadAccount, submitTransaction)
 * use axios internally, which throws a generic "Request failed with
 * status code NNN" on any non-2xx response — that's what a user sees if
 * the error isn't unwrapped. Horizon actually returns a much more useful
 * `extras.result_codes` object explaining exactly why (e.g. a specific
 * transaction submission failed, or which operation and why), so this
 * pulls that out when present instead of the generic axios wrapper text.
 */
function horizonErrorDetail(err: unknown): string {
  const anyErr = err as {
    response?: { data?: { extras?: { result_codes?: unknown }; detail?: string; title?: string } };
    message?: string;
  };
  const resultCodes = anyErr?.response?.data?.extras?.result_codes;
  if (resultCodes) return `Horizon rejected it: ${JSON.stringify(resultCodes)}`;
  const detail = anyErr?.response?.data?.detail ?? anyErr?.response?.data?.title;
  if (detail) return detail;
  return anyErr?.message ?? "Unknown Horizon error.";
}

/**
 * Submit a Freighter-signed classic Horizon transaction (e.g. XLM payment).
 * Distinct from `submitSignedTransaction` which uses Soroban RPC — classic
 * transactions go through Horizon's REST API instead.
 */
export async function submitClassicTransaction(signedXdr: string): Promise<{ hash: string }> {
  const server = getHorizonServer();
  const tx     = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  try {
    const result = await server.submitTransaction(tx);
    return { hash: result.hash };
  } catch (err) {
    throw new Error(`Transaction submission failed. ${horizonErrorDetail(err)}`);
  }
}

// ── Commission-token trustline (one-time wallet setup) ─────────────────────
// Stellar requires an account to explicitly "trust" any non-native asset
// before it can hold or send it. Real testers hit this the first time they
// try to approve a referral, with a confusing on-chain error — this section
// lets the app detect the missing trustline and fix it in one guided click
// (sign a change_trust operation) instead of sending someone off to read
// docs and run CLI commands.

const COMMISSION_TOKEN_CODE   = process.env.NEXT_PUBLIC_COMMISSION_TOKEN_CODE ?? "";
const COMMISSION_TOKEN_ISSUER = process.env.NEXT_PUBLIC_COMMISSION_TOKEN_ISSUER ?? "";
// Server-only — never prefixed with NEXT_PUBLIC_. Used solely to send a
// starting balance to a wallet that's just opened a trustline; this is
// testnet play money with no real value, so the blast radius of this
// secret leaking is "someone can mint themselves fake test USDC," not a
// real financial loss.
const COMMISSION_TOKEN_ISSUER_SECRET = process.env.COMMISSION_TOKEN_ISSUER_SECRET ?? "";

const STARTING_TEST_BALANCE = "1000"; // enough for several test referrals

/** Looks up whether an account already trusts (and how much it holds of) the commission token. */
export async function checkTrustlineStatus(
  publicKey: string
): Promise<{ hasTrustline: boolean; balance: string }> {
  const server = getHorizonServer();
  try {
    const account = await server.loadAccount(publicKey);
    const line = account.balances.find(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === COMMISSION_TOKEN_CODE &&
        b.asset_issuer === COMMISSION_TOKEN_ISSUER
    );
    return { hasTrustline: Boolean(line), balance: line && "balance" in line ? line.balance : "0" };
  } catch {
    // Includes a brand-new, unfunded account — no trustline yet, same as any other reason it can't be found.
    return { hasTrustline: false, balance: "0" };
  }
}

/** Builds an unsigned change_trust transaction so a wallet can opt in to holding the commission token. */
export async function buildChangeTrustXdr(sourcePublicKey: string): Promise<string> {
  if (!COMMISSION_TOKEN_CODE || !COMMISSION_TOKEN_ISSUER) {
    throw new Error(
      "NEXT_PUBLIC_COMMISSION_TOKEN_CODE / NEXT_PUBLIC_COMMISSION_TOKEN_ISSUER aren't configured on the server."
    );
  }
  const server  = getHorizonServer();
  let account;
  try {
    account = await server.loadAccount(sourcePublicKey);
  } catch (err) {
    throw new Error(`Couldn't load that wallet's account. ${horizonErrorDetail(err)}`);
  }
  const asset = new Asset(COMMISSION_TOKEN_CODE, COMMISSION_TOKEN_ISSUER);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(300)
    .build();

  return tx.toXDR();
}

/**
 * Sends a starting test-USDC balance from the issuer to a wallet that has
 * just opened a trustline. Safe to call repeatedly — skips silently if the
 * account already holds some, so it can't be used to drain the issuer by
 * spamming the endpoint.
 */
export async function fundNewTrustline(
  destinationPublicKey: string
): Promise<{ funded: boolean; hash?: string }> {
  if (!COMMISSION_TOKEN_ISSUER_SECRET) {
    throw new Error("COMMISSION_TOKEN_ISSUER_SECRET isn't configured on the server.");
  }

  const status = await checkTrustlineStatus(destinationPublicKey);
  if (!status.hasTrustline) {
    throw new Error("That account doesn't have a trustline for the commission token yet.");
  }
  if (parseFloat(status.balance) > 0) {
    return { funded: false }; // already has funds — nothing to do
  }

  const server     = getHorizonServer();
  const issuerKey  = Keypair.fromSecret(COMMISSION_TOKEN_ISSUER_SECRET);
  let issuerAcct;
  try {
    issuerAcct = await server.loadAccount(issuerKey.publicKey());
  } catch (err) {
    throw new Error(`Couldn't load the issuer account. ${horizonErrorDetail(err)}`);
  }
  const asset = new Asset(COMMISSION_TOKEN_CODE, COMMISSION_TOKEN_ISSUER);

  const tx = new TransactionBuilder(issuerAcct, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset,
        amount: STARTING_TEST_BALANCE,
      })
    )
    .setTimeout(120)
    .build();

  tx.sign(issuerKey);
  try {
    const result = await server.submitTransaction(tx);
    return { funded: true, hash: result.hash };
  } catch (err) {
    throw new Error(`Couldn't send the starting balance. ${horizonErrorDetail(err)}`);
  }
}