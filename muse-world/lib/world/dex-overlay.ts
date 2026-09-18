export type ScreenPoint = {
  x: number;
  y: number;
  z: number;
};

export type OverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const DEX_OVERLAY_MIN_W = 36;
export const DEX_OVERLAY_MIN_H = 24;
export const DEX_READABLE_W = 300;
export const DEX_READABLE_H = 174;
export const DEX_EXACT_W = 260;
export const DEX_EXACT_H = 150;
export const DEX_FACE_MIN = 0.08;

export function overlayRectFromCorners(corners: readonly ScreenPoint[]): OverlayRect {
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left,
    top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
}

export function clipPathFromCorners(
  corners: readonly ScreenPoint[],
  rect: OverlayRect,
): string {
  const points = corners.map((corner) => {
    const x = corner.x - rect.left;
    const y = corner.y - rect.top;
    return `${x}px ${y}px`;
  });
  return `polygon(${points.join(", ")})`;
}

export function rectsIntersect(
  rect: OverlayRect,
  viewW: number,
  viewH: number,
  pad = 8,
): boolean {
  return (
    rect.left + rect.width > pad &&
    rect.top + rect.height > pad &&
    rect.left < viewW - pad &&
    rect.top < viewH - pad
  );
}

export function dexOverlayOpen(input: {
  rect: OverlayRect;
  facing: number;
  ndcZ: readonly number[];
  viewW: number;
  viewH: number;
  minW?: number;
  minH?: number;
}): boolean {
  if (input.facing <= DEX_FACE_MIN) {
    return false;
  }
  if (input.ndcZ.some((z) => z < 0 || z > 1)) {
    return false;
  }
  if (input.rect.width < (input.minW ?? DEX_OVERLAY_MIN_W)) {
    return false;
  }
  if (input.rect.height < (input.minH ?? DEX_OVERLAY_MIN_H)) {
    return false;
  }
  return rectsIntersect(input.rect, input.viewW, input.viewH);
}

export function readableOverlay(
  rect: OverlayRect,
  minW = DEX_READABLE_W,
  minH = DEX_READABLE_H,
): OverlayRect {
  const width = Math.max(rect.width, minW);
  const height = Math.max(rect.height, minH);
  return {
    left: rect.left + rect.width / 2 - width / 2,
    top: rect.top + rect.height / 2 - height / 2,
    width,
    height,
  };
}

export function placeDexOverlay(input: {
  rect: OverlayRect;
  facing: number;
  ndcZ: readonly number[];
  viewW: number;
  viewH: number;
}): { rect: OverlayRect; exact: boolean } | null {
  if (!dexOverlayOpen(input)) {
    return null;
  }
  if (input.rect.width >= DEX_EXACT_W && input.rect.height >= DEX_EXACT_H) {
    return { rect: input.rect, exact: true };
  }
  return { rect: readableOverlay(input.rect), exact: false };
}

export function watchDexRect(
  point: { left: number; top: number },
  frame: { x: number; y: number; scale: number },
  viewW: number,
  viewH: number,
): OverlayRect {
  const cx = viewW / 2;
  const cy = viewH / 2;
  const x = (point.left / 100) * viewW;
  const y = (point.top / 100) * viewH;
  const px = (x - cx) * frame.scale + cx + (frame.x / 100) * viewW;
  const py = (y - cy) * frame.scale + cy + (frame.y / 100) * viewH;
  return {
    left: px - DEX_READABLE_W / 2,
    top: py - DEX_READABLE_H / 2,
    width: DEX_READABLE_W,
    height: DEX_READABLE_H,
  };
}

export function applyOverlayBox(
  el: HTMLElement,
  rect: OverlayRect,
  clip: string | null,
): void {
  el.hidden = false;
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.clipPath = clip ?? "none";
}

export function hideOverlayBox(el: HTMLElement): void {
  el.hidden = true;
  el.style.clipPath = "none";
}
