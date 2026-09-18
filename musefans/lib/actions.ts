"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  clearSessionCookie,
  currentUser,
  setAgeCookie,
  setSessionCookie,
} from "./auth";
import { getMuse } from "./catalog";
import { hashPassword, verifyPassword } from "./crypto";
import { mutateState } from "./store";

const emailSchema = z.string().trim().email().max(160).toLowerCase();
const passwordSchema = z.string().min(8).max(128);
const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]+$/);

function newId() {
  return crypto.randomUUID();
}

export async function confirmAge() {
  await setAgeCookie();
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function registerAccount(email: string, password: string) {
  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse({ email, password });
  if (!parsed.success) return { ok: false as const, error: "Email or password is wrong." };
  const passwordHash = await hashPassword(parsed.data.password);
  const result = await mutateState((state) => {
    if (state.users.some((user) => user.email === parsed.data.email)) {
      return { ok: false as const, error: "That email is already on file." };
    }
    const userId = newId();
    state.users.push({
      id: userId,
      email: parsed.data.email,
      password_hash: passwordHash,
      created_at: Date.now(),
    });
    const sessionId = newId();
    state.sessions.push({
      id: sessionId,
      user_id: userId,
      created_at: Date.now(),
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
    return { ok: true as const, sessionId };
  });
  if (!result.ok) return result;
  await setSessionCookie(result.sessionId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function loginAccount(email: string, password: string) {
  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse({ email, password });
  if (!parsed.success) return { ok: false as const, error: "Email or password is wrong." };
  const result = await mutateState((state) => {
    const user = state.users.find((row) => row.email === parsed.data.email);
    return { user };
  });
  if (!result.user || !(await verifyPassword(parsed.data.password, result.user.password_hash))) {
    return { ok: false as const, error: "Email or password is wrong." };
  }
  const sessionId = newId();
  await mutateState((state) => {
    state.sessions.push({
      id: sessionId,
      user_id: result.user!.id,
      created_at: Date.now(),
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
  });
  await setSessionCookie(sessionId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function logoutAccount() {
  const user = await currentUser();
  if (user) {
    await mutateState((state) => {
      state.sessions = state.sessions.filter((session) => session.user_id !== user.id);
    });
  }
  await clearSessionCookie();
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function subscribeMuse(handle: string) {
  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) return { ok: false as const, error: "missing" as const };
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const muse = getMuse(parsed.data);
  if (!muse) return { ok: false as const, error: "missing" as const };
  await mutateState((state) => {
    const exists = state.subscriptions.some(
      (row) => row.user_id === user.id && row.muse_handle === muse.handle,
    );
    if (!exists) {
      state.subscriptions.push({
        user_id: user.id,
        muse_handle: muse.handle,
        created_at: Date.now(),
      });
    }
  });
  revalidatePath(`/m/${muse.handle}`);
  revalidatePath("/feed");
  revalidatePath("/account");
  return { ok: true as const };
}

export async function tipMuse(handle: string, amountCents: 500 | 1000 | 2500) {
  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) return { ok: false as const, error: "missing" as const };
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const muse = getMuse(parsed.data);
  if (!muse) return { ok: false as const, error: "missing" as const };
  await mutateState((state) => {
    state.tips.push({
      id: newId(),
      user_id: user.id,
      muse_handle: muse.handle,
      amount_cents: amountCents,
      created_at: Date.now(),
    });
  });
  revalidatePath(`/m/${muse.handle}`);
  revalidatePath("/account");
  return { ok: true as const };
}

export async function sendNote(handle: string, body: string) {
  const parsed = z
    .object({ handle: handleSchema, body: z.string().trim().min(1).max(500) })
    .safeParse({ handle, body });
  if (!parsed.success) return { ok: false as const, error: "missing" as const };
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const muse = getMuse(parsed.data.handle);
  if (!muse) return { ok: false as const, error: "missing" as const };
  await mutateState((state) => {
    const now = Date.now();
    state.messages.push({
      id: newId(),
      user_id: user.id,
      muse_handle: muse.handle,
      body: parsed.data.body,
      image_path: null,
      visibility: "free",
      price_cents: 0,
      from_muse: 0,
      created_at: now,
    });
    const museNotes = state.messages.filter(
      (row) => row.user_id === user.id && row.muse_handle === muse.handle && row.from_muse === 1,
    );
    if (museNotes.length === 0) {
      state.messages.push({
        id: newId(),
        user_id: user.id,
        muse_handle: muse.handle,
        body: "A still I kept off the grid.",
        image_path: muse.avatar_path.replace("-portrait.png", "-locked-1.png"),
        visibility: "ppv",
        price_cents: 300,
        from_muse: 1,
        created_at: now + 1,
      });
    }
  });
  revalidatePath("/messages");
  return { ok: true as const };
}

export async function unlockNote(messageId: string) {
  const parsed = z.string().uuid().safeParse(messageId);
  if (!parsed.success) return { ok: false as const, error: "missing" as const };
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const result = await mutateState((state) => {
    const message = state.messages.find((row) => row.id === parsed.data);
    if (!message || message.user_id !== user.id) return { ok: false as const, error: "missing" as const };
    const exists = state.unlocks.some((row) => row.user_id === user.id && row.message_id === message.id);
    if (!exists) {
      state.unlocks.push({ user_id: user.id, message_id: message.id, created_at: Date.now() });
    }
    return { ok: true as const };
  });
  revalidatePath("/messages");
  return result;
}
