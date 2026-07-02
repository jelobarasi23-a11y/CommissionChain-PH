"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CopyableAddress({
  address,
  chars = 4,
  className,
}: {
  address: string;
  chars?: number;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — fails silently */ }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy: ${address}`}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      {shortenAddress(address, chars)}
      {copied
        ? <Check className="h-3 w-3 text-primary" />
        : <Copy className="h-3 w-3 opacity-50" />
      }
    </button>
  );
}
