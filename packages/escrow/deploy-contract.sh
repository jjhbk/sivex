#!/bin/bash

# Deploy TaskEscrow contract to Anvil
# Prerequisites: Anvil running (docker compose up -d)

set -e

ANVIL_URL="${ANVIL_URL:-http://localhost:8545}"
REGISTRY_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Anvil account 0

echo "🚀 Deploying TaskEscrow contract..."
echo "   Anvil URL: $ANVIL_URL"
echo "   Registry: $REGISTRY_ADDRESS"

# Check if Anvil is running
if ! curl -s -X POST "$ANVIL_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","id":1}' > /dev/null 2>&1; then
  echo "❌ Error: Anvil is not running at $ANVIL_URL"
  echo "   Start Anvil with: docker compose up -d"
  exit 1
fi

echo "✓ Anvil is running"
echo ""
echo "To deploy the contract, you need Foundry:"
echo ""
echo "  1. Install Foundry:"
echo "     curl -L https://foundry.paradigm.xyz | bash"
echo "     source ~/.bashrc"
echo "     foundryup"
echo ""
echo "  2. Compile and deploy:"
echo "     cd packages/escrow"
echo "     forge build"
echo "     npm run deploy"
echo ""
echo "OR use the web-based compiler at: https://remix.ethereum.org"
echo ""
