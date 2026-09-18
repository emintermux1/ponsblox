"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { useTape } from "@/components/world/tape-context";
import { dexEmbedSrc, dexHonesty } from "@/lib/world/dex-embed";
import {
  applyOverlayBox,
  clipPathFromCorners,
  hideOverlayBox,
  overlayRectFromCorners,
  placeDexOverlay,
  type ScreenPoint,
} from "@/lib/world/dex-overlay";
import { tapeHeadline, tapeStamp } from "@/lib/world/tape";

const LCD_CORNERS: readonly [number, number][] = [
  [-0.5, 0.5],
  [0.5, 0.5],
  [0.5, -0.5],
  [-0.5, -0.5],
];

const projected = LCD_CORNERS.map(() => new Vector3());
const lcdNormal = new Vector3();
const camDir = new Vector3();

export function DexScreenerFrame({
  src,
  mark,
  headline,
  stamp,
}: {
  src: string;
  mark: "SIM" | "REAL";
  headline: string;
  stamp: string;
}) {
  return (
    <>
      <span className="loft-dex-screen-bar">
        DEXSCREENER · {headline} · {mark} · {stamp} · no fills
      </span>
      <iframe
        title="DexScreener"
        src={src}
        className="loft-dex-frame"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </>
  );
}

function findDexHost(canvas: HTMLCanvasElement): HTMLElement | null {
  return (
    canvas.closest("[data-dex-host]") ??
    canvas.closest("[data-loft-mode]") ??
    document.querySelector("[data-dex-host]")
  );
}

export function DexOnLcd({ width, height }: { width: number; height: number }) {
  const tape = useTape();
  const src = dexEmbedSrc(tape);
  const mark = dexHonesty(tape.source);
  const headline = tape.ticker ?? tapeHeadline(tape);
  const stamp = tapeStamp(tape.source);
  const group = useRef<Group>(null);
  const pane = useRef<HTMLDivElement>(null);
  const gl = useThree((state) => state.gl);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setHost(findDexHost(gl.domElement));
  }, [gl]);

  useFrame(({ camera, size }) => {
    const el = pane.current;
    const lcd = group.current;
    if (!el || !lcd || !src) {
      if (el) {
        hideOverlayBox(el);
      }
      return;
    }
    lcd.updateWorldMatrix(true, false);
    const canvas = gl.domElement.getBoundingClientRect();
    const root = host?.getBoundingClientRect() ?? canvas;
    const ox = canvas.left - root.left;
    const oy = canvas.top - root.top;
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

  if (!src || !host) {
    return <group ref={group} />;
  }

  return (
    <group ref={group}>
      {createPortal(
        <div
          ref={pane}
          className="loft-dex-screen"
          data-dex-embed="live"
          data-dex-mark={mark}
          hidden
        >
          <DexScreenerFrame src={src} mark={mark} headline={headline} stamp={stamp} />
        </div>,
        host,
      )}
    </group>
  );
}
