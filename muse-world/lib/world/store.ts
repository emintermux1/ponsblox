import { seedWorld } from "@/lib/world/defaults";
import type { WorldSnapshot } from "@/types/world";

type Listener = (state: WorldSnapshot) => void;

let snapshot = seedWorld();
const listeners = new Set<Listener>();

export function getWorld(): WorldSnapshot {
  return snapshot;
}

export function setWorld(next: WorldSnapshot): void {
  snapshot = next;
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function patchWorld(
  patch: (current: WorldSnapshot) => WorldSnapshot,
): WorldSnapshot {
  snapshot = patch(snapshot);
  for (const listener of listeners) {
    listener(snapshot);
  }
  return snapshot;
}

export function subscribeWorld(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}
