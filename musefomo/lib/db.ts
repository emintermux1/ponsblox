import { createHash } from "node:crypto";
import postgres from "postgres";

import { PUBLIC_DB_MS, SOL_MINT } from "@/lib/constants";
import { serverEnv } from "@/lib/env";
import { confirmedFillsFromTrades, replayFills, windowStartMs } from "@/lib/ledger";
import { toDirectoryAgent } from "@/lib/directory";
import { queryRowsBudget, type CancellableQuery } from "@/lib/sql-timeout";
import type {
  Agent,
  AgentPermissions,
  AgentStatus,
  DirectoryAgent,
  LeaderboardWindow,
  Position,
  Thesis,
  Trade,
  TradeSide,
  TradeStatus,
} from "@/lib/types";

type Sql = ReturnType<typeof postgres>;

let client: Sql | null = null;
let publicClient: Sql | null = null;
let securityReady = false;

function postgresOptions(kind: "runtime" | "public") {
  return {
    ssl: "require" as const,
    max: 1,
    prepare: false,
    idle_timeout: kind === "public" ? 8 : 20,
    connect_timeout: 1,
    fetch_types: kind !== "public",
    ...(kind === "public" ? { connection: { statement_timeout: PUBLIC_DB_MS } } : {}),
  };
}

function hashClaimCode(code: string): string {
  return createHash("sha256")
    .update(`${serverEnv().credentialPepper}:claim:${code}`)
    .digest("hex");
}

async function queryRows<T>(result: PromiseLike<unknown>): Promise<T[]> {
  return (await result) as T[];
}

function db(): Sql {
  if (client) return client;
  const env = serverEnv();
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  client = postgres(env.databaseUrl, postgresOptions("runtime"));
  return client;
}

function publicDb(): Sql {
  if (publicClient) return publicClient;
  const env = serverEnv();
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  publicClient = postgres(env.databaseUrl, postgresOptions("public"));
  return publicClient;
}

export function runtimeSql(): Sql {
  return db();
}

export function publicSql(): Sql {
  return publicDb();
}

function rowsFrom<T>(query: CancellableQuery, budgetMs?: number): Promise<T[]> {
  return budgetMs != null ? queryRowsBudget<T>(query, budgetMs) : queryRows<T>(query);
}

type AgentRow = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  status: AgentStatus;
  owner_privy_user_id: string | null;
  wallet_address: string | null;
  privy_wallet_id: string | null;
  session_signer_enabled: boolean;
  claim_expires_at: string;
  created_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
};

type PermissionRow = {
  agent_id: string;
  trading_enabled: boolean;
  withdrawals_enabled: boolean;
  max_per_trade_lamports: string;
  max_daily_volume_lamports: string;
  allowed_mints: string[];
  session_expires_at: string | null;
  updated_at: string;
};

type TradeRow = {
  id: string;
  idempotency_key: string | null;
  agent_id: string;
  human_privy_user_id: string | null;
  wallet_address: string;
  side: TradeSide;
  input_mint: string;
  output_mint: string;
  requested_amount: string;
  actual_in_amount: string | null;
  actual_out_amount: string | null;
  quote_out_amount: string | null;
  price: string | null;
  slippage_bps: number | null;
  fee_lamports: string | null;
  thesis_id: string | null;
  dflow_quote: unknown;
  signature: string | null;
  status: TradeStatus;
  fail_reason: string | null;
  created_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
};

type PositionRow = {
  id: string;
  agent_id: string;
  mint: string;
  amount: string;
  cost_basis_lamports: string;
  updated_at: string;
};

type ThesisRow = {
  id: string;
  agent_id: string;
  mint: string;
  text: string;
  trade_id: string | null;
  created_at: string;
};

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    status: row.status,
    ownerPrivyUserId: row.owner_privy_user_id,
    walletAddress: row.wallet_address,
    privyWalletId: row.privy_wallet_id,
    sessionSignerEnabled: row.session_signer_enabled,
    claimExpiresAt: row.claim_expires_at,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    revokedAt: row.revoked_at,
  };
}

function mapPermissions(row: PermissionRow): AgentPermissions {
  return {
    agentId: row.agent_id,
    tradingEnabled: row.trading_enabled,
    withdrawalsEnabled: row.withdrawals_enabled,
    maxPerTradeLamports: String(row.max_per_trade_lamports),
    maxDailyVolumeLamports: String(row.max_daily_volume_lamports),
    allowedMints: row.allowed_mints ?? [],
    sessionExpiresAt: row.session_expires_at,
    updatedAt: row.updated_at,
  };
}

function mapTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    agentId: row.agent_id,
    humanPrivyUserId: row.human_privy_user_id,
    walletAddress: row.wallet_address,
    side: row.side,
    inputMint: row.input_mint,
    outputMint: row.output_mint,
    requestedAmount: row.requested_amount,
    actualInAmount: row.actual_in_amount,
    actualOutAmount: row.actual_out_amount,
    quoteOutAmount: row.quote_out_amount,
    price: row.price,
    slippageBps: row.slippage_bps,
    feeLamports: row.fee_lamports,
    thesisId: row.thesis_id,
    dflowQuote: row.dflow_quote,
    signature: row.signature,
    status: row.status,
    failReason: row.fail_reason,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    confirmedAt: row.confirmed_at,
  };
}

function mapPosition(row: PositionRow): Position {
  return {
    id: row.id,
    agentId: row.agent_id,
    mint: row.mint,
    amount: row.amount,
    costBasisLamports: row.cost_basis_lamports,
    updatedAt: row.updated_at,
  };
}

function mapThesis(row: ThesisRow): Thesis {
  return {
    id: row.id,
    agentId: row.agent_id,
    mint: row.mint,
    text: row.text,
    tradeId: row.trade_id,
    createdAt: row.created_at,
  };
}

export async function dbHealth(): Promise<boolean> {
  try {
    await db()`select 1 as ok`;
    return true;
  } catch {
    return false;
  }
}

export async function upsertHuman(privyUserId: string, email?: string | null) {
  await db()`
    insert into humans (privy_user_id, email, last_seen_at)
    values (${privyUserId}, ${email ?? null}, now())
    on conflict (privy_user_id)
    do update set last_seen_at = now(), email = coalesce(excluded.email, humans.email)
  `;
}

export async function insertAgent(input: {
  handle: string;
  displayName: string | null;
  bio: string | null;
  claimCode: string;
  claimExpiresAt: Date;
}): Promise<Agent> {
  const rows = await queryRows<AgentRow>(db()`
    insert into agents (handle, display_name, bio, status, claim_code, claim_expires_at)
    values (
      ${input.handle},
      ${input.displayName},
      ${input.bio},
      'pending_claim',
      ${hashClaimCode(input.claimCode)},
      ${input.claimExpiresAt.toISOString()}
    )
    returning
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
  `);
  const agent = rows[0];
  if (!agent) throw new Error("agent insert failed");
  await db()`
    insert into agent_permissions (agent_id)
    values (${agent.id})
    on conflict (agent_id) do nothing
  `;
  return mapAgent(agent);
}

