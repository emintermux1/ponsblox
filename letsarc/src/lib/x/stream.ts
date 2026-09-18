import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";
import { mapMentionTweets, type MentionEvent } from "./mentions.js";

const RULE_TAG = "letsarc-mentions";

export async function startFilteredMentionStream(args: {
  bearerToken: string;
  botUsername: string;
  onMention: (event: MentionEvent) => Promise<void>;
  onError?: (error: unknown) => void;
}): Promise<{ stop: () => Promise<void> }> {
  const client = new TwitterApi(args.bearerToken);
  const ro = client.readOnly;
  const existing = await ro.v2.streamRules();
  const stale = (existing.data ?? [])
    .filter((rule) => rule.tag === RULE_TAG)
    .map((rule) => rule.id);
  if (stale.length) {
    await ro.v2.updateStreamRules({ delete: { ids: stale } });
  }
  await ro.v2.updateStreamRules({
    add: [
      {
        value: `@${args.botUsername} -is:retweet`,
        tag: RULE_TAG,
      },
    ],
  });

  const stream = await ro.v2.searchStream({
    autoConnect: true,
    expansions: [
      "author_id",
      "attachments.media_keys",
      "referenced_tweets.id",
      "referenced_tweets.id.author_id",
      "referenced_tweets.id.attachments.media_keys",
    ],
    "tweet.fields": [
      "created_at",
      "author_id",
      "text",
      "referenced_tweets",
      "attachments",
      "conversation_id",
    ],
    "user.fields": ["username"],
    "media.fields": ["type", "url", "preview_image_url"],
  });

  stream.autoReconnect = true;
  stream.on(ETwitterStreamEvent.Data, async (payload) => {
    try {
      const tweet = payload.data;
      if (!tweet) return;
      const events = mapMentionTweets({
        tweets: [tweet],
        users: payload.includes?.users,
        media: payload.includes?.media,
        extras: payload.includes?.tweets,
      });
      for (const event of events) {
        await args.onMention(event);
      }
    } catch (error) {
      args.onError?.(error);
    }
  });
  stream.on(ETwitterStreamEvent.Error, (error) => {
    args.onError?.(error);
  });

  return {
    stop: async () => {
      stream.autoReconnect = false;
      stream.close();
    },
  };
}
