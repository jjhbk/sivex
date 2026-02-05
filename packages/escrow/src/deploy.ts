import { createWalletClient, http, getContractAddress } from 'viem';
import { anvil } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ANVIL_URL = process.env.ANVIL_URL || 'http://localhost:8545';
// Anvil default deployer account 0
const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

// Load ABI from artifact
const artifactPath = resolve(__dirname, '../artifacts/TaskEscrow.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));

// TaskEscrow bytecode — placeholder. Run `forge compile` and replace with
// the bytecode from out/TaskEscrow.sol/TaskEscrow.json to deploy the real contract.
const TASK_ESCROW_BYTECODE = '0x' as `0x${string}`;

async function deploy() {
  const account = privateKeyToAccount(DEPLOYER_KEY);
  const client = createWalletClient({
    account,
    chain: anvil,
    transport: http(ANVIL_URL),
  });

  console.log('[deploy] Deploying TaskEscrow to Anvil...');
  console.log(`[deploy] Deployer: ${account.address}`);

  // Deploy with constructor arg: registry address = deployer address (registry oracle)
  const registryAddress = account.address;

  const txHash = await client.deployContract({
    abi: artifact.abi,
    bytecode: TASK_ESCROW_BYTECODE,
    args: [registryAddress],
  });

  console.log(`[deploy] Deploy tx: ${txHash}`);

  // Get deployed address from nonce
  const nonce = await client.getTransactionCount({ address: account.address });
  const contractAddress = getContractAddress({
    address: account.address,
    nonce: nonce - 1,
  });

  console.log(`[deploy] TaskEscrow deployed at: ${contractAddress}`);

  // Write address to deploy manifest
  const manifest = {
    escrowAddress: contractAddress,
    registryAddress,
    deployedAt: new Date().toISOString(),
  };

  const outPath = resolve(__dirname, '../../deploy.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`[deploy] Manifest written to ${outPath}`);
  console.log('[deploy] Set ESCROW_CONTRACT_ADDRESS=' + contractAddress + ' in your .env');
}

deploy().catch(err => {
  console.error('[deploy] Failed:', err);
  process.exit(1);
});
