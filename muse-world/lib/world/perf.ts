import type { CameraPreset } from "@/types/world";
import { assertNever } from "@/types/world";

export type PerfTier = "desktop" | "tablet" | "phone";
export type RenderMode = "webgl" | "watch";
export type FramePolicy = "always" | "demand" | "never";
export type CityLod = "dense" | "sparse";
export type GlassQuality = "physical" | "standard";
export type PowerPref = "high-performance" | "low-power";

export type PerfSignals = {
  width: number;
  height: number;
  hidden: boolean;
  reducedMotion: boolean;
  webgl: boolean;
  coarse: boolean;
  saveData: boolean;
};

export type PerfBudget = {
  tier: PerfTier;
  mode: RenderMode;
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: 512 | 1024;
  extraLights: boolean;
  contactShadows: boolean;
  glass: GlassQuality;
  cityCount: number;
  cityLod: CityLod;
  htmlThoughts: boolean;
  frameloop: FramePolicy;
  pauseExtras: boolean;
  reducedMotion: boolean;
  hidden: boolean;
  cameraFar: number;
  thoughtDistance: number;
  powerPreference: PowerPref;
};

/** Hard caps — never let the loft push past these. */
export const PERF_BUDGET = {
  dprDesktop: 1.5,
  dprTablet: 1.15,
  dprPhone: 1,
  phoneWidth: 768,
  watchWidth: 900,
  tabletWidth: 1100,
  cityDesktop: 36,
  cityTablet: 14,
  shadowDesktop: 1024 as const,
  shadowTablet: 512 as const,
  farDesktop: 72,
  farTablet: 46,
  thoughtDesktop: 16,
  thoughtTablet: 11,
  tickMs: 900,
} as const;

export const FIRST_PAINT_SIGNALS: PerfSignals = {
  width: 1280,
  height: 800,
  hidden: false,
  reducedMotion: false,
  webgl: false,
  coarse: false,
  saveData: false,
};

let webglProbe: boolean | null = null;

export function probeWebGL(): boolean {
  if (webglProbe !== null) {
    return webglProbe;
  }
  if (typeof document === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false });
    if (!gl) {
      webglProbe = false;
      return false;
    }
    webglProbe = true;
    return true;
  } catch {
    webglProbe = false;
    return false;
  }
}

export function readPerfSignals(): PerfSignals {
  if (typeof window === "undefined") {
    return FIRST_PAINT_SIGNALS;
  }
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    hidden: document.visibilityState === "hidden",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: probeWebGL(),
    coarse: window.matchMedia("(pointer: coarse)").matches,
    saveData: Boolean(connection?.saveData),
  };
}

export function tierFromSignals(signals: PerfSignals): PerfTier {
  if (signals.width < PERF_BUDGET.phoneWidth) {
    return "phone";
  }
  if (signals.width < PERF_BUDGET.tabletWidth) {
    return "tablet";
  }
  return "desktop";
}

export function shouldWatch(signals: PerfSignals, webglLost: boolean): boolean {
  if (webglLost || !signals.webgl) {
    return true;
  }
  if (signals.width < PERF_BUDGET.phoneWidth) {
    return true;
  }
  if (signals.coarse && signals.width < PERF_BUDGET.watchWidth) {
    return true;
  }
  if (signals.saveData && signals.coarse) {
    return true;
  }
  return false;
}

function dprFor(tier: PerfTier, reducedMotion: boolean): [number, number] {
  switch (tier) {
    case "desktop":
      return [1, reducedMotion ? 1.25 : PERF_BUDGET.dprDesktop];
    case "tablet":
      return [1, reducedMotion ? 1 : PERF_BUDGET.dprTablet];
    case "phone":
      return [1, PERF_BUDGET.dprPhone];
    default:
      return assertNever(tier);
  }
}

function framePolicy(hidden: boolean, reducedMotion: boolean): FramePolicy {
  if (hidden) {
    return "never";
  }
  if (reducedMotion) {
    return "demand";
  }
  return "always";
}

export function budgetFromSignals(
  signals: PerfSignals,
  options: { webglLost?: boolean } = {},
): PerfBudget {
  const tier = tierFromSignals(signals);
  const watch = shouldWatch(signals, Boolean(options.webglLost));
  const pauseExtras = signals.hidden || signals.reducedMotion || watch;
  const compact = tier !== "desktop";

  switch (tier) {
    case "desktop":
    case "tablet":
    case "phone":
      break;
    default:
      return assertNever(tier);
  }

  const budget: PerfBudget = {
    tier,
    mode: watch ? "watch" : "webgl",
    dpr: dprFor(tier, signals.reducedMotion),
    antialias: !compact && !signals.reducedMotion,
    shadows: !watch && tier === "desktop" && !signals.reducedMotion,
    shadowMapSize: compact ? PERF_BUDGET.shadowTablet : PERF_BUDGET.shadowDesktop,
    extraLights: !watch && tier === "desktop" && !pauseExtras,
    contactShadows: !watch && tier === "desktop" && !pauseExtras,
    glass: !watch && tier === "desktop" && !signals.reducedMotion ? "physical" : "standard",
    cityCount: watch
      ? 0
      : tier === "desktop"
        ? PERF_BUDGET.cityDesktop
        : PERF_BUDGET.cityTablet,
    cityLod: tier === "desktop" ? "dense" : "sparse",
    htmlThoughts: !watch && !signals.hidden && (tier === "desktop" || !signals.reducedMotion),
    frameloop: watch ? "never" : framePolicy(signals.hidden, signals.reducedMotion),
    pauseExtras,
    reducedMotion: signals.reducedMotion,
    hidden: signals.hidden,
    cameraFar: compact ? PERF_BUDGET.farTablet : PERF_BUDGET.farDesktop,
    thoughtDistance: compact ? PERF_BUDGET.thoughtTablet : PERF_BUDGET.thoughtDesktop,
    powerPreference: tier === "desktop" ? "high-performance" : "low-power",
  };
  assertPerfCaps(budget);
  return budget;
}

export const FIRST_PAINT_BUDGET = budgetFromSignals(FIRST_PAINT_SIGNALS);

export function projectLoft(position: readonly [number, number, number]): {
  left: number;
  top: number;
} {
  const left = 8 + ((position[0] + 9) / 18) * 84;
  const top = 24 + ((position[2] + 4.6) / 11) * 52;
  return {
    left: Math.min(96, Math.max(4, left)),
    top: Math.min(84, Math.max(16, top)),
  };
}

export function watchFrame(preset: CameraPreset): {
  x: number;
  y: number;
  scale: number;
} {
  switch (preset) {
    case "ROOM":
      return { x: 0, y: 0, scale: 1 };
    case "LOUNGE":
      return { x: 16, y: -4, scale: 1.32 };
    case "SCROLLER":
      return { x: 20, y: 2, scale: 1.4 };
    case "TRADER":
      return { x: -18, y: 6, scale: 1.36 };
    case "BUILDER":
      return { x: -24, y: -2, scale: 1.34 };
    case "GROK":
      return { x: 0, y: 4, scale: 1.28 };
    case "MIND":
      return { x: 0, y: 8, scale: 1.48 };
    default:
      return assertNever(preset);
  }
}

export function assertPerfCaps(budget: PerfBudget): void {
  if (budget.dpr[1] > PERF_BUDGET.dprDesktop) {
    throw new Error("DPR over desktop cap");
  }
  if (budget.cityCount > PERF_BUDGET.cityDesktop) {
    throw new Error("city instances over cap");
  }
}
