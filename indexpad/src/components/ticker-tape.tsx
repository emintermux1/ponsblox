const TAPE = [
  "INDEXPAD",
  "ROBINHOOD CHAIN",
  "BASKET → MARKET",
  "CREATE INDEX",
  "WEIGHT IN THE OPEN",
  "PONS V2 FACTORY",
  "NO INVENTED PRINTS",
  "TURN ANY BASKET INTO A MARKET",
];

export function TickerTape() {
  const line = [...TAPE, ...TAPE];
  return (
    <div className="relative overflow-hidden border-y border-line bg-[#0a0908]">
      <div className="ip-tape flex w-max items-center gap-8 py-1.5 pr-8 font-mono text-[10px] uppercase tracking-[0.22em] text-accent/80">
        {line.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-8">
            {item}
            <span aria-hidden className="text-foreground/20">
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
