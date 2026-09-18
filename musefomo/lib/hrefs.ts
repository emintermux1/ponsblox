import type { FeedActor } from "@/lib/types";
import { actorProfileHref, humanProfileHref, museProfileHref } from "@/lib/profile-href";

export function museHref(idOrHandle: string): string {
  return museProfileHref(idOrHandle);
}

export function humanHref(handleOrId: string): string {
  return humanProfileHref(handleOrId);
}

export function actorHref(actor: Pick<FeedActor, "id" | "handle" | "kind">): string | null {
  return actorProfileHref(actor);
}
