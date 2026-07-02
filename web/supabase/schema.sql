-- CommissionChain PH — Supabase schema
--
-- Run this once in your Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste this whole file -> Run) to create
-- everything the app needs. It's the direct SQL equivalent of what used
-- to be a Prisma schema: same tables, same relationships, same purpose —
-- this off-chain database mirrors and enriches what lives on the Soroban
-- referral contract. The contract is the source of truth for money
-- movement (escrow, payout) and the core referral state machine; this
-- database adds the human-facing details the contract doesn't need to
-- store on-chain (client names, business names, a fast indexed list for
-- the dashboard, optional reward-token bookkeeping).
--
-- Every table below has Row Level Security enabled with NO policies
-- attached, which means PostgREST's public API (the anon/authenticated
-- keys) can't read or write any of it. That's intentional: this app talks
-- to Supabase exclusively from Next.js API routes using the service role
-- key (see src/lib/supabase.ts), which bypasses RLS by design. There's no
-- Supabase Auth session anywhere in this app — "who you are" is "whichever
-- Stellar wallet you signed with," which isn't something PostgREST's
-- row-level security can key off out of the box — so the safest default
-- is to lock the public API down entirely rather than try to half-secure
-- it with policies tied to an auth system this app doesn't use.

create extension if not exists pgcrypto;

create type referral_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'CLAIMED');
create type transaction_type as enum ('CREATE_REFERRAL', 'APPROVE_REFERRAL', 'REJECT_REFERRAL', 'CLAIM_COMMISSION');
create type transaction_status as enum ('PENDING', 'SUCCESS', 'FAILED');

-- A sales/referral agent. Identified by their Stellar public key (the
-- address their Freighter wallet signs with) — there is no separate auth
-- system, the wallet is the login.
create table users (
  id text primary key default gen_random_uuid()::text,
  public_key text not null unique,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_public_key_idx on users (public_key);

-- A business (insurance agency, real-estate brokerage, recruitment firm,
-- solar installer, marketing agency, etc.) that pays out commissions to
-- agents for referrals it approves.
create table businesses (
  id text primary key default gen_random_uuid()::text,
  public_key text not null unique,
  name text not null,
  industry text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_public_key_idx on businesses (public_key);

-- One referral submission. on_chain_id is the u32 id assigned by the
-- Soroban contract's create_referral call and is how this row stays in
-- sync with on-chain state — every status change here should correspond
-- to a transaction recorded against this referral's on-chain id.
create table referrals (
  id text primary key default gen_random_uuid()::text,
  on_chain_id integer not null unique,
  client_name text not null,
  business_name text not null,
  commission_amount numeric(18, 7) not null,
  status referral_status not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agent_id text not null references users (id),
  business_id text not null references businesses (id)
);
create index referrals_agent_id_idx on referrals (agent_id);
create index referrals_business_id_idx on referrals (business_id);
create index referrals_status_idx on referrals (status);
create index referrals_on_chain_id_idx on referrals (on_chain_id);

-- The realized payout for a referral, created once claim_commission
-- succeeds on-chain. Its own table (rather than just fields on referrals)
-- so commission history can be queried/reported on independently of
-- referral status.
create table commissions (
  id text primary key default gen_random_uuid()::text,
  amount numeric(18, 7) not null,
  claimed_at timestamptz not null default now(),
  tx_hash text,
  referral_id text not null unique references referrals (id),
  agent_id text not null references users (id)
);
create index commissions_agent_id_idx on commissions (agent_id);

-- A record of every Stellar transaction this app submitted on behalf of a
-- user, so the UI can show status and link out to Stellar Expert without
-- re-querying Horizon/RPC every time.
create table transactions (
  id text primary key default gen_random_uuid()::text,
  tx_hash text not null unique,
  type transaction_type not null,
  status transaction_status not null default 'PENDING',
  ledger integer,
  source_key text not null,
  created_at timestamptz not null default now(),
  referral_id text references referrals (id)
);
create index transactions_referral_id_idx on transactions (referral_id);
create index transactions_source_key_idx on transactions (source_key);

-- Optional/stretch: a lightweight log of custom reward-token grants to
-- agents (e.g. loyalty points for hitting referral milestones). Not part
-- of the required MVP flow or contract functions — kept intentionally
-- simple, off-chain only, no contract support needed for this table.
create table reward_tokens (
  id text primary key default gen_random_uuid()::text,
  asset_code text not null default 'CCPRWD',
  amount numeric(18, 7) not null,
  reason text not null,
  created_at timestamptz not null default now(),
  agent_id text not null references users (id)
);
create index reward_tokens_agent_id_idx on reward_tokens (agent_id);

-- Lock every table down from the public PostgREST API — see the note at
-- the top of this file for why.
alter table users enable row level security;
alter table businesses enable row level security;
alter table referrals enable row level security;
alter table commissions enable row level security;
alter table transactions enable row level security;
alter table reward_tokens enable row level security;
