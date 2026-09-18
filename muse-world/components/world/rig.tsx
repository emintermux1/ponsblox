"use client";

import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MOUSE, TOUCH, PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { usePerf } from "@/components/world/perf-context";
import {
  applyProxyToCamera,
  dampShot,
  fitShotToViewport,
  flattenShot,
  HOME_SHOT,
  INTRO_FAILSAFE_MS,
  introShotsFor,
  lookLimits,
  playIntro,
  proxyFromCamera,
  readShot,
  shotForPreset,
  shotSettled,
  writeShot,
  type Shot,
  type ShotProxy,
} from "@/lib/world/camera";
import type { CameraPreset, MuseId } from "@/types/world";
import { assertNever } from "@/types/world";

type Drive =
  | { kind: "intro" }
  | { kind: "ease"; to: Shot }
  | { kind: "free" };

function syncLook(controls: OrbitControlsImpl | null, proxy: ShotProxy): void {
  if (!controls) {
    return;
  }
  controls.target.set(proxy.tx, proxy.ty, proxy.tz);
  controls.update();
}

export function CameraRig({
  preset,
  selected,
  musePos,
  introDone,
  onIntroDone,
}: {
  preset: CameraPreset;
  selected: MuseId | null;
  musePos: [number, number, number] | null;
  introDone: boolean;
  onIntroDone: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const { reducedMotion, hidden, cameraFar, tier } = usePerf();
  const compact = tier === "phone" || size.width < 768;
  const limits = lookLimits(compact);
  const fit = (shot: Shot): Shot => fitShotToViewport(shot, size.width, size.height);
  const home = (): Shot => fit(HOME_SHOT);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const startShot = fit(introShotsFor(size.width, size.height)[0] ?? HOME_SHOT);
  const proxy = useRef<ShotProxy>(flattenShot(introDone || reducedMotion ? home() : startShot));
  const drive = useRef<Drive>(introDone || reducedMotion ? { kind: "free" } : { kind: "intro" });
  const dragging = useRef(false);
  const skipPreset = useRef(true);
  const finished = useRef(introDone || reducedMotion);
  const musePosRef = useRef(musePos);
  const onIntroDoneRef = useRef(onIntroDone);
  const releaseRef = useRef<(fromCamera: boolean, finishIntro: boolean) => void>(() => undefined);
  const [lookFree, setLookFree] = useState(introDone || reducedMotion);

  useEffect(() => {
    musePosRef.current = musePos;
  }, [musePos]);

  useEffect(() => {
    onIntroDoneRef.current = onIntroDone;
  }, [onIntroDone]);

  releaseRef.current = (fromCamera, finishIntro) => {
    if (fromCamera) {
      proxy.current = proxyFromCamera(camera, home());
    }
    applyProxyToCamera(camera, proxy.current);
    const controls = controlsRef.current;
    if (controls) {
      controls.enabled = true;
      syncLook(controls, proxy.current);
    }
    drive.current = { kind: "free" };
    setLookFree(true);
    if (finishIntro && !finished.current) {
      finished.current = true;
      onIntroDoneRef.current();
    }
  };

  useEffect(() => {
    if (!reducedMotion) {
      return;
    }
    writeShot(proxy.current, home());
    applyProxyToCamera(camera, proxy.current);
    syncLook(controlsRef.current, proxy.current);
    drive.current = { kind: "free" };
    setLookFree(true);
    if (!introDone) {
      onIntroDone();
    }
  }, [camera, introDone, onIntroDone, reducedMotion, size.height, size.width]);

  useEffect(() => {
    if (introDone || reducedMotion) {
      return;
    }
    drive.current = { kind: "intro" };
    setLookFree(false);
    const shots = introShotsFor(size.width, size.height).map((shot) =>
      fitShotToViewport(shot, size.width, size.height),
    );
    const timeline = playIntro(
      proxy.current,
      () => {
        releaseRef.current(false, true);
      },
      shots,
    );
    const failSafe = window.setTimeout(() => {
      timeline.kill();
      releaseRef.current(false, true);
    }, compact ? INTRO_FAILSAFE_MS : INTRO_FAILSAFE_MS + 1_200);
    return () => {
      window.clearTimeout(failSafe);
      timeline.kill();
    };
  }, [compact, introDone, reducedMotion, size.height, size.width]);

  useEffect(() => {
    if (!introDone) {
      return;
    }
    if (skipPreset.current) {
      skipPreset.current = false;
      drive.current = { kind: "free" };
      setLookFree(true);
      syncLook(controlsRef.current, proxy.current);
      return;
    }
    const next = fit(shotForPreset(preset, selected, musePosRef.current));
    proxy.current = proxyFromCamera(camera, next);
    drive.current = { kind: "ease", to: next };
    setLookFree(true);
  }, [camera, introDone, preset, selected, size.height, size.width]);

  useEffect(() => {
    const el = gl.domElement;
    const onPointerDown = () => {
      const mode = drive.current;
      switch (mode.kind) {
        case "intro":
          releaseRef.current(true, true);
          return;
        case "ease":
          dragging.current = true;
          releaseRef.current(true, false);
          return;
        case "free":
          dragging.current = true;
          return;
        default:
          return assertNever(mode);
      }
    };
    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [gl]);

  useFrame((_, dt) => {
    if (hidden) {
      return;
    }
    if (camera instanceof PerspectiveCamera) {
      camera.far = cameraFar;
      camera.updateProjectionMatrix();
    }
    const mode = drive.current;
    switch (mode.kind) {
      case "intro":
        applyProxyToCamera(camera, proxy.current);
        return;
      case "ease": {
        if (dragging.current) {
          drive.current = { kind: "free" };
          return;
        }
        dampShot(proxy.current, mode.to, dt);
        applyProxyToCamera(camera, proxy.current);
        syncLook(controlsRef.current, proxy.current);
        if (shotSettled(readShot(proxy.current), mode.to)) {
          drive.current = { kind: "free" };
        }
        return;
      }
      case "free":
        return;
      default:
        return assertNever(mode);
    }
  });

  return (
    <OrbitControls
      ref={(node) => {
        controlsRef.current = node;
        if (node) {
          node.target.set(proxy.current.tx, proxy.current.ty, proxy.current.tz);
        }
      }}
      makeDefault
      enabled={lookFree && !hidden}
      enableDamping
      dampingFactor={limits.dampingFactor}
      enablePan={!compact}
      enableZoom
      enableRotate
      screenSpacePanning
      minDistance={limits.minDistance}
      maxDistance={limits.maxDistance}
      minPolarAngle={limits.minPolarAngle}
      maxPolarAngle={limits.maxPolarAngle}
      rotateSpeed={limits.rotateSpeed}
      zoomSpeed={limits.zoomSpeed}
      panSpeed={limits.panSpeed}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      touches={{
        ONE: TOUCH.ROTATE,
        TWO: TOUCH.DOLLY_PAN,
      }}
      onStart={() => {
        dragging.current = true;
        const mode = drive.current;
        switch (mode.kind) {
          case "intro":
            releaseRef.current(true, true);
            return;
          case "ease":
            releaseRef.current(true, false);
            return;
          case "free":
            return;
          default:
            return assertNever(mode);
        }
      }}
      onEnd={() => {
        dragging.current = false;
      }}
    />
  );
}
