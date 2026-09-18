import { cookies } from "next/headers";

import { loadState } from "./store";
import type { UserRow } from "./types";

const SESSION_COOKIE = "mf_session";
const AGE_COOKIE = "mf_age";

export async function isAged() {
  const jar = await cookies();
  return jar.get(AGE_COOKIE)?.value === "1";
}

export async function getSessionId() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function setAgeCookie() {
  const jar = await cookies();
  jar.set(AGE_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    secure: Boolean(process.env.VERCEL),
  });
}

export async function setSessionCookie(sessionId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: Boolean(process.env.VERCEL),
    httpOnly: true,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<UserRow | null> {
  const sessionId = await getSessionId();
  if (!sessionId) return null;
  const state = await loadState();
  const session = state.sessions.find(
    (row) => row.id === sessionId && row.expires_at > Date.now(),
  );
  if (!session) return null;
  return state.users.find((user) => user.id === session.user_id) ?? null;
}
