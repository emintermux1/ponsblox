"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-[#2b2924] text-[#f3ead8]",
  "bg-[#8a6d3a] text-[#f7f0e2]",
  "bg-[#3e5648] text-[#e8f0ea]",
  "bg-[#6e5346] text-[#f6eee6]",
  "bg-[#4a5560] text-[#eef1f4]",
  "bg-[#9a7b4f] text-[#fff8ea]",
  "bg-[#5a4a38] text-[#f4eadc]",
  "bg-[#2f4a3c] text-[#e6f2ea]",
];

function toneFor(symbol: string): string {
  let hash = 0;
  for (const ch of symbol) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length] ?? TONES[0];
}

export function tokenFill(symbol: string): string {
  const fills = [
    "#2b2924",
    "#8a6d3a",
    "#3e5648",
    "#6e5346",
    "#4a5560",
    "#9a7b4f",
    "#5a4a38",
    "#2f4a3c",
  ];
  let hash = 0;
  for (const ch of symbol) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return fills[hash % fills.length] ?? fills[0];
}

type TokenLogoProps = {
  symbol: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-11 text-[13px]",
  lg: "size-14 text-[15px]",
};

export function TokenLogo({ symbol, src, size = "md", className }: TokenLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = symbol.replace(/^\$/, "").slice(0, 3).toUpperCase();
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium tracking-wide shadow-[inset_0_0_0_1px_rgba(22,20,15,0.12)]",
        SIZES[size],
        !showImage && toneFor(symbol),
        className,
      )}
      aria-hidden={showImage}
    >
      {showImage ? (
        // External adapter URLs are not allowlisted — native img is intentional.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
