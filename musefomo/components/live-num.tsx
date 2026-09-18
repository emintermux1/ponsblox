"use client";

import { motion } from "framer-motion";

import { useFomoMotion } from "@/components/use-fomo-motion";

/** Instant swap + opacity settle. Never count money up. */
export function LiveNum({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const motionPrefs = useFomoMotion();
  return (
    <motion.span
      key={value}
      className={`mf-num ${className}`}
      initial={motionPrefs.reduced ? false : { opacity: 0.45 }}
      animate={{ opacity: 1 }}
      transition={motionPrefs.transition("fast")}
    >
      {value}
    </motion.span>
  );
}
