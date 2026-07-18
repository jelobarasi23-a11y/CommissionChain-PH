/**
 * Formatting helpers shared across the dashboard, referral list, and
 * commission history pages.
 */

const HORIZON_DECIMALS = 7;

/** Format a commission amount (stored as a decimal string/number) as a
 * peso-style figure with the asset code, e.g. "500.0000000 USDC" ->
 * "500.00 USDC" for compact display. */
export function formatAmount(amount: number | string, assetCode = "USDC"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${assetCode}`;
}

/** Stellar amounts on-chain are integers in the asset's smallest unit
 * (7 decimal places, same convention as XLM stroops). Convert a
 * human-entered decimal amount (e.g. 500.5) into the raw on-chain integer
 * string the contract expects. */
export function toStroops(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** HORIZON_DECIMALS));
}

/** Convert a raw on-chain integer amount back into a human-readable decimal
 * number. */
export function fromStroops(raw: bigint | number | string): number {
  const n = typeof raw === "bigint" ? raw : BigInt(raw);
  return Number(n) / 10 ** HORIZON_DECIMALS;
}

/** Shorten a Stellar public key/contract id for compact display:
 * GABCD...WXYZ */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Build a Stellar Expert testnet explorer link for a transaction hash. */
export function explorerTxUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

/** Build a Stellar Expert testnet explorer link for an account or
 * contract address. */
export function explorerAddressUrl(address: string): string {
  const isContract = address.startsWith("C");
  return `https://stellar.expert/explorer/testnet/${isContract ? "contract" : "account"}/${address}`;
}

/** Human-readable relative-ish date for table rows. */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
