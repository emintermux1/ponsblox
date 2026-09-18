import "server-only";

import {
  classifyGrokBias,
  grokReplyFromWake,
  loftCaptionFromText,
  resolveWakeResult,
  type GrokReply,
  type GrokToolReply,
  type GrokWakeResult,
} from "@/lib/adapters/parse";
import {
  GROK_ENV_NAMES,
  assertSource,
  honestyFromLabel,
  isGrokWebhookConfigured,
  isXaiConfigured,
  readEnvName,
  type GrokAsk,
} from "@/lib/adapters/source";

export type { GrokAsk, GrokReply } from "@/lib/adapters/source";
export type { GrokToolReply, GrokWakeResult } from "@/lib/adapters/parse";

export type GrokWakeReason = "interval" | "click";

const WAKE_COOLDOWN_MS = 20_000;
const INTERVAL_WAKE_MS = 20_000;
let lastWakeAt = 0;
let lastWakeOk = false;
let lastIntervalWakeAt = 0;

export function isIntervalWakeDue(now = Date.now()): boolean {
  return now - lastIntervalWakeAt >= INTERVAL_WAKE_MS;
}

export function noteIntervalWake(now = Date.now()): void {
  lastIntervalWakeAt = now;
}

export function resetGrokWakeClocksForTests(): void {
  lastWakeAt = 0;
  lastWakeOk = false;
  lastIntervalWakeAt = 0;
}

async function wakeGrokBot(ask: GrokAsk): Promise<boolean> {
  if (!isGrokWebhookConfigured()) {
    return false;
  }
  const url = readEnvName(GROK_ENV_NAMES.webhookUrl);
  const key = readEnvName(GROK_ENV_NAMES.webhookKey);
  if (!url || !key) {
    return false;
  }
  const now = Date.now();
  if (now - lastWakeAt < WAKE_COOLDOWN_MS) {
    return lastWakeOk;
  }
  lastWakeAt = now;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Automation-Key": key,
      },
      body: JSON.stringify({
        museId: ask.museId,
        goal: ask.goal,
        observation: ask.observation,
        replyTo: "/api/grok/ingest",
        note: "Muse is the brain. HTTP 200 here means a run started, not a Grok Bot reply. Reply by POSTing /api/grok/ingest.",
      }),
      signal: AbortSignal.timeout(8000),
    });
    lastWakeOk = response.ok;
    return lastWakeOk;
  } catch {
    lastWakeOk = false;
    return false;
  }
}

async function askXai(ask: GrokAsk): Promise<GrokToolReply | null> {
  const key = readEnvName(GROK_ENV_NAMES.xaiKey);
  if (!key || !isXaiConfigured(key)) {
    return null;
  }
  const base = readEnvName(GROK_ENV_NAMES.xaiUrl) ?? "https://api.x.ai/v1";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "You are a tool called by a Muse agent. One short sentence. No chain of thought. End with WATCH, PASS, or BUY. Do not invent fills or claim you executed a trade.",
        },
        {
          role: "user",
          content: `${ask.museId} goal=${ask.goal} saw=${ask.observation}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return null;
  }
  const summary = loftCaptionFromText(raw);
  if (!summary) {
    return null;
  }
  return {
    source: "xai",
    summary,
    bias: classifyGrokBias(summary),
  };
}

export async function wakeGrok(ask: GrokAsk): Promise<GrokWakeResult> {
  const webhookConfigured = isGrokWebhookConfigured();
  const woken = webhookConfigured ? await wakeGrokBot(ask).catch(() => false) : false;
  const xai = await askXai(ask).catch(() => null);
  return resolveWakeResult(woken, xai);
}

export async function askGrok(ask: GrokAsk): Promise<GrokReply> {
  const result = await wakeGrok(ask);
  const reply = grokReplyFromWake(result);
  switch (reply.source) {
    case "xai":
      assertSource(honestyFromLabel("xai"));
      return reply;
    case "sim":
      assertSource(honestyFromLabel("sim"));
      return reply;
    default: {
      const _never: never = reply;
      return _never;
    }
  }
}
