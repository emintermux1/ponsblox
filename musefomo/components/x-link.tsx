import { X_AT, X_URL } from "@/lib/social";

export function XLink({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={X_AT}
      className={[
        "inline-flex shrink-0 items-center gap-1.5 font-medium tracking-tight",
        compact ? "h-8 px-2 text-[12px]" : "text-sm",
        className ?? "text-mute hover:text-ink",
      ].join(" ")}
    >
      <XGlyph />
      <span className="whitespace-nowrap">{compact ? X_AT : `X ${X_AT}`}</span>
    </a>
  );
}

function XGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.725-8.835L1.254 2.25H8.08l4.253 5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  );
}
