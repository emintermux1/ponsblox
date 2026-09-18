"use client";

import Image from "next/image";

import { TokenIcon } from "@/components/token-icon";
import { BRAND } from "@/lib/brand";
import { proxiedImage } from "@/lib/media";
import { museIdentity } from "@/lib/muse-identity";

const SIZES = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-9 w-9 text-[10px]",
  lg: "h-12 w-12 text-xs",
  xl: "h-16 w-16 text-sm",
} as const;

export function Pfp({
  src,
  name,
  handle,
  agentId,
  size = "md",
  mascot = true,
  kind = "human",
}: {
  src?: string | null;
  name?: string | null;
  handle?: string | null;
  agentId?: string | null;
  size?: keyof typeof SIZES;
  mascot?: boolean;
  kind?: "human" | "agent" | "token";
}) {
  if (kind === "token") {
    const tokenSize = size === "sm" ? "sm" : size === "lg" || size === "xl" ? "lg" : "md";
    return <TokenIcon src={src} symbol={name ?? handle} mint={agentId} size={tokenSize} />;
  }

  const identity = kind === "agent" ? museIdentity(agentId ?? handle ?? name) : null;
  const image = kind === "agent" ? null : proxiedImage(src);
  const box = SIZES[size];
  const ring = kind === "agent" ? "mf-pfp-agent" : "mf-pfp-human";
  const cutout = identity?.src ?? (mascot ? BRAND.mark : BRAND.wave);

  return (
    <span className={`mf-pfp relative inline-flex ${box} ${ring} shrink-0 overflow-hidden rounded-full bg-card`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      ) : (
        <Image
          src={cutout}
          alt=""
          fill
          sizes="64px"
          className="mf-cutout bg-transparent object-contain p-[8%]"
        />
      )}
    </span>
  );
}
