import { createWalletClient, http, keccak256 } from 'viem';
import { anvil } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// TaskEscrow ABI (minimal — only what we need)
const ESCROW_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'taskId', type: 'bytes32' }],
    name: 'fundTask',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'taskId', type: 'bytes32' },
      { internalType: 'address', name: 'assignee', type: 'address' },
    ],
    name: 'assignTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'taskId', type: 'bytes32' }],
    name: 'completeTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'taskId', type: 'bytes32' }],
    name: 'failTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'taskId', type: 'bytes32' }],
    name: 'disputeTask',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const ANVIL_URL = process.env.ANVIL_URL || 'http://localhost:8545';
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}` | undefined;

// Anvil default account 0 (settlement oracle / registry wallet)
const REGISTRY_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

function taskIdToBytes32(taskId: string): `0x${string}` {
  return keccak256(`0x${Buffer.from(taskId).toString('hex')}`);
}

export async function settle(
  action: 'assign' | 'complete' | 'fail' | 'dispute',
  taskId: string,
  targetWallet?: string,
): Promise<{ ok: boolean; error?: string; txHash?: string }> {
  if (!ESCROW_ADDRESS) {
    // Graceful degradation: if no escrow deployed, skip on-chain settlement
    console.warn('[settlement] ESCROW_CONTRACT_ADDRESS not set — skipping on-chain settlement');
    return { ok: true };
  }

  try {
    const account = privateKeyToAccount(REGISTRY_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: anvil,
      transport: http(ANVIL_URL),
    });

    const bytes32TaskId = taskIdToBytes32(taskId);

    let txHash: `0x${string}`;

    switch (action) {
      case 'assign':
        if (!targetWallet) throw new Error('assignee wallet required');
        txHash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'assignTask',
          args: [bytes32TaskId, targetWallet as `0x${string}`],
        });
        break;

      case 'complete':
        txHash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'completeTask',
          args: [bytes32TaskId],
        });
        break;

      case 'fail':
        txHash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'failTask',
          args: [bytes32TaskId],
        });
        break;

      case 'dispute':
        txHash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          functionName: 'disputeTask',
          args: [bytes32TaskId],
        });
        break;

      default:
        return { ok: false, error: `Unknown action: ${action}` };
    }

    return { ok: true, txHash };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
