import { after } from "next/server";

/** Kick trending refresh after HTML is sent. Never run it on the paint path. */
export function scheduleTrendRefresh() {
  try {
    after(() => {
      void loadTrendRefresh();
    });
  } catch {
    // after() is unavailable outside a request — do not start fetches here.
  }
}

async function loadTrendRefresh() {
  try {
    // Isolated from first-paint imports so a discovery/db throw cannot blank the page.
    const { refreshTrendingPublic } = await import("@/lib/discovery");
    refreshTrendingPublic();
  } catch {
    return;
  }
}
