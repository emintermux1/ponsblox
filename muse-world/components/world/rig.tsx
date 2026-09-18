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
  const { reducedMotion, hidden, cameraFar } = usePerf();
  const proxy = useRef<ShotProxy>(proxyFromCamera(camera, INTRO_SHOTS[0]));
  const follow = useRef(false);
  const finished = useRef(false);
  const musePosRef = useRef(musePos);
  const onIntroDoneRef = useRef(onIntroDone);

  useEffect(() => {
    musePosRef.current = musePos;
  }, [musePos]);

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
    const next = shotForPreset(preset, selected, musePosRef.current);
    const tween = tweenShot(proxy.current, next, {
      onComplete: () => {
        follow.current = preset === "MIND";
      },
    });
    return () => {
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
      dampShot(proxy.current, shotForPreset("MIND", selected, musePos), dt);
    }
    applyProxyToCamera(frameCamera, proxy.current);
  });

  return null;
}
