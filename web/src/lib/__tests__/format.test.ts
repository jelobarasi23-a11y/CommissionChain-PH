import { describe, it, expect } from "vitest";
import {
  formatAmount,
  toStroops,
  fromStroops,
  shortenAddress,
  explorerTxUrl,
  explorerAddressUrl,
} from "../format";

describe("formatAmount", () => {
  it("formats a numeric amount with the asset code", () => {
    expect(formatAmount(500)).toBe("500.00 USDC");
  });

  it("formats a string amount the same way", () => {
    expect(formatAmount("1250.5")).toBe("1,250.50 USDC");
  });

  it("respects a custom asset code", () => {
    expect(formatAmount(10, "XLM")).toBe("10.00 XLM");
  });

  it("handles zero", () => {
    expect(formatAmount(0)).toBe("0.00 USDC");
  });
});

describe("toStroops / fromStroops round-trip", () => {
  it("converts a decimal amount to the on-chain integer and back", () => {
    const original = 500.5;
    const raw = toStroops(original);
    expect(raw).toBe(5005000000n);
    expect(fromStroops(raw)).toBeCloseTo(original, 7);
  });

  it("handles whole numbers cleanly", () => {
    expect(toStroops(100)).toBe(1000000000n);
    expect(fromStroops(1000000000n)).toBe(100);
  });

  it("fromStroops accepts string input (as returned by some RPC calls)", () => {
    expect(fromStroops("2500000000")).toBe(250);
  });
});

describe("shortenAddress", () => {
  const fullAddress = "GBI2VP5Z3UN2FJYHXNIK2FUKNK4XFKLARHLRBLPA4LDLE4AJEHCAB5WP";

  it("shortens a long Stellar address to head...tail", () => {
    expect(shortenAddress(fullAddress)).toBe("GBI2...B5WP");
  });

  it("respects a custom character count", () => {
    const result = shortenAddress(fullAddress, 6);
    expect(result.startsWith("GBI2VP")).toBe(true);
    expect(result.endsWith("CAB5WP")).toBe(true);
  });

  it("returns short strings unchanged rather than over-truncating", () => {
    expect(shortenAddress("short")).toBe("short");
  });
});

describe("explorer URL builders", () => {
  it("builds a Stellar Expert testnet transaction URL", () => {
    expect(explorerTxUrl("abc123")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123"
    );
  });

  it("builds a contract URL for C-prefixed addresses", () => {
    const contractId = "CBUXDZ34FE6KSGQL3O3NKUHSEPXXYTHGM3TCJM5LL5O3QBG55W33KMGZ";
    expect(explorerAddressUrl(contractId)).toBe(
      `https://stellar.expert/explorer/testnet/contract/${contractId}`
    );
  });

  it("builds an account URL for G-prefixed addresses", () => {
    const account = "GBI2VP5Z3UN2FJYHXNIK2FUKNK4XFKLARHLRBLPA4LDLE4AJEHCAB5WP";
    expect(explorerAddressUrl(account)).toBe(
      `https://stellar.expert/explorer/testnet/account/${account}`
    );
  });
});
