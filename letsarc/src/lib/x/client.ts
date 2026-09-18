import { TwitterApi } from "twitter-api-v2";
import type { WorkerEnv } from "../config.js";

export function createTwitterClient(env: WorkerEnv): TwitterApi {
  return new TwitterApi({
    appKey: env.X_API_KEY,
    appSecret: env.X_API_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessSecret: env.X_ACCESS_TOKEN_SECRET,
  });
}

export function tweetUrl(username: string, id: string): string {
  return `https://x.com/${username}/status/${id}`;
}
