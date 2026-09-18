import { PAGE_DESCRIPTION, SITE_ORIGIN, WORDMARK } from "@/components/watch/copy";
import { SpectatorFrame } from "@/components/watch/frame";

export default function Home() {
  return (
    <div className="loft-root">
      <h1 className="sr-only">
        {WORDMARK} at {new URL(SITE_ORIGIN).host}. {PAGE_DESCRIPTION}
      </h1>
      <SpectatorFrame />
      <div className="loft-grain" aria-hidden />
      <div className="loft-vignette" aria-hidden />
    </div>
  );
}
