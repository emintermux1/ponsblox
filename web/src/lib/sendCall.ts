import { parseAbi, type Address, type Hex, type WalletClient } from 'viem'
import type { IntentView } from './api.ts'
import { rhc } from './chain.ts'

const APPROVE = parseAbi(['function approve(address spender, uint256 amount) returns (bool)'])

export async function sendIntentCall(
  wallet: WalletClient,
  account: Address,
  call: IntentView['call'],
  onStatus: (s: string) => void,
): Promise<Hex> {
  if (call.approveToken && call.approveSpender && call.approveAmount && BigInt(call.approveAmount) > 0n) {
    onStatus('Approve the spend in your wallet…')
    await wallet.writeContract({
      account,
      chain: rhc,
      address: call.approveToken as Address,
      abi: APPROVE,
      functionName: 'approve',
      args: [call.approveSpender as Address, BigInt(call.approveAmount)],
    })
  }
  onStatus('Confirm in your wallet…')
  return wallet.sendTransaction({
    account,
    chain: rhc,
    to: call.to as Address,
    data: call.data,
    value: BigInt(call.value || '0'),
  })
}
