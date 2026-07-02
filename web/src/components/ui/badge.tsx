import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-display transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-primary/15 text-primary border border-primary/20",
        secondary:   "bg-surface-raised text-muted-foreground border border-white/8",
        destructive: "bg-[hsl(var(--coral)/_0.15)] text-[hsl(var(--coral))] border border-[hsl(var(--coral)/_0.2)]",
        gold:        "bg-[hsl(var(--gold)/_0.15)] text-[hsl(var(--gold))] border border-[hsl(var(--gold)/_0.2)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
