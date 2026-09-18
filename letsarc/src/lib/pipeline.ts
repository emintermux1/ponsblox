import type { Hex } from "viem";
import type { WorkerEnv } from "./config.js";
import { Store } from "./db/store.js";
import { parseLaunchCommand } from "./parse/tweet.js";
import {
  createArcClients,
  getNativeBalance,
  launchOnArgus,
  reconcileLaunch,
} from "./argus/launch.js";
import { resolveImageUri } from "./media/upload.js";
import { formatLiveReply } from "./bot/reply.js";
import { createTwitterClient } from "./x/client.js";
import {
  fetchMentionReplies,
  hydrateMention,
  replyToTweet,
  type MentionEvent,
} from "./x/mentions.js";
import type { LaunchRow } from "./types.js";

function logLatency(row: LaunchRow): void {
  console.log(
    JSON.stringify({
      trigger: row.triggerTweetId,
      event_received_ms: row.eventReceivedMs,
      tweet_resolved_ms: row.tweetResolvedMs,
      parsed_ms: row.parsedMs,
      transaction_submitted_ms: row.transactionSubmittedMs,
      transaction_confirmed_ms: row.transactionConfirmedMs,
      reply_posted_ms: row.replyPostedMs,
      total_launch_ms: row.totalLaunchMs,
    }),
  );
}

export class LaunchPipeline {
  private chain;
  private readonly twitter;
  private queue: Promise<void> = Promise.resolve();
  private readonly inflight = new Set<string>();

  constructor(
    private readonly env: WorkerEnv,
    private readonly store: Store,
  ) {
    this.chain = createArcClients({
      privateKey: env.LAUNCHER_PRIVATE_KEY,
      rpcUrl: env.ARC_RPC_URL,
    });
    this.twitter = createTwitterClient(env);
  }

  get launcherAddress(): string {
    return this.chain.account.address;
  }

  get publicClient() {
    return this.chain.publicClient;
  }

