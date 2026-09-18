import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Let’s Arc Admin",
  description: "Private launch control for @letslauncharc",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