export async function insertCredential(input: {
  agentId: string;
  tokenHash: string;
  label: string;
  expiresAt: Date | null;
}) {
  await db()`
    insert into agent_credentials (agent_id, token_hash, label, expires_at)
    values (${input.agentId}, ${input.tokenHash}, ${input.label}, ${input.expiresAt?.toISOString() ?? null})
  `;
}

export async function findAgentByCredentialHash(tokenHash: string): Promise<Agent | null> {
  const rows = await queryRows<AgentRow>(db()`
    select
      a.id, a.handle, a.display_name, a.bio, a.status, a.owner_privy_user_id,
      a.wallet_address, a.privy_wallet_id, a.session_signer_enabled,
      a.claim_expires_at::text, a.created_at::text, a.claimed_at::text, a.revoked_at::text
    from agent_credentials c
    join agents a on a.id = c.agent_id
    where c.token_hash = ${tokenHash}
      and c.revoked_at is null
      and (c.expires_at is null or c.expires_at > now())
    limit 1
  `);
  const row = rows[0];
  if (!row) return null;
  await db()`
    update agent_credentials set last_used_at = now() where token_hash = ${tokenHash}
  `;
  return mapAgent(row);
}

export async function findAgentById(id: string): Promise<Agent | null> {
  const rows = await queryRows<AgentRow>(db()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where id = ${id}
    limit 1
  `);
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function findAgentByHandle(handle: string): Promise<Agent | null> {
  const rows = await queryRows<AgentRow>(db()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where handle = ${handle}
    limit 1
  `);
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function findAgentByClaimCode(code: string): Promise<Agent | null> {
  const rows = await queryRows<AgentRow>(db()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where claim_code = ${hashClaimCode(code)} or claim_code = ${code}
    limit 1
  `);
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function listAgentsForOwner(privyUserId: string): Promise<Agent[]> {
  const rows = await queryRows<AgentRow>(db()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where owner_privy_user_id = ${privyUserId}
    order by created_at desc
  `);
  return rows.map(mapAgent);
}

export async function listPublicAgents(limit = 40): Promise<Agent[]> {
  const rows = await queryRowsBudget<AgentRow>(
    publicDb()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where status <> 'revoked'
    order by
      case when status = 'claimed' then 0 else 1 end,
      claimed_at desc nulls last,
      created_at desc
    limit ${limit}
  `,
    PUBLIC_DB_MS,
  );
  return rows.map(mapAgent);
}

export async function listDirectoryAgents(limit = 40): Promise<DirectoryAgent[]> {
  const agents = await listPublicAgents(limit);
  return agents.map((agent) =>
    toDirectoryAgent({
      id: agent.id,
      handle: agent.handle,
      displayName: agent.displayName,
      bio: agent.bio,
      status: agent.status,
      createdAt: agent.createdAt,
      claimedAt: agent.claimedAt,
      lastFillAt: null,
      lastThesisAt: null,
      lastFollowAt: null,
    }),
  );
}

async function listDirectoryActivity(ids: string[]): Promise<
  Map<string, { lastFillAt: string | null; lastThesisAt: string | null; lastFollowAt: string | null }>
> {
  const out = new Map<string, { lastFillAt: string | null; lastThesisAt: string | null; lastFollowAt: string | null }>();
  if (!ids.length) return out;
  const [fills, theses, follows] = await Promise.all([
    queryRows<{ agent_id: string; last_fill_at: string | null }>(db()`
      select agent_id, max(confirmed_at)::text as last_fill_at
      from trades
      where status = 'confirmed'
        and confirmed_at is not null
        and agent_id = any(${ids})
      group by agent_id
    `),
    queryRows<{ agent_id: string; last_thesis_at: string | null }>(db()`
      select agent_id, max(created_at)::text as last_thesis_at
      from theses
      where agent_id = any(${ids})
      group by agent_id
    `),
    queryRows<{ agent_id: string; last_follow_at: string | null }>(db()`
      select agent_id, max(created_at)::text as last_follow_at
      from (
        select follower_id as agent_id, created_at from follows where follower_id = any(${ids})
        union all
        select followee_id as agent_id, created_at from follows where followee_id = any(${ids})
      ) f
      group by agent_id
    `),
  ]);
  for (const id of ids) {
    out.set(id, { lastFillAt: null, lastThesisAt: null, lastFollowAt: null });
  }
  for (const row of fills) {
    const current = out.get(row.agent_id) ?? { lastFillAt: null, lastThesisAt: null, lastFollowAt: null };
    current.lastFillAt = row.last_fill_at;
    out.set(row.agent_id, current);
  }
  for (const row of theses) {
    const current = out.get(row.agent_id) ?? { lastFillAt: null, lastThesisAt: null, lastFollowAt: null };
    current.lastThesisAt = row.last_thesis_at;
    out.set(row.agent_id, current);
  }
  for (const row of follows) {
    const current = out.get(row.agent_id) ?? { lastFillAt: null, lastThesisAt: null, lastFollowAt: null };
    current.lastFollowAt = row.last_follow_at;
    out.set(row.agent_id, current);
  }
  return out;
}

export async function listRecentTheses(limit = 30): Promise<
  Array<Thesis & { handle: string; displayName: string | null }>
> {
  const rows = await queryRowsBudget<ThesisRow & { handle: string; display_name: string | null }>(
    publicDb()`
    select
      t.id, t.agent_id, t.mint, t.text, t.trade_id, t.created_at::text,
      a.handle, a.display_name
    from theses t
    join agents a on a.id = t.agent_id
    order by t.created_at desc
    limit ${limit}
  `,
    PUBLIC_DB_MS,
  );
  return rows.map((row) => ({
    ...mapThesis(row),
    handle: row.handle,
    displayName: row.display_name,
  }));
}

export async function searchAgents(q: string, limit = 8): Promise<Agent[]> {
  await ensureDiscoverySchema();
  const exact = q.replace(/^@/, "").trim().toLowerCase();
  const prefix = `${exact}%`;
  const rows = await queryRows<AgentRow>(db()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where lower(handle) = ${exact}
       or lower(handle) like ${prefix}
       or lower(coalesce(display_name, '')) like ${prefix}
    order by (lower(handle) = ${exact}) desc, claimed_at desc nulls last
    limit ${limit}
  `);
  return rows.map(mapAgent);
}

export async function claimAgent(input: {
  agentId: string;
  privyUserId: string;
  walletAddress: string;
  privyWalletId: string | null;
}): Promise<Agent | null> {
  const rows = await queryRows<AgentRow>(db()`
    update agents
    set
      status = 'claimed',
      owner_privy_user_id = ${input.privyUserId},
      wallet_address = ${input.walletAddress},
      privy_wallet_id = ${input.privyWalletId},
      claimed_at = coalesce(claimed_at, now())
    where id = ${input.agentId}
      and (
        status = 'pending_claim'
        or (status = 'claimed' and owner_privy_user_id = ${input.privyUserId})
      )
    returning
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
  `);
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function revokeAgent(agentId: string): Promise<Agent> {
  const rows = await queryRows<AgentRow>(db()`
    update agents
    set status = 'revoked', revoked_at = now(), session_signer_enabled = false
    where id = ${agentId}
    returning
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
  `);
  await db()`
    update agent_permissions
    set trading_enabled = false, updated_at = now()
    where agent_id = ${agentId}
  `;
  await db()`
    update agent_credentials
    set revoked_at = now()
    where agent_id = ${agentId} and revoked_at is null
  `;
  const row = rows[0];
  if (!row) throw new Error("revoke failed");
  return mapAgent(row);
}

export async function getPermissions(agentId: string): Promise<AgentPermissions | null> {
  const rows = await queryRows<PermissionRow>(db()`
    select
      agent_id, trading_enabled, withdrawals_enabled,
      max_per_trade_lamports::text, max_daily_volume_lamports::text,
      allowed_mints, session_expires_at::text, updated_at::text
    from agent_permissions
    where agent_id = ${agentId}
    limit 1
  `);
  return rows[0] ? mapPermissions(rows[0]) : null;
}

export async function updatePermissions(
  agentId: string,
  patch: Partial<{
    tradingEnabled: boolean;
    maxPerTradeLamports: string;
    maxDailyVolumeLamports: string;
    allowedMints: string[];
    sessionExpiresAt: string | null;
  }>,
): Promise<AgentPermissions> {
  const current = await getPermissions(agentId);
  if (!current) throw new Error("permissions missing");
  const next = {
    tradingEnabled: patch.tradingEnabled ?? current.tradingEnabled,
    maxPerTradeLamports: patch.maxPerTradeLamports ?? current.maxPerTradeLamports,
    maxDailyVolumeLamports: patch.maxDailyVolumeLamports ?? current.maxDailyVolumeLamports,
    allowedMints: patch.allowedMints ?? current.allowedMints,
    sessionExpiresAt:
      patch.sessionExpiresAt === undefined ? current.sessionExpiresAt : patch.sessionExpiresAt,
  };
  const rows = await queryRows<PermissionRow>(db()`
    update agent_permissions
    set
      trading_enabled = ${next.tradingEnabled},
      withdrawals_enabled = false,
      max_per_trade_lamports = ${next.maxPerTradeLamports},
      max_daily_volume_lamports = ${next.maxDailyVolumeLamports},
      allowed_mints = ${next.allowedMints},
      session_expires_at = ${next.sessionExpiresAt},
      updated_at = now()
    where agent_id = ${agentId}
    returning
      agent_id, trading_enabled, withdrawals_enabled,
      max_per_trade_lamports::text, max_daily_volume_lamports::text,
      allowed_mints, session_expires_at::text, updated_at::text
  `);
  const row = rows[0];
  if (!row) throw new Error("permissions update failed");
  return mapPermissions(row);
}

export async function findTradeByIdempotency(key: string, agentId: string): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where idempotency_key = ${key}
      and agent_id = ${agentId}
    limit 1
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function findTradeById(id: string): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where id = ${id}
    limit 1
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function findTradeBySignature(signature: string): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where signature = ${signature}
    limit 1
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function insertTrade(input: {
  idempotencyKey: string | null;
  agentId: string;
  humanPrivyUserId: string | null;
  walletAddress: string;
  side: TradeSide;
  inputMint: string;
  outputMint: string;
  requestedAmount: string;
  quoteOutAmount: string | null;
  price: string | null;
  slippageBps: number;
  thesisId: string | null;
  dflowQuote: unknown;
  status: TradeStatus;
}): Promise<Trade> {
  const rows = await queryRows<TradeRow>(db()`
    insert into trades (
      idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, quote_out_amount, price,
      slippage_bps, thesis_id, dflow_quote, status
    ) values (
      ${input.idempotencyKey}, ${input.agentId}, ${input.humanPrivyUserId},
      ${input.walletAddress}, ${input.side}, ${input.inputMint}, ${input.outputMint},
      ${input.requestedAmount}, ${input.quoteOutAmount}, ${input.price},
      ${input.slippageBps}, ${input.thesisId}, ${JSON.stringify(input.dflowQuote)}::jsonb,
      ${input.status}
    )
    returning
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
  `);
  const row = rows[0];
  if (!row) throw new Error("trade insert failed");
  return mapTrade(row);
}

export async function updateTrade(
  id: string,
  patch: Partial<{
    status: TradeStatus;
    signature: string | null;
    failReason: string | null;
    actualInAmount: string | null;
    actualOutAmount: string | null;
    feeLamports: string | null;
    submittedAt: string | null;
    confirmedAt: string | null;
  }>,
): Promise<Trade> {
  const current = await findTradeById(id);
  if (!current) throw new Error("trade missing");
  const next = {
    status: patch.status ?? current.status,
    signature: patch.signature === undefined ? current.signature : patch.signature,
    failReason: patch.failReason === undefined ? current.failReason : patch.failReason,
    actualInAmount:
      patch.actualInAmount === undefined ? current.actualInAmount : patch.actualInAmount,
    actualOutAmount:
      patch.actualOutAmount === undefined ? current.actualOutAmount : patch.actualOutAmount,
    feeLamports: patch.feeLamports === undefined ? current.feeLamports : patch.feeLamports,
    submittedAt: patch.submittedAt === undefined ? current.submittedAt : patch.submittedAt,
    confirmedAt: patch.confirmedAt === undefined ? current.confirmedAt : patch.confirmedAt,
  };
  const rows = await queryRows<TradeRow>(db()`
    update trades
    set
      status = ${next.status},
      signature = ${next.signature},
      fail_reason = ${next.failReason},
      actual_in_amount = ${next.actualInAmount},
      actual_out_amount = ${next.actualOutAmount},
      fee_lamports = ${next.feeLamports},
      submitted_at = ${next.submittedAt},
      confirmed_at = ${next.confirmedAt}
    where id = ${id}
    returning
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
  `);
  const row = rows[0];
  if (!row) throw new Error("trade update failed");
  return mapTrade(row);
}

export async function markTradeConfirmed(
  id: string,
  patch: {
    actualInAmount: string | null;
    actualOutAmount: string | null;
    feeLamports?: string | null;
    confirmedAt: string;
  },
): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    update trades
    set
      status = 'confirmed',
      actual_in_amount = ${patch.actualInAmount},
      actual_out_amount = ${patch.actualOutAmount},
      fee_lamports = coalesce(${patch.feeLamports ?? null}, fee_lamports),
      confirmed_at = ${patch.confirmedAt}
    where id = ${id}
      and status <> 'confirmed'
    returning
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function markTradeFailed(id: string, failReason: string): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    update trades
    set status = 'failed', fail_reason = ${failReason}
    where id = ${id}
      and status not in ('confirmed', 'failed', 'expired')
    returning
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function markTradeConfirming(id: string): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    update trades
    set status = 'confirming'
    where id = ${id}
      and status = 'submitted'
    returning
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function markTradeExpired(id: string, failReason: string): Promise<Trade | null> {
  const rows = await queryRows<TradeRow>(db()`
    update trades
    set status = 'expired', fail_reason = ${failReason}
    where id = ${id}
      and status not in ('confirmed', 'failed', 'expired')
    returning
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
  `);
  return rows[0] ? mapTrade(rows[0]) : null;
}

export async function listTradesForAgent(agentId: string, limit = 50): Promise<Trade[]> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where agent_id = ${agentId}
    order by created_at desc
    limit ${limit}
  `);
  return rows.map(mapTrade);
}

export async function listConfirmedTradesForAgent(agentId: string): Promise<Trade[]> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where agent_id = ${agentId}
      and status = 'confirmed'
    order by confirmed_at asc, created_at asc, id asc
  `);
  return rows.map(mapTrade);
}

