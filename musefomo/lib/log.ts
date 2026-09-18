type LogFields = Record<string, string | number | boolean | null | undefined>;

const SECRET_KEY = /secret|token|password|authorization|cookie|private[_-]?key|api[_-]?key|pepper|bearer/i;

function scrub(fields: LogFields): Record<string, string | number | boolean | null> {
  const next: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEY.test(key)) continue;
    if (value === undefined) continue;
    next[key] = value;
  }
  return next;
}

export function logInfo(event: string, fields: LogFields = {}) {
  console.info(JSON.stringify({ level: "info", event, ...scrub(fields) }));
}

export function logWarn(event: string, fields: LogFields = {}) {
  console.warn(JSON.stringify({ level: "warn", event, ...scrub(fields) }));
}

export function logError(event: string, fields: LogFields = {}) {
  console.error(JSON.stringify({ level: "error", event, ...scrub(fields) }));
}

export function safeLog(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  switch (level) {
    case "info":
      logInfo(event, fields);
      return;
    case "warn":
      logWarn(event, fields);
      return;
    case "error":
      logError(event, fields);
      return;
    default: {
      const _never: never = level;
      return _never;
    }
  }
}
