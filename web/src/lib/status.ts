import type { Referral } from "./types";

export type ViewerRole = "agent" | "business" | "other";

/** Which side of a referral the currently-connected wallet is on, if any —
 * drives both which action buttons show and how the status is explained. */
export function getViewerRole(referral: Referral, address: string | null): ViewerRole {
  if (!address) return "other";
  if (address === referral.business.publicKey) return "business";
  if (address === referral.agent.publicKey) return "agent";
  return "other";
}

/** A one-line, plain-English explanation of where a referral stands right
 * now, written for someone who has never touched a blockchain. Translates
 * the underlying contract state machine into what's actually happening
 * with the money, from the point of view of whoever's looking at it. */
export function statusCaption(referral: Referral, role: ViewerRole): string {
  switch (referral.status) {
    case "PENDING":
      return role === "business"
        ? "Waiting for your review — approve to set the money aside."
        : `Waiting for ${referral.businessName} to review.`;
    case "APPROVED":
      if (role === "agent") return "Money is set aside — click Claim to send it to your wallet.";
      if (role === "business") return "You've set the money aside. Waiting for the agent to withdraw it.";
      return "Money is set aside, waiting to be claimed.";
    case "REJECTED":
      return `Declined by ${referral.businessName}.`;
    case "CLAIMED":
      return role === "agent" ? "Paid — sent straight to your wallet." : "Paid out to the agent.";
    default:
      return "";
  }
}
