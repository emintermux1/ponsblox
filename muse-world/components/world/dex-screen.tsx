"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { dexPane } from "@/components/world/dex-pin";
import { useTape } from "@/components/world/tape-context";
import { dexEmbedSrc } from "@/lib/world/dex-embed";
import {
  applyOverlayBox,
  clipPathFromCorners,
  hideOverlayBox,
  overlayRectFromCorners,
  placeDexOverlay,
  type ScreenPoint,
} from "@/lib/world/dex-overlay";

const LCD_CORNERS: readonly [number, number][] = [
  [-0.5, 0.5],
  [0.5, 0.5],
  [0.5, -0.5],
  [-0.5, -0.5],
];

const projected = LCD_CORNERS.map(() => new Vector3());
const lcdNormal = new Vector3();
const camDir = new Vector3();

export function DexOnLcd({ width, height }: { width: number; height: number }) {
  const tape = useTape();
  const src = dexEmbedSrc(tape);
  const group = useRef<Group>(null);
  const gl = useThree((state) => state.gl);

  useFrame(({ camera, size }) => {
    const el = dexPane();
    const lcd = group.current;
    if (!el || !lcd || !src) {
      if (el) {
        hideOverlayBox(el);
      }
      return;
    }
    lcd.updateWorldMatrix(true, false);
    const canvas = gl.domElement.getBoundingClientRect();
    const host = el.offsetParent?.getBoundingClientRect() ?? canvas;
    const ox = canvas.left - host.left;
    const oy = canvas.top - host.top;
    const corners: ScreenPoint[] = LCD_CORNERS.map((corner, index) => {
      const point = projected[index] ?? new Vector3();
      point.set(corner[0] * width, corner[1] * height, 0.002);
      point.applyMatrix4(lcd.matrixWorld);
      point.project(camera);
      return {
        x: ox + (point.x * 0.5 + 0.5) * size.width,
        y: oy + (-point.y * 0.5 + 0.5) * size.height,
        z: point.z,
      };
    });
    lcdNormal.set(0, 0, 1).transformDirection(lcd.matrixWorld);
    camera.getWorldDirection(camDir);
    const placed = placeDexOverlay({
      rect: overlayRectFromCorners(corners),
      facing: -lcdNormal.dot(camDir),
      ndcZ: corners.map((corner) => corner.z),
      viewW: size.width,
      viewH: size.height,
    });
    if (!placed) {
      hideOverlayBox(el);
      return;
    }
    applyOverlayBox(
      el,
      placed.rect,
      placed.exact ? clipPathFromCorners(corners, placed.rect) : null,
    );
  });

  return <group ref={group} />;
}
