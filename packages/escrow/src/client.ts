import { createPublicClient, createWalletClient, http, keccak256 } from 'viem';
import { anvil } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ABI from artifact file
const artifactPath = resolve(__dirname, '../artifacts/TaskEscrow.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
export const ESCROW_ABI = artifact.abi;

const ANVIL_URL = process.env.ANVIL_URL || 'http://localhost:8545';
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const publicClient = createPublicClient({
  chain: anvil,
  transport: http(ANVIL_URL),
});

export function taskIdToBytes32(taskId: string): `0x${string}` {
  return keccak256(`0x${Buffer.from(taskId).toString('hex')}`);
}

export async function fundTask(
  taskId: string,
  amountWei: bigint,
  senderPrivateKey: string,
): Promise<`0x${string}`> {
  if (!ESCROW_ADDRESS) throw new Error('ESCROW_CONTRACT_ADDRESS not set');

  const account = privateKeyToAccount(senderPrivateKey as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: anvil,
    transport: http(ANVIL_URL),
  });

  return client.writeContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'fundTask',
    args: [taskIdToBytes32(taskId)],
    value: amountWei,
  });
}

export async function getTask(taskId: string): Promise<{
  creator: string;
  assignee: string;
  amount: bigint;
  state: number;
} | null> {
  if (!ESCROW_ADDRESS) return null;

  const result = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'tasks',
    args: [taskIdToBytes32(taskId)],
  });

  return {
    creator: result[0],
    assignee: result[1],
    amount: result[2],
    state: result[3],
  };
}
