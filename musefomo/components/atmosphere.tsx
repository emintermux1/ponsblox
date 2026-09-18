import type { ReactNode } from "react";

export function Atmosphere({
  kicker,
  title,
  children,
  src = "/brand/hero.jpg",
  compact = false,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
  src?: string;
  compact?: boolean;
}) {
  void src;
  void compact;
  return (
    <header className="border-b border-line px-3.5 py-3.5">
      <p className="mf-kicker">{kicker}</p>
      <h1 className="mf-display mt-1">{title}</h1>
      {children ? <div className="mt-1.5 max-w-xl text-[13px] leading-5 text-mute">{children}</div> : null}
    </header>
  );
}
