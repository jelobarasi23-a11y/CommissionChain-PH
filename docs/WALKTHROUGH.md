# Full setup walkthrough

This walks through everything between unzipping the project and running the
live demo: installing the toolchain, deploying the contract, getting a test
"USDC" token onto testnet, wiring up the database, and clicking through the
actual flow with two wallets. Commands below were checked against current
Stellar CLI documentation rather than assumed, since this tooling moves
fast — if a command's output looks different from what's shown here, that's
usually just a CLI version difference, not a sign something's wrong.

Budget 45–90 minutes for first-time setup, most of it toolchain installs.

---

## Part 1 — Install prerequisites

### Node.js

Node 20+ and npm. Check with `node --version`.

### Rust + the Soroban target

Soroban contracts need Rust **1.84.0 or newer** specifically for the
`wasm32v1-none` target (the current standard build target — older guides
reference `wasm32-unknown-unknown`, which still exists but isn't what
current tooling defaults to).

```bash
# Install Rust if you don't have it
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Windows: download rustup-init.exe from rust-lang.org/tools/install instead

# If you already have Rust, make sure it's new enough
rustc --version          # should be >= 1.84.0
rustup update            # if it isn't

# Add the contract build target
rustup target add wasm32v1-none
```

### Stellar CLI

This builds, tests, and deploys the contract, and manages testnet
identities. Pick one:

```bash
# macOS / Linux (recommended — also installs system deps)
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh -s -- --install-deps

# macOS / Linux via Homebrew
brew install stellar-cli

# Any platform via cargo
cargo install --locked stellar-cli

# Windows via winget
winget install --id Stellar.StellarCLI
```

Verify with `stellar --version`.

### Database

