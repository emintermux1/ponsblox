import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ivory placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
