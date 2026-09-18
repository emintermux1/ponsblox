import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pinRecord(cid: string) {
  const hash = cid.trim();
  if (!hash) throw new Error("Pinata returned no CID");
  return {
    cid: hash,
    uri: `ipfs://${hash}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
  };
}

async function pinBytes(bytes: Uint8Array, filename: string, contentType: string) {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) throw new Error("Image upload is not configured. Set PINATA_JWT or paste an https:// / ipfs:// link.");
  const form = new FormData();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  form.append("file", new Blob([copy], { type: contentType || "application/octet-stream" }), filename || "image");
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Pinata: ${text.slice(0, 180)}`);
  const json = JSON.parse(text) as { IpfsHash?: string };
  return pinRecord(json.IpfsHash || "");
}

export async function GET() {
  const jwt = Boolean(process.env.PINATA_JWT?.trim());
  return NextResponse.json({
    configured: jwt,
    note: jwt ? "Pinata pinFileToIPFS" : "Set PINATA_JWT to enable uploads.",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      filename?: string;
      contentType?: string;
      data?: string;
    };
    if (!body.data) throw new Error("Missing file data");
    const raw = body.data.includes(",") ? body.data.slice(body.data.indexOf(",") + 1) : body.data;
    const bytes = Uint8Array.from(Buffer.from(raw, "base64"));
    const pin = await pinBytes(bytes, body.filename || "image", body.contentType || "application/octet-stream");
    return NextResponse.json(pin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPFS upload failed";
    const status = /not configured/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
