"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { usePerf } from "@/components/world/perf-context";
import { damp, INTRO_SHOTS, shotForPreset, type Shot } from "@/lib/world/camera";
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
  const { reducedMotion, hidden } = usePerf();
  const started = useRef(0);
  const current = useRef<Shot>(INTRO_SHOTS[0]);
  const target = useRef<Shot>(INTRO_SHOTS[0]);
  const finished = useRef(false);

  useEffect(() => {
    started.current = performance.now();
  }, []);

  useEffect(() => {
    if (reducedMotion && !introDone) {
      onIntroDone();
    }
  }, [introDone, onIntroDone, reducedMotion]);

  useEffect(() => {
    target.current = introDone
      ? shotForPreset(preset, selected, musePos)
      : INTRO_SHOTS[0];
  }, [preset, selected, musePos, introDone]);

  useFrame((state, dt) => {
    if (hidden) {
      return;
    }
    const camera = state.camera;
    const elapsed = (performance.now() - started.current) / 1000;
    const lambda = reducedMotion ? 8 : 2.4;
    if (!introDone && !reducedMotion) {
      const idx = Math.min(INTRO_SHOTS.length - 1, Math.floor(elapsed / 3.1));
      const local = Math.min(1, (elapsed - idx * 3.1) / 3.1);
      const a = INTRO_SHOTS[idx];
      const b = INTRO_SHOTS[Math.min(INTRO_SHOTS.length - 1, idx + 1)];
      const ease = 1 - Math.pow(1 - local, 3);
      target.current = {
        position: [
          a.position[0] + (b.position[0] - a.position[0]) * ease,
          a.position[1] + (b.position[1] - a.position[1]) * ease,
          a.position[2] + (b.position[2] - a.position[2]) * ease,
        ],
        target: [
          a.target[0] + (b.target[0] - a.target[0]) * ease,
          a.target[1] + (b.target[1] - a.target[1]) * ease,
          a.target[2] + (b.target[2] - a.target[2]) * ease,
        ],
        fov: a.fov + (b.fov - a.fov) * ease,
      };
      if (elapsed > 11.8 && !finished.current) {
        finished.current = true;
        onIntroDone();
      }
    }
    const shot = target.current;
    current.current = {
      position: [
        damp(current.current.position[0], shot.position[0], lambda, dt),
        damp(current.current.position[1], shot.position[1], lambda, dt),
        damp(current.current.position[2], shot.position[2], lambda, dt),
      ],
      target: [
        damp(current.current.target[0], shot.target[0], lambda + 0.2, dt),
        damp(current.current.target[1], shot.target[1], lambda + 0.2, dt),
        damp(current.current.target[2], shot.target[2], lambda + 0.2, dt),
      ],
      fov: damp(current.current.fov, shot.fov, Math.max(2.1, lambda - 0.3), dt),
    };
    camera.position.set(...current.current.position);
    camera.lookAt(...current.current.target);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = current.current.fov;
    }
    camera.updateProjectionMatrix();
  });

  return null;
}
