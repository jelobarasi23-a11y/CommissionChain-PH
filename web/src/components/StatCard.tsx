"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";
import type { LucideIcon } from "lucide-react";

const ACCENT_CONFIG = {
  teal: {
    stripe:  "stripe-teal",
    iconBg:  "bg-primary/10",
    iconColor: "text-primary",
    glow:    "hover:shadow-[0_0_30px_-6px_hsl(162_100%_41%_/_0.25)]",
  },
  gold: {
    stripe:  "stripe-gold",
    iconBg:  "bg-[hsl(var(--gold)/_0.12)]",
    iconColor: "text-[hsl(var(--gold))]",
    glow:    "hover:shadow-[0_0_30px_-6px_hsl(38_95%_55%_/_0.25)]",
  },
  rust: {
    stripe:  "stripe-coral",
    iconBg:  "bg-[hsl(var(--coral)/_0.12)]",
    iconColor: "text-[hsl(var(--coral))]",
    glow:    "hover:shadow-[0_0_30px_-6px_hsl(4_84%_60%_/_0.2)]",
  },
} as const;

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent = "teal",
  format,
}: {
  label: string;
  value: number;
  description?: string;
  icon?: LucideIcon;
  accent?: "teal" | "gold" | "rust";
  format?: (n: number) => string;
}) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : String(Math.round(animated));
  const cfg = ACCENT_CONFIG[accent];

  return (
    <Card className={cn("overflow-hidden transition-all duration-300", cfg.glow)}>
      {/* Coloured accent stripe across the top */}
      <div className={cn("h-[3px] w-full", cfg.stripe)} />

      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3 pt-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.iconBg)}>
            <Icon className={cn("h-4.5 w-4.5", cfg.iconColor)} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-5">
        <div className="font-display text-3xl font-bold tabular-nums tracking-tight">{display}</div>
        {description && (
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
