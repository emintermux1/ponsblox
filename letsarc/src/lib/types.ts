export const LAUNCH_STATUSES = [
  "RECEIVED",
  "VALIDATING",
  "SUBMITTING",
  "SUBMITTED",
  "CONFIRMING",
  "LAUNCHED",
  "REPLYING",
  "COMPLETED",
  "REJECTED",
  "FAILED",
] as const;

export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

export type LaunchRow = {
  id: string;
  triggerTweetId: string;
  triggerTweetUrl: string | null;
  triggerText: string | null;
  requesterXId: string;
  requesterUsername: string;
  sourceTweetId: string | null;
  sourceTweetUrl: string | null;
  sourceUsername: string | null;
  sourceText: string | null;
  sourceMedia: string | null;
  ticker: string | null;
  tokenName: string | null;
  status: LaunchStatus;
  transactionHash: string | null;
  tokenAddress: string | null;
  argusUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  eventReceivedMs: number | null;
  tweetResolvedMs: number | null;
  parsedMs: number | null;
  transactionSubmittedMs: number | null;
  transactionConfirmedMs: number | null;
  replyPostedMs: number | null;
  totalLaunchMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LatencyMarks = {
  eventReceivedMs: number;
  tweetResolvedMs?: number;
  parsedMs?: number;
  transactionSubmittedMs?: number;
  transactionConfirmedMs?: number;
  replyPostedMs?: number;
};

export function assertLaunchStatus(value: string): LaunchStatus {
  switch (value) {
    case "RECEIVED":
    case "VALIDATING":
    case "SUBMITTING":
    case "SUBMITTED":
    case "CONFIRMING":
    case "LAUNCHED":
    case "REPLYING":
    case "COMPLETED":
    case "REJECTED":
    case "FAILED":
      return value;
    default: {
      const _never: never = value as never;
      throw new Error(`Unknown launch status: ${_never}`);
    }
  }
}
