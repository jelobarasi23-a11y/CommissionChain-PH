"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Layers, LayoutDashboard, ListChecks, PlusCircle, Banknote, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/",              label: "Dashboard",    icon: LayoutDashboard },
  { href: "/referrals",     label: "Referrals",    icon: ListChecks },
  { href: "/referrals/new", label: "New Referral", icon: PlusCircle },
  { href: "/commissions",   label: "Commissions",  icon: Banknote },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group px-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow transition-shadow group-hover:shadow-[0_0_24px_4px_hsl(162_100%_41%_/_0.45)]">
        <Layers className="h-4 w-4 text-night" strokeWidth={2.5} />
      </div>
      <span className="font-display text-base font-bold tracking-tight">
        <span className="gradient-text">CommissionChain</span>
        <span className="text-muted-foreground"> PH</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const active = pathname === l.href;
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Persistent left sidebar on desktop (md and up) — logo pinned at top,
 * primary nav links stacked below. Hidden entirely below md; on mobile the
 * same links render inside MobileSidebarDrawer instead, triggered by the
 * hamburger button in TopBar.
 */
export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:gap-8 md:border-r md:border-white/5 md:bg-night/70 md:px-4 md:py-5 md:sticky md:top-0 md:h-screen">
      <Logo />
      <NavLinks />
    </aside>
  );
}

/**
 * Mobile-only slide-in drawer showing the same nav links as Sidebar,
 * plus the logo and a close button. Rendered via a plain conditional
 * (not a portal) since it's already scoped to the mobile breakpoint and
 * doesn't need to escape any particular stacking context.
 */
export function MobileSidebarDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] md:hidden">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-72 max-w-[80vw] flex-col gap-8 border-r border-white/8 bg-night px-4 py-5 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
      </div>
    </div>
  );
}
