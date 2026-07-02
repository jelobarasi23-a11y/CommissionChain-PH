"use client";

/**
 * Thin wrapper around `@stellar/freighter-api`. Every function here mirrors
 * a real exported function from that package (verified against the
 * installed package's own type declarations rather than assumed from
 * memory) — this file just gives the rest of the app a small, predictable
 * surface and turns Freighter's `{ ...data, error? }` response shape into
 * normal thrown errors / typed return values.
 */
import {
  isConnected as freighterIsConnected,
  isAllowed as freighterIsAllowed,
  setAllowed as freighterSetAllowed,
  requestAccess as freighterRequestAccess,
  getAddress as freighterGetAddress,
  getNetworkDetails as freighterGetNetworkDetails,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

export class WalletError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}

/** Whether the Freighter browser extension is installed at all (separate
 * from whether this site has been granted access yet). */
export async function isFreighterInstalled(): Promise<boolean> {
  const result = await freighterIsConnected();
  if (result.error) return false;
  return result.isConnected;
}

/** Whether this site has already been granted access to the user's wallet
 * in a previous visit, so we can silently re-fetch the address instead of
 * showing a "Connect Wallet" prompt. */
export async function isSiteAllowed(): Promise<boolean> {
  const result = await freighterIsAllowed();
  if (result.error) return false;
  return result.isAllowed;
}

/**
 * Full connect flow for the "Connect Wallet" button. `requestAccess`
 * prompts the user (if not already allowed) and returns their public key
 * in one call — there's no separate "approve" + "fetch address" round trip
 * needed with the current Freighter API.
 */
export async function connectWallet(): Promise<string> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new WalletError(
      "Freighter wallet extension not found. Install it from freighter.app and reload the page."
    );
  }

  const result = await freighterRequestAccess();
  if (result.error) {
    throw new WalletError(result.error.message, result.error.code);
  }
  return result.address;
}

/** Re-fetch the currently connected address for a return visit, without
 * re-triggering the connect prompt. Call `isSiteAllowed()` first. */
export async function getConnectedAddress(): Promise<string | null> {
  const result = await freighterGetAddress();
  if (result.error || !result.address) return null;
  return result.address;
}

/** Confirm Freighter is pointed at the same network the app expects
 * (testnet), so we fail fast with a clear message instead of a confusing
 * transaction error later. */
export async function verifyNetwork(expectedPassphrase: string): Promise<void> {
  const result = await freighterGetNetworkDetails();
  if (result.error) {
    throw new WalletError(result.error.message, result.error.code);
  }
  if (result.networkPassphrase !== expectedPassphrase) {
    throw new WalletError(
      `Freighter is set to "${result.network}". Switch it to Testnet in the extension and try again.`
    );
  }
}

/**
 * Ask Freighter to sign an unsigned transaction XDR (built server-side by
 * `/api/referrals/*`) and return the signed XDR ready for submission.
 */
export async function signTransactionXdr(
  xdr: string,
  networkPassphrase: string,
  address: string
): Promise<string> {
  const result = await freighterSignTransaction(xdr, { networkPassphrase, address });
  if (result.error) {
    throw new WalletError(result.error.message, result.error.code);
  }
  return result.signedTxXdr;
}

// setAllowed is exposed for completeness (e.g. a manual "grant access"
// button elsewhere in the app) even though connectWallet()'s call to
// requestAccess() covers the common path on its own.
export async function setAllowed(): Promise<boolean> {
  const result = await freighterSetAllowed();
  if (result.error) return false;
  return result.isAllowed;
}

/**
 * Disconnect: Freighter doesn't expose a revoke/disconnect API a dApp
 * can call, so disconnecting here means clearing the app's own local
 * session state (address, balance). The extension itself stays authorized
 * until the user manually revokes it inside Freighter's settings.
 * This function is intentionally a no-op at the SDK layer — the real
 * work is done by WalletProvider calling setAddress(null) after this.
 */
export async function disconnectWallet(): Promise<void> {
  // Nothing to call on Freighter's API — state clear is handled by caller.
}

/**
 * Fetch the connected account's native XLM balance from Horizon.
 * Returns a string like "9999.9931370" (same format Horizon returns),
 * or "0" if the account has no native balance entry (shouldn't happen
 * for any funded account, but is a safe default).
 */
export async function fetchXlmBalance(publicKey: string): Promise<string> {
  const horizonUrl =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org"
      : "https://horizon-testnet.stellar.org";

  const res = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!res.ok) return "0";
  const data: { balances?: { asset_type: string; balance: string }[] } = await res.json();
  const native = data.balances?.find((b) => b.asset_type === "native");
  return native?.balance ?? "0";
}

// ── Albedo wallet ─────────────────────────────────────────────────────────────
export async function connectAlbedo(): Promise<string> {
  const { default: albedo } = await import("@albedo-link/intent");
  const result = await albedo.publicKey({ token: Math.random().toString(36).slice(2) });
  return result.pubkey;
}

export async function signTransactionXdrAlbedo(xdr: string, address: string): Promise<string> {
  const { default: albedo } = await import("@albedo-link/intent");
  const result = await albedo.tx({ xdr, pubkey: address, network: "testnet" });
  return result.signed_envelope_xdr;
}

export async function signWithWallet(
  xdr: string,
  networkPassphrase: string,
  address: string,
  walletType: "freighter" | "albedo"
): Promise<string> {
  return walletType === "albedo"
    ? signTransactionXdrAlbedo(xdr, address)
    : signTransactionXdr(xdr, networkPassphrase, address);
}
