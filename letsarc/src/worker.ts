import { loadWorkerEnv } from "./lib/config.js";
import { Store } from "./lib/db/store.js";
import { LaunchPipeline } from "./lib/pipeline.js";
import { assertPortalReady } from "./lib/argus/launch.js";
import { startFilteredMentionStream } from "./lib/x/stream.js";

async function main(): Promise<void> {
  const env = loadWorkerEnv();
  const store = new Store(env.DATABASE_URL);
  await store.migrate();

  const pipeline = new LaunchPipeline(env, store);
  await assertPortalReady(pipeline.publicClient);
  await store.setMeta("launcher_address", pipeline.launcherAddress);
  console.log(`[worker] launcher ${pipeline.launcherAddress}`);
  console.log(`[worker] bot @${env.X_BOT_USERNAME} (${env.X_BOT_USER_ID})`);

  let streamStop: (() => Promise<void>) | null = null;
  if (env.X_BEARER_TOKEN) {
    try {
      const stream = await startFilteredMentionStream({
        bearerToken: env.X_BEARER_TOKEN,
        botUsername: env.X_BOT_USERNAME,
        onMention: (event) => pipeline.handleMention(event),
        onError: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          void store.setMeta("x_last_error", message.slice(0, 400));
          console.error("[stream]", error);
        },
      });
      streamStop = stream.stop;
      await store.setMeta("x_transport", "filtered_stream");
      console.log("[worker] X filtered stream connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[worker] filtered stream unavailable, polling: ${message}`);
      await store.setMeta("x_transport", "poll");
    }
  } else {
    await store.setMeta("x_transport", "poll");
    console.log("[worker] X mention poll every", env.POLL_INTERVAL_MS, "ms");
  }

  const transport = await store.getMeta("x_transport");
  let pollDelay = env.POLL_INTERVAL_MS;

  const heartbeat = async () => {
    await store.setMeta("worker_heartbeat_ms", String(Date.now()));
  };

  const pendingTick = async () => {
    try {
      await pipeline.processPending();
    } catch (err) {
      console.error("[pending]", err);
    }
  };

  const pollTick = async () => {
    if (transport === "filtered_stream") return;
    try {
      await pipeline.pollOnce();
      pollDelay = env.POLL_INTERVAL_MS;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/429|rate limit/i.test(message)) {
        pollDelay = Math.min(60_000, Math.max(pollDelay * 2, 5_000));
        console.warn(`[poll] rate limited, next in ${pollDelay}ms`);
      } else {
        console.error("[poll]", err);
      }
    }
  };

  await heartbeat();
  await pendingTick();
  await pollTick();

  const pendingTimer = setInterval(() => {
    void pendingTick();
  }, 250);
  const beatTimer = setInterval(() => {
    void heartbeat();
  }, 5_000);

  let pollTimer: ReturnType<typeof setTimeout>;
  const schedulePoll = () => {
    pollTimer = setTimeout(() => {
      void pollTick().finally(schedulePoll);
    }, pollDelay);
  };
  schedulePoll();

  const shutdown = async () => {
    clearInterval(pendingTimer);
    clearTimeout(pollTimer);
    clearInterval(beatTimer);
    if (streamStop) await streamStop();
    await store.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
