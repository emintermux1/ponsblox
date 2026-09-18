"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import {
  chartReveal,
  feedInsert,
  FOMO_DURATION,
  FOMO_EASE,
  modalMotion,
  modalMotionReduced,
  pageFade,
  sheetMotion,
  sheetMotionReduced,
  surfaceSnap,
  tabFade,
} from "@/lib/motion";

export function useFomoMotion() {
  const reduced = Boolean(useReducedMotion());
  return {
    reduced,
    page: reduced ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } } : pageFade,
    tab: reduced
      ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
      : tabFade,
    sheet: reduced ? sheetMotionReduced : sheetMotion,
    modal: reduced ? modalMotionReduced : modalMotion,
    feed: reduced ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } } : feedInsert,
    chart: reduced ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } } : chartReveal,
    surface: reduced
      ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
      : surfaceSnap,
    transition: (key: keyof typeof FOMO_DURATION) =>
      reduced ? { duration: 0 } : { duration: FOMO_DURATION[key], ease: FOMO_EASE },
  };
}

/** Desktop rail vs mobile sheet — SSR assumes mobile so we never flash a desktop ticket over the dock. */
export function useMinWidth(px: number) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${px}px)`);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [px]);
  return matches;
}

export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const view = window.visualViewport;
    if (!view) return;
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - view.height - view.offsetTop);
      setInset(overlap);
    };
    sync();
    view.addEventListener("resize", sync);
    view.addEventListener("scroll", sync);
    return () => {
      view.removeEventListener("resize", sync);
      view.removeEventListener("scroll", sync);
    };
  }, [active]);
  return inset;
}
