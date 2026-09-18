import { getAdminStore } from "@/lib/db/singleton";
import { crcResponseToken, parseAccountActivity, safeEqual } from "@/lib/x/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function webhookEnv(): { secret?: string; botUserId?: string; consumerSecret?: string } {
  return {
    secret: process.env.X_WEBHOOK_SECRET,
    botUserId: process.env.X_BOT_USER_ID,
    consumerSecret: process.env.X_API_SECRET,
  };
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const crc = url.searchParams.get("crc_token");
  if (!crc) return Response.json({ error: "missing crc_token" }, { status: 400 });
  const consumerSecret = webhookEnv().consumerSecret;
  if (!consumerSecret) {
    return Response.json({ error: "X_API_SECRET not configured" }, { status: 501 });
  }
  return Response.json({ response_token: crcResponseToken(crc, consumerSecret) });
}

export async function POST(req: Request): Promise<Response> {
  const extra = webhookEnv().secret;
  if (extra) {
    const header = req.headers.get("x-webhook-secret") ?? "";
    if (!header || !safeEqual(header, extra)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json().catch(() => null);
  const events = parseAccountActivity(payload, webhookEnv().botUserId);
  const store = getAdminStore();
  await store.migrate();
  const received = Date.now();
  let ingested = 0;
  for (const event of events) {
    const claimed = await store.claimTrigger({
      triggerTweetId: event.triggerTweetId,
      triggerTweetUrl: event.triggerTweetUrl,
      triggerText: event.triggerText,
      requesterXId: event.requesterXId,
      requesterUsername: event.requesterUsername,
      eventReceivedMs: received,
    });
    if (!claimed) continue;
    await store.update(event.triggerTweetId, {
      sourceTweetId: event.sourceTweetId,
      sourceTweetUrl: event.sourceTweetUrl,
      sourceUsername: event.sourceUsername,
      sourceText: event.sourceText,
      sourceMedia: event.sourceMedia,
    });
    ingested += 1;
  }
  return Response.json({ ok: true, ingested });
}
