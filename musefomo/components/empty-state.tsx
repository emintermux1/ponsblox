import Image from "next/image";
import type { ReactNode } from "react";

import { BRAND } from "@/lib/brand";
import { assertNever } from "@/lib/never";

export type Pose = "jump" | "laptop" | "hoodie" | "coffee";

function poseSrc(pose: Pose): string {
  switch (pose) {
    case "jump":
      return BRAND.empty;
    case "laptop":
      return BRAND.laptop;
    case "hoodie":
      return BRAND.hoodie;
    case "coffee":
      return BRAND.coffee;
    default:
      return assertNever(pose);
  }
}

export function EmptyState({
  title,
  body,
  pose,
  src,
  action,
}: {
  title: string;
  body: string;
  pose?: Pose;
  src?: string;
  action?: ReactNode;
}) {
  const mark = src ?? (pose ? poseSrc(pose) : null);
  return (
    <div className="mf-empty px-4 py-6" data-kind="empty">
      <p className="mf-kicker">Empty</p>
      {mark ? (
        <div className="mf-cutout-wrap mt-3 mb-2 flex h-12 w-12 items-center justify-center">
          <Image
            src={mark}
            alt=""
            width={48}
            height={48}
            className="mf-mark mf-cutout h-12 w-12 bg-transparent object-contain object-center"
          />
        </div>
      ) : null}
      <h2 className="mt-2 text-[15px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-md text-[12px] leading-5 text-mute">{body}</p>
      {action ? <div className="mt-3.5">{action}</div> : null}
    </div>
  );
}
