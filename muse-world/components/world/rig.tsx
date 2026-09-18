"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { usePerf } from "@/components/world/perf-context";
import {
  applyProxyToCamera,
  dampShot,
  INTRO_SHOTS,
  playIntro,
  PRESET_CUT_S,
  proxyFromCamera,
  shotForPreset,
  tweenShot,
  type ShotProxy,
} from "@/lib/world/camera";
import type { CameraPreset, MuseId } from "@/types/world";

export function CameraRig({
  preset,
  selected,
  musePos,
  museFacing,
  introDone,
  onIntroDone,
}: {
  preset: CameraPreset;
  selected: MuseId | null;
  musePos: [number, number, number] | null;
  museFacing: number;
  introDone: boolean;
  onIntroDone: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const { reducedMotion, hidden, cameraFar } = usePerf();
  const proxy = useRef<ShotProxy>(proxyFromCamera(camera, INTRO_SHOTS[0]));
  const follow = useRef(false);
  const finished = useRef(false);
  const musePosRef = useRef(musePos);
  const museFacingRef = useRef(museFacing);
  const onIntroDoneRef = useRef(onIntroDone);

  useEffect(() => {
    musePosRef.current = musePos;
    museFacingRef.current = museFacing;
  }, [musePos, museFacing]);

  useEffect(() => {
    onIntroDoneRef.current = onIntroDone;
  }, [onIntroDone]);

  useEffect(() => {
    if (reducedMotion && !introDone) {
      onIntroDone();
    }
  }, [introDone, onIntroDone, reducedMotion]);

  useEffect(() => {
    if (introDone || reducedMotion) {
      return;
    }
    const finish = () => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      follow.current = false;
      onIntroDoneRef.current();
    };
    const timeline = playIntro(proxy.current, finish);
    const failSafe = window.setTimeout(finish, 14_000);
    return () => {
      window.clearTimeout(failSafe);
      timeline.kill();
    };
  }, [introDone, reducedMotion]);

  useEffect(() => {
    if (!introDone) {
      return;
    }
    follow.current = false;
    const next = shotForPreset(preset, selected, musePosRef.current, museFacingRef.current);
    const tween = tweenShot(proxy.current, next, {
      duration: PRESET_CUT_S,
      onComplete: () => {
        follow.current = preset === "MIND";
      },
    });
    // GSAP time is frame-driven; on slow GPUs lag smoothing can stretch a cut
    // far past its duration. Land the shot on a wall-clock deadline instead.
    const snap = window.setTimeout(() => {
      if (tween.isActive()) {
        tween.progress(1);
      }
    }, (PRESET_CUT_S + 0.6) * 1000);
    return () => {
      window.clearTimeout(snap);
      tween.kill();
    };
  }, [preset, selected, introDone]);

  useFrame((state, dt) => {
    if (hidden) {
      return;
    }
    const frameCamera = state.camera;
    if (frameCamera instanceof PerspectiveCamera) {
      frameCamera.far = cameraFar;
    }
    if (follow.current && preset === "MIND") {
      dampShot(proxy.current, shotForPreset("MIND", selected, musePos, museFacing), dt);
    }
    const p = proxy.current;
    if (reducedMotion) {
      applyProxyToCamera(frameCamera, p);
      return;
    }
    // Gentle handheld drift so a held shot never reads as a freeze-frame.
    const t = state.clock.elapsedTime;
    applyProxyToCamera(frameCamera, {
      px: p.px + Math.sin(t * 0.13) * 0.08,
      py: p.py + Math.sin(t * 0.09 + 1.4) * 0.045,
      pz: p.pz + Math.sin(t * 0.11 + 2.8) * 0.06,
      tx: p.tx + Math.sin(t * 0.1 + 0.7) * 0.04,
      ty: p.ty + Math.sin(t * 0.08 + 2.1) * 0.025,
      tz: p.tz,
      fov: p.fov,
    });
  });

  return null;
}
