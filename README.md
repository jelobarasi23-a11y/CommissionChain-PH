# CommissionChain PH

On-chain referral commission escrow for Philippine SME businesses and
freelance sales agents, built on Stellar and Soroban.

> **Status:** hackathon/testnet prototype. The smart contract is
> functionally tested (see [Testing](#testing) below) but has **not** been
> professionally audited, and must not be pointed at mainnet funds without
> one first.

**🔗 Live demo:** [commissionchain-ph.vercel.app](https://commissionchain-ph.vercel.app)

## The Problem

Insurance agencies, real-estate brokerages, recruitment firms, solar
installers, and marketing agencies across the Philippines run on
freelance referral agents — people paid a commission whenever a referral
they bring in closes. Today that commission is tracked in a spreadsheet
or a notebook, approved informally, and paid out whenever the business
gets around to it. The agent has no record they can point to, no
visibility into approval status, and no way to know a payout is actually
coming until it shows up.

## The Solution

CommissionChain PH puts the whole referral-to-payout lifecycle on Stellar:

1. An **agent** connects their Freighter wallet and submits a referral —
   client name, business, commission amount.
2. The **business** reviews it and either **approves** it (which escrows
   the commission on-chain immediately, transferred from the business's
   own balance into the contract) or **rejects** it.
3. Once approved, the **agent claims** the commission, releasing the
   escrowed funds straight to their wallet.

Every step is a real Soroban transaction signed by whichever party is
acting — the app never holds funds or private keys for anyone.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system
diagram and a step-by-step breakdown of each transaction,
[`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) for a complete, copy-pasteable
setup-to-demo walkthrough, [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for
running the app locally and deploying it to Vercel, and
[`docs/PITCH.md`](docs/PITCH.md) / [`docs/HACKATHON.md`](docs/HACKATHON.md)
for the pitch materials and Stellar-fit rationale.

## Architecture at a glance

```
Agent / Business (Freighter)
        │  sign transactions
        ▼
Next.js 15 frontend  ──fetch──▶  Next.js API routes  ──build/submit──▶  Soroban RPC (testnet)
        │                              │                                       │
        │                              ▼                                      ▼
        │                        Supabase (Postgres)         Referral contract ──▶ USDC SAC
        ▼
   Dashboard / Referrals / New Referral / Commissions
```

- **`contracts/referral`** — the Soroban smart contract (Rust): the
  on-chain source of truth for a referral's state and the escrowed funds.
- **`web`** — the Next.js 15 + TypeScript app: frontend pages, the wallet
  integration, and the API routes that build/submit Soroban transactions
  and keep Supabase in sync with on-chain results.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Wallet | Freighter (`@stellar/freighter-api`) |
| Backend | Next.js API routes, `@stellar/stellar-sdk` |
| Blockchain | Stellar Testnet, Soroban smart contracts |
| Database | PostgreSQL via Supabase (`@supabase/supabase-js`, no ORM) |
| Smart contract | Rust + `soroban-sdk` |

## Repository layout

```
commissionchain-ph/
├── contracts/referral/      Soroban contract (Rust)
│   ├── src/lib.rs           Contract logic
│   ├── src/test.rs          5 required tests
│   └── Cargo.toml
├── web/                     Next.js application
│   ├── supabase/schema.sql  Database schema (run once in Supabase's SQL editor)
│   └── src/
│       ├── app/             Pages + API routes
│       ├── components/      UI components
│       └── lib/              Wallet, Stellar RPC, Supabase, formatting
├── docs/
│   ├── ARCHITECTURE.md      Diagram + transaction flow
│   ├── WALKTHROUGH.md       Full setup-to-demo walkthrough
│   ├── DEPLOYMENT.md        Run locally + deploy to Vercel
│   ├── PITCH.md             Elevator pitch, demo script, judge Q&A
│   └── HACKATHON.md         Why this fits Stellar
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- A Rust toolchain (1.84+) with the `wasm32v1-none` target (`rustup
  target add wasm32v1-none`) and the [Soroban / Stellar
  CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
  for deploying the contract
- PostgreSQL via [Supabase](https://supabase.com) (a free project — no
  local Postgres install needed)
- The [Freighter](https://www.freighter.app/) browser extension, set to
  Testnet

## Setup

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Create a free [Supabase](https://supabase.com) project, then run
`web/supabase/schema.sql` once in its SQL Editor (Supabase dashboard ->
SQL Editor -> New query -> paste -> Run) to create the tables this app
needs. Get your project's URL and secret key from Settings -> API Keys
and put them in `.env` as `SUPABASE_URL` / `SUPABASE_SECRET_KEY`. The
Stellar testnet values in `.env.example` already work as-is; you'll fill
in `NEXT_PUBLIC_REFERRAL_CONTRACT_ID` after deploying the contract in
step 3.

### 3. Build and deploy the smart contract

```bash
cd contracts/referral
rustup target add wasm32v1-none   # one-time; needs Rust 1.84+ (rustup update if older)
cargo test                         # run the 5 required tests
stellar contract build             # builds + optimizes target/wasm32v1-none/release/referral_contract.wasm

stellar contract deploy \
  --wasm target/wasm32v1-none/release/referral_contract.wasm \
  --source-account <your-funded-testnet-identity> \
  --network testnet
```

Note the contract id printed by `deploy` and put it in
`NEXT_PUBLIC_REFERRAL_CONTRACT_ID` in `web/.env`.

Then initialize it once, pointing it at the token it should escrow
commissions in (testnet USDC, or your own test asset's Stellar Asset
Contract wrapper):

```bash
stellar contract invoke \
  --id <your-contract-id> \
  --source-account <your-admin-identity> \
  --network testnet \
  -- initialize --admin <your-admin-public-key> --token <usdc-sac-contract-id>
```

Put that same token contract id in `NEXT_PUBLIC_COMMISSION_TOKEN_ID`.

**For the full version of this — including how to get a test USDC token
onto testnet and set up Freighter for a live demo — see
[`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md).**

### 4. (Optional) Generate official shadcn/ui components

The project ships with small, hand-written UI primitives in
`src/components/ui/` so it runs immediately with zero extra setup. A
`components.json` is already in place if you'd rather swap in the
official shadcn components:

```bash
npx shadcn@latest add button card badge input label
```

### 5. Run it

```bash
npm run dev
```

Open two browser profiles (or two browsers) with Freighter installed —
one funded testnet account acting as the agent, another as the business
— and walk through the flow in [`docs/PITCH.md`](docs/PITCH.md)'s demo
script. Use [Friendbot](https://friendbot.stellar.org/) to fund each
testnet account, and make sure the business account holds enough of the
commission token to cover the referrals you'll approve.

## Testing

The contract ships with the 5 required tests, run with:

```bash
cd contracts/referral
cargo test
```

They cover: the full happy path (create → approve → claim, including
checking the agent's and business's token balances actually move by the
right amount), an unauthorized-approval attempt from a stranger address,
a duplicate claim attempt, on-chain storage matching exactly what was
submitted, and approval status flipping correctly (including a rejected
double-approve attempt).

> **A note on how this was verified:** this contract was actually
> compiled and tested against a real `soroban-sdk` toolchain rather than
> only written from memory — all 5 tests pass. The
> `wasm32v1-none` build step and the Next.js app's live
> interaction with Soroban RPC/Horizon and a real Supabase project were
> not end-to-end tested in the environment this was built in (no network
> path to Stellar's testnet infrastructure or to Supabase's API from
> there), so budget time for that pass when you first wire up a real
> deployment. The web app's TypeScript did type-check cleanly against the
> real, fully-installed `@supabase/supabase-js` package, though — that
> part isn't a stand-in.

### Frontend tests

```bash
cd web
npm test
```

25 tests across 3 files using Vitest + React Testing Library, covering the
formatting helpers (`formatAmount`, `toStroops`/`fromStroops` round-trip,
address shortening, explorer URL builders), the role/status caption logic
that decides what each viewer sees and which buttons appear
(`getViewerRole`, `statusCaption`), and the `ApprovalStamp` component's
rendering across all four referral states.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full guide — using
one Supabase project for both local and Vercel, and a troubleshooting
section for the most common issues. Short version: run
`web/supabase/schema.sql` once in Supabase's SQL Editor, deploy `web/` to
Vercel with **Root Directory** set to `web`, and copy `SUPABASE_URL` /
`SUPABASE_SECRET_KEY` and the other variables from `.env` into the
project's environment variables — no build command changes needed, since
there's no ORM client to regenerate or migration step to run.

## Hackathon demo flow

See [`docs/PITCH.md`](docs/PITCH.md) for the full 30-second pitch, 2-minute
demo script, and anticipated judge questions with answers.

## License

MIT. This is a hackathon prototype — see the status note at the top of
this file and the security note in `contracts/referral/src/lib.rs` before
considering any production use.

---

## Deployed contract addresses (Stellar Testnet)

> These are the live testnet deployments used for judging. Replace with your own after running `stellar contract deploy` per the walkthrough.

| Contract | Address |
|---|---|
| Referral escrow contract | `CBBDNGISC7AKMP6U533NXRUHH66XZDIVZ32XOFZED7IK67O5HKQPWMVD` |
| USDC Stellar Asset Contract (SAC) | `CBS6ZLQB4ZICVF4UJCHCTD3VBGZANVY3BA7BLFGA66RCJXTS3BUDIL3M` |

> This contract was redeployed partway through development to pick up the
> event-emitting code added for the real-time events feature (see
> [Real-time contract events](#real-time-contract-events) below) — Soroban
> contracts are immutable, so only transactions run *after* a redeploy can
> emit the new events. For live, verifiable transaction proof against this
> exact deployment, see screenshot 8 below, or click any referral's
> "View proof" link directly in the running app.

---

## Screenshots

> **For submitters:** take these screenshots while the app is running locally or on Vercel, then replace the placeholder paths below. Store images in `docs/screenshots/`.

### 1. Wallet connected + XLM balance displayed

![Wallet connected and XLM balance shown in the navbar](docs/screenshots/01-wallet-connected-balance.png)

The nav bar shows the connected address, live XLM balance, and a pulsing green indicator confirming the Stellar Testnet connection.

### 2. XLM balance screen (Send XLM page)

![XLM balance on the Send XLM page](docs/screenshots/02-xlm-balance.png)

The `/xlm` page shows the live XLM balance fetched from Horizon and a form to send a classic XLM payment transaction.

### 3. Successful referral submission (transaction hash)

![Referral submitted with Pending status and transaction proof link](docs/screenshots/03-referral-submitted.png)

After submitting a referral, the Referrals page shows Pending status with a "View proof" link to Stellar Expert for the `create_referral` transaction.

### 4. Approved referral + commission claimed

![Referral settled with commission payout confirmed](docs/screenshots/04-commission-claimed.png)

After the business approves and the agent claims, the referral shows Settled status. The Commissions page displays the payout with a link to the `claim_commission` transaction hash on Stellar Expert.

### 5. Multi-wallet selector — Freighter and Albedo (Level 2)

![Wallet picker modal showing Freighter and Albedo options](docs/screenshots/10-multi-wallet-selector.png)

Clicking **Connect Wallet** opens a centered modal showing both supported wallets — Freighter (browser extension) and Albedo (web-based, no install required). The modal is rendered via React Portal so it appears correctly above all page content regardless of stacking context.

### 6. Mobile-responsive layout (Level 3)

![CommissionChain PH dashboard on a mobile phone](docs/screenshots/12-mobile-view.png)

The dashboard on an actual phone (Chrome for Android), not a resized desktop window — sidebar collapses to a hamburger menu, stat cards and buttons reflow to a single column.

### 7. CI/CD pipeline passing (Level 3)

![GitHub Actions run showing both jobs passing, with the Vitest test report inline](docs/screenshots/13-ci-cd-passing-with-tests.png)

Both CI jobs green on push — **Contract tests (cargo test)** and **Web app build**. The build job's summary also surfaces the full Vitest report inline: **25/25 tests passing** across 3 test files, giving this one screenshot double duty as both the CI/CD proof and the frontend test-results proof.

### 8. Live on-chain event feed — all three referral lifecycle events

![On-chain events panel showing Referral submitted, Commission escrowed, and Commission paid out events, each with a real ledger number](docs/screenshots/14-live-events-populated.png)

One referral (Maria Santos, on-chain id `#2`), taken through its full lifecycle — submitted, approved, claimed — with the **On-chain events** panel catching all three as they happened: **Referral submitted**, **Commission escrowed**, and **Commission paid out**, each tagged with a real Stellar ledger number (3,524,716 / 3,524,759 / 3,524,767) and a live relative timestamp. This confirms the full chain end to end: the deployed contract genuinely emits an event at every stage, and the dashboard's 15-second poll against Soroban RPC genuinely catches each one without a page refresh.

---

### 9. Contract test suite passing

![Terminal output of cargo test showing all 5 tests passing](docs/screenshots/15-cargo-test-passing.png)

`cargo test` run against the deployed contract's source — all 5 required tests (`test_storage_verification`, `test_approval_status_verification`, `test_duplicate_claim`, `test_happy_path`, `test_unauthorized_approval`) pass cleanly: `5 passed; 0 failed`.

---

### On-Chain Transaction Proof

Every action below is a real, signed Soroban contract invocation submitted to Stellar Testnet — verifiable on Stellar Expert.

| Action | Contract call | Stellar Expert |
|---|---|---|
| Referral submitted | `create_referral` | [2a0b36e0...dceee433](https://stellar.expert/explorer/testnet/tx/2a0b36e01ee3df64cdf6c6edd7a2dc0ba3639d1b3046607d68160ea7dceee433) |
| Referral approved (commission escrowed) | `approve_referral` | [5922d6b3...3675a0e52](https://stellar.expert/explorer/testnet/tx/5922d6b326cae83c2a46478c256974845345004401e4d65ceba598f3675a0e52) |
| Commission claimed | `claim_commission` | [015dcc6d...564ccaa141](https://stellar.expert/explorer/testnet/tx/015dcc6d7993b7e396145c6455486b84624f75f85c9207bb4c09cd564ccaa141) |

![create_referral on Stellar Expert](docs/screenshots/05-proof-create-referral.png)
![approve_referral on Stellar Expert](docs/screenshots/06-proof-approve-referral.png)
![claim_commission on Stellar Expert](docs/screenshots/07-proof-claim-commission.png)

A second, independent referral going through the same flow:

| Action | Contract call | Stellar Expert |
|---|---|---|
| Referral submitted | `create_referral` | [63b72989...bfb127eb](https://stellar.expert/explorer/testnet/tx/63b7298942d678142e4fdbafee49d7193895a01f02b139ca2bb84bc7bfb127eb) |
| Commission claimed | `claim_commission` | [bedc0678...d9d248f9](https://stellar.expert/explorer/testnet/tx/bedc067849446739665216afbd9f6599c38f5cf5ca3bc8336dbb2a33d9d248f9) |

![create_referral on Stellar Expert — second referral](docs/screenshots/08-proof-create-referral-2.png)
![claim_commission on Stellar Expert — second referral](docs/screenshots/09-proof-claim-commission-2.png)

---

## Multi-wallet support

CommissionChain PH supports two Stellar wallets, selectable via a wallet
picker modal when you click **Connect Wallet**:

| Wallet | Type | How it works |
|---|---|---|
| **Freighter** | Browser extension | Install from [freighter.app](https://freighter.app) |
| **Albedo** | Web-based, no install | Authorizes transactions in a secure popup at [albedo.link](https://albedo.link) |

![Wallet picker modal showing Freighter and Albedo options](docs/screenshots/10-multi-wallet-selector.png)

*The wallet selection modal appears centered over the page when Connect Wallet is clicked — both wallets are clearly labeled with their type and a Learn more link.*

`WalletProvider` exposes a single `signXdr(xdr)` function that routes to
whichever wallet is connected, so every transaction-signing call site in
the app (`ReferralForm`, `ReferralTable`, the Send XLM page) works
identically regardless of which wallet the user picked.

## Real-time contract events

Every state-changing contract function — `create_referral`,
`approve_referral`, `reject_referral`, `claim_commission` — publishes a
Soroban event with topics `("referral", "<action>")` and the referral id
as data (`contracts/referral/src/lib.rs`).

The frontend (`src/lib/events.ts`) polls `rpc.Server.getEvents()` every 15
seconds and displays new events in the **On-chain events** feed on the
dashboard (`src/components/ContractEventFeed.tsx`) — updating
automatically when any user takes an action on the deployed contract,
without a page refresh.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:
- `cargo test` against the Soroban contract (all 5 tests)
- `stellar contract build` to confirm the WASM compiles
- TypeScript type-check (`tsc --noEmit`)
- Frontend test suite (`npm test`)
- Next.js production build

## 🎥 Demo Video

Watch the CommissionChain PH demo:

[![CommissionChain PH Demo](https://img.youtube.com/vi/rp-Fvr8xtug/maxresdefault.jpg)](https://youtu.be/rp-Fvr8xtug)

▶️ **[Watch the Demo Video on YouTube](https://youtu.be/rp-Fvr8xtug)**

## Deployment automation

`scripts/deploy.sh` wraps the manual `stellar contract build` / `deploy` /
`initialize` sequence into one repeatable command:

```bash
./scripts/deploy.sh --network testnet --admin admin --token <TOKEN_CONTRACT_ID>
```

It builds, runs the test suite, deploys, initializes, and prints the
`NEXT_PUBLIC_REFERRAL_CONTRACT_ID` value ready to paste into `web/.env`.
