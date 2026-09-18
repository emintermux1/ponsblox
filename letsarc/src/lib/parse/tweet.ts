export type ParsedLaunch = {
  ticker: string;
  name: string;
};

const TICKER_CHARS = /^[A-Za-z0-9]+$/;
const NAME_WORD = /^[A-Za-z0-9]+$/;
const MAX_TICKER = 10;
const MIN_TICKER = 2;
const MAX_NAME_LEN = 32;
const MAX_NAME_WORDS = 4;

const STOP_WORDS = new Set(
  [
    "please",
    "pls",
    "now",
    "launch",
    "launched",
    "create",
    "make",
    "deploy",
    "here",
    "thanks",
    "lfg",
    "wen",
    "pump",
    "moon",
  ].map((w) => w.toLowerCase()),
);

function clean(text: string): string {
  return text
    .replace(/@\w+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/#\w+/g, " ")
    .replace(/[^\w$]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateTicker(raw: string): string | null {
  const ticker = raw.replace(/^\$/, "").trim().toUpperCase();
  if (ticker.length < MIN_TICKER || ticker.length > MAX_TICKER) return null;
  if (!TICKER_CHARS.test(ticker)) return null;
  return ticker;
}

function validateName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > MAX_NAME_LEN) return null;
  if (!/^[A-Za-z0-9 ]+$/.test(name)) return null;
  return name;
}

/**
 * Deterministic: `@letslauncharc $TICKER Coin Name`
 * Mentions and URLs are stripped first. No LLM.
 */
export function parseLaunchCommand(rawText: string): ParsedLaunch | null {
  const text = clean(rawText);
  if (!text) return null;

  const match = text.match(/\$([A-Za-z0-9]{2,10})\b/);
  if (!match || match.index === undefined) return null;

  const ticker = validateTicker(match[1] ?? "");
  if (!ticker) return null;

  const after = text.slice(match.index + match[0].length).trim();
  const words = after.split(/\s+/).filter(Boolean);
  const picked: string[] = [];
  for (const word of words) {
    if (!NAME_WORD.test(word)) break;
    if (STOP_WORDS.has(word.toLowerCase())) {
      if (picked.length === 0) return null;
      break;
    }
    const next = [...picked, word].join(" ");
    if (next.length > MAX_NAME_LEN || picked.length >= MAX_NAME_WORDS) break;
    picked.push(word);
  }
  const name = validateName(picked.join(" "));
  if (!name) return null;
  return { ticker, name };
}
