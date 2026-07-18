import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold font-display transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-night shadow-glow hover:shadow-[0_0_28px_4px_hsl(162_100%_41%_/_0.45)] hover:brightness-110 active:scale-[0.98]",
        secondary:
          "bg-surface-raised border border-white/8 text-foreground hover:border-white/16 hover:bg-[hsl(224_30%_20%)] active:scale-[0.98]",
        outline:
          "border border-white/10 bg-transparent text-foreground hover:bg-surface-raised hover:border-white/16 active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
        destructive:
          "bg-coral/20 text-[hsl(var(--coral))] border border-[hsl(var(--coral))/30] hover:bg-coral/30 active:scale-[0.98]",
        accent:
          "bg-gradient-gold text-night shadow-glow-gold hover:shadow-[0_0_28px_4px_hsl(38_95%_55%_/_0.4)] hover:brightness-110 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-6 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
