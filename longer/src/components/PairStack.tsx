import type { LeveragedAsset } from '@/lib/assets'
import { AssetMark } from './AssetMark'
import { TokenMark } from './TokenMark'

export function PairStack({
  symbol,
  logo,
  asset,
}: {
  symbol: string
  logo?: string
  asset: LeveragedAsset
}) {
  return (
    <span className="relative inline-flex shrink-0 pr-3 pt-1">
      <TokenMark symbol={symbol} logo={logo} size="lg" />
      <span className="absolute -bottom-0.5 -right-0.5 border border-bg">
        <AssetMark asset={asset} size="sm" />
      </span>
    </span>
  )
}
