import gsap from "gsap";
import { PerspectiveCamera, Vector3, type Camera } from "three";
import { GROK_ORB_POS } from "@/lib/world/layout";
import type { CameraPreset, MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

export type Shot = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type ShotProxy = {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
};

export const CINEMA_EASE = "power2.inOut";

export const INTRO_COPY_AT_MS = [0, 3200, 7000] as const;
export const INTRO_CLEAR_MS = 10_800;
export const INTRO_HOLD_S = 0.28;
export const INTRO_SETTLE_S = 0.4;
export const INTRO_LEG_S = 3.05;

export const INTRO_SHOTS: Shot[] = [
  { position: [1.1, 3.15, 11.4], target: [0.15, 1.25, 0.35], fov: 36 },
  { position: [-1.4, 2.4, 8.2], target: [-3.2, 1.1, 1.2], fov: 36 },
  { position: [6.8, 2.6, 6.4], target: [3.2, 1.15, -0.2], fov: 34 },
  { position: [2.4, 4.6, 9.8], target: [0.4, 1.2, 1.2], fov: 40 },
];

const FOLLOW_LAMBDA = {
  position: 1.12,
  target: 1.28,
  fov: 1.02,
} as const;

let cinemaArmed = false;

export function armCinema(): void {
  if (cinemaArmed) {
    return;
  }
  cinemaArmed = true;
  gsap.ticker.lagSmoothing(1000, 33);
}

function lookAtMuse(
  position: [number, number, number],
  fallback: [number, number, number],
  musePos: [number, number, number] | null,
  fov: number,
): Shot {
  const [x, y, z] = musePos ?? fallback;
  return {
    position,
    target: [x, y + 0.36, z],
    fov,
  };
}

export function shotForPreset(
  preset: CameraPreset,
  _selected: MuseId | null,
  musePos: [number, number, number] | null,
): Shot {
  switch (preset) {
    case "LOUNGE":
      return lookAtMuse([-6.2, 2.5, 7.1], [-3.2, 0.54, 1.6], musePos, 38);
    case "SCROLLER":
      return lookAtMuse([-6.4, 1.9, 3.8], [-4.1, 0.59, 1.15], musePos, 32);
    case "TRADER":
      return lookAtMuse([6.6, 2.1, 3.4], [3.35, 0.69, -0.2], musePos, 32);
    case "BUILDER":
      return lookAtMuse([3.8, 2.2, 6.2], [6.3, 0.74, 2.8], musePos, 34);
    case "GROK":
      return {
        position: [2.05, 2.08, 4.85],
        target: [GROK_ORB_POS[0], GROK_ORB_POS[1], GROK_ORB_POS[2]],
        fov: 30,
      };
    case "MIND": {
      const [x, y, z] = musePos ?? [0, 1, 0];
      return { position: [x + 1.6, y + 1.72, z + 2.55], target: [x, y + 1.08, z], fov: 32 };
    }
    case "ROOM":
      return { position: [2.4, 4.6, 9.8], target: [0.4, 1.2, 1.2], fov: 40 };
    default:
      return assertNever(preset);
  }
}

export function presetForMuse(id: MuseId): CameraPreset {
  switch (id) {
    case "scroller":
      return "SCROLLER";
    case "trader":
      return "TRADER";
    case "chill":
      return "LOUNGE";
    case "builder":
      return "BUILDER";
    default:
      return assertNever(id);
  }
}

export function flattenShot(shot: Shot): ShotProxy {
  return {
    px: shot.position[0],
    py: shot.position[1],
    pz: shot.position[2],
    tx: shot.target[0],
    ty: shot.target[1],
    tz: shot.target[2],
    fov: shot.fov,
  };
}

export function proxyFromCamera(camera: Camera, fallback: Shot): ShotProxy {
  const dir = new Vector3();
  camera.getWorldDirection(dir);
  const aim = Math.max(
    1,
    Math.hypot(
      fallback.target[0] - camera.position.x,
      fallback.target[1] - camera.position.y,
      fallback.target[2] - camera.position.z,
    ),
  );
  return {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: camera.position.x + dir.x * aim,
    ty: camera.position.y + dir.y * aim,
    tz: camera.position.z + dir.z * aim,
    fov: camera instanceof PerspectiveCamera ? camera.fov : fallback.fov,
  };
}

export function readShot(proxy: ShotProxy): Shot {
  return {
    position: [proxy.px, proxy.py, proxy.pz],
    target: [proxy.tx, proxy.ty, proxy.tz],
    fov: proxy.fov,
  };
}

export function shotDistance(from: Shot, to: Shot): number {
  const pos = Math.hypot(
    to.position[0] - from.position[0],
    to.position[1] - from.position[1],
    to.position[2] - from.position[2],
  );
  const look = Math.hypot(
    to.target[0] - from.target[0],
    to.target[1] - from.target[1],
    to.target[2] - from.target[2],
  );
  return pos + look * 0.55 + Math.abs(to.fov - from.fov) * 0.04;
}

export function cinematicDuration(from: Shot, to: Shot): number {
  const distance = shotDistance(from, to);
  return Math.min(6.8, Math.max(1.65, 1.85 + distance * 0.26));
}

export function introLegDuration(from: Shot, to: Shot): number {
  return Math.min(INTRO_LEG_S + 0.2, Math.max(INTRO_LEG_S - 0.2, cinematicDuration(from, to) * 0.7));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function cinemaDt(dt: number): number {
  return Math.min(Math.max(dt, 0), 1 / 24);
}

export function dampShot(proxy: ShotProxy, to: Shot, dt: number): void {
  const step = cinemaDt(dt);
  proxy.px = damp(proxy.px, to.position[0], FOLLOW_LAMBDA.position, step);
  proxy.py = damp(proxy.py, to.position[1], FOLLOW_LAMBDA.position, step);
  proxy.pz = damp(proxy.pz, to.position[2], FOLLOW_LAMBDA.position, step);
  proxy.tx = damp(proxy.tx, to.target[0], FOLLOW_LAMBDA.target, step);
  proxy.ty = damp(proxy.ty, to.target[1], FOLLOW_LAMBDA.target, step);
  proxy.tz = damp(proxy.tz, to.target[2], FOLLOW_LAMBDA.target, step);
  proxy.fov = damp(proxy.fov, to.fov, FOLLOW_LAMBDA.fov, step);
}

export function applyProxyToCamera(camera: Camera, proxy: ShotProxy): void {
  camera.position.set(proxy.px, proxy.py, proxy.pz);
  camera.lookAt(proxy.tx, proxy.ty, proxy.tz);
  if (camera instanceof PerspectiveCamera) {
    camera.fov = proxy.fov;
    camera.updateProjectionMatrix();
  }
}

export function tweenShot(
  proxy: ShotProxy,
  to: Shot,
  extras?: gsap.TweenVars,
): gsap.core.Tween {
  armCinema();
  const from = readShot(proxy);
  const { duration: requested, ...rest } = extras ?? {};
  const duration =
    typeof requested === "number"
      ? Math.max(1.65, requested)
      : cinematicDuration(from, to);
  return gsap.to(proxy, {
    ...flattenShot(to),
    ...rest,
    duration,
    ease: rest.ease ?? CINEMA_EASE,
    overwrite: rest.overwrite ?? "auto",
  });
}

export function playIntro(
  proxy: ShotProxy,
  onComplete: () => void,
): gsap.core.Timeline {
  armCinema();
  const tl = gsap.timeline({ onComplete });
  const start = readShot(proxy);
  if (shotDistance(start, INTRO_SHOTS[0]) > 0.05) {
    tl.to(proxy, {
      ...flattenShot(INTRO_SHOTS[0]),
      duration: Math.min(1.2, cinematicDuration(start, INTRO_SHOTS[0])),
      ease: CINEMA_EASE,
    });
  }
  for (let i = 1; i < INTRO_SHOTS.length; i++) {
    const prev = INTRO_SHOTS[i - 1];
    const next = INTRO_SHOTS[i];
    tl.to(proxy, {
      ...flattenShot(next),
      duration: introLegDuration(prev, next),
      ease: CINEMA_EASE,
    });
    if (i < INTRO_SHOTS.length - 1) {
      tl.to({}, { duration: INTRO_HOLD_S });
    }
  }
  tl.to({}, { duration: INTRO_SETTLE_S });
  return tl;
}
