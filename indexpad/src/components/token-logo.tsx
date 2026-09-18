"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PALETTE = ["#c9a65a", "#3f9d6e", "#8b6b3d", "#c45c4a", "#6e8ea3", "#b07a4a", "#7d8a4a"];

export function tokenColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0];
}

export function TokenLogo({
  symbol,
  logo,
  color,
  layoutId,
  size = 40,
  className,
  ...props
}: {
  symbol: string;
  logo?: string | null;
  color?: string;
  layoutId?: string;
  size?: number;
} & Omit<HTMLMotionProps<"div">, "children">) {
  const [failed, setFailed] = useState(false);
  const fill = color || tokenColor(symbol);
  const mark = symbol.replace(/^\$/, "").slice(0, 3);

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-ivory/15 shadow-[0_0_0_1px_rgba(12,11,8,0.5)]",
        className,
      )}
      style={{ width: size, height: size, background: fill }}
      {...props}
    >
      {logo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center font-mono text-[0.62em] font-semibold tracking-tight text-[#0c0b08]">
          {mark}
        </span>
      )}
    </motion.div>
  );
}
