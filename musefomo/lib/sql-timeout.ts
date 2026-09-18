export type CancellableQuery = PromiseLike<unknown> & { cancel?: () => void };

export function cancelQuery(query: unknown): void {
  if (
    query &&
    typeof query === "object" &&
    "cancel" in query &&
    typeof (query as { cancel: unknown }).cancel === "function"
  ) {
    try {
      (query as { cancel: () => void }).cancel();
    } catch {
      // ignore a cancel that races the socket close
    }
  }
}

/** Await rows, or cancel the leftover query and return [] when the public budget expires. */
export async function queryRowsBudget<T>(result: CancellableQuery, ms: number): Promise<T[]> {
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T[]>((resolve) => {
    timer = setTimeout(() => {
      if (!finished) cancelQuery(result);
      resolve([]);
    }, ms);
  });
  try {
    return await Promise.race([Promise.resolve(result).then((rows) => rows as T[]), timeout]);
  } catch {
    return [];
  } finally {
    finished = true;
    if (timer) clearTimeout(timer);
  }
}