export async function listAllConfirmedTrades(limit = 5000): Promise<Trade[]> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where status = 'confirmed'
    order by confirmed_at asc, created_at asc, id asc
    limit ${limit}
  `);
  return rows.map(mapTrade);
}

export async function listAllConfirmedTradesForWallet(address: string): Promise<Trade[]> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where wallet_address = ${address}
      and status = 'confirmed'
    order by confirmed_at asc, created_at asc, id asc
  `);
  return rows.map(mapTrade);
}

export async function listAgentsByIds(ids: string[]): Promise<Agent[]> {
  if (!ids.length) return [];
  const rows = await queryRows<AgentRow>(db()`
    select
      id, handle, display_name, bio, status, owner_privy_user_id,
      wallet_address, privy_wallet_id, session_signer_enabled,
      claim_expires_at::text, created_at::text, claimed_at::text, revoked_at::text
    from agents
    where id = any(${ids})
  `);
  return rows.map(mapAgent);
}

export async function queryMostTradedMints(
  window: LeaderboardWindow,
  limit = 40,
): Promise<Array<{ mint: string; fillCount: number; volumeLamports: string }>> {
  const since = windowStartMs(window);
  const sinceIso = since == null ? null : new Date(since).toISOString();
  const rows = await queryRows<{ mint: string; fills: number; volume_lamports: string }>(db()`
    select
      case when side = 'buy' then output_mint else input_mint end as mint,
      count(*)::int as fills,
      coalesce(
        sum(
          case
            when side = 'buy' then actual_in_amount::numeric
            else actual_out_amount::numeric
          end
        ),
        0
      )::text as volume_lamports
    from trades
    where status = 'confirmed'
      and actual_in_amount is not null
      and actual_out_amount is not null
      and (${sinceIso}::timestamptz is null or confirmed_at >= ${sinceIso}::timestamptz)
    group by 1
    order by
      sum(
        case
          when side = 'buy' then actual_in_amount::numeric
          else actual_out_amount::numeric
        end
      ) desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    mint: row.mint,
    fillCount: row.fills,
    volumeLamports: row.volume_lamports,
  }));
}

export async function queryMostHeldMints(
  limit = 40,
): Promise<Array<{ mint: string; holders: number; qtyHeldRaw: string; costBasisLamports: string }>> {
  const rows = await queryRows<{
    mint: string;
    holders: number;
    qty: string;
    cost: string;
  }>(db()`
    select
      mint,
      count(*)::int as holders,
      coalesce(sum(amount::numeric), 0)::text as qty,
      coalesce(sum(cost_basis_lamports::numeric), 0)::text as cost
    from positions
    where amount::numeric > 0
    group by mint
    order by count(*) desc, sum(cost_basis_lamports::numeric) desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    mint: row.mint,
    holders: row.holders,
    qtyHeldRaw: row.qty,
    costBasisLamports: row.cost,
  }));
}

