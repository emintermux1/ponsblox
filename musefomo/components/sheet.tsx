"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

import { useFomoMotion, useKeyboardInset } from "@/components/use-fomo-motion";

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const motionPrefs = useFomoMotion();
  const keyboard = useKeyboardInset(open);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const node = panel.current?.querySelector<HTMLElement>("input, textarea, button, [href]");
      node?.focus();
    }, 40);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="mf-backdrop flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={motionPrefs.transition("fast")}
          onClick={onClose}
        >
          <motion.div
            ref={panel}
            className="mf-sheet w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            {...motionPrefs.sheet}
            style={{
              paddingBottom: `calc(1.25rem + env(safe-area-inset-bottom, 0px) + ${keyboard}px)`,
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
              <p className="mf-kicker">Muse FOMO</p>
              <h2 className="mt-1 text-[17px] font-semibold tracking-tight">{title}</h2>
              <div className="mt-2.5 min-w-0 text-[13px] leading-5 text-mute [&>aside]:text-ink">{children}</div>
              {footer ? <div className="mt-4">{footer}</div> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
