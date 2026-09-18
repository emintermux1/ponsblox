"use client";

import { GROK_NAME, grokPresence } from "@/lib/world/cast";
import { inspectCopy } from "@/lib/world/pick";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, ScreenId, WorldSnapshot } from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  ENTER_MIND,
  hudMark,
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
  compact = false,
  onPreset,
  onSelect,
  onInspect,
  onEnterMind,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  compact?: boolean;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onInspect: (id: ScreenId | null) => void;
  onEnterMind: () => void;
}) {
  const street = useStreetSignal();
  const selected = world.selected ? world.muses[world.selected] : null;
  const signal = lastSignal(street, world.events);
  const mark = hudMark(signal.mark);
  const grokLive = grokPresence(world.events) === "LIVE";
  const caption = compact ? null : quietIntro(introLine);
  const inspect = world.inspecting ? inspectCopy(world, world.inspecting) : null;

  return (
    <div
      className="loft-chrome"
      data-chrome="spectator"
      data-chrome-compact={compact ? "true" : "false"}
      data-entry-veil="off"
    >
      <header className="loft-chrome-top">
        <Wordmark mark={mark} signal={signal} mode={mode} caption={caption} />
        <div className="loft-chrome-tools">
          <Locations camera={world.camera} onPreset={onPreset} />
          {selected ? <MindButton mindOpen={world.mindOpen} onToggle={onEnterMind} /> : null}
        </div>
      </header>
      <NameStrip
        selectedId={world.selected}
        grokLive={grokLive}
        grokActive={world.camera === "GROK" || world.grokWake.phase !== "idle"}
        onSelect={onSelect}
        onGrok={() => onPreset("GROK")}
      />
      {inspect ? (
        <p className="loft-selected-note">
          {inspect.title}
          {inspect.lines.slice(0, 1).map((line) => (
            <span key={line}>{line}</span>
          ))}
          <button type="button" onClick={() => onInspect(null)}>
            close
          </button>
        </p>
      ) : selected ? (
        <p className="loft-selected-note">
          {selected.name}
          <span>{activityLine(selected.activity)}</span>
          {world.mindOpen ? <span>{selected.mind.action}</span> : null}
        </p>
      ) : world.camera === "GROK" || world.grokWake.phase !== "idle" ? (
        <p className="loft-selected-note">
          {GROK_NAME}
          <span>{world.grokWake.phase === "waking" ? "waking" : world.grokWake.honesty ?? ""}</span>
        </p>
      ) : null}
    </div>
  );
}

function quietIntro(line: string | null): string | null {
  if (!line) {
    return null;
  }
  const packed = line.replace(/\s+/g, "").toLowerCase();
  if (packed === "museworld" || packed === "musegrok") {
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
  mark,
  signal,
  mode,
  caption,
}: {
  mark: "REAL" | "SIM";
  signal: LastSignal;
  mode: RenderMode;
  caption: string | null;
}) {
  return (
    <div className="loft-wordmark-block">
      <p className="loft-wordmark">{WORDMARK}</p>
      <p className="loft-signal">
        <span className={signalDotClass(signal.mark)} data-hud-mark={mark} />
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
  grokActive,
  onSelect,
  onGrok,
}: {
  selectedId: MuseId | null;
  grokLive: boolean;
  grokActive: boolean;
  onSelect: (id: MuseId | null) => void;
  onGrok: () => void;
}) {
  return (
    <nav className="loft-strip" aria-label="Muses">
      {MUSE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          data-muse-chip={id}
          onClick={() => onSelect(id)}
          data-active={selectedId === id}
        >
          {museStripName(id)}
        </button>
      ))}
      <button
        type="button"
        className="loft-strip-grok"
        data-live={grokLive}
        data-active={grokActive}
        aria-label={GROK_NAME}
        onClick={onGrok}
      >
        Grok
      </button>
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