export async function listConfirmedTradesForWallet(address: string, mint?: string, limit = 40): Promise<Trade[]> {
  const rows = mint
    ? await queryRows<TradeRow>(db()`
        select
          id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
          input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
          quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
          signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
        from trades
        where wallet_address = ${address}
          and status = 'confirmed'
          and (input_mint = ${mint} or output_mint = ${mint})
        order by confirmed_at desc
        limit ${limit}
      `)
    : await queryRows<TradeRow>(db()`
        select
          id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
          input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
          quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
          signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
        from trades
        where wallet_address = ${address}
          and status = 'confirmed'
        order by confirmed_at desc
        limit ${limit}
      `);
  return rows.map(mapTrade);
}

export type HydratedConfirmedTrade = Trade & {
  handle: string;
  displayName: string | null;
  thesisText: string | null;
};

export async function listHydratedConfirmedTrades(
  limit = 40,
  agentIds?: string[],
  budgetMs?: number,
): Promise<HydratedConfirmedTrade[]> {
  if (agentIds && agentIds.length === 0) return [];
  const sql = budgetMs != null ? publicDb() : db();
  const rows = agentIds
    ? await rowsFrom<TradeRow & { handle: string; display_name: string | null; thesis_text: string | null }>(
        sql`
        select
          t.id, t.idempotency_key, t.agent_id, t.human_privy_user_id, t.wallet_address, t.side,
          t.input_mint, t.output_mint, t.requested_amount, t.actual_in_amount, t.actual_out_amount,
          t.quote_out_amount, t.price, t.slippage_bps, t.fee_lamports, t.thesis_id, t.dflow_quote,
          t.signature, t.status, t.fail_reason, t.created_at::text, t.submitted_at::text,
          t.confirmed_at::text, a.handle, a.display_name, th.text as thesis_text
        from trades t
        join agents a on a.id = t.agent_id
        left join theses th on th.id = t.thesis_id
        where t.status = 'confirmed'
          and t.confirmed_at is not null
          and t.agent_id = any(${agentIds})
        order by t.confirmed_at desc
        limit ${limit}
      `,
        budgetMs,
      )
    : await rowsFrom<TradeRow & { handle: string; display_name: string | null; thesis_text: string | null }>(
        sql`
        select
          t.id, t.idempotency_key, t.agent_id, t.human_privy_user_id, t.wallet_address, t.side,
          t.input_mint, t.output_mint, t.requested_amount, t.actual_in_amount, t.actual_out_amount,
          t.quote_out_amount, t.price, t.slippage_bps, t.fee_lamports, t.thesis_id, t.dflow_quote,
          t.signature, t.status, t.fail_reason, t.created_at::text, t.submitted_at::text,
          t.confirmed_at::text, a.handle, a.display_name, th.text as thesis_text
        from trades t
        join agents a on a.id = t.agent_id
        left join theses th on th.id = t.thesis_id
        where t.status = 'confirmed'
          and t.confirmed_at is not null
        order by t.confirmed_at desc
        limit ${limit}
      `,
        budgetMs,
      );
  return rows
    .filter((row) => row.status === "confirmed" && row.confirmed_at)
    .map((row) => ({
      ...mapTrade(row),
      handle: row.handle,
      displayName: row.display_name,
      thesisText: row.thesis_text,
    }));
}

export async function listFollowingIdsForAgents(agentIds: string[]): Promise<string[]> {
  if (!agentIds.length) return [];
  const found = await queryRows<{ followee_id: string }>(db()`
    select distinct followee_id from follows where follower_id = any(${agentIds})
  `);
  return found.map((row) => row.followee_id);
}

export async function listRecentFollows(
  limit = 30,
  agentIds?: string[],
  budgetMs?: number,
): Promise<
  Array<{
    followerId: string;
    followeeId: string;
    createdAt: string;
    followerHandle: string;
    followerName: string | null;
    followeeHandle: string;
    followeeName: string | null;
  }>
