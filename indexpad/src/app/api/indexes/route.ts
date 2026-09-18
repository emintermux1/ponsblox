import { createIndex, getPonsIndexes } from "@/lib/indexpad/indexes";
import type { CreateIndexInput } from "@/types";

export async function GET() {
  const result = await getPonsIndexes();
  return Response.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | (CreateIndexInput & { creator?: string; logos?: Record<string, string> })
    | null;
  if (!body) {
    return Response.json(
      { ok: false, code: "invalid", message: "JSON body required" },
      { status: 400 },
    );
  }
  const { creator, logos, ...input } = body;
  const result = await createIndex(input, { creator, logos });
  const status = result.ok
    ? 201
    : result.code === "not_configured"
      ? 503
      : result.code === "invalid"
        ? 400
        : result.code === "rejected"
          ? 401
          : 502;
  return Response.json(result, { status });
}