This project uses [Supabase](https://supabase.com) for Postgres, accessed
directly via its JS client rather than an ORM — a free account is all you
need, no local Postgres install required. Part 7 below covers creating a
project; [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) Part 0 has the full detail
on exactly where to find your project URL and secret key.

### Freighter

Install the [Freighter](https://www.freighter.app/) browser extension now;
you'll configure it in Part 6.

---

## Part 2 — Unpack the project

Unzip `commissionchain-ph.zip` wherever you keep projects. You should see
`contracts/`, `web/`, and `docs/` at the top level.

---

## Part 3 — Build and test the contract

```bash
cd commissionchain-ph/contracts/referral
cargo test
```

You should see all 5 tests pass (`test result: ok. 5 passed`). If you hit
dependency resolution errors here, it almost always means your Rust is
older than what the pinned `Cargo.lock` expects — `rustup update` and
retry before doing anything else.

Now build the deployable contract:

```bash
stellar contract build
```

This compiles for `wasm32v1-none` and optimizes the output automatically
(current CLI versions do this by default — no separate `--optimize` step
needed). The artifact lands at:

```
target/wasm32v1-none/release/referral_contract.wasm
```

(Rust turns the hyphen in `referral-contract` into an underscore for the
filename — that's expected, not a typo.)

---

## Part 4 — Create testnet identities

You need three funded testnet keypairs: one to act as the contract admin
(deploys and initializes it), and one each for the agent and the business
you'll demo with.

```bash
stellar keys generate admin    --network testnet --fund
stellar keys generate agent    --network testnet --fund
stellar keys generate business --network testnet --fund
```

Each command funds the new account with testnet XLM via Friendbot
automatically. Get the public addresses (you'll need these throughout):

```bash
stellar keys address admin
stellar keys address agent
stellar keys address business
```

You'll also need the **secret keys** later to import `agent` and `business`
into Freighter:

```bash
stellar keys show agent
stellar keys show business
```

Keep this terminal output around — copy these four values (two public,
two secret) somewhere you can paste from.

---

## Part 5 — Get a test commission token onto testnet

The contract escrows and pays out whatever token you point it at. You have
two options — pick one.

### Option A — issue your own test "USDC" (simplest, recommended)

This gives you full control and no dependency on a third-party faucet
being up, which is the more reliable choice for a hackathon demo. It's
completely normal for testnet demos to use a self-issued token under a
recognizable name.

```bash
# A throwaway issuer account for your test asset
stellar keys generate usdc_issuer --network testnet --fund

# Business account opens a trustline to the asset
stellar tx new change-trust \
  --source business \
  --line "USDC:$(stellar keys address usdc_issuer)"

# Issuer sends the business a starting balance (amount is in the asset's
# own units here, not stroops — this sends 100,000 test USDC)
stellar tx new payment \
  --source usdc_issuer \
  --destination business \
  --asset "USDC:$(stellar keys address usdc_issuer)" \
  --amount 100000_0000000

# Deploy the Stellar Asset Contract wrapper so Soroban contracts (ours)
# can interact with it
stellar contract asset deploy \
  --source admin \
  --network testnet \
  --asset "USDC:$(stellar keys address usdc_issuer)"
```

That last command prints a contract id starting with `C` — that's your
`NEXT_PUBLIC_COMMISSION_TOKEN_ID`.

### Option B — use real Circle testnet USDC

Circle's actual testnet USDC issuer on Stellar is
`GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`. To use it:
open a trustline from `business` to that issuer the same way as Option A's
trustline step, then use [Circle's testnet
faucet](https://developers.circle.com/stablecoins/docs/usdc-on-testing-networks)
to send testnet USDC to your business address instead of the manual
payment step, then run `stellar contract asset deploy` against that
issuer/code pair instead of your own. This is closer to "real" but adds a
dependency on Circle's faucet being reachable — Option A is the safer bet
if you're prepping for a live demo.

---

## Part 6 — Deploy and initialize the referral contract

```bash
cd commissionchain-ph/contracts/referral

stellar contract deploy \
  --wasm target/wasm32v1-none/release/referral_contract.wasm \
  --source-account admin \
  --network testnet \
  --alias referral
```

This prints your contract id (starts with `C`) — that's
`NEXT_PUBLIC_REFERRAL_CONTRACT_ID`.

Now run `initialize` once, pointing it at the token contract id from Part
5:

```bash
stellar contract invoke \
  --id referral \
  --source-account admin \
  --network testnet \
  -- initialize \
  --admin "$(stellar keys address admin)" \
  --token <your-token-contract-id-from-part-5>
```

If this succeeds silently (no error), it worked — `initialize` returns
nothing on success.

---

## Part 7 — Database setup

Set up a Supabase project and run the schema file — see
[`docs/DEPLOYMENT.md`](DEPLOYMENT.md) Part 0 for exactly how, including
where to find your project URL and secret key in the Supabase dashboard.

```bash
cd commissionchain-ph/web
cp .env.example .env
```

Edit `.env`:
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` → both from your Supabase project
- `NEXT_PUBLIC_REFERRAL_CONTRACT_ID` → the contract id from Part 6
- `NEXT_PUBLIC_COMMISSION_TOKEN_ID` → the token contract id from Part 5
- Leave the testnet network values as they are

Then:

```bash
npm install
```

There's no separate migration command — the tables already exist once
you've run `web/supabase/schema.sql` in Supabase's SQL Editor, which Part
0 of the deployment guide walks through.

---

## Part 8 — Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Part 9 — Configure Freighter and demo the flow

1. Open Freighter, switch its network to **Testnet** (Settings → Network).
2. Import the **agent** account using the secret key from Part 4
   (Freighter → Add Account → Import using a secret key).
3. Import the **business** account the same way as a second account in
   Freighter, or use a second browser profile if you'd rather keep both
   visibly separate during a demo.

Now walk the actual flow:

1. With Freighter set to the **agent** account, go to **New Referral**,
   fill in the business's name and its public address (from Part 4), a
   client name, and a commission amount. Submit and sign in the Freighter
   popup.
2. Go to **Referrals** — you'll see it Pending, with a link to the
   transaction on Stellar Expert.
3. Switch Freighter to the **business** account (Freighter's account
   switcher, top of the extension). Refresh the Referrals page — Approve
   and Reject buttons now show up on that row, because the contract
   itself (not the frontend) recognizes this wallet as the named business.
   Click **Approve** and sign. This is the step that actually moves the
   commission into escrow on-chain.
4. Switch Freighter back to the **agent** account. Refresh — a **Claim**
   button now shows. Click it and sign.
5. Go to **Commissions** — the payout is listed, with a link to the claim
   transaction.

---

## Troubleshooting

**`cargo test` fails with dependency/edition errors.** Your Rust is older
than the lockfile expects. `rustup update`, then retry.

**`stellar contract build` can't find the `wasm32v1-none` target.**
`rustup target add wasm32v1-none` — and if you only just ran `rustup
update`, you may need to re-add the target for the new toolchain version.

**Freighter shows a different network or won't sign.** Double check it's
set to Testnet (Settings → Network) — a mismatch here is the single most
common cause of confusing failures, and `verifyNetwork()` in `wallet.ts`
will surface it as an explicit error if it happens.

**Approve/Reject/Claim buttons don't show up.** They're keyed off the
*exact* connected address matching the referral's stored business or
agent address — double check you're on the account you think you are in
Freighter's account switcher, and that you typed the right address when
submitting the referral.

**`initialize` fails with "AlreadyInitialized."** It's a one-time call —
if you're redeploying and re-initializing, you need a fresh contract
deploy first (each deploy gets a new contract id with its own storage).

**A transaction fails with an authorization error.** Most often this means
you signed with the wrong Freighter account for that action — approvals
need the business account, claims need the agent account, regardless of
which account happens to be active in the browser tab.