> {
  if (agentIds && agentIds.length === 0) return [];
  try {
    const sql = budgetMs != null ? publicDb() : db();
    const rows = agentIds
      ? await rowsFrom<{
          follower_id: string;
          followee_id: string;
          created_at: string;
          follower_handle: string;
          follower_name: string | null;
          followee_handle: string;
          followee_name: string | null;
        }>(
          sql`
          select
            f.follower_id, f.followee_id, f.created_at::text,
            a.handle as follower_handle, a.display_name as follower_name,
            b.handle as followee_handle, b.display_name as followee_name
          from follows f
          join agents a on a.id = f.follower_id
          join agents b on b.id = f.followee_id
          where f.follower_id = any(${agentIds})
          order by f.created_at desc
          limit ${limit}
        `,
          budgetMs,
        )
      : await rowsFrom<{
          follower_id: string;
          followee_id: string;
          created_at: string;
          follower_handle: string;
          follower_name: string | null;
          followee_handle: string;
          followee_name: string | null;
        }>(
          sql`
          select
            f.follower_id, f.followee_id, f.created_at::text,
            a.handle as follower_handle, a.display_name as follower_name,
            b.handle as followee_handle, b.display_name as followee_name
          from follows f
          join agents a on a.id = f.follower_id
          join agents b on b.id = f.followee_id
          order by f.created_at desc
          limit ${limit}
        `,
          budgetMs,
        );
    return rows.map((row) => ({
      followerId: row.follower_id,
      followeeId: row.followee_id,
      createdAt: row.created_at,
      followerHandle: row.follower_handle,
      followerName: row.follower_name,
      followeeHandle: row.followee_handle,
      followeeName: row.followee_name,
    }));
  } catch {
    return [];
  }
}

export async function listRecentConfirmedTrades(limit = 20): Promise<Trade[]> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where status = 'confirmed'
    order by confirmed_at desc
    limit ${limit}
  `);
  return rows.map(mapTrade);
}

export async function listPositions(agentId: string): Promise<Position[]> {
  const rows = await queryRows<PositionRow>(db()`
    select id, agent_id, mint, amount, cost_basis_lamports, updated_at::text
    from positions
    where agent_id = ${agentId}
    order by updated_at desc
  `);
  return rows.map(mapPosition);
}

export async function syncPositionFromConfirmedFills(agentId: string, mint: string) {
  const trades = await listConfirmedTradesForAgent(agentId);
  const fills = confirmedFillsFromTrades(trades).filter((fill) => fill.mint === mint);
  const snapshot = replayFills(fills);
  const pos = snapshot.agents.get(agentId)?.mints.get(mint);
  const amount = (pos?.qty ?? 0n).toString();
  const cost = (pos?.costLamports ?? 0n).toString();
  await db()`
    insert into positions (agent_id, mint, amount, cost_basis_lamports)
    values (${agentId}, ${mint}, ${amount}, ${cost})
    on conflict (agent_id, mint)
    do update set
      amount = ${amount},
      cost_basis_lamports = ${cost},
      updated_at = now()
  `;
}

export async function applyConfirmedFill(input: {
  agentId: string;
  mint: string;
  amountDelta?: bigint;
  costDeltaLamports?: bigint;
}) {
  void input.amountDelta;
  void input.costDeltaLamports;
  await syncPositionFromConfirmedFills(input.agentId, input.mint);
}

export async function addDailyVolume(agentId: string, lamports: bigint) {
  await db()`
    insert into daily_volume (agent_id, day, volume_lamports)
    values (${agentId}, current_date, ${lamports.toString()}::bigint)
    on conflict (agent_id, day)
    do update set volume_lamports = daily_volume.volume_lamports + excluded.volume_lamports
  `;
}

export async function getDailyVolume(agentId: string): Promise<bigint> {
  const found = await queryRows<{ volume_lamports: string }>(db()`
    select volume_lamports::text
    from daily_volume
    where agent_id = ${agentId} and day = current_date
    limit 1
  `);
  return BigInt(found[0]?.volume_lamports ?? "0");
}

export async function insertThesis(input: {
  agentId: string;
  mint: string;
  text: string;
  tradeId: string | null;
}): Promise<Thesis> {
  const rows = await queryRows<ThesisRow>(db()`
    insert into theses (agent_id, mint, text, trade_id)
    values (${input.agentId}, ${input.mint}, ${input.text}, ${input.tradeId})
    returning id, agent_id, mint, text, trade_id, created_at::text
  `);
  const row = rows[0];
  if (!row) throw new Error("thesis insert failed");
  await db()`
    insert into feed_events (kind, agent_id, thesis_id)
    values ('thesis', ${input.agentId}, ${row.id})
  `;
  return mapThesis(row);
}

export async function listThesesForMint(mint: string, limit = 40): Promise<Thesis[]> {
  const rows = await queryRows<ThesisRow>(db()`
    select id, agent_id, mint, text, trade_id, created_at::text
    from theses
    where mint = ${mint}
    order by created_at desc
    limit ${limit}
  `);
  return rows.map(mapThesis);
}

export async function listMintThesesWithAgents(
  mint: string,
  limit = 40,
): Promise<Array<Thesis & { handle: string; displayName: string | null }>> {
  const rows = await queryRows<ThesisRow & { handle: string; display_name: string | null }>(db()`
    select
      t.id, t.agent_id, t.mint, t.text, t.trade_id, t.created_at::text,
      a.handle, a.display_name
    from theses t
    join agents a on a.id = t.agent_id
    where t.mint = ${mint}
    order by t.created_at desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    ...mapThesis(row),
    handle: row.handle,
    displayName: row.display_name,
  }));
}

export async function listMintHolders(
  mint: string,
  limit = 40,
): Promise<
  Array<{
    agentId: string;
    handle: string;
    displayName: string | null;
    mint: string;
    amount: string;
    source: "position";
  }>
