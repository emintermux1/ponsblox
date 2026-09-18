import { MuseWorld } from "@/components/world/muse-world";

export default function Home() {
  return (
    <div className="loft-root">
      <h1 className="sr-only">
        Muse World. A living penthouse. Four muses. You watch.
      </h1>
      <MuseWorld />
      <div className="loft-grain" aria-hidden />
      <div className="loft-vignette" aria-hidden />
    </div>
  );
}
