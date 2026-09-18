"use client";

import type { ThreeEvent } from "@react-three/fiber";

export const ORBIT_DRAG_PX = 6;

type Point = { x: number; y: number };

let pickStart: Point | null = null;

export function setLoftCursor(hover: boolean): void {
  if (typeof document === "undefined") {
    return;
  }
  document.body.style.cursor = hover ? "pointer" : "";
}

export function isOrbitDrag(from: Point, to: Point, threshold = ORBIT_DRAG_PX): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) > threshold;
}

export function loftPickHandlers(onPick: () => void): {
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
} {
  return {
    onPointerDown: (event) => {
      pickStart = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
    },
    onClick: (event) => {
      event.stopPropagation();
      const start = pickStart;
      pickStart = null;
      if (
        start &&
        isOrbitDrag(start, { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY })
      ) {
        return;
      }
      onPick();
    },
    onPointerOver: (event) => {
      event.stopPropagation();
      setLoftCursor(true);
    },
    onPointerOut: () => {
      setLoftCursor(false);
    },
  };
}