  private enqueue(work: () => Promise<void>): Promise<void> {
    const run = this.queue.then(work, work);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async ingest(event: MentionEvent, received = Date.now()): Promise<void> {
    const claimed = await this.store.claimTrigger({
      triggerTweetId: event.triggerTweetId,
      triggerTweetUrl: event.triggerTweetUrl,
      triggerText: event.triggerText,
      requesterXId: event.requesterXId,
      requesterUsername: event.requesterUsername,
      eventReceivedMs: received,
    });
    if (!claimed) return;
    await this.store.update(event.triggerTweetId, {
      sourceTweetId: event.sourceTweetId,
      sourceTweetUrl: event.sourceTweetUrl,
      sourceUsername: event.sourceUsername,
      sourceText: event.sourceText,
      sourceMedia: event.sourceMedia,
    });
  }

  async handleMention(event: MentionEvent): Promise<void> {
    await this.enqueue(async () => {
      const received = Date.now();
      await this.ingest(event, received);
      await this.processTrigger(event.triggerTweetId, event, received);
    });
  }

  async processPending(): Promise<void> {
    const rows = await this.store.listActionable();
    for (const row of rows) {
      await this.enqueue(async () => {
        await this.processTrigger(row.triggerTweetId);
      });
    }
  }

  async pollOnce(): Promise<void> {
    const sinceId = await this.store.getMeta("since_id");
    let mentions: MentionEvent[];
    try {
      mentions = await fetchMentionReplies({
        client: this.twitter,
        botUserId: this.env.X_BOT_USER_ID,
        sinceId,
      });
      await this.store.setMeta("x_last_error", "");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.store.setMeta("x_last_error", message.slice(0, 400));
      throw err;
    }
    if (!mentions.length) {
      console.log("[poll] no new mentions");
      return;
    }
    let maxId = sinceId ? BigInt(sinceId) : 0n;
    for (const mention of mentions) {
      const id = BigInt(mention.triggerTweetId);
      if (id > maxId) maxId = id;
      await this.handleMention(mention);
    }
    if (maxId > 0n) {
      await this.store.setMeta("since_id", maxId.toString());
    }
  }

  private async processTrigger(
    triggerTweetId: string,
    incoming?: MentionEvent,
    receivedOverride?: number,
  ): Promise<void> {
    if (this.inflight.has(triggerTweetId)) return;
    this.inflight.add(triggerTweetId);
    try {
      await this.processTriggerLocked(triggerTweetId, incoming, receivedOverride);
    } finally {
      this.inflight.delete(triggerTweetId);
    }
  }

  private async processTriggerLocked(
    triggerTweetId: string,
    incoming?: MentionEvent,
    receivedOverride?: number,
  ): Promise<void> {
    const row = await this.store.getByTrigger(triggerTweetId);
    if (!row) return;
    if (row.status === "COMPLETED" || row.status === "REJECTED") return;

    if (row.transactionHash) {
      await this.reconcileExisting(row);
      return;
    }

    if (
      row.status !== "RECEIVED" &&
      row.status !== "VALIDATING" &&
      row.status !== "SUBMITTING"
    ) {
      return;
    }

    if (
      !incoming &&
      (row.status === "VALIDATING" || row.status === "SUBMITTING")
    ) {
      const age = Date.now() - new Date(row.updatedAt).getTime();
      if (age < 120_000) return;
    }

    const event = incoming ?? (await this.eventFromRow(row));
    if (!event) {
      await this.store.update(triggerTweetId, {
        status: "FAILED",
        errorCode: "hydrate",
        errorMessage: "Could not reload the trigger tweet",
      });
      return;
    }

    await this.runLaunch(event, receivedOverride ?? row.eventReceivedMs ?? Date.now());
  }

  private async eventFromRow(row: LaunchRow): Promise<MentionEvent | null> {
    if (row.triggerText) {
      return {
        triggerTweetId: row.triggerTweetId,
        triggerTweetUrl: row.triggerTweetUrl ?? "",
        triggerText: row.triggerText,
        requesterXId: row.requesterXId,
        requesterUsername: row.requesterUsername,
        sourceTweetId: row.sourceTweetId,
        sourceTweetUrl: row.sourceTweetUrl,
        sourceUsername: row.sourceUsername,
        sourceText: row.sourceText,
        sourceMedia: row.sourceMedia,
      };
    }
    return hydrateMention({
      client: this.twitter,
      tweetId: row.triggerTweetId,
    });
  }

  private async runLaunch(event: MentionEvent, received: number): Promise<void> {
    if (
      event.requesterUsername.toLowerCase() ===
      this.env.X_BOT_USERNAME.toLowerCase()
    ) {
      await this.reject(event, "self", "Ignored self mention.");
      return;
    }

    const parsed = parseLaunchCommand(event.triggerText);
    const parsedAt = Date.now();
    if (!parsed) {
      await this.store.update(event.triggerTweetId, {
        status: "REJECTED",
        parsedMs: parsedAt,
        triggerText: event.triggerText,
        errorCode: "parse",
        errorMessage: "Need: @letslauncharc $TICKER Coin Name",
        totalLaunchMs: parsedAt - received,
      });
      return;
    }

    let source = event;
    if (event.sourceTweetId && !event.sourceText) {
      const hydrated = await hydrateMention({
        client: this.twitter,
        tweetId: event.triggerTweetId,
      });
      if (hydrated) source = hydrated;
    }

    const resolved = Date.now();
    await this.store.update(event.triggerTweetId, {
      status: "VALIDATING",
      triggerText: source.triggerText,
      sourceTweetId: source.sourceTweetId,
      sourceTweetUrl: source.sourceTweetUrl,
      sourceUsername: source.sourceUsername,
      sourceText: source.sourceText,
      sourceMedia: source.sourceMedia,
      ticker: parsed.ticker,
      tokenName: parsed.name,
      tweetResolvedMs: resolved,
      parsedMs: parsedAt,
    });

    if (!source.sourceTweetId) {
      await this.reject(event, "not_a_reply", "Launch requests must reply to another post.");
      return;
    }

    const description =
      source.sourceText?.slice(0, 280) ||
      `Launched via @${this.env.X_BOT_USERNAME} from ${source.sourceTweetUrl ?? event.triggerTweetUrl}`;

    if (this.env.DRY_RUN) {
      await this.store.update(event.triggerTweetId, {
        status: "COMPLETED",
        errorCode: "dry_run",
        errorMessage: "DRY_RUN — no transaction sent",
        totalLaunchMs: Date.now() - received,
      });
      try {
        await replyToTweet({
          client: this.twitter,
          tweetId: event.triggerTweetId,
          text: `DRY_RUN ok\n$${parsed.ticker} ${parsed.name}`,
        });
      } catch (err) {
        console.error("[reply] dry-run failed", event.triggerTweetId, err);
      }
      return;
    }

    await this.store.update(event.triggerTweetId, { status: "SUBMITTING" });

    const [imageUri, balance] = await Promise.all([
      resolveImageUri({
        sourceMedia: source.sourceMedia,
        description,
        pinataJwt: this.env.PINATA_JWT,
      }),
      getNativeBalance(this.chain.publicClient, this.chain.account.address),
    ]);

    if (balance < BigInt(this.env.MIN_NATIVE_WEI)) {
      await this.fail(event, "funds", "Launcher wallet needs more Arc USDC for gas.");
      return;
    }

    const again = await this.store.getByTrigger(event.triggerTweetId);
    if (again?.transactionHash) {
      await this.reconcileExisting(again);
      return;
    }

    const twitter = source.sourceUsername
      ? `https://x.com/${source.sourceUsername}`
      : `https://x.com/${this.env.X_BOT_USERNAME}`;

    try {
      const result = await launchOnArgus({
        publicClient: this.chain.publicClient,
        walletClient: this.chain.walletClient,
        account: this.chain.account,
        input: {
          name: parsed.name,
          symbol: parsed.ticker,
          imageUri,
          description,
          twitter,
          website: source.sourceTweetUrl ?? "",
        },
        onStage: async (stage) => {
          if (stage === "submitting") {
            await this.store.update(event.triggerTweetId, { status: "SUBMITTING" });
          }
          if (stage === "confirming") {
            await this.store.update(event.triggerTweetId, { status: "CONFIRMING" });
          }
        },
        onSubmitted: async (txHash) => {
          await this.store.update(event.triggerTweetId, {
            status: "SUBMITTED",
            transactionHash: txHash,
            transactionSubmittedMs: Date.now(),
          });
        },
      });

      const confirmed = Date.now();
      await this.store.update(event.triggerTweetId, {
        status: "LAUNCHED",
        transactionHash: result.txHash,
        tokenAddress: result.token,
        argusUrl: result.argusUrl,
        transactionConfirmedMs: confirmed,
      });

      await this.finishReply(event.triggerTweetId, parsed.ticker, result.argusUrl, received);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const current = await this.store.getByTrigger(event.triggerTweetId);
      if (current?.transactionHash) {
        await this.reconcileExisting(current);
        if ((await this.store.getByTrigger(event.triggerTweetId))?.status === "FAILED") {
          await this.store.update(event.triggerTweetId, {
            errorCode: "post_submit",
            errorMessage: message.slice(0, 500),
          });
        }
        return;
      }
      await this.fail(event, "launch", message);
    }
  }

  private async finishReply(
    triggerTweetId: string,
    ticker: string,
    argusUrl: string,
    received: number,
  ): Promise<void> {
    await this.store.update(triggerTweetId, { status: "REPLYING" });
    try {
      await replyToTweet({
        client: this.twitter,
        tweetId: triggerTweetId,
        text: formatLiveReply({ ticker, argusUrl }),
      });
      const replyAt = Date.now();
      const done = await this.store.update(triggerTweetId, {
        status: "COMPLETED",
        errorCode: null,
        errorMessage: null,
        replyPostedMs: replyAt,
        totalLaunchMs: replyAt - received,
      });
      logLatency(done);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.store.update(triggerTweetId, {
        status: "REPLYING",
        errorCode: "reply",
        errorMessage: message.slice(0, 500),
      });
      console.error("[reply] failed", triggerTweetId, err);
    }
  }

  private async reconcileExisting(row: LaunchRow): Promise<void> {
    if (!row.transactionHash) return;
    if (row.tokenAddress && row.argusUrl) {
      if (row.status !== "COMPLETED" && row.ticker) {
        await this.finishReply(
          row.triggerTweetId,
          row.ticker,
          row.argusUrl,
          row.eventReceivedMs ?? Date.now(),
        );
      }
      return;
    }

    const result = await reconcileLaunch({
      publicClient: this.chain.publicClient,
      creator: this.chain.account.address,
      txHash: row.transactionHash as Hex,
    });

    switch (result.state) {
      case "pending":
        await this.store.update(row.triggerTweetId, { status: "CONFIRMING" });
        return;
      case "reverted":
        await this.store.update(row.triggerTweetId, {
          status: "FAILED",
          errorCode: "reverted",
          errorMessage: `Launch tx reverted: ${result.txHash}. Do not resubmit blindly.`,
        });
        return;
      case "unknown":
        await this.store.update(row.triggerTweetId, {
          status: "FAILED",
          errorCode: "no_token_event",
          errorMessage: `Tx ${result.txHash} succeeded but TokenCreated was missing. Do not resubmit.`,
        });
        return;
      case "launched":
        await this.store.update(row.triggerTweetId, {
          status: "LAUNCHED",
          tokenAddress: result.token,
          argusUrl: result.argusUrl,
          transactionConfirmedMs: Date.now(),
        });
        if (row.ticker) {
          await this.finishReply(
            row.triggerTweetId,
            row.ticker,
            result.argusUrl,
            row.eventReceivedMs ?? Date.now(),
          );
        }
        return;
      default: {
        const _never: never = result;
        throw new Error(`Unhandled reconcile state ${JSON.stringify(_never)}`);
      }
    }
  }

  private async reject(
    event: MentionEvent,
    code: string,
    message: string,
  ): Promise<void> {
    await this.store.update(event.triggerTweetId, {
      status: "REJECTED",
      errorCode: code,
      errorMessage: message,
    });
  }

  private async fail(
    event: MentionEvent,
    code: string,
    message: string,
  ): Promise<void> {
    await this.store.update(event.triggerTweetId, {
      status: "FAILED",
      errorCode: code,
      errorMessage: message.slice(0, 500),
    });
  }
}
