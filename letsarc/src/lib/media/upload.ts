import { solidPng } from "./png.js";

const ARGUS_UPLOAD = "https://argus.world/api/upload";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Production Argus create form posts here. GET /api/upload returns { pinning: true }. */
export async function uploadToArgus(args: {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  description?: string;
}): Promise<string> {
  let lastError = "Argus upload failed";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from(args.bytes)], { type: args.contentType }),
      args.filename,
    );
    if (args.description) form.append("description", args.description);
    const res = await fetch(ARGUS_UPLOAD, { method: "POST", body: form });
    if (res.ok) {
      const json = (await res.json()) as { uri?: string };
      if (!json.uri) throw new Error("Argus upload returned no uri");
      return json.uri;
    }
    lastError = `Argus upload failed (${res.status}): ${await res.text()}`;
    if (res.status !== 429 && res.status < 500) break;
    await sleep(400 * attempt);
  }
  throw new Error(lastError);
}

export async function uploadToPinata(args: {
  jwt: string;
  bytes: Uint8Array;
  filename: string;
  contentType: string;
}): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(args.bytes)], { type: args.contentType }),
    args.filename,
  );
  form.append("pinataMetadata", JSON.stringify({ name: args.filename }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${args.jwt}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Pinata upload failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error("Pinata response missing IpfsHash");
  return `ipfs://${json.IpfsHash}`;
}

/** 64×64 orange PNG so a launch is never blocked on missing tweet media. */
export function placeholderPng(): {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
} {
  return {
    bytes: solidPng({ width: 64, height: 64, r: 255, g: 106, b: 0 }),
    contentType: "image/png",
    filename: "letsarc.png",
  };
}

function safeHttpsUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.toString().length > 500) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function resolveImageUri(args: {
  sourceMedia: string | null;
  description: string;
  pinataJwt?: string;
}): Promise<string> {
  const direct = args.sourceMedia ? safeHttpsUrl(args.sourceMedia) : null;
  if (direct) return direct;

  const file = placeholderPng();
  try {
    return await uploadToArgus({
      bytes: file.bytes,
      filename: file.filename,
      contentType: file.contentType,
      description: args.description,
    });
  } catch (err) {
    if (!args.pinataJwt) throw err;
    return uploadToPinata({
      jwt: args.pinataJwt,
      bytes: file.bytes,
      filename: file.filename,
      contentType: file.contentType,
    });
  }
}
