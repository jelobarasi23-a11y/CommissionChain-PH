"use client";

import * as React from "react";
import {
  connectWallet, connectAlbedo, disconnectWallet,
  signWithWallet, getConnectedAddress, isSiteAllowed,
  verifyNetwork, fetchXlmBalance, WalletError,
} from "@/lib/wallet";

const PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

export type WalletType = "freighter" | "albedo";

type WalletContextValue = {
  address:        string | null;
  xlmBalance:     string | null;
  walletType:     WalletType | null;
  isConnecting:   boolean;
  error:          string | null;
  connect:        (type: WalletType) => Promise<void>;
  disconnect:     () => void;
  refreshBalance: () => Promise<void>;
  signXdr:        (xdr: string) => Promise<string>;
};

const WalletContext = React.createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address,      setAddress]      = React.useState<string | null>(null);
  const [xlmBalance,   setXlmBalance]   = React.useState<string | null>(null);
  const [walletType,   setWalletType]   = React.useState<WalletType | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [error,        setError]        = React.useState<string | null>(null);

  const refreshBalance = React.useCallback(async () => {
    if (!address) { setXlmBalance(null); return; }
    try { setXlmBalance(await fetchXlmBalance(address)); } catch { setXlmBalance(null); }
  }, [address]);

  // Restore previous Freighter session on page load
  React.useEffect(() => {
    (async () => {
      try {
        if (await isSiteAllowed()) {
          const a = await getConnectedAddress();
          if (a) { setAddress(a); setWalletType("freighter"); }
        }
      } catch { /* silent */ }
    })();
  }, []);

  React.useEffect(() => { refreshBalance(); }, [refreshBalance]);

  const connect = React.useCallback(async (type: WalletType) => {
    setIsConnecting(true); setError(null);
    try {
      const addr = type === "albedo" ? await connectAlbedo() : await connectWallet();
      if (type === "freighter") await verifyNetwork(PASSPHRASE);
      setAddress(addr); setWalletType(type);
    } catch (err) {
      setError(err instanceof WalletError ? err.message : `Failed to connect ${type}.`);
      setAddress(null); setWalletType(null);
    } finally { setIsConnecting(false); }
  }, []);

  const disconnect = React.useCallback(() => {
    disconnectWallet().catch(() => {});
    setAddress(null); setXlmBalance(null); setWalletType(null); setError(null);
  }, []);

  const signXdr = React.useCallback(async (xdr: string): Promise<string> => {
    if (!address || !walletType) throw new WalletError("No wallet connected.");
    return signWithWallet(xdr, PASSPHRASE, address, walletType);
  }, [address, walletType]);

  return (
    <WalletContext.Provider value={{ address, xlmBalance, walletType, isConnecting, error, connect, disconnect, refreshBalance, signXdr }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider.");
  return ctx;
}
