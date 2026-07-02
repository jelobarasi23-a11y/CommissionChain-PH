export type ReferralStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED";

export type Transaction = {
  id: string;
  txHash: string;
  type: "CREATE_REFERRAL" | "APPROVE_REFERRAL" | "REJECT_REFERRAL" | "CLAIM_COMMISSION";
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string;
};

export type Commission = {
  id: string;
  amount: string;
  claimedAt: string;
  txHash: string | null;
};

export type Referral = {
  id: string;
  onChainId: number;
  clientName: string;
  businessName: string;
  commissionAmount: string;
  status: ReferralStatus;
  createdAt: string;
  agent: { publicKey: string; displayName: string | null };
  business: { publicKey: string; name: string };
  commission: Commission | null;
  transactions: Transaction[];
};
