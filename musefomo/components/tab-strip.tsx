"use client";

import { motion } from "framer-motion";

import { useFomoMotion } from "@/components/use-fomo-motion";

export function TabStrip<T extends string>({
  value,
  onChange,
  items,
  layoutId,
  fill = false,
  className = "",
}: {
  value: T;
  onChange: (next: T) => void;
  items: ReadonlyArray<{ value: T; label: string }>;
  layoutId: string;
  fill?: boolean;
  className?: string;
}) {
  const motionPrefs = useFomoMotion();
  return (
    <div className={`mf-tabs relative flex ${fill ? "w-full" : ""} ${className}`} role="tablist">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`relative min-h-9 shrink-0 px-3 text-[13px] font-medium tracking-tight ${
              fill ? "flex-1" : ""
            } ${active ? "text-ink" : "text-mute"}`}
          >
            {active ? (
              motionPrefs.reduced ? (
                <span className="mf-tab-pill absolute inset-0 rounded-[10px]" />
              ) : (
                <motion.span
                  layoutId={layoutId}
                  className="mf-tab-pill absolute inset-0 rounded-[10px]"
                  transition={motionPrefs.transition("fast")}
                />
              )
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
