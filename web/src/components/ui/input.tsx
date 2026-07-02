import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-white/8 bg-night/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60",
        "transition-all duration-150",
        "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
        "hover:border-white/14",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
