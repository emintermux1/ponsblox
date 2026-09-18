import type { ReactNode } from "react";

import { AgeGate } from "./age-gate";
import { AppNav } from "./app-nav";

export function Shell({
  aged,
  email,
  children,
}: {
  aged: boolean;
  email: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-fg">
      {!aged ? <AgeGate /> : null}
      <AppNav email={email} />
      <div className={`md:ml-60 ${aged ? "" : "pointer-events-none select-none"}`}>{children}</div>
    </div>
  );
}
