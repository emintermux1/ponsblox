import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const stub = pathToFileURL(path.join(import.meta.dirname, "server-only-stub.mjs")).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: stub, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    return nextResolve(pathToFileURL(path.join(root, specifier.slice(2))).href, context);
  }
  return nextResolve(specifier, context);
}
