import type { Metadata } from "next";
import { MeDashboard } from "./me-dashboard";

export const metadata: Metadata = {
  title: "Desk",
  description:
    "Indexes you created, coins you launched, and indexes you saved.",
};

export default function MePage() {
  return <MeDashboard />;
}
