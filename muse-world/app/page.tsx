import { SpectatorFrame } from "@/components/watch/frame";

export default function Home() {
  return (
    <div className="loft-root">
      <h1 className="sr-only">
        Muse Grok World. A living penthouse. Four muses, one Grok. You watch.
      </h1>
      <SpectatorFrame />
      <div className="loft-grain" aria-hidden />
      <div className="loft-vignette" aria-hidden />
    </div>
  );
}
