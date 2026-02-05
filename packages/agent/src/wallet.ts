import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { anvil } from 'viem/chains';

const ANVIL_URL = process.env.ANVIL_URL || 'http://localhost:8545';
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;

if (!PRIVATE_KEY) {
  throw new Error('AGENT_PRIVATE_KEY environment variable is required');
}

export const account = privateKeyToAccount(PRIVATE_KEY);

export const walletClient = createWalletClient({
  account,
  chain: anvil,
  transport: http(ANVIL_URL),
});

export const walletAddress = account.address;
