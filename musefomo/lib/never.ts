export function assertNever(value: never, label = "value"): never {
  throw new Error(`unhandled ${label}`);
}
