import { cn } from "@/lib/utils";

export type ReferralStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED";

const STAMP_TEXT: Record<ReferralStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLAIMED: "Settled",
};

const STAMP_CLASS: Record<ReferralStatus, string> = {
  PENDING: "stamp-pending",
  APPROVED: "stamp-approved",
  REJECTED: "stamp-rejected",
  CLAIMED: "stamp-claimed",
};

/** The one deliberately decorative element in the UI — see globals.css for
 * the full rationale. `size="sm"` is used inline in table rows; the
 * default size is for referral detail/summary contexts. */
export function ApprovalStamp({
  status,
  size = "default",
}: {
  status: ReferralStatus;
  size?: "default" | "sm";
}) {
  return (
    <span
      className={cn("stamp", STAMP_CLASS[status], size === "sm" && "stamp-sm")}
      aria-label={`Status: ${STAMP_TEXT[status]}`}
    >
      {STAMP_TEXT[status]}
    </span>
  );
}
