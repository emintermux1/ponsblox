import type { ReactNode } from "react";

export function PageFade({ children }: { children: ReactNode }) {
  return <div className="min-h-full min-w-0">{children}</div>;
}
