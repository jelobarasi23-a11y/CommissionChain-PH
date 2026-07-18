"use client";

import * as React from "react";
import { Sidebar, MobileSidebarDrawer } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * Overall page shell: persistent left Sidebar on desktop, a slim TopBar
 * to its right holding only network/wallet controls, and the mobile
 * drawer for small screens. Rendered once from the root layout so every
 * page just returns its own content — no page needs to import or render
 * navigation chrome itself anymore.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MobileSidebarDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
