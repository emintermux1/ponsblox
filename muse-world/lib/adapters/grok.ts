import "server-only";

import type { GrokSource, MuseId } from "@/types/world";

export type GrokAsk = {
  museId: MuseId;
  goal: string;
  observation: string;
};

export type GrokReply = {
  source: GrokSource;
  summary: string;
  bias: "buy" | "pass" | "watch";
};

function classify(text: string): GrokReply["bias"] {
  const lower = text.toLowerCase();
  if (lower.includes("pass") || lower.includes("avoid") || lower.includes("thin")) {
    return "pass";
  }
  if (lower.includes("buy") || lower.includes("asymmetric") || lower.includes("early")) {
    return "buy";
  }
  return "watch";
}

async function wakeGrokBot(ask: GrokAsk): Promise<boolean> {
  const url = process.env.GROK_BOT_WEBHOOK_URL;
  const key = process.env.GROK_BOT_WEBHOOK_KEY;
  if (!url || !key) {
    return false;
  }
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
      note: "Muse is the brain. Reply by POSTing /api/grok/ingest.",
    }),
    signal: AbortSignal.timeout(8000),
  });
  return response.ok;
}

async function askXai(ask: GrokAsk): Promise<GrokReply | null> {
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
            "You are a tool called by a Muse agent. One short sentence. No chain of thought. End with WATCH, PASS, or BUY.",
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
  return { source: "xai", summary: summary.slice(0, 140), bias: classify(summary) };
}

export async function askGrok(ask: GrokAsk): Promise<GrokReply> {
  const woken = await wakeGrokBot(ask).catch(() => false);
  const xai = await askXai(ask).catch(() => null);
  if (xai) {
    return xai;
  }
  if (woken) {
    return {
      source: "bot",
      summary: "Grok Bot woken — waiting on ingest",
      bias: "watch",
    };
  }
  return {
    source: "sim",
    summary: "no Grok key — SIM context only",
    bias: "watch",
  };
}
