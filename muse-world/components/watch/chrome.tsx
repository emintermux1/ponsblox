"use client";

import { CAST, GROK_NAME, grokPresence } from "@/lib/world/cast";
import { grokCompanyLine } from "@/lib/world/grok-watch";
import { inspectCopy } from "@/components/watch/copy";
import type { RenderMode } from "@/lib/world/perf";
import type { CameraPreset, MuseId, ScreenId, WorldSnapshot } from "@/types/world";
import { MUSE_IDS } from "@/types/world";
import {
  activityLine,
  LEAVE_MIND,
  MIND_HINT,
  locationLabel,
  ROOM_PRESETS,
  WORDMARK,
} from "@/components/watch/copy";

export function SpectatorChrome({
  world,
  introLine,
  mode: _mode,
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
  const selected = world.selected ? world.muses[world.selected] : null;
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
        <div className="loft-wordmark-block">
          <p className="loft-wordmark">{WORDMARK}</p>
          {caption ? <p className="loft-intro">{caption}</p> : null}
        </div>
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
        onGrok={onWakeGrok}
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
          <span className="loft-strip-name">{CAST[id].name}</span>
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
        <span className="loft-strip-name">{GROK_NAME}</span>
        {grokLive ? <span className="loft-strip-role">live</span> : null}
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
