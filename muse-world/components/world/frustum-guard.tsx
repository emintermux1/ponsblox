"use client";

import { useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Frustum, Matrix4, Sphere, Vector3, type Group } from "three";
import { usePerf } from "@/components/world/perf-context";

const frustum = new Frustum();
const viewProjection = new Matrix4();
const sphere = new Sphere(new Vector3(), 1);

export function FrustumGuard({
  center,
  radius = 1.35,
  children,
}: {
  center: [number, number, number];
  radius?: number;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const { pauseExtras, tier } = usePerf();

  useFrame(() => {
    if (!group.current) {
      return;
    }
    if (pauseExtras || tier === "phone") {
      group.current.visible = true;
      return;
    }
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    sphere.center.set(center[0], center[1], center[2]);
    sphere.radius = radius;
    group.current.visible = frustum.intersectsSphere(sphere);
  });

  return <group ref={group}>{children}</group>;
}
