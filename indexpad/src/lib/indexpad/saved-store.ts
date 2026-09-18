import { readSavedSlugs } from "./store";

export { readSavedSlugs, toggleSavedIndex } from "./store";

export function isIndexSaved(wallet: string, slug: string): boolean {
  return readSavedSlugs(wallet).includes(slug);
}
