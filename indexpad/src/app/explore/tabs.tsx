import Link from "next/link";
import type { ExploreSort } from "@/lib/indexpad/explore-types";

type Tab = { id: ExploreSort; label: string };

export function ExploreTabs({
  active,
  tabs,
}: {
  active: ExploreSort;
  tabs: Tab[];
}) {
  return (
    <nav
      className="mt-8 flex gap-1 overflow-x-auto border-b border-line pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Index sorts"
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        const href = tab.id === "trending" ? "/explore" : `/explore?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`shrink-0 rounded-t-md px-3 py-2.5 text-[13px] transition-colors ${
              on
                ? "border-b-2 border-accent text-foreground"
                : "border-b-2 border-transparent text-muted hover:text-foreground/80"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