> {
  const rows = await queryRows<{
    agent_id: string;
    handle: string;
    display_name: string | null;
    mint: string;
    amount: string;
  }>(db()`
    select
      p.agent_id, a.handle, a.display_name, p.mint, p.amount::text
    from positions p
    join agents a on a.id = p.agent_id
    where p.mint = ${mint}
      and p.amount::numeric > 0
      and a.status = 'claimed'
    order by p.amount::numeric desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    agentId: row.agent_id,
    handle: row.handle,
    displayName: row.display_name,
    mint: row.mint,
    amount: row.amount,
    source: "position" as const,
  }));
}

export async function listThesesForAgent(agentId: string, limit = 40): Promise<Thesis[]> {
  const rows = await queryRows<ThesisRow>(db()`
    select id, agent_id, mint, text, trade_id, created_at::text
    from theses
    where agent_id = ${agentId}
    order by created_at desc
    limit ${limit}
  `);
  return rows.map(mapThesis);
}

export async function followAgent(followerId: string, followeeId: string) {
  await db()`
    insert into follows (follower_id, followee_id)
    values (${followerId}, ${followeeId})
    on conflict do nothing
  `;
  await db()`
    insert into feed_events (kind, agent_id)
    values ('follow', ${followerId})
  `;
}

export async function unfollowAgent(followerId: string, followeeId: string) {
  await db()`
    delete from follows
    where follower_id = ${followerId} and followee_id = ${followeeId}
  `;
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const found = await queryRows<{ ok: number }>(db()`
    select 1 as ok from follows
    where follower_id = ${followerId} and followee_id = ${followeeId}
    limit 1
  `);
  return Boolean(found[0]);
}

export async function countFollowers(agentId: string): Promise<number> {
  const found = await queryRows<{ n: number }>(db()`
    select count(*)::int as n from follows where followee_id = ${agentId}
  `);
  return found[0]?.n ?? 0;
}

export async function listFollowingIds(followerId: string): Promise<string[]> {
  const found = await queryRows<{ followee_id: string }>(db()`
    select followee_id from follows where follower_id = ${followerId}
  `);
  return found.map((row) => row.followee_id);
}

export async function insertTradeFeedEvent(agentId: string, tradeId: string) {
  await db()`
    insert into feed_events (kind, agent_id, trade_id)
    select 'trade', ${agentId}::uuid, ${tradeId}::uuid
    where not exists (
      select 1 from feed_events
      where kind = 'trade' and trade_id = ${tradeId}::uuid
    )
  `;
}

export async function listFeed(limit = 40): Promise<
  Array<{
    id: string;
    kind: "trade" | "thesis" | "follow";
    agentId: string;
    tradeId: string | null;
    thesisId: string | null;
    createdAt: string;
  }>
> {
  const found = await queryRows<{
    id: string;
    kind: "trade" | "thesis" | "follow";
    agent_id: string;
    trade_id: string | null;
    thesis_id: string | null;
    created_at: string;
  }>(db()`
    select id, kind, agent_id, trade_id, thesis_id, created_at::text
    from feed_events
    order by created_at desc
    limit ${limit}
  `);
  return found.map((row) => ({
    id: row.id,
    kind: row.kind,
    agentId: row.agent_id,
    tradeId: row.trade_id,
    thesisId: row.thesis_id,
    createdAt: row.created_at,
  }));
}

export async function listFollowingFeed(followerId: string, limit = 40) {
  const found = await queryRows<{
    id: string;
    kind: "trade" | "thesis" | "follow";
    agent_id: string;
    trade_id: string | null;
    thesis_id: string | null;
    created_at: string;
  }>(db()`
    select e.id, e.kind, e.agent_id, e.trade_id, e.thesis_id, e.created_at::text
    from feed_events e
    join follows f on f.followee_id = e.agent_id
    where f.follower_id = ${followerId}
    order by e.created_at desc
    limit ${limit}
  `);
  return found.map((row) => ({
    id: row.id,
    kind: row.kind,
    agentId: row.agent_id,
    tradeId: row.trade_id,
    thesisId: row.thesis_id,
    createdAt: row.created_at,
  }));
}

export async function ensureSecurityTables() {
  if (securityReady) return;
  await db()`
    create table if not exists security_audit (
      id uuid primary key default gen_random_uuid(),
      at timestamptz not null default now(),
      action text not null,
      actor_type text not null,
      actor_id text,
      agent_id text,
      trade_id text,
      ip text,
      meta jsonb not null default '{}'::jsonb
    )
  `;
  await db()`
    create table if not exists rate_limits (
      bucket text primary key,
      hits int not null,
      reset_at timestamptz not null
    )
  `;
  try {
    await db()`
      create unique index if not exists trades_idempotency_agent_key_uidx
      on trades (agent_id, idempotency_key)
      where idempotency_key is not null
    `;
  } catch {
    // musefomo_runtime cannot ALTER trades; keys are still scoped in application as agentId:key
  }
  try {
    await db()`
      create table if not exists helius_deliveries (
        delivery_key text primary key,
        signature text not null,
        received_at timestamptz not null default now()
      )
    `;
    await db()`
      create index if not exists helius_deliveries_sig_idx
      on helius_deliveries (signature)
    `;
    await db()`
      create table if not exists confirmed_executions (
        trade_id uuid primary key,
        signature text not null unique,
        agent_id uuid not null,
        wallet_address text not null,
        mint text not null,
        side text not null,
        token_amount_raw text not null,
        token_decimals int not null,
        quote_amount_raw text not null,
        quote_decimals int not null,
        quote_mint text not null,
        slot bigint,
        confirmed_at timestamptz not null,
        created_at timestamptz not null default now()
      )
    `;
  } catch {
    // Runtime role cannot CREATE in public; deliveries fall back to helius_events.
  }
  try {
    await db()`
      create unique index if not exists feed_events_trade_uidx
      on feed_events (trade_id)
      where kind = 'trade' and trade_id is not null
    `;
  } catch {
    // feed insert uses WHERE NOT EXISTS
  }
  securityReady = true;
}

export async function insertAuditEvent(input: {
  action: string;
  actorType: string;
  actorId: string | null;
  agentId: string | null;
  tradeId: string | null;
  ip: string | null;
  meta: Record<string, unknown>;
}) {
  await ensureSecurityTables();
  await db()`
    insert into security_audit (action, actor_type, actor_id, agent_id, trade_id, ip, meta)
    values (
      ${input.action},
      ${input.actorType},
      ${input.actorId},
      ${input.agentId},
      ${input.tradeId},
      ${input.ip},
      ${JSON.stringify(input.meta)}::jsonb
    )
  `;
}

export async function consumeRateLimit(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  await ensureSecurityTables();
  const resetAt = new Date(Date.now() + windowMs).toISOString();
  const rows = await queryRows<{ hits: number }>(db()`
    insert into rate_limits (bucket, hits, reset_at)
    values (${bucket}, 1, ${resetAt})
    on conflict (bucket) do update set
      hits = case when rate_limits.reset_at <= now() then 1 else rate_limits.hits + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning hits
  `);
  return Number(rows[0]?.hits ?? limit + 1) <= limit;
}

let discoveryReady: Promise<void> | null = null;

export async function ensureDiscoverySchema(): Promise<void> {
  if (!discoveryReady) {
    discoveryReady = applyDiscoverySchema().catch((error) => {
      discoveryReady = null;
      throw error;
    });
  }
  return discoveryReady;
}

async function applyDiscoverySchema(): Promise<void> {
  await db()`
    create table if not exists token_index (
      mint text primary key,
      symbol text,
      name text,
      image_url text,
      updated_at timestamptz not null default now()
    )
  `;
  await db()`create index if not exists token_index_symbol_prefix on token_index (lower(symbol) text_pattern_ops)`;
  await db()`create index if not exists token_index_name_prefix on token_index (lower(name) text_pattern_ops)`;
  await db()`create index if not exists agents_handle_prefix on agents (lower(handle) text_pattern_ops)`;
  await db()`create index if not exists agents_name_prefix on agents (lower(coalesce(display_name, '')) text_pattern_ops)`;
  await db()`
    create index if not exists trades_confirmed_at_idx
    on trades (confirmed_at desc)
    where status = 'confirmed'
  `;
  await db()`
    create index if not exists trades_confirmed_agent_idx
    on trades (agent_id, confirmed_at desc)
    where status = 'confirmed'
  `;
  await db()`create index if not exists positions_mint_idx on positions (mint)`;
  await db()`
    insert into token_index (mint)
    select distinct mint from (
      select output_mint as mint from trades where status = 'confirmed'
      union
      select input_mint as mint from trades where status = 'confirmed'
      union
      select mint from positions
    ) seen
    where mint is not null
      and mint <> ${SOL_MINT}
    on conflict (mint) do nothing
  `;
}

export type TokenIndexRow = {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
};

export async function searchTokenIndex(q: string, limit = 8): Promise<TokenIndexRow[]> {
  await ensureDiscoverySchema();
  const exact = q.trim();
  const lower = exact.toLowerCase();
  const prefix = `${exact}%`;
  const lowerPrefix = `${lower}%`;
  const rows = await queryRows<{
    mint: string;
    symbol: string | null;
    name: string | null;
    image_url: string | null;
  }>(db()`
    select mint, symbol, name, image_url
    from token_index
    where mint = ${exact}
       or mint like ${prefix}
       or lower(coalesce(symbol, '')) = ${lower}
       or lower(coalesce(symbol, '')) like ${lowerPrefix}
       or lower(coalesce(name, '')) like ${lowerPrefix}
    order by
      (mint = ${exact}) desc,
      (lower(coalesce(symbol, '')) = ${lower}) desc,
      updated_at desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: row.image_url,
  }));
}

