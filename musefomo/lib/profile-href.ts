export function museProfileHref(idOrHandle: string): string {
  return `/agent/${encodeURIComponent(stripHandle(idOrHandle))}`;
}

export function humanProfileHref(handle: string): string {
  return `/profile/${encodeURIComponent(stripHandle(handle))}`;
}

export function humanBoardHref(entry: { handle?: string | null; id?: string | null }): string | null {
  const slug = entry.handle || entry.id;
  return slug ? humanProfileHref(slug) : null;
}

export function actorProfileHref(actor: {
  kind?: "agent" | "human" | "token" | null;
  handle?: string | null;
  id?: string | null;
}): string | null {
  if (actor.kind === "agent") {
    const slug = actor.id || actor.handle;
    return slug ? museProfileHref(slug) : null;
  }
  const slug = actor.handle || actor.id;
  return slug ? humanProfileHref(slug) : null;
}

export function stripHandle(value: string): string {
  return value.replace(/^@/, "").trim();
}
