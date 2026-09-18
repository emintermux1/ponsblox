import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { ROBINHOOD_RPC, robinhood } from "@/lib/chain";
import { optionalPublicEnv } from "@/lib/env";

const walletConnectId = optionalPublicEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");

export const wagmiConfig = createConfig({
  chains: [robinhood],
  connectors: [injected()],
  transports: {
    [robinhood.id]: http(ROBINHOOD_RPC),
  },
  ssr: true,
});

export const walletConnectConfigured = Boolean(walletConnectId);
