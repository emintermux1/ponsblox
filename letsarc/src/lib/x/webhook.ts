import { createHmac, timingSafeEqual } from "node:crypto";
import { tweetUrl } from "./client.js";
import type { MentionEvent } from "./mentions.js";

export function crcResponseToken(
  crcToken: string,
  consumerSecret: string,
): string {
  const hmac = createHmac("sha256", consumerSecret)
    .update(crcToken)
    .digest("base64");
  return `sha256=${hmac}`;
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

type ActivityUser = {
  id_str?: string;
  screen_name?: string;
};

type ActivityTweet = {
  id_str?: string;
  id?: string | number;
  text?: string;
  full_text?: string;
  user?: ActivityUser;
  in_reply_to_status_id_str?: string | null;
  in_reply_to_screen_name?: string | null;
  entities?: {
    media?: Array<{ type?: string; media_url_https?: string }>;
  };
  extended_entities?: {
    media?: Array<{ type?: string; media_url_https?: string }>;
  };
};

type ActivityPayload = {
  for_user_id?: string;
  tweet_create_events?: ActivityTweet[];
};

function photoFrom(tweet: ActivityTweet): string | null {
  const media =
    tweet.extended_entities?.media ?? tweet.entities?.media ?? [];
  const photo = media.find((m) => m.type === "photo" && m.media_url_https);
  return photo?.media_url_https ?? null;
}

export function parseAccountActivity(
  payload: unknown,
  botUserId?: string,
): MentionEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as ActivityPayload;
  if (botUserId && body.for_user_id && body.for_user_id !== botUserId) {
    return [];
  }
  const tweets = body.tweet_create_events ?? [];
  const events: MentionEvent[] = [];
  for (const tweet of tweets) {
    const id = String(tweet.id_str ?? tweet.id ?? "");
    const username = tweet.user?.screen_name ?? "unknown";
    const userId = tweet.user?.id_str ?? "";
    const text = tweet.full_text ?? tweet.text ?? "";
    if (!id || !userId) continue;
    const parentId = tweet.in_reply_to_status_id_str ?? null;
    const parentUser = tweet.in_reply_to_screen_name ?? null;
    events.push({
      triggerTweetId: id,
      triggerTweetUrl: tweetUrl(username, id),
      triggerText: text,
      requesterXId: userId,
      requesterUsername: username,
      sourceTweetId: parentId,
      sourceTweetUrl:
        parentId && parentUser ? tweetUrl(parentUser, parentId) : null,
      sourceUsername: parentUser,
      sourceText: null,
      sourceMedia: photoFrom(tweet),
    });
  }
  return events;
}
