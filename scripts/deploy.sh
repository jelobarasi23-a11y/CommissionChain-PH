#!/usr/bin/env bash
# CommissionChain PH — Contract deployment script
#
# Usage: ./scripts/deploy.sh [--network testnet|mainnet] [--admin <key-alias>]
#
# Prerequisites:
#   - Rust 1.84+ with wasm32v1-none target (rustup target add wasm32v1-none)
#   - Stellar CLI installed (stellar --version)
#   - A funded identity saved via `stellar keys generate <name> --network testnet --fund`
#
# The script builds the contract, deploys it, and initializes it in one
# repeatable run. It prints every contract ID so you can paste them straight
# into web/.env.

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
NETWORK="${NETWORK:-testnet}"
ADMIN_KEY="${ADMIN_KEY:-admin}"
TOKEN_CONTRACT_ID="${TOKEN_CONTRACT_ID:-}"   # required for initialize step

# ── Parse flags ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --network)  NETWORK="$2";   shift 2 ;;
    --admin)    ADMIN_KEY="$2"; shift 2 ;;
    --token)    TOKEN_CONTRACT_ID="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  CommissionChain PH — Contract Deployment        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Network : $NETWORK"
echo "  Admin   : $ADMIN_KEY  ($(stellar keys address "$ADMIN_KEY" --network "$NETWORK" 2>/dev/null || echo 'address lookup failed'))"
echo ""

# ── Step 1: Build ─────────────────────────────────────────────────────────────
echo "▶ Step 1/4 — Building contract WASM..."
cd "$(dirname "$0")/../contracts/referral"

rustup target add wasm32v1-none 2>/dev/null || true
stellar contract build

WASM="target/wasm32v1-none/release/referral_contract.wasm"
if [[ ! -f "$WASM" ]]; then
  echo "✗ WASM not found at $WASM — build may have failed."
  exit 1
fi
echo "✓ Built: $WASM ($(du -sh "$WASM" | cut -f1))"

# ── Step 2: Run tests ─────────────────────────────────────────────────────────
echo ""
echo "▶ Step 2/4 — Running contract tests..."
cargo test
echo "✓ All tests passed."

# ── Step 3: Deploy ────────────────────────────────────────────────────────────
echo ""
echo "▶ Step 3/4 — Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source-account "$ADMIN_KEY" \
  --network "$NETWORK" \
  2>&1 | grep -E "^C[A-Z2-7]{55}$" | tail -1)

if [[ -z "$CONTRACT_ID" ]]; then
  echo "✗ Could not parse contract ID from deploy output."
  echo "  Check stellar contract deploy output above."
  exit 1
fi

echo "✓ Deployed referral contract: $CONTRACT_ID"

# ── Step 4: Initialize ────────────────────────────────────────────────────────
echo ""
echo "▶ Step 4/4 — Initializing contract..."

if [[ -z "$TOKEN_CONTRACT_ID" ]]; then
  echo ""
  echo "  ⚠  No --token provided. Skipping initialize."
  echo "  Run manually once you have a token contract ID:"
  echo ""
  echo "    stellar contract invoke \\"
  echo "      --id $CONTRACT_ID \\"
  echo "      --source-account $ADMIN_KEY \\"
  echo "      --network $NETWORK \\"
  echo "      -- initialize \\"
  echo "      --admin \$(stellar keys address $ADMIN_KEY) \\"
  echo "      --token <TOKEN_CONTRACT_ID>"
  echo ""
else
  ADMIN_ADDR=$(stellar keys address "$ADMIN_KEY" --network "$NETWORK")
  stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$ADMIN_KEY" \
    --network "$NETWORK" \
    -- initialize \
    --admin "$ADMIN_ADDR" \
    --token "$TOKEN_CONTRACT_ID"
  echo "✓ Contract initialized."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Deployment complete — copy these into web/.env  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  NEXT_PUBLIC_REFERRAL_CONTRACT_ID=$CONTRACT_ID"
if [[ -n "$TOKEN_CONTRACT_ID" ]]; then
  echo "  NEXT_PUBLIC_COMMISSION_TOKEN_ID=$TOKEN_CONTRACT_ID"
fi
echo ""
