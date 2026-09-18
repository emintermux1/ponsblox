export const FOMO_EASE = [0.22, 1, 0.36, 1] as const;

/** Seconds. Keep the band at 120–220ms — no springs. */
export const FOMO_DURATION = {
  instant: 0.12,
  fast: 0.16,
  base: 0.2,
  enter: 0.22,
  sheet: 0.22,
} as const;

export const FOMO_MS = {
  instant: 120,
  fast: 160,
  base: 200,
  enter: 220,
  sheet: 220,
} as const;

const ease = FOMO_EASE;

/** Route enter — stay visible. Initial 0 blanks first paint if hydration fails. */
export const pageFade = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
  transition: { duration: 0, ease },
};

/** Live row insert — opacity only. Transform/height here jumps the scroll. */
export const feedInsert = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: FOMO_DURATION.fast, ease },
};

/** Tab panel swap — opacity only. */
export const tabFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: FOMO_DURATION.fast, ease },
};

/** Bottom sheet. Transform only (no layout). */
export const sheetMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: FOMO_DURATION.sheet, ease },
};

export const sheetMotionReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.01 },
};

/** Centered modal / search popover. */
export const modalMotion = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.99 },
  transition: { duration: FOMO_DURATION.base, ease },
};

export const modalMotionReduced = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.01 },
};

export const chartReveal = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: FOMO_DURATION.enter, ease },
};

/** Forgotten-states surfaces: copy is painted immediately. Motion may fade extras. */
export const surfaceSnap = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 1, y: 0 },
  transition: { duration: 0 },
};

export const rowEnter = feedInsert;
export const sheetSpring = sheetMotion;
export const popoverSpring = modalMotion;

export function fomoTransition(duration: keyof typeof FOMO_DURATION, reduced?: boolean) {
  if (reduced) return { duration: 0 };
  return { duration: FOMO_DURATION[duration], ease: FOMO_EASE };
}
