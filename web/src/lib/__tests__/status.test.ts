import { describe, it, expect } from "vitest";
import { getViewerRole, statusCaption } from "../status";
import type { Referral } from "../types";

const AGENT_KEY    = "GAGENTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const BUSINESS_KEY = "GBUSINESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const OTHER_KEY     = "GSTRANGERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: "ref-1",
    onChainId: 1,
    clientName: "Maria Santos",
    businessName: "Pinnacle Insurance Agency",
    commissionAmount: "500",
    status: "PENDING",
    createdAt: new Date().toISOString(),
    agent: { publicKey: AGENT_KEY, displayName: null },
    business: { publicKey: BUSINESS_KEY, name: "Pinnacle Insurance Agency" },
    commission: null,
    transactions: [],
    ...overrides,
  };
}

describe("getViewerRole", () => {
  it("returns 'other' when no wallet is connected", () => {
    expect(getViewerRole(makeReferral(), null)).toBe("other");
  });

  it("returns 'business' when the connected address matches the business", () => {
    expect(getViewerRole(makeReferral(), BUSINESS_KEY)).toBe("business");
  });

  it("returns 'agent' when the connected address matches the agent", () => {
    expect(getViewerRole(makeReferral(), AGENT_KEY)).toBe("agent");
  });

  it("returns 'other' for an unrelated connected address", () => {
    expect(getViewerRole(makeReferral(), OTHER_KEY)).toBe("other");
  });
});

describe("statusCaption", () => {
  it("explains PENDING differently for the business than for everyone else", () => {
    const referral = makeReferral({ status: "PENDING" });
    expect(statusCaption(referral, "business")).toMatch(/approve to set the money aside/i);
    expect(statusCaption(referral, "agent")).toContain(referral.businessName);
    expect(statusCaption(referral, "other")).toContain(referral.businessName);
  });

  it("explains APPROVED differently for agent vs business vs bystander", () => {
    const referral = makeReferral({ status: "APPROVED" });
    expect(statusCaption(referral, "agent")).toMatch(/click claim/i);
    expect(statusCaption(referral, "business")).toMatch(/waiting for the agent/i);
    expect(statusCaption(referral, "other")).toMatch(/waiting to be claimed/i);
  });

  it("explains REJECTED with the business name regardless of role", () => {
    const referral = makeReferral({ status: "REJECTED" });
    expect(statusCaption(referral, "agent")).toContain(referral.businessName);
    expect(statusCaption(referral, "business")).toContain(referral.businessName);
  });

  it("explains CLAIMED differently for the agent than for everyone else", () => {
    const referral = makeReferral({ status: "CLAIMED" });
    expect(statusCaption(referral, "agent")).toMatch(/sent straight to your wallet/i);
    expect(statusCaption(referral, "business")).toMatch(/paid out to the agent/i);
  });
});
