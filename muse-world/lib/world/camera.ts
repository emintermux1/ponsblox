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
export const INTRO_SETTLE_S = 0.28;
export const INTRO_LEG_S = 3.05;
export const INTRO_EASE_S = 1.8;
export const INTRO_FAILSAFE_MS = 4_000;
export const LOOK_ARRIVE_EPS = 0.08;

export const HOME_SHOT: Shot = {
  position: [2.4, 4.6, 9.8],
  target: [0.4, 1.2, 1.2],
  fov: 40,
};

export const INTRO_SHOTS: Shot[] = [
  { position: [1.1, 3.15, 11.4], target: [0.15, 1.25, 0.35], fov: 36 },
  HOME_SHOT,
];

/** Short look into the loft — phones skip the long cinema crawl. */
export const MOBILE_INTRO_SHOTS: Shot[] = [
  { position: [1.35, 3.4, 13.1], target: [0.45, 1.12, 0.9], fov: 50 },
  { position: [1.85, 3.55, 12.2], target: [0.7, 1.08, 1.2], fov: 52 },
];

export const NARROW_VIEWPORT = 768;

export const LOOK_CAM = {
  minDistance: 2.8,
  maxDistance: 22,
  minPolarAngle: 0.18,
  maxPolarAngle: Math.PI / 2 - 0.04,
  dampingFactor: 0.085,
  rotateSpeed: 0.86,
  zoomSpeed: 0.88,
  panSpeed: 0.72,
} as const;

export type LookLimits = {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  dampingFactor: number;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
};

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
        position: [6.55, 2.18, 2.42],
        target: [GROK_ORB_POS[0], GROK_ORB_POS[1], GROK_ORB_POS[2]],
        fov: 30,
      };
    case "MIND": {
      const [x, y, z] = musePos ?? [0, 1, 0];
      return { position: [x + 1.6, y + 1.72, z + 2.55], target: [x, y + 1.08, z], fov: 32 };
    }
    case "ROOM":
      return HOME_SHOT;
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

export function writeShot(proxy: ShotProxy, shot: Shot): void {
  proxy.px = shot.position[0];
  proxy.py = shot.position[1];
  proxy.pz = shot.position[2];
  proxy.tx = shot.target[0];
  proxy.ty = shot.target[1];
  proxy.tz = shot.target[2];
  proxy.fov = shot.fov;
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

export function shotSettled(from: Shot, to: Shot, epsilon = LOOK_ARRIVE_EPS): boolean {
  return shotDistance(from, to) < epsilon;
}

export function cinematicDuration(from: Shot, to: Shot): number {
  const distance = shotDistance(from, to);
  return Math.min(6.8, Math.max(1.65, 1.85 + distance * 0.26));
}

export function introLegDuration(from: Shot, to: Shot): number {
  return Math.min(INTRO_LEG_S + 0.2, Math.max(INTRO_LEG_S - 0.2, cinematicDuration(from, to) * 0.7));
}

export function introEaseDuration(from: Shot, to: Shot): number {
  return Math.min(INTRO_EASE_S, Math.max(1.05, cinematicDuration(from, to) * 0.42));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Clamp a resumed-tab spike so the look-cam cannot jump a room. */
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
      ? Math.max(0.7, requested)
      : cinematicDuration(from, to);
  return gsap.to(proxy, {
    ...flattenShot(to),
    ...rest,
    duration,
    ease: rest.ease ?? CINEMA_EASE,
    overwrite: rest.overwrite ?? "auto",
  });
}

export function isNarrowViewport(width: number, height = 844): boolean {
  return width < NARROW_VIEWPORT || height / Math.max(1, width) > 1.35;
}

export function introShotsFor(width: number, height = 844): Shot[] {
  return isNarrowViewport(width, height) ? MOBILE_INTRO_SHOTS : INTRO_SHOTS;
}

/** Keep the four muses in a portrait frame — vertical FOV alone is too tight. */
export function fitShotToViewport(shot: Shot, width: number, height: number): Shot {
  if (!isNarrowViewport(width, height)) {
    return shot;
  }
  const aspect = Math.max(0.42, width / Math.max(1, height));
  const extraFov = aspect < 0.62 ? 18 : 12;
  const pull = aspect < 0.62 ? 2.35 : 1.45;
  return {
    position: [shot.position[0] * 0.82, shot.position[1] + 0.18, shot.position[2] + pull],
    target: [shot.target[0] * 0.72, shot.target[1] + 0.02, shot.target[2]],
    fov: Math.min(64, shot.fov + extraFov),
  };
}

export function lookLimits(compact: boolean): LookLimits {
  if (!compact) {
    return LOOK_CAM;
  }
  return {
    minDistance: 5.4,
    maxDistance: 16.8,
    minPolarAngle: Math.PI * 0.3,
    maxPolarAngle: Math.PI * 0.5,
    dampingFactor: LOOK_CAM.dampingFactor,
    rotateSpeed: 0.78,
    zoomSpeed: LOOK_CAM.zoomSpeed,
    panSpeed: LOOK_CAM.panSpeed,
  };
}

export function playIntro(
  proxy: ShotProxy,
  onComplete: () => void,
  shots: Shot[] = INTRO_SHOTS,
): gsap.core.Timeline {
  armCinema();
  const path = shots.length > 0 ? shots : INTRO_SHOTS;
  const home = path[path.length - 1] ?? HOME_SHOT;
  const tl = gsap.timeline({ onComplete });
  const start = readShot(proxy);
  if (shotDistance(start, home) > 0.05) {
    tl.to(proxy, {
      ...flattenShot(home),
      duration: introEaseDuration(start, home),
      ease: CINEMA_EASE,
    });
  }
  tl.to({}, { duration: INTRO_SETTLE_S });
  return tl;
}
