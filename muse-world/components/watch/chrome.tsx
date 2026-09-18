"use client";

import { grokSignalLive } from "@/lib/world/mind-graph";
import type { RenderMode } from "@/lib/world/perf";
import type {
  CameraPreset,
  MuseId,
  WorldSnapshot,
} from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  ENTER_MIND,
  LEAVE_MIND,
  locationLabel,
  ROOM_PRESETS,
  WORDMARK,
} from "@/components/watch/copy";
import { lastSignal, useStreetSignal, type LastSignal } from "@/components/watch/signal";

export function SpectatorChrome({
  world,
  introLine,
  mode,
  onPreset,
  onSelect,
  onEnterMind,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onEnterMind: () => void;
}) {
  const street = useStreetSignal();
  const selected = world.selected ? world.muses[world.selected] : null;
  const signal = lastSignal(street, world.events);
  const grokLive = MUSE_IDS.some((id) => grokSignalLive(world.muses[id].mind));
  const caption = quietIntro(introLine);

  return (
    <div className="loft-chrome" data-chrome="spectator">
      <header className="loft-chrome-top">
        <Wordmark signal={signal} mode={mode} caption={caption} />
        <div className="loft-chrome-tools">
          <Locations camera={world.camera} onPreset={onPreset} />
          {selected ? (
            <MindButton mindOpen={world.mindOpen} onToggle={onEnterMind} />
          ) : null}
        </div>
      </header>
      <NameStrip
        selectedId={world.selected}
        grokLive={grokLive}
        onSelect={onSelect}
      />
      {selected ? (
        <p className="loft-selected-note">
          {selected.name}
          <span>{activityLine(selected.activity)}</span>
          {world.mindOpen ? <span>{selected.mind.action}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

function quietIntro(line: string | null): string | null {
  if (!line) {
    return null;
  }
  if (line.replace(/\s+/g, "").toLowerCase() === "museworld") {
    return null;
  }
  return line;
}

function museStripName(id: MuseId): string {
  switch (id) {
    case "scroller":
      return "Scroller";
    case "trader":
      return "Trader";
    case "chill":
      return "Chill";
    case "builder":
      return "Builder";
    default:
      return assertNever(id);
  }
}

function modeLabel(mode: RenderMode): string {
  switch (mode) {
    case "webgl":
      return "Loft";
    case "watch":
      return "Watch";
    default:
      return assertNever(mode);
  }
}

function signalMarkLabel(mark: LastSignal["mark"]): string {
  switch (mark) {
    case "REAL":
      return "live";
    case "SIM":
      return "sim";
    case "—":
      return "quiet";
    default:
      return assertNever(mark);
  }
}

function Wordmark({
  signal,
  mode,
  caption,
}: {
  signal: LastSignal;
  mode: RenderMode;
  caption: string | null;
}) {
  return (
    <div className="loft-wordmark-block">
      <p className="loft-wordmark">{WORDMARK} World</p>
      <p className="loft-signal">
        <span className={signalDotClass(signal.mark)} />
        {signalMarkLabel(signal.mark)}
        <span className="loft-signal-mode">{modeLabel(mode)}</span>
      </p>
      {caption ? <p className="loft-intro">{caption}</p> : null}
    </div>
  );
}

function signalDotClass(mark: LastSignal["mark"]): string {
  switch (mark) {
    case "REAL":
      return "loft-dot loft-dot-live";
    case "SIM":
      return "loft-dot loft-dot-sim";
    case "—":
      return "loft-dot";
    default:
      return assertNever(mark);
  }
}

function Locations({
  camera,
  onPreset,
}: {
  camera: CameraPreset;
  onPreset: (preset: CameraPreset) => void;
}) {
  return (
    <nav className="loft-locations" aria-label="Rooms">
      {ROOM_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onPreset(preset)}
          data-active={camera === preset}
        >
          {locationLabel(preset)}
        </button>
      ))}
    </nav>
  );
}

function NameStrip({
  selectedId,
  grokLive,
  onSelect,
}: {
  selectedId: MuseId | null;
  grokLive: boolean;
  onSelect: (id: MuseId | null) => void;
}) {
  return (
    <nav className="loft-strip" aria-label="Muses">
      {MUSE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          data-active={selectedId === id}
        >
          {museStripName(id)}
        </button>
      ))}
      <span className="loft-strip-grok" data-live={grokLive}>
        Grok
      </span>
    </nav>
  );
}

function MindButton({
  mindOpen,
  onToggle,
}: {
  mindOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="loft-mind-btn" onClick={onToggle}>
      {mindOpen ? LEAVE_MIND : ENTER_MIND}
    </button>
  );
}
