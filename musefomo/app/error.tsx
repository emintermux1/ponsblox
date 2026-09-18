"use client";

import { HomeFeedShell } from "@/components/home-feed-shell";
import { seedHomeMemes } from "@/lib/home-paint";

export default function AppError() {
  return <HomeFeedShell tab="for-you" tokens={seedHomeMemes()} thesisRows={[]} paint="error-cache" />;
}
