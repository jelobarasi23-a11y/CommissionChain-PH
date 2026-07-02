"use client";

import { WalletConnectButton } from "./WalletConnectButton";
import { NetworkStatusPill } from "./NetworkStatusPill";
import { Menu } from "lucide-react";

/**
 * Slim top bar living to the right of Sidebar — holds only the network
 * status pill and the wallet cluster (balance / address / Send XLM /
 * Disconnect), plus a hamburger button on mobile (where Sidebar is hidden
 * and MobileSidebarDrawer takes over navigation instead). Primary nav
 * links used to live here too; they moved into Sidebar so this bar has
 * room to breathe instead of wrapping/crowding on smaller desktop widths.
 */
export function TopBar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:justify-end md:px-6">
        {/* Mobile hamburger — opens the sidebar drawer. Hidden on desktop
            since Sidebar is always visible there. */}
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg border border-white/8 bg-surface p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <NetworkStatusPill />
          </div>
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
