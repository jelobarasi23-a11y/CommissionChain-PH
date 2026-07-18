import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely, with later classes overriding earlier
 * conflicting ones. Standard shadcn/ui helper — every shadcn component
 * generated via `npx shadcn add ...` imports this.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
