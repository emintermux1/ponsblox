import type { ReactNode } from "react";

import { PageFade } from "@/components/page-fade";

export default function Template({ children }: { children: ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
