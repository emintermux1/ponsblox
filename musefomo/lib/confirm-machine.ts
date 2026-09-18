export const CONFIRM_STATUSES = [
  "quoted",
  "awaiting_signature",
  "submitted",
  "confirming",
  "confirmed",
  "failed",
  "expired",
] as const;

export type ConfirmStatus = (typeof CONFIRM_STATUSES)[number];
export type ConfirmIntent = "noop" | "confirming" | "confirm" | "fail" | "expire";

const PENDING = new Set<ConfirmStatus>(["submitted", "confirming"]);
const PRE_SUBMIT = new Set<ConfirmStatus>(["quoted", "awaiting_signature"]);

export function isPendingStatus(status: ConfirmStatus): boolean {
  return PENDING.has(status);
}

export function isTerminalStatus(status: ConfirmStatus): boolean {
  return status === "confirmed" || status === "failed" || status === "expired";
}

export function isConfirmedHeliusStatus(status: string | null): boolean {
  return status === "confirmed" || status === "finalized";
}

export function scopedIdempotencyKey(agentId: string, key: string): string {
  const prefix = `${agentId}:`;
  return key.startsWith(prefix) ? key : `${prefix}${key}`;
}

export function webhookDeliveryKey(input: {
  signature: string;
  slot?: number | null;
  confirmationStatus?: string | null;
  executionId?: string | null;
}): string {
  return [
    `sig:${input.signature}`,
    `slot:${input.slot ?? ""}`,
    `st:${input.confirmationStatus ?? ""}`,
    `ex:${input.executionId ?? ""}`,
  ].join("|");
}

export function nextConfirmIntent(input: {
  status: ConfirmStatus;
  confirmationStatus: string | null;
  err: unknown;
  seen: boolean;
  blockExpired: boolean;
}): ConfirmIntent {
  if (input.status === "confirmed") return "noop";
  if (input.err) {
    return input.status === "failed" ? "noop" : "fail";
  }
  if (isConfirmedHeliusStatus(input.confirmationStatus)) return "confirm";
  if (PRE_SUBMIT.has(input.status)) return "noop";
  if (input.status === "submitted" && input.seen) return "confirming";
  if (input.blockExpired && !input.seen && PENDING.has(input.status)) return "expire";
  return "noop";
}
