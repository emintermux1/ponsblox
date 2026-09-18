import type { ReactNode } from "react";

export default function CreateLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col bg-desk text-ivory">{children}</div>;
}
