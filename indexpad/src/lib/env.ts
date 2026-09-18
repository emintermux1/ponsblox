function read(name: string): string {
  return (process.env[name] || "").trim();
}

function publicRead(name: string): string {
  if (!name.startsWith("NEXT_PUBLIC_")) {
    throw new Error(`${name} is not a public env key`);
  }
  return read(name);
}

export function publicEnv(name: string, fallback: string): string {
  return publicRead(name) || fallback;
}

export function optionalPublicEnv(name: string): string {
  return publicRead(name);
}

export function serverEnv(name: string): string {
  if (name.startsWith("NEXT_PUBLIC_")) {
    return read(name);
  }
  return read(name);
}

export function requireServerEnv(name: string): string {
  const value = serverEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
