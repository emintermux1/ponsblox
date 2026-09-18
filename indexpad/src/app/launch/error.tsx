"use client";

import { RouteError } from "@/components/route-shell";

export default function ErrorBoundary({
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  return <RouteError onRetry={retry ?? reset} />;
}
