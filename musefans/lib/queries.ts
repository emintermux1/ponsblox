import { currentUser, isAged } from "./auth";
import { getMuse, listMuses, postsFor } from "./catalog";
import { loadState } from "./store";
import type { MusePostView, ThreadMessage } from "./types";

export async function getGateState() {
  const user = await currentUser();
  return {
    aged: await isAged(),
    user: user ? { id: user.id, email: user.email } : null,
  };
}

export async function getHomeCatalog() {
  const user = await currentUser();
  const state = user ? await loadState() : null;
  const mine = new Set(
    state && user
      ? state.subscriptions.filter((row) => row.user_id === user.id).map((row) => row.muse_handle)
      : [],
  );
  const muses = listMuses().map((muse) => ({
    ...muse,
    subscribed: mine.has(muse.handle),
    posts: postsFor(muse.handle).length,
  }));
  const feed = user
    ? muses
        .filter((muse) => muse.subscribed)
        .flatMap((muse) =>
          postsFor(muse.handle).map((post) => ({
            ...post,
            display_name: muse.display_name,
            avatar_path: muse.avatar_path,
          })),
        )
        .sort((a, b) => b.created_at - a.created_at)
    : [];
  return {
    signedIn: Boolean(user),
    muses,
    feed,
  };
}

export async function getMusePage(handle: string) {
  const muse = getMuse(handle);
  if (!muse) return { ok: false as const, error: "missing" as const };
  const user = await currentUser();
  const state = await loadState();
  const subscribed = user
    ? state.subscriptions.some((row) => row.user_id === user.id && row.muse_handle === muse.handle)
    : false;
  const posts: MusePostView[] = postsFor(muse.handle).map((post) => {
    const open = post.visibility === "free" || subscribed;
    return { ...post, open };
  });
  return { ok: true as const, muse, subscribed, posts };
}

export async function getFeed() {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const state = await loadState();
  const handles = new Set(
    state.subscriptions.filter((row) => row.user_id === user.id).map((row) => row.muse_handle),
  );
  const posts = listMuses()
    .flatMap((muse) => postsFor(muse.handle))
    .filter((post) => handles.has(post.muse_handle))
    .sort((a, b) => b.created_at - a.created_at);
  return { ok: true as const, posts };
}

export async function getAccount() {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const state = await loadState();
  const subscriptions = state.subscriptions
    .filter((row) => row.user_id === user.id)
    .map((row) => {
      const muse = getMuse(row.muse_handle);
      return muse
        ? {
            handle: muse.handle,
            display_name: muse.display_name,
            avatar_path: muse.avatar_path,
            price_cents: muse.price_cents,
            created_at: row.created_at,
          }
        : null;
    })
    .filter((row) => row !== null)
    .sort((a, b) => b.created_at - a.created_at);
  const tips = state.tips
    .filter((row) => row.user_id === user.id)
    .map((row) => ({
      id: row.id,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      display_name: getMuse(row.muse_handle)?.display_name ?? row.muse_handle,
    }))
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 20);
  return { ok: true as const, email: user.email, subscriptions, tips };
}

export async function getInbox() {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const state = await loadState();
  const byHandle = new Map<string, number>();
  for (const message of state.messages) {
    if (message.user_id !== user.id) continue;
    const last = byHandle.get(message.muse_handle) ?? 0;
    if (message.created_at > last) byHandle.set(message.muse_handle, message.created_at);
  }
  const threads = [...byHandle.entries()]
    .map(([handle, last_at]) => {
      const muse = getMuse(handle);
      if (!muse) return null;
      return {
        handle: muse.handle,
        display_name: muse.display_name,
        avatar_path: muse.avatar_path,
        last_at,
      };
    })
    .filter((row) => row !== null)
    .sort((a, b) => b.last_at - a.last_at);
  return { ok: true as const, threads };
}

export async function getThread(handle: string) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "auth" as const };
  const muse = getMuse(handle);
  if (!muse) return { ok: false as const, error: "missing" as const };
  const state = await loadState();
  const openIds = new Set(
    state.unlocks.filter((row) => row.user_id === user.id).map((row) => row.message_id),
  );
  const messages: ThreadMessage[] = state.messages
    .filter((row) => row.user_id === user.id && row.muse_handle === muse.handle)
    .sort((a, b) => a.created_at - b.created_at)
    .map((row) => {
      const open = row.visibility === "free" || openIds.has(row.id);
      return {
        ...row,
        open,
        image_path: row.image_path && open ? row.image_path : row.image_path && !open ? null : row.image_path,
        body: open ? row.body : "Locked note. Unlock to read.",
      };
    });
  return { ok: true as const, muse, messages };
}
