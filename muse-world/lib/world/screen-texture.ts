import {
  cleanTicker,
  finiteChange,
  isJunkDisplayName,
  pulseDisplayName,
  type MarketProviderId,
} from "@/lib/adapters/parse";

export type ScreenSource = MarketProviderId | "sim";

export type ScreenPulse = {
  ticker: string | null;
  name: string | null;
  changePct: number | null;
  source: ScreenSource;
};

export type ScreenKind = "desk" | "phone" | "laptop";

export type ScreenView = {
  lit: true;
  title: string;
  change: string;
  changeTone: "up" | "down" | "flat";
  mark: "REAL" | "SIM";
  source: string;
};

const LIVE: readonly ScreenSource[] = [
  "gecko",
  "dexscreener",
  "birdeye",
  "gmgn",
  "helius",
  "solana",
];

export function quietScreenPulse(): ScreenPulse {
  return {
    ticker: null,
    name: null,
    changePct: null,
    source: "sim",
  };
}

export function isLiveScreenSource(source: string | null | undefined): source is Exclude<ScreenSource, "sim"> {
  return LIVE.includes(source as ScreenSource);
}

export function sanitizeScreenPulse(input: {
  ticker?: unknown;
  name?: unknown;
  changePct?: unknown;
  source?: unknown;
}): ScreenPulse {
  const rawSource = typeof input.source === "string" ? input.source : "sim";
  const source: ScreenSource = isLiveScreenSource(rawSource) ? rawSource : "sim";
  const ticker = cleanTicker(typeof input.ticker === "string" ? input.ticker : null);
  const rawName = typeof input.name === "string" ? input.name : null;
  const name = rawName && !isJunkDisplayName(rawName) ? pulseDisplayName(rawName, ticker) : ticker;
  if (!ticker && !name) {
    return quietScreenPulse();
  }
  return {
    ticker,
    name,
    changePct: finiteChange(input.changePct),
    source,
  };
}

export function formatChange(changePct: number | null): string {
  if (changePct == null) {
    return "—";
  }
  const sign = changePct > 0 ? "+" : "";
  return `${sign}${changePct.toFixed(2)}%`;
}

export function changeTone(changePct: number | null): ScreenView["changeTone"] {
  if (changePct == null || changePct === 0) {
    return "flat";
  }
  return changePct > 0 ? "up" : "down";
}

export function screenView(pulse: ScreenPulse): ScreenView {
  const clean = sanitizeScreenPulse(pulse);
  const title = clean.name ?? clean.ticker;
  const live = clean.source !== "sim" && Boolean(title);
  return {
    lit: true,
    title: title ?? (clean.source === "sim" ? "SIM" : "TAPE"),
    change: formatChange(clean.changePct),
    changeTone: changeTone(clean.changePct),
    mark: live ? "REAL" : "SIM",
    source: clean.source.toUpperCase(),
  };
}

export function paintScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pulse: ScreenPulse,
  time: number,
  kind: ScreenKind,
): void {
  const view = screenView(pulse);
  const glow = 0.55 + Math.sin(time * 1.8) * 0.08;
  const scan = ((time * 38) % height) / height;
  const top = kind === "phone" ? "#1a3b52" : "#16344a";
  const bottom = kind === "phone" ? "#0d2230" : "#0b1c28";

  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, top);
  wash.addColorStop(1, bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `rgba(90, 160, 196, ${0.06 + glow * 0.04})`;
  for (let x = 18; x < width; x += 28) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 16; y < height; y += 22) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.fillStyle = `rgba(186, 230, 255, ${0.08 + glow * 0.05})`;
  ctx.fillRect(0, scan * height, width, 6);

  const changeColor =
    view.changeTone === "up" ? "#7ee3a4" : view.changeTone === "down" ? "#ef8b8b" : "#d7c9a6";
  const titleSize = kind === "phone" ? Math.floor(width * 0.16) : Math.floor(height * 0.22);
  const changeSize = kind === "phone" ? Math.floor(width * 0.12) : Math.floor(height * 0.16);
  const titleY = kind === "phone" ? height * 0.38 : height * 0.42;
  const changeY = kind === "phone" ? height * 0.56 : height * 0.68;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(236, 246, 255, ${0.82 + glow * 0.16})`;
  ctx.font = `600 ${titleSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(view.title, width / 2, titleY, width * 0.86);

  ctx.fillStyle = changeColor;
  ctx.font = `600 ${changeSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(view.change, width / 2, changeY, width * 0.86);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(215, 201, 166, 0.55)";
  ctx.font = `500 ${Math.max(10, Math.floor(height * 0.07))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(view.mark, 16, height - 18);

  ctx.textAlign = "right";
  ctx.fillText(view.source, width - 16, height - 18);
}
