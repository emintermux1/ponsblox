"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState, type Pose } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { useFomoMotion } from "@/components/use-fomo-motion";
import {
  type SurfaceCopy,
  type SurfaceKind,
  surfaceCssKind,
} from "@/lib/surface-copy";

export function SurfaceState({
  kind,
  title,
  body,
  code: _code,
  surface,
  pose,
  retry,
  retryLabel = "Retry",
  action,
}: SurfaceCopy & {
  code?: string;
  surface: string;
  pose?: Pose;
  retry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
}) {
  const motionPrefs = useFomoMotion();
  const cssKind = surfaceCssKind(kind);
  const controls = action ?? (retry ? (
    <button type="button" onClick={retry} className="mf-buy inline-flex rounded-full px-3 py-1.5 text-[12px]">
      {retryLabel}
    </button>
  ) : null);

  if (kind === "loading" && !pose) {
    return (
      <motion.div data-motion-surface={surface} data-kind={cssKind} {...motionPrefs.surface}>
        <LoadingState label={title} />
        {body ? <p className="sr-only">{body}</p> : null}
      </motion.div>
    );
  }

  if (pose) {
    return (
      <motion.div data-motion-surface={surface} data-kind={cssKind} {...motionPrefs.surface}>
        <EmptyState title={title} body={body} pose={pose} action={controls} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mf-state"
      data-kind={cssKind}
      data-motion-surface={surface}
      role={kind === "failed" || kind === "unavailable" || kind === "denied" ? "alert" : "status"}
      {...motionPrefs.surface}
    >
      <p className="font-medium tracking-tight text-ink">{title}</p>
      <p className="mt-0.5">{body}</p>
      {controls ? <div className="mt-2">{controls}</div> : null}
    </motion.div>
  );
}

export function MissingSlice({
  surface,
  title,
  body,
  retry,
}: {
  surface: string;
  title: string;
  body: string;
  code?: string;
  retry?: () => void;
}) {
  return (
    <SurfaceState
      kind="partial"
      surface={surface}
      title={title}
      body={body}
      retry={retry}
      retryLabel="Retry"
    />
  );
}

export function kindFromStatus(status: number | undefined): SurfaceKind | null {
  if (status == null) return null;
  if (status === 401 || status === 403) return "denied";
  if (status === 404) return "not-found";
  if (status === 402) return "unavailable";
  if (status === 429) return "rate-limit";
  if (status >= 500) return "unavailable";
  if (status >= 400) return "failed";
  return null;
}

export function RefreshRetry({ label = "Retry" }: { label?: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className="mf-buy inline-flex rounded-full px-3 py-1.5 text-[12px]">
      {label}
    </button>
  );
}
