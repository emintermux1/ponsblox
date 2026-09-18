import { publicAppUrl } from "@/lib/app-url";
import { SOL_MINT } from "@/lib/constants";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`missing env ${name}`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function serverEnv() {
  return {
    dflowApiKey: required("DFLOW_API_KEY"),
    heliusApiKey: required("HELIUS_API_KEY"),
    privyAppId: required("PRIVY_APP_ID"),
    privyAppSecret: required("PRIVY_APP_SECRET"),
    privyJwksUrl: required("PRIVY_JWKS_URL"),
    privyAuthorizationPrivateKey: optional("PRIVY_AUTHORIZATION_PRIVATE_KEY"),
    privyAuthorizationKeyId: optional("PRIVY_AUTHORIZATION_KEY_ID"),
    fomoscanApiKey: required("FOMOSCAN_API_KEY"),
    fomoscanApiUrl: (optional("FOMOSCAN_API_URL") ?? "https://api.fomoscan.sh").replace(
      /\/$/,
      "",
    ),
    birdeyeApiKey: optional("BIRDEYE_API_KEY"),
    solscanApiKey: optional("SOLSCAN_API_KEY"),
    gmgnApiKey: optional("GMGN_API_KEY"),
    blockscoutApiKey: optional("BLOCKSCOUT_API_KEY"),
    databaseUrl: optional("DATABASE_URL"),
    supabaseUrl: optional("SUPABASE_URL"),
    supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
    heliusWebhookSecret: optional("HELIUS_WEBHOOK_SECRET"),
    credentialPepper: required("CREDENTIAL_PEPPER"),
    appUrl: publicAppUrl(),
    solMint: SOL_MINT,
  };
}

export function missingInfra(): string[] {
  const missing: string[] = [];
  const names = [
    "DFLOW_API_KEY",
    "HELIUS_API_KEY",
    "PRIVY_APP_ID",
    "PRIVY_APP_SECRET",
    "FOMOSCAN_API_KEY",
    "CREDENTIAL_PEPPER",
  ] as const;
  for (const name of names) {
    if (!process.env[name]?.trim()) missing.push(name);
  }
  if (!process.env.DATABASE_URL?.trim() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}
