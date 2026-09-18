import { get, put } from "@vercel/blob";

import type { FanState } from "./types";

const STATE_PATH = "musefans-state.json";

const emptyState = (): FanState => ({
  users: [],
  sessions: [],
  subscriptions: [],
  tips: [],
  messages: [],
  unlocks: [],
});

type GlobalStore = {
  __musefansState?: FanState;
};

function memoryState() {
  const globalStore = globalThis as typeof globalThis & GlobalStore;
  if (!globalStore.__musefansState) {
    globalStore.__musefansState = emptyState();
  }
  return globalStore.__musefansState;
}

function canUseBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL_OIDC_TOKEN);
}

async function streamToText(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return "";
  return new Response(stream).text();
}

export async function loadState(): Promise<FanState> {
  if (!canUseBlob()) {
    return structuredClone(memoryState());
  }
  const result = await get(STATE_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return emptyState();
  }
  const text = await streamToText(result.stream);
  if (!text) return emptyState();
  return JSON.parse(text) as FanState;
}

export async function saveState(state: FanState) {
  if (!canUseBlob()) {
    (globalThis as typeof globalThis & GlobalStore).__musefansState = structuredClone(state);
    return;
  }
  await put(STATE_PATH, JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function mutateState<T>(fn: (state: FanState) => T): Promise<T> {
  const state = await loadState();
  const result = fn(state);
  await saveState(state);
  return result;
}
