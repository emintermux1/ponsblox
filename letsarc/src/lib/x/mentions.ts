import type { TwitterApi } from "twitter-api-v2";
import type {
  MediaObjectV2,
  TweetV2,
  UserV2,
} from "twitter-api-v2";
import { tweetUrl } from "./client.js";

export type MentionEvent = {
  triggerTweetId: string;
  triggerTweetUrl: string;
  triggerText: string;
  requesterXId: string;
  requesterUsername: string;
  sourceTweetId: string | null;
  sourceTweetUrl: string | null;
  sourceUsername: string | null;
  sourceText: string | null;
  sourceMedia: string | null;
};

const TWEET_FIELDS = [
  "created_at",
  "author_id",
  "text",
  "referenced_tweets",
  "attachments",
  "conversation_id",
] as const;

const EXPANSIONS = [
  "author_id",
  "attachments.media_keys",
  "referenced_tweets.id",
  "referenced_tweets.id.author_id",
  "referenced_tweets.id.attachments.media_keys",
] as const;

export function mapMentionTweets(args: {
  tweets: TweetV2[];
  users?: UserV2[];
  media?: MediaObjectV2[];
  extras?: TweetV2[];
}): MentionEvent[] {
  const users = args.users ?? [];
  const media = args.media ?? [];
  const extras = args.extras ?? [];

  const userName = (id: string | undefined): string =>
    users.find((u) => u.id === id)?.username ?? "unknown";

  const imageFor = (keys: string[] | undefined): string | null => {
    if (!keys?.length) return null;
    for (const key of keys) {
      const item = media.find((m) => m.media_key === key);
      if (item?.type === "photo" && item.url) return item.url;
    }
    return null;
  };

  return args.tweets
    .map((tweet) => {
      const reply = tweet.referenced_tweets?.find((r) => r.type === "replied_to");
      const parent = reply
        ? (extras.find((t) => t.id === reply.id) ?? null)
        : null;
      const requesterUsername = userName(tweet.author_id);
      const sourceUsername = parent ? userName(parent.author_id) : null;
      return {
        triggerTweetId: tweet.id,
        triggerTweetUrl: tweetUrl(requesterUsername, tweet.id),
        triggerText: tweet.text,
        requesterXId: tweet.author_id ?? "",
        requesterUsername,
        sourceTweetId: parent?.id ?? reply?.id ?? null,
        sourceTweetUrl:
          parent && sourceUsername ? tweetUrl(sourceUsername, parent.id) : null,
        sourceUsername,
        sourceText: parent?.text ?? null,
        sourceMedia:
          imageFor(parent?.attachments?.media_keys) ??
          imageFor(tweet.attachments?.media_keys),
      } satisfies MentionEvent;
    })
    .filter((t) => t.requesterXId)
    .sort((a, b) =>
      BigInt(a.triggerTweetId) < BigInt(b.triggerTweetId) ? -1 : 1,
    );
}

export async function fetchMentionReplies(args: {
  client: TwitterApi;
  botUserId: string;
  sinceId?: string | null;
}): Promise<MentionEvent[]> {
  const timeline = await args.client.v2.userMentionTimeline(args.botUserId, {
    since_id: args.sinceId ?? undefined,
    max_results: 20,
    expansions: [...EXPANSIONS],
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": ["username"],
    "media.fields": ["type", "url", "preview_image_url"],
  });

  return mapMentionTweets({
    tweets: timeline.data.data ?? [],
    users: timeline.data.includes?.users,
    media: timeline.data.includes?.media,
    extras: timeline.data.includes?.tweets,
  });
}

export async function hydrateMention(args: {
  client: TwitterApi;
  tweetId: string;
}): Promise<MentionEvent | null> {
  const res = await args.client.v2.singleTweet(args.tweetId, {
    expansions: [...EXPANSIONS],
    "tweet.fields": [...TWEET_FIELDS],
    "user.fields": ["username"],
    "media.fields": ["type", "url", "preview_image_url"],
  });
  const tweet = res.data;
  if (!tweet) return null;
  const mapped = mapMentionTweets({
    tweets: [tweet],
    users: res.includes?.users,
    media: res.includes?.media,
    extras: res.includes?.tweets,
  });
  return mapped[0] ?? null;
}

export async function replyToTweet(args: {
  client: TwitterApi;
  tweetId: string;
  text: string;
}): Promise<string> {
  const res = await args.client.v2.reply(args.text, args.tweetId);
  return res.data.id;
}
