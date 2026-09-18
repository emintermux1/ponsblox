"use client";

import { CAST, GROK_NAME, grokPresence } from "@/lib/world/cast";
import { inspectCopy } from "@/lib/world/pick";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, ScreenId, WorldSnapshot } from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  hudMark,
  LEAVE_MIND,
  locationLabel,
  MIND_HINT,
  ROOM_PRESETS,
  WORDMARK,
  WORLD_MARK,
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
  const grokMark = grokLive ? "LIVE" : "SIM";
  const inspect = world.inspecting ? inspectCopy(world, world.inspecting) : null;
  const caption = compact ? null : quietIntro(introLine);

  return (
    <div className="loft-chrome" data-chrome="spectator" data-entry-veil="off">
      <header className="loft-chrome-top">
        <Wordmark signal={signal} mark={mark} mode={mode} caption={caption} />
        <div className="loft-chrome-tools">
          <Locations camera={world.camera} onPreset={onPreset} />
          {selected ? <MindButton mindOpen={world.mindOpen} onToggle={onEnterMind} /> : null}
        </div>
      </header>
      <NameStrip
        world={world}
        selectedId={world.selected}
        grokLive={grokLive}
        grokMark={grokMark}
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
          <span>
            {world.grokWake.phase === "waking" ? "waking" : world.grokWake.honesty ?? grokMark}
          </span>
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

function modeLabel(mode: RenderMode): string {
  switch (mode) {
    case "webgl":
      return "LOFT";
    case "watch":
      return "WATCH";
    default:
      return assertNever(mode);
  }
}

function Wordmark({
  signal,
  mark,
  mode,
  caption,
}: {
  signal: LastSignal;
  mark: "REAL" | "SIM";
  mode: RenderMode;
  caption: string | null;
}) {
  return (
    <div className="loft-wordmark-block">
      <p className="loft-wordmark">{WORDMARK}</p>
      <p className="loft-world-mark">{WORLD_MARK}</p>
      <p className="loft-signal">
        <span className={signalDotClass(mark)} />
        {mark}
        <span className="loft-signal-mode">{modeLabel(mode)}</span>
      </p>
      {caption ? <p className="loft-intro">{caption}</p> : null}
      {signal.line && signal.mark !== "—" ? (
        <p className="loft-intro">{signal.line}</p>
      ) : null}
    </div>
  );
}

function signalDotClass(mark: "REAL" | "SIM"): string {
  switch (mark) {
    case "REAL":
      return "loft-dot loft-dot-live";
    case "SIM":
      return "loft-dot loft-dot-sim";
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
  world,
  selectedId,
  grokLive,
  grokMark,
  grokActive,
  onSelect,
  onGrok,
}: {
  world: WorldSnapshot;
  selectedId: MuseId | null;
  grokLive: boolean;
  grokMark: "LIVE" | "SIM";
  grokActive: boolean;
  onSelect: (id: MuseId | null) => void;
  onGrok: () => void;
}) {
  return (
    <nav className="loft-strip" aria-label="Muses">
      {MUSE_IDS.map((id) => {
        const muse = world.muses[id];
        return (
          <button
            key={id}
            type="button"
            data-muse-chip={id}
            onClick={() => onSelect(id)}
            data-active={selectedId === id}
          >
            <span className="loft-strip-name">{CAST[id].name}</span>
            <span className="loft-strip-activity">{activityLine(muse.activity)}</span>
          </button>
        );
      })}
      <button
        type="button"
        className="loft-strip-grok"
        data-live={grokLive}
        data-active={grokActive}
        aria-label={`${GROK_NAME} ${grokMark}`}
        onClick={onGrok}
      >
        <span className="loft-strip-name">{GROK_NAME}</span>
        <span className="loft-strip-activity">{grokMark}</span>
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
      {mindOpen ? LEAVE_MIND : MIND_HINT}
    </button>
  );
}
