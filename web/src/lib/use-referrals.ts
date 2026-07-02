"use client";

import * as React from "react";
import type { Referral } from "./types";

export function useReferrals(filter?: { agentPublicKey?: string; businessPublicKey?: string }) {
  const [referrals, setReferrals] = React.useState<Referral[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter?.agentPublicKey) params.set("agentPublicKey", filter.agentPublicKey);
      if (filter?.businessPublicKey) params.set("businessPublicKey", filter.businessPublicKey);

      const res = await fetch(`/api/referrals?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load referrals.");
      setReferrals(data.referrals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.agentPublicKey, filter?.businessPublicKey]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { referrals, isLoading, error, refresh };
}
