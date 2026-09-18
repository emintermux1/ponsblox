export function formatLiveReply(args: {
  ticker: string;
  argusUrl: string;
}): string {
  return `$${args.ticker} is live.\n${args.argusUrl}`;
}

export function formatRejectReply(reason: string): string {
  return `Could not launch: ${reason.slice(0, 180)}`;
}
