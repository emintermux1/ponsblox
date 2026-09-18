import "server-only";

import type { MuseId } from "@/types/world";
import {
  classifyGrokBias,
  resolveWakeResult,
  type GrokToolReply,
  type GrokWakeResult,
} from "@/lib/adapters/parse";

export type GrokAsk = {
  museId: MuseId;
  goal: string;
  observation: string;
};

export type { GrokReply, GrokToolReply, GrokWakeResult } from "@/lib/adapters/parse";

const WAKE_COOLDOWN_MS = 20_000;
let lastWakeAt = 0;
let lastWakeOk = false;

async function wakeGrokBot(ask: GrokAsk): Promise<boolean> {
  const url = process.env.GROK_BOT_WEBHOOK_URL;
  const key = process.env.GROK_BOT_WEBHOOK_KEY;
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
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return null;
  }
  const base = process.env.XAI_API_URL ?? "https://api.x.ai/v1";
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
  const summary = data.choices?.[0]?.message?.content?.trim();
  if (!summary) {
    return null;
  }
  return {
    source: "xai",
    summary: summary.slice(0, 140),
    bias: classifyGrokBias(summary),
  };
}

export async function wakeGrok(ask: GrokAsk): Promise<GrokWakeResult> {
  const woken = await wakeGrokBot(ask).catch(() => false);
  const xai = await askXai(ask).catch(() => null);
  return resolveWakeResult(woken, xai);
}

export async function askGrok(ask: GrokAsk): Promise<GrokWakeResult> {
  return wakeGrok(ask);
}
