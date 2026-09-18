"use client";

import { FeedRow } from "@/components/feed-row";
import type { FomoScanThesis } from "@/lib/types";

export function ThesisRow({
  item,
  index = 0,
  mascot = false,
}: {
  item: FomoScanThesis;
  index?: number;
  mascot?: boolean;
}) {
  return <FeedRow item={item} index={index} mascot={mascot} />;
}
