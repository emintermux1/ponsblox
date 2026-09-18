import { loadDatabaseUrl } from "../config.js";
import { Store } from "./store.js";

let store: Store | null = null;

export function getAdminStore(): Store {
  if (!store) {
    store = new Store(loadDatabaseUrl());
  }
  return store;
}
