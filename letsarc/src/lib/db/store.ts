import pg from "pg";
import {
  assertLaunchStatus,
  type LaunchRow,
  type LaunchStatus,
} from "../types.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS launches (
  id bigserial PRIMARY KEY,
  trigger_tweet_id text NOT NULL UNIQUE,
  trigger_tweet_url text,
  trigger_text text,
  requester_x_id text NOT NULL,
  requester_username text NOT NULL,
  source_tweet_id text,
  source_tweet_url text,
  source_username text,
  source_text text,
  source_media text,
  ticker text,
  token_name text,
  status text NOT NULL,
  transaction_hash text,
  token_address text,
  argus_url text,
  error_code text,
  error_message text,
  event_received_ms bigint,
  tweet_resolved_ms bigint,
  parsed_ms bigint,
  transaction_submitted_ms bigint,
  transaction_confirmed_ms bigint,
  reply_posted_ms bigint,
  total_launch_ms bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meta (
  key text PRIMARY KEY,
  value text NOT NULL
);
CREATE INDEX IF NOT EXISTS launches_status_idx ON launches (status);
CREATE INDEX IF NOT EXISTS launches_created_idx ON launches (created_at DESC);
ALTER TABLE launches ADD COLUMN IF NOT EXISTS trigger_text text;
`;

function mapRow(row: pg.QueryResultRow): LaunchRow {
  return {
    id: String(row.id),
    triggerTweetId: row.trigger_tweet_id,
    triggerTweetUrl: row.trigger_tweet_url,
    triggerText: row.trigger_text,
    requesterXId: row.requester_x_id,
    requesterUsername: row.requester_username,
    sourceTweetId: row.source_tweet_id,
    sourceTweetUrl: row.source_tweet_url,
    sourceUsername: row.source_username,
    sourceText: row.source_text,
    sourceMedia: row.source_media,
    ticker: row.ticker,
    tokenName: row.token_name,
    status: assertLaunchStatus(row.status),
    transactionHash: row.transaction_hash,
    tokenAddress: row.token_address,
    argusUrl: row.argus_url,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    eventReceivedMs: row.event_received_ms === null ? null : Number(row.event_received_ms),
    tweetResolvedMs: row.tweet_resolved_ms === null ? null : Number(row.tweet_resolved_ms),
    parsedMs: row.parsed_ms === null ? null : Number(row.parsed_ms),
    transactionSubmittedMs:
      row.transaction_submitted_ms === null
        ? null
        : Number(row.transaction_submitted_ms),
    transactionConfirmedMs:
      row.transaction_confirmed_ms === null
        ? null
        : Number(row.transaction_confirmed_ms),
    replyPostedMs: row.reply_posted_ms === null ? null : Number(row.reply_posted_ms),
    totalLaunchMs: row.total_launch_ms === null ? null : Number(row.total_launch_ms),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class Store {
  readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 8,
    });
  }

  async migrate(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);
  }

  async ping(): Promise<boolean> {
    const result = await this.pool.query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  }

  async getMeta(key: string): Promise<string | null> {
    const result = await this.pool.query(
      "SELECT value FROM meta WHERE key = $1",
      [key],
    );
    return result.rows[0]?.value ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO meta (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
    );
  }

  async claimTrigger(args: {
    triggerTweetId: string;
    triggerTweetUrl: string;
    triggerText?: string | null;
    requesterXId: string;
    requesterUsername: string;
    eventReceivedMs: number;
  }): Promise<LaunchRow | null> {
    const result = await this.pool.query(
      `INSERT INTO launches (
         trigger_tweet_id, trigger_tweet_url, trigger_text, requester_x_id, requester_username,
         status, event_received_ms
       ) VALUES ($1, $2, $3, $4, $5, 'RECEIVED', $6)
       ON CONFLICT (trigger_tweet_id) DO NOTHING
       RETURNING *`,
      [
        args.triggerTweetId,
        args.triggerTweetUrl,
        args.triggerText ?? null,
        args.requesterXId,
        args.requesterUsername,
        args.eventReceivedMs,
      ],
    );
    if (!result.rows[0]) return null;
    return mapRow(result.rows[0]);
  }

  async getByTrigger(triggerTweetId: string): Promise<LaunchRow | null> {
    const result = await this.pool.query(
      "SELECT * FROM launches WHERE trigger_tweet_id = $1",
      [triggerTweetId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async listRecent(limit = 50): Promise<LaunchRow[]> {
    const result = await this.pool.query(
      "SELECT * FROM launches ORDER BY created_at DESC LIMIT $1",
      [limit],
    );
    return result.rows.map(mapRow);
  }

  async update(
    triggerTweetId: string,
    patch: Partial<{
      status: LaunchStatus;
      triggerText: string | null;
      sourceTweetId: string | null;
      sourceTweetUrl: string | null;
      sourceUsername: string | null;
      sourceText: string | null;
      sourceMedia: string | null;
      ticker: string | null;
      tokenName: string | null;
      transactionHash: string | null;
      tokenAddress: string | null;
      argusUrl: string | null;
      errorCode: string | null;
      errorMessage: string | null;
      tweetResolvedMs: number | null;
      parsedMs: number | null;
      transactionSubmittedMs: number | null;
      transactionConfirmedMs: number | null;
      replyPostedMs: number | null;
      totalLaunchMs: number | null;
    }>,
  ): Promise<LaunchRow> {
    const sets: string[] = ["updated_at = now()"];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (patch.status !== undefined) add("status", patch.status);
    if (patch.triggerText !== undefined) add("trigger_text", patch.triggerText);
    if (patch.sourceTweetId !== undefined) add("source_tweet_id", patch.sourceTweetId);
    if (patch.sourceTweetUrl !== undefined) add("source_tweet_url", patch.sourceTweetUrl);
    if (patch.sourceUsername !== undefined) add("source_username", patch.sourceUsername);
    if (patch.sourceText !== undefined) add("source_text", patch.sourceText);
    if (patch.sourceMedia !== undefined) add("source_media", patch.sourceMedia);
    if (patch.ticker !== undefined) add("ticker", patch.ticker);
    if (patch.tokenName !== undefined) add("token_name", patch.tokenName);
    if (patch.transactionHash !== undefined) add("transaction_hash", patch.transactionHash);
    if (patch.tokenAddress !== undefined) add("token_address", patch.tokenAddress);
    if (patch.argusUrl !== undefined) add("argus_url", patch.argusUrl);
    if (patch.errorCode !== undefined) add("error_code", patch.errorCode);
    if (patch.errorMessage !== undefined) add("error_message", patch.errorMessage);
    if (patch.tweetResolvedMs !== undefined) add("tweet_resolved_ms", patch.tweetResolvedMs);
    if (patch.parsedMs !== undefined) add("parsed_ms", patch.parsedMs);
    if (patch.transactionSubmittedMs !== undefined) {
      add("transaction_submitted_ms", patch.transactionSubmittedMs);
    }
    if (patch.transactionConfirmedMs !== undefined) {
      add("transaction_confirmed_ms", patch.transactionConfirmedMs);
    }
    if (patch.replyPostedMs !== undefined) add("reply_posted_ms", patch.replyPostedMs);
    if (patch.totalLaunchMs !== undefined) add("total_launch_ms", patch.totalLaunchMs);

    values.push(triggerTweetId);
    const result = await this.pool.query(
      `UPDATE launches SET ${sets.join(", ")} WHERE trigger_tweet_id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rows[0]) {
      throw new Error(`Launch ${triggerTweetId} not found`);
    }
    return mapRow(result.rows[0]);
  }

  async listActionable(limit = 20): Promise<LaunchRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM launches
       WHERE status = 'RECEIVED'
          OR (
            status IN ('VALIDATING', 'SUBMITTING')
            AND transaction_hash IS NULL
            AND updated_at < NOW() - INTERVAL '2 minutes'
          )
          OR (
            status IN ('SUBMITTED', 'CONFIRMING', 'LAUNCHED', 'REPLYING')
            AND transaction_hash IS NOT NULL
          )
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map(mapRow);
  }

  async requestRetry(triggerTweetId: string): Promise<LaunchRow> {
    const result = await this.pool.query(
      `UPDATE launches
       SET status = 'RECEIVED',
           error_code = NULL,
           error_message = NULL,
           updated_at = now()
       WHERE trigger_tweet_id = $1
         AND status = 'FAILED'
         AND transaction_hash IS NULL
       RETURNING *`,
      [triggerTweetId],
    );
    if (!result.rows[0]) {
      throw new Error(
        "Retry refused: only FAILED launches with no transaction hash can be retried",
      );
    }
    return mapRow(result.rows[0]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
