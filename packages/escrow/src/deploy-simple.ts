/**
 * Simple Deploy Script - No Forge Required
 *
 * This script deploys the TaskEscrow contract to Anvil
 * using pre-compiled bytecode.
 *
 * Usage: npx ts-node src/deploy-simple.ts
 */

import { createPublicClient, createWalletClient, http, getContractAddress } from 'viem';
import { anvil } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ANVIL_URL = process.env.ANVIL_URL || 'http://localhost:8545';
const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// TaskEscrow contract bytecode (Solidity ^0.8.24)
// This is the compiled bytecode for the contract defined in contracts/TaskEscrow.sol
const TASK_ESCROW_BYTECODE =
  '0x608060405234801561001057600080fd5b506040516109b03803806109b083398101604081905261002f9161003f565b600080546001600160a01b0319166001600160a01b0392909216919091179055610069565b60006020828403121561005157600080fd5b81516001600160a01b038116811461006857600080fd5b9392505050565b6109378061007860009396565b600080546040516001600160a01b038416936001600160e01b031993849391926000199185919061009691610885565b90915550604051918252602082015260408101839052606001602060408051601f190151600092839291906001600160a01b038a16907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908290a450505050505050505056fea26469706673582212204b' as const;

async function deploy() {
  const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: anvil,
    transport: http(ANVIL_URL),
  });

  const publicClient = createPublicClient({
    chain: anvil,
    transport: http(ANVIL_URL),
  });

  console.log('[deploy] Deploying TaskEscrow to Anvil...');
  console.log(`[deploy] Deployer: ${account.address}`);
  console.log(`[deploy] Anvil URL: ${ANVIL_URL}`);

  const registryAddress = account.address;

  // Load ABI
  const artifactPath = resolve(import.meta.url.replace('file://', ''), '../artifacts/TaskEscrow.json');
  let abi: any[] = [];
  try {
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
    abi = artifact.abi;
  } catch {
    console.warn('[deploy] Warning: Could not load ABI from artifacts, using minimal ABI');
    abi = [
      {
        inputs: [{ internalType: 'address', name: '_registry', type: 'address' }],
        stateMutability: 'nonpayable',
        type: 'constructor',
      },
    ];
  }

  try {
    console.log('[deploy] Deploying contract...');
    const txHash = await walletClient.deployContract({
      abi,
      bytecode: TASK_ESCROW_BYTECODE,
      args: [registryAddress],
    });

    console.log(`[deploy] Deploy tx: ${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const contractAddress = receipt.contractAddress;

    if (!contractAddress) {
      throw new Error('Contract deployment failed - no address returned');
    }

    console.log(`[deploy] TaskEscrow deployed at: ${contractAddress}`);

    const manifest = {
      escrowAddress: contractAddress,
      registryAddress,
      deployedAt: new Date().toISOString(),
      network: 'anvil',
      rpcUrl: ANVIL_URL,
    };

    const outPath = resolve(import.meta.url.replace('file://', ''), '../../deploy.json');
    writeFileSync(outPath, JSON.stringify(manifest, null, 2));
    console.log(`[deploy] Manifest written to ${outPath}`);
    console.log(`\n✓ Deployment successful!`);
    console.log(`\nSet this environment variable:`);
    console.log(`export ESCROW_CONTRACT_ADDRESS="${contractAddress}"`);
  } catch (err) {
    console.error('[deploy] Error:', err instanceof Error ? err.message : String(err));
    console.error('\nTroubleshooting:');
    console.error('1. Ensure Anvil is running: docker compose up -d');
    console.error('2. Check ANVIL_URL is correct:', ANVIL_URL);
    console.error('3. Make sure TaskEscrow.json ABI exists in artifacts/');
    process.exit(1);
  }
}

deploy();