export async function upsertTokenMeta(input: {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  imageUrl?: string | null;
}) {
  await ensureDiscoverySchema();
  await db()`
    insert into token_index (mint, symbol, name, image_url, updated_at)
    values (${input.mint}, ${input.symbol ?? null}, ${input.name ?? null}, ${input.imageUrl ?? null}, now())
    on conflict (mint) do update set
      symbol = coalesce(excluded.symbol, token_index.symbol),
      name = coalesce(excluded.name, token_index.name),
      image_url = coalesce(excluded.image_url, token_index.image_url),
      updated_at = now()
  `;
}

export async function listTokenIndexByMints(mints: string[]): Promise<TokenIndexRow[]> {
  if (!mints.length) return [];
  await ensureDiscoverySchema();
  const rows = await queryRows<{
    mint: string;
    symbol: string | null;
    name: string | null;
    image_url: string | null;
  }>(db()`
    select mint, symbol, name, image_url
    from token_index
    where mint = any(${mints}::text[])
  `);
  return rows.map((row) => ({
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: row.image_url,
  }));
}

export type MuseCashflowRow = {
  id: string;
  handle: string;
  displayName: string | null;
  buyLamports: string;
  sellLamports: string;
  trades: number;
};

export async function listMuseAgentCashflow(since: string | null, limit = 40): Promise<MuseCashflowRow[]> {
  const rows = since
    ? await queryRows<{
        id: string;
        handle: string;
        display_name: string | null;
        buy_lamports: string;
        sell_lamports: string;
        trades: string;
      }>(db()`
        select
          a.id,
          a.handle,
          a.display_name,
          coalesce(sum(case when t.side = 'buy' then coalesce(t.actual_in_amount, t.requested_amount, '0')::numeric else 0 end), 0)::text as buy_lamports,
          coalesce(sum(case when t.side = 'sell' then coalesce(t.actual_out_amount, '0')::numeric else 0 end), 0)::text as sell_lamports,
          count(*)::text as trades
        from trades t
        join agents a on a.id = t.agent_id
        where t.status = 'confirmed'
          and t.confirmed_at >= ${since}
        group by a.id, a.handle, a.display_name
        order by (
          coalesce(sum(case when t.side = 'sell' then coalesce(t.actual_out_amount, '0')::numeric else 0 end), 0)
          - coalesce(sum(case when t.side = 'buy' then coalesce(t.actual_in_amount, t.requested_amount, '0')::numeric else 0 end), 0)
        ) desc
        limit ${limit}
      `)
    : await queryRows<{
        id: string;
        handle: string;
        display_name: string | null;
        buy_lamports: string;
        sell_lamports: string;
        trades: string;
      }>(db()`
        select
          a.id,
          a.handle,
          a.display_name,
          coalesce(sum(case when t.side = 'buy' then coalesce(t.actual_in_amount, t.requested_amount, '0')::numeric else 0 end), 0)::text as buy_lamports,
          coalesce(sum(case when t.side = 'sell' then coalesce(t.actual_out_amount, '0')::numeric else 0 end), 0)::text as sell_lamports,
          count(*)::text as trades
        from trades t
        join agents a on a.id = t.agent_id
        where t.status = 'confirmed'
        group by a.id, a.handle, a.display_name
        order by (
          coalesce(sum(case when t.side = 'sell' then coalesce(t.actual_out_amount, '0')::numeric else 0 end), 0)
          - coalesce(sum(case when t.side = 'buy' then coalesce(t.actual_in_amount, t.requested_amount, '0')::numeric else 0 end), 0)
        ) desc
        limit ${limit}
      `);
  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    buyLamports: row.buy_lamports,
    sellLamports: row.sell_lamports,
    trades: Number(row.trades),
  }));
}

export async function listMuseTopMints(since: string | null): Promise<Map<string, string>> {
  const rows = since
    ? await queryRows<{ agent_id: string; mint: string }>(db()`
        select distinct on (agent_id) agent_id, mint
        from (
          select
            agent_id,
            case when side = 'buy' then output_mint else input_mint end as mint,
            sum(
              case when side = 'buy'
                then coalesce(actual_in_amount, requested_amount, '0')::numeric
                else coalesce(actual_out_amount, '0')::numeric
              end
            ) as vol
          from trades
          where status = 'confirmed'
            and confirmed_at >= ${since}
            and case when side = 'buy' then output_mint else input_mint end <> ${SOL_MINT}
          group by agent_id, case when side = 'buy' then output_mint else input_mint end
        ) ranked
        order by agent_id, vol desc
      `)
    : await queryRows<{ agent_id: string; mint: string }>(db()`
        select distinct on (agent_id) agent_id, mint
        from (
          select
            agent_id,
            case when side = 'buy' then output_mint else input_mint end as mint,
            sum(
              case when side = 'buy'
                then coalesce(actual_in_amount, requested_amount, '0')::numeric
                else coalesce(actual_out_amount, '0')::numeric
              end
            ) as vol
          from trades
          where status = 'confirmed'
            and case when side = 'buy' then output_mint else input_mint end <> ${SOL_MINT}
          group by agent_id, case when side = 'buy' then output_mint else input_mint end
        ) ranked
        order by agent_id, vol desc
      `);
  return new Map(rows.map((row) => [row.agent_id, row.mint]));
}

export type MuseMintStat = {
  mint: string;
  trades: number;
  volumeLamports: string;
  holders: number;
};

