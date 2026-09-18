"use client";

import type { ThreeEvent } from "@react-three/fiber";

export function setLoftCursor(hover: boolean): void {
  if (typeof document === "undefined") {
    return;
  }
  document.body.style.cursor = hover ? "pointer" : "";
}

export function loftPickHandlers(onPick: () => void): {
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
} {
  return {
    onClick: (event) => {
      event.stopPropagation();
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
