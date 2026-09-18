"use client";

import { CAST, GROK_NAME, grokPresence } from "@/lib/world/cast";
import { ASK_GROK, grokCompanyLine, grokSupportCaption } from "@/lib/world/grok-watch";
import { inspectCopy } from "@/lib/world/pick";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, ScreenId, WorldSnapshot } from "@/types/world";
import { assertNever, MUSE_IDS } from "@/types/world";
import {
  activityLine,
  grokHonestyMark,
  hudMark,
  LEAVE_MIND,
  MIND_HINT,
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
  onWakeGrok,
}: {
  world: WorldSnapshot;
  introLine: string | null;
  mode: RenderMode;
  compact?: boolean;
  onPreset: (preset: CameraPreset) => void;
  onSelect: (id: MuseId | null) => void;
  onInspect: (id: ScreenId | null) => void;
  onEnterMind: () => void;
  onWakeGrok: () => void;
}) {
  const street = useStreetSignal();
  const selected = world.selected ? world.muses[world.selected] : null;
  const signal = lastSignal(street, world.events);
  const mark = hudMark(signal.mark);
  const grokMark = grokHonestyMark(world.events);
  const grokLive =
    grokPresence(world.events) === "LIVE" || world.grokWake.honesty === "REAL";
  const caption = compact ? null : quietIntro(introLine);
  const inspect = world.inspecting ? inspectCopy(world, world.inspecting) : null;
  const company = grokCompanyLine(world);

  return (
    <div
      className="loft-chrome"
      data-chrome="spectator"
      data-chrome-compact={compact ? "true" : "false"}
      data-entry-veil="off"
    >
      <header className="loft-chrome-top">
        <Wordmark mark={mark} grokMark={grokMark} mode={mode} caption={caption} />
        <div className="loft-chrome-tools">
          <Locations camera={world.camera} onPreset={onPreset} />
          {selected ? <MindButton mindOpen={world.mindOpen} onToggle={onEnterMind} /> : null}
        </div>
      </header>
      <NameStrip
        selectedId={world.selected}
        grokLive={grokLive}
        grokMark={grokMark}
        grokActive={world.camera === "GROK" || world.grokWake.phase !== "idle"}
        onSelect={onSelect}
        onGrok={onWakeGrok}
      />
      <AskGrok world={world} onWake={onWakeGrok} />
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
          {company ? <span>{company}</span> : null}
        </p>
      ) : world.camera === "GROK" || world.grokWake.phase !== "idle" ? (
        <p className="loft-selected-note">
          {GROK_NAME}
          <span>{world.grokWake.phase === "waking" ? "waking" : world.grokWake.honesty ?? "SIM"}</span>
          {company ? <span>{company}</span> : null}
        </p>
      ) : company ? (
        <p className="loft-selected-note">{company}</p>
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
      return "Loft";
    case "watch":
      return "Watch";
    default:
      return assertNever(mode);
  }
}

function Wordmark({
  mark,
  grokMark,
  mode,
  caption,
}: {
  mark: "REAL" | "SIM";
  grokMark: "GROK LIVE" | "SIM";
  mode: RenderMode;
  caption: string | null;
}) {
  return (
    <div className="loft-wordmark-block">
      <p className="loft-wordmark">{WORDMARK}</p>
      <p className="loft-signal">
        <span className={signalDotClass(mark)} data-hud-mark={mark} />
        {mark}
        <span className="loft-signal-mode">{modeLabel(mode)}</span>
        <span className="loft-world-mark">{grokMark}</span>
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
  grokMark,
  grokActive,
  onSelect,
  onGrok,
}: {
  selectedId: MuseId | null;
  grokLive: boolean;
  grokMark: "GROK LIVE" | "SIM";
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
          <span>{CAST[id].name}</span>
          <span className="loft-strip-role">{CAST[id].role}</span>
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
        <span>Grok</span>
        <span className="loft-strip-role">{grokMark}</span>
      </button>
    </nav>
  );
}

function AskGrok({
  world,
  onWake,
}: {
  world: WorldSnapshot;
  onWake: () => void;
}) {
  return (
    <div className="loft-ask-grok">
      <button type="button" onClick={onWake}>
        {ASK_GROK}
      </button>
      <p>{grokSupportCaption(world)}</p>
    </div>
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