export async function listMuseMostTraded(limit = 12, since?: string | null): Promise<MuseMintStat[]> {
  const rows = await queryRows<{ mint: string; trades: string; volume_lamports: string }>(db()`
    select
      mint,
      count(*)::text as trades,
      coalesce(sum(vol), 0)::text as volume_lamports
    from (
      select
        case when side = 'buy' then output_mint else input_mint end as mint,
        case when side = 'buy' then actual_in_amount::numeric else actual_out_amount::numeric end as vol
      from trades
      where status = 'confirmed'
        and actual_in_amount is not null
        and actual_out_amount is not null
        and (${since ?? null}::timestamptz is null or confirmed_at >= ${since ?? null}::timestamptz)
        and case when side = 'buy' then output_mint else input_mint end <> ${SOL_MINT}
    ) fills
    group by mint
    order by sum(vol) desc, count(*) desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    mint: row.mint,
    trades: Number(row.trades),
    volumeLamports: row.volume_lamports,
    holders: 0,
  }));
}

export async function listMuseMostHeld(limit = 12): Promise<MuseMintStat[]> {
  const rows = await queryRows<{ mint: string; holders: string; amount: string }>(db()`
    select
      mint,
      count(*)::text as holders,
      coalesce(sum(amount::numeric), 0)::text as amount
    from positions
    where amount::numeric > 0
      and mint <> ${SOL_MINT}
    group by mint
    order by count(*) desc, sum(amount::numeric) desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    mint: row.mint,
    trades: 0,
    volumeLamports: "0",
    holders: Number(row.holders),
  }));
}

export type MuseActivityRow = {
  id: string;
  agentId: string;
  handle: string;
  displayName: string | null;
  side: TradeSide;
  mint: string;
  actualInAmount: string | null;
  actualOutAmount: string | null;
  requestedAmount: string;
  confirmedAt: string;
  signature: string | null;
};

export async function listMuseRecentActivity(limit = 16): Promise<MuseActivityRow[]> {
  const rows = await queryRows<{
    id: string;
    agent_id: string;
    handle: string;
    display_name: string | null;
    side: TradeSide;
    mint: string;
    actual_in_amount: string | null;
    actual_out_amount: string | null;
    requested_amount: string;
    confirmed_at: string;
    signature: string | null;
  }>(db()`
    select
      t.id,
      t.agent_id,
      a.handle,
      a.display_name,
      t.side,
      case when t.side = 'buy' then t.output_mint else t.input_mint end as mint,
      t.actual_in_amount,
      t.actual_out_amount,
      t.requested_amount,
      t.confirmed_at::text,
      t.signature
    from trades t
    join agents a on a.id = t.agent_id
    where t.status = 'confirmed'
    order by t.confirmed_at desc
    limit ${limit}
  `);
  return rows.map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    handle: row.handle,
    displayName: row.display_name,
    side: row.side,
    mint: row.mint,
    actualInAmount: row.actual_in_amount,
    actualOutAmount: row.actual_out_amount,
    requestedAmount: row.requested_amount,
    confirmedAt: row.confirmed_at,
    signature: row.signature,
  }));
}

export async function recordHeliusEvent(signature: string, payload: unknown): Promise<boolean> {
  await ensureSecurityTables();
  const found = await queryRows<{ signature: string }>(db()`
    insert into helius_events (signature, payload)
    values (${signature}, ${JSON.stringify(payload)}::jsonb)
    on conflict (signature) do nothing
    returning signature
  `);
  return Boolean(found[0]);
}

export async function recordHeliusDelivery(deliveryKey: string, signature: string): Promise<boolean> {
  await ensureSecurityTables();
  try {
    const found = await queryRows<{ delivery_key: string }>(db()`
      insert into helius_deliveries (delivery_key, signature)
      values (${deliveryKey}, ${signature})
      on conflict (delivery_key) do nothing
      returning delivery_key
    `);
    return Boolean(found[0]);
  } catch {
    return recordHeliusEvent(`delivery:${deliveryKey}`, { signature });
  }
}

export async function listPendingTrades(limit = 40): Promise<Trade[]> {
  const rows = await queryRows<TradeRow>(db()`
    select
      id, idempotency_key, agent_id, human_privy_user_id, wallet_address, side,
      input_mint, output_mint, requested_amount, actual_in_amount, actual_out_amount,
      quote_out_amount, price, slippage_bps, fee_lamports, thesis_id, dflow_quote,
      signature, status, fail_reason, created_at::text, submitted_at::text, confirmed_at::text
    from trades
    where status in ('submitted', 'confirming')
      and signature is not null
    order by submitted_at asc nulls last
    limit ${limit}
  `);
  return rows.map(mapTrade);
}

export async function listConfirmedMissingExecution(limit = 20): Promise<Trade[]> {
  await ensureSecurityTables();
  try {
    const rows = await queryRows<TradeRow>(db()`
      select
        t.id, t.idempotency_key, t.agent_id, t.human_privy_user_id, t.wallet_address, t.side,
        t.input_mint, t.output_mint, t.requested_amount, t.actual_in_amount, t.actual_out_amount,
        t.quote_out_amount, t.price, t.slippage_bps, t.fee_lamports, t.thesis_id, t.dflow_quote,
        t.signature, t.status, t.fail_reason, t.created_at::text, t.submitted_at::text, t.confirmed_at::text
      from trades t
      left join confirmed_executions e on e.trade_id = t.id
      where t.status = 'confirmed'
        and e.trade_id is null
      order by t.confirmed_at asc nulls last
      limit ${limit}
    `);
    return rows.map(mapTrade);
  } catch {
    return [];
  }
}

export async function insertConfirmedExecution(input: {
  tradeId: string;
  signature: string;
  agentId: string;
  walletAddress: string;
  mint: string;
  side: string;
  tokenAmountRaw: string;
  tokenDecimals: number;
  quoteAmountRaw: string;
  quoteDecimals: number;
  quoteMint: string;
  slot: number | null;
  confirmedAt: string;
}): Promise<boolean> {
  await ensureSecurityTables();
  try {
    const found = await queryRows<{ trade_id: string }>(db()`
      insert into confirmed_executions (
        trade_id, signature, agent_id, wallet_address, mint, side,
        token_amount_raw, token_decimals, quote_amount_raw, quote_decimals,
        quote_mint, slot, confirmed_at
      ) values (
        ${input.tradeId}, ${input.signature}, ${input.agentId}, ${input.walletAddress},
        ${input.mint}, ${input.side}, ${input.tokenAmountRaw}, ${input.tokenDecimals},
        ${input.quoteAmountRaw}, ${input.quoteDecimals}, ${input.quoteMint},
        ${input.slot}, ${input.confirmedAt}
      )
      on conflict (trade_id) do nothing
      returning trade_id
    `);
    return Boolean(found[0]);
  } catch {
    return recordHeliusEvent(`exec:${input.tradeId}`, {
      signature: input.signature,
      mint: input.mint,
      side: input.side,
      tokenAmountRaw: input.tokenAmountRaw,
      tokenDecimals: input.tokenDecimals,
      quoteAmountRaw: input.quoteAmountRaw,
      quoteDecimals: input.quoteDecimals,
      quoteMint: input.quoteMint,
      slot: input.slot,
      ts: input.confirmedAt,
    });
  }
}
