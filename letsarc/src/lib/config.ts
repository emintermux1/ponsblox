import { z } from "zod";
import { config as loadDotenv } from "dotenv";
import type { Hex } from "viem";

loadDotenv();

const workerSchema = z.object({
  LAUNCHER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "LAUNCHER_PRIVATE_KEY must be 0x + 64 hex"),
  ARC_RPC_URL: z.string().url().optional(),
  X_API_KEY: z.string().min(1),
  X_API_SECRET: z.string().min(1),
  X_ACCESS_TOKEN: z.string().min(1),
  X_ACCESS_TOKEN_SECRET: z.string().min(1),
  X_BOT_USER_ID: z.string().min(1),
  X_BOT_USERNAME: z.string().default("letslauncharc"),
  X_BEARER_TOKEN: z.string().optional(),
  X_WEBHOOK_SECRET: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  PINATA_JWT: z.string().optional(),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  MIN_NATIVE_WEI: z.string().default("1000000000000000"),
  DRY_RUN: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

const adminSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_SECRET: z.string().min(8),
});

export type WorkerEnv = z.infer<typeof workerSchema> & {
  LAUNCHER_PRIVATE_KEY: Hex;
};

export type AdminEnv = z.infer<typeof adminSchema>;

function formatZod(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

export function loadWorkerEnv(): WorkerEnv {
  const parsed = workerSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid worker environment:\n${formatZod(parsed.error)}`);
  }
  return parsed.data as WorkerEnv;
}

export function loadAdminEnv(): AdminEnv {
  const parsed = adminSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid admin environment:\n${formatZod(parsed.error)}`);
  }
  return parsed.data;
}

export function loadDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}
