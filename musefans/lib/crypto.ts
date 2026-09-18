function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2:100000:${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterRaw, saltHex, hashHex] = stored.split(":");
  if (scheme !== "pbkdf2" || !iterRaw || !saltHex || !hashHex) return false;
  const iterations = Number.parseInt(iterRaw, 10);
  if (!Number.isFinite(iterations)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations, hash: "SHA-256" },
    key,
    256,
  );
  const next = toHex(new Uint8Array(bits));
  if (next.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < next.length; i += 1) {
    diff |= next.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
