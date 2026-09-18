import type { Address, Hash } from "viem";

export type AdapterCode =
  | "empty"
  | "not_found"
  | "not_configured"
  | "upstream"
  | "invalid"
  | "rejected";

export type AdapterOk<T> = {
  ok: true;
  data: T;
};

export type AdapterErr = {
  ok: false;
  code: AdapterCode;
  message: string;
};

export type AdapterResult<T> = AdapterOk<T> | AdapterErr;

export type PonsToken = {
  address: Address;
  curve: Address;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  deployer: Address;
  creatorFeeRecipient: Address;
  pairToken: Address;
  pairSymbol: string;
  priceQuote: string | null;
  marketCapQuote: string | null;
  quoteReserve: string;
  tokenReserve: string;
  totalSupply: string;
  graduated: boolean;
  readyToGraduate: boolean;
  creatorTaxBps: number;
  buybackEnabled: boolean;
  phase: number;
  explorerUrl: string;
};

export type IndexComponent = {
  symbol: string;
  weightBps: number;
  tokenAddress: Address | null;
};

export type PonsIndexStatus = "draft" | "launched" | "failed";

export type PonsIndex = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  components: IndexComponent[];
  coinAddress: Address | null;
  createdAt: number;
  status: PonsIndexStatus;
};

export type IndexPerformance = {
  indexId: string;
  asOf: number;
  valueQuote: string | null;
  change24hBps: number | null;
  componentReturns: Array<{
    symbol: string;
    change24hBps: number | null;
  }>;
};

export type IndexLaunchStatus = "prepared" | "submitted" | "confirmed" | "failed";

export type IndexLaunch = {
  indexId: string | null;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  quoteIn: string;
  recipient: Address;
  txHash: Hash | null;
  tokenAddress: Address | null;
  curveAddress: Address | null;
  status: IndexLaunchStatus;
  error: string | null;
};

export type CreateIndexInput = {
  name: string;
  symbol: string;
  description: string;
  components: IndexComponent[];
};

export type LaunchIndexCoinInput = {
  indexId?: string;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  quoteIn: string;
  recipient: Address;
  website?: string;
  twitter?: string;
  telegram?: string;
  creatorTaxBps?: number;
  buybackEnabled?: boolean;
};
