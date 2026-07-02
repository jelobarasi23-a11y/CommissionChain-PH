# Running locally and deploying to Vercel

This covers the two ways to run the Next.js app — on your own machine, and
live on Vercel. It assumes the Soroban contract is already deployed and
initialized on Stellar testnet; if you haven't done that yet, do
[`docs/WALKTHROUGH.md`](WALKTHROUGH.md) first and come back here with your
`NEXT_PUBLIC_REFERRAL_CONTRACT_ID` and `NEXT_PUBLIC_COMMISSION_TOKEN_ID` in
hand. Neither of those values changes between "running locally" and
"running on Vercel" — they're addresses on a shared public network, not
anything tied to where the frontend happens to be hosted.

The database here is Supabase, used the same way in both places — there's
no separate local Postgres install and no migration tool to run; you
create one Supabase project, run one SQL file once, and point both your
local `.env` and your Vercel environment variables at the same project.

---

## Part 0 — Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (the free tier
   is plenty for this).
2. Once it's provisioned, open the **SQL Editor** in the left sidebar,
   click **New query**, paste in the entire contents of
   `web/supabase/schema.sql` from this project, and click **Run**. That
   creates every table the app needs, already locked down with Row Level
   Security (see the comment at the top of that file for why — short
   version: this app talks to Supabase only from its own server-side API
   routes using a key that bypasses RLS, so the public API is locked to
   zero access by design rather than half-secured with policies).
3. Get your credentials: **Settings → API Keys** (or the **Connect**
   button at the top of the dashboard).
   - **Project URL** — this is `SUPABASE_URL`.
   - A key that bypasses Row Level Security — this is `SUPABASE_SECRET_KEY`.
     On newer projects this is in the **Secret keys** section (starts with
     `sb_secret_...`); on older projects still on the legacy key system,
     it's the **`service_role`** key under **Legacy API Keys**. Either
     works the same way here.

Keep both handy — they go in `.env` for local, and in Vercel's
environment variables for production, unchanged either way.

---

## Part A — Run it locally

```bash
cd commissionchain-ph/web
npm install
cp .env.example .env
```

Fill in `.env`:
- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` — from Part 0
- `NEXT_PUBLIC_REFERRAL_CONTRACT_ID` / `NEXT_PUBLIC_COMMISSION_TOKEN_ID` —
  from your contract deploy
- leave the testnet network values as they are

```bash
npm run dev
```

Open `http://localhost:3000`. There's no migration command to run — the
SQL you ran once in Part 0 already created everything. See
[`docs/WALKTHROUGH.md`](WALKTHROUGH.md) Part 9 for actually clicking
through the demo with two Freighter accounts.

---

## Part B — Deploy to Vercel

### 1. Get the code into a Git repository

Vercel deploys from GitHub, GitLab, or Bitbucket (you can also deploy
directly from your machine with the Vercel CLI, covered at the end of this
section, but a repo is the more durable setup).

```bash
cd commissionchain-ph
git init
git add .
git commit -m "Initial commit"
```

Create an empty repository on GitHub, then:

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

### 2. Create a Vercel project

At [vercel.com](https://vercel.com), **Add New → Project**, import the
repo you just pushed. Vercel will detect Next.js automatically, but
because the app lives in `web/`, not the repo root, set:

- **Root Directory**: `web`

Leave the build command as the default (`next build`) — nothing here
needs overriding. There's no ORM client to regenerate and no migration
step to run as part of the build; the database side of this app is just
HTTP calls to Supabase at request time.

### 3. Set the environment variables

**Settings → Environment Variables.** Add the exact same values from your
local `.env` — the same Supabase project serves both, so this is a direct
copy, not a new setup:

```
SUPABASE_URL=<from Part 0>
SUPABASE_SECRET_KEY=<from Part 0>
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_REFERRAL_CONTRACT_ID=<your deployed contract id>
NEXT_PUBLIC_COMMISSION_TOKEN_ID=<your token contract id>
```

`ADMIN_SECRET_KEY` isn't needed here — this app's request-handling code
never reads it; only add it if you write your own one-off admin scripts
that do.

Apply all of these to all three environments (Production, Preview,
Development) unless you have a reason to split them.

> If you'd rather Vercel and your local machine use two separate Supabase
> projects instead of sharing one — e.g. so test data from local
> experiments never shows up in what you demo live — just create a second
> Supabase project and repeat Part 0 for it (including running the SQL
> file there too), then use that project's credentials here instead.
> Nothing else in this guide changes either way.

### 4. Deploy

Push to `main` (or click **Deploy** if you're already looking at the
project). Watch the build logs — if anything errors talking to Supabase
once it's live, it's almost always `SUPABASE_URL` or `SUPABASE_SECRET_KEY`
not set yet, or not matching the values from Part 0.

### 5. Verify

Open the `*.vercel.app` URL Vercel gives you. Freighter works on any
site, including this one — connect it and walk the same demo flow as
local (submit as agent, approve as business, claim as agent). Since local
and Vercel point at the same Supabase project by default, anything you
created locally already shows up here too, and vice versa — both copies
of the frontend are reading and writing the same database, on top of the
same on-chain contract.

### Alternative: deploying without a Git repo

If you'd rather not push to GitHub first:

```bash
npm install -g vercel
cd commissionchain-ph/web
vercel
```

This deploys straight from your local folder and walks you through
linking/creating a project interactively. You'll still need to do step 3
above (environment variables) in the resulting project's dashboard — the
CLI path skips the Git step, not the configuration.

---

## Troubleshooting

**App builds fine but every page errors at runtime.** Almost always
`SUPABASE_URL` or `SUPABASE_SECRET_KEY` — check they're set for the
environment you're actually hitting (Production vs. Preview use separate
variable sets unless you applied yours to both), and that they're the
real values from Part 0, not placeholders.

**Every request fails with something like "permission denied for table"
or returns empty results that shouldn't be empty.** You're most likely
using a publishable/anon key instead of the secret/service_role one —
the schema in `web/supabase/schema.sql` enables Row Level Security with
no policies, which means only the key that bypasses RLS can read or write
anything. Double check `SUPABASE_SECRET_KEY` is actually the secret (or
legacy `service_role`) key, not the publishable (or legacy `anon`) one.

**Referrals submitted locally don't show up on the deployed site, or vice
versa.** Only expected if you deliberately set up two separate Supabase
projects (the optional callout in step 3) — by default local and Vercel
share one project, so this usually means a typo in one environment's
credentials rather than two databases working as intended.

**You ran the SQL file twice, or against a project that already had these
tables, and got "already exists" errors.** Harmless — it means setup
already happened. If you genuinely want to start over, drop the six
tables in the Supabase SQL Editor first (`drop table reward_tokens,
transactions, commissions, referrals, businesses, users cascade;`) and
re-run the schema file.
