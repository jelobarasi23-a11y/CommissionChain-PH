# Pitch materials

## 30-second elevator pitch

Across the Philippines, insurance agencies, real-estate brokerages,
recruitment firms, solar installers, and marketing agencies all run on the
same broken pattern: a freelance agent refers a client, and then waits —
weeks, sometimes months — for a commission that lives in someone's
spreadsheet, subject to memory, trust, and cash flow. CommissionChain PH
puts that whole handshake on Stellar. An agent submits a referral, the
business approves it with one signature — which escrows the commission
on-chain immediately — and the agent claims it the moment it's approved.
No spreadsheet, no "the check is coming," no chasing. Just a wallet, a
signature, and USDC that's already there waiting.

## 2-minute demo script

**0:00–0:20 — The problem.** Open on the Dashboard, empty state. "This is
built for the agent economy that runs Philippine SME sales — referral
agents who get paid on commission, by businesses who track it all by hand.
The agent has no proof a referral was ever submitted, and no way to know
if or when they'll get paid."

**0:20–0:50 — Submitting a referral.** Connect Freighter as the agent.
Go to New Referral, fill in a client name, the business's name and wallet
address, a commission amount, hit submit. Freighter pops up — sign it.
"That's a real Soroban transaction on testnet, not a database row
pretending to be one." Land on the Referrals page and point at the Pending
stamp and the transaction link to Stellar Expert.

**0:50–1:25 — Approving as the business.** Switch the connected wallet to
the business's address. The same referral now shows Approve/Reject
buttons because the contract — not the frontend — knows this wallet is
the named business. Click Approve, sign in Freighter. "That signature just
moved the commission out of the business's balance into escrow, on-chain,
right now." Point at the stamp flipping to Approved and the new
transaction link.

**1:25–1:55 — Claiming as the agent.** Switch back to the agent's wallet.
Go to Commissions — nothing yet, since this hasn't been claimed. Back on
Referrals, click Claim, sign. Stamp flips to Settled. Jump to Commissions:
the payout is listed with the amount and a link to the claim transaction.
"That's real USDC, in the agent's wallet, with a permanent on-chain
receipt — not a promise."

**1:55–2:00 — Close.** "Same flow works for insurance, real estate,
recruitment, solar, marketing — anywhere a business owes a freelancer a
commission. CommissionChain PH is that handshake, made trustless."

## Judge Q&A

**Why does this need a blockchain instead of just a database with a
"paid" checkbox?**
A checkbox is exactly what businesses already have, and it's exactly the
problem — it's only as trustworthy as whoever can edit it. Putting the
escrow and the payout on a Soroban contract means the agent isn't relying
on the business's bookkeeping or goodwill: once a referral is approved,
the funds are already moved into escrow on-chain and nobody (including us)
can quietly revert that. The agent's claim is a contract call against
money that's *already there*, not a request that depends on someone else
acting in good faith.

**Why Soroban specifically, and not just XLM payments via classic
operations?**
Classic Stellar payments can move money, but they can't express "hold this
until a condition is met, then let exactly one party release it." That's
a state machine — pending, approved, claimed — with authorization rules
that depend on *who* is calling and *what state* the referral is in.
That's precisely what a smart contract is for, and Soroban is what brings
that to Stellar's settlement speed and fees.

**What stops a business from approving a referral and never having the
funds to cover it?**
`approve_referral` doesn't just flip a flag — the token transfer that
escrows the commission happens inside that same contract call, atomically.
If the business doesn't have the balance, the transfer fails and the whole
transaction reverts; there's no state where a referral shows "Approved"
without the money already sitting in escrow.

**What happens if a business approves a referral and then the agent never
claims it?**
The funds stay safely escrowed in the contract indefinitely — nothing
about the contract assumes the agent claims promptly. There's no
forfeiture or expiry built into this MVP; if real-world urgency ever
demanded a "claim by" window, that would be a natural extension, not a
patch to the core escrow logic.

**Why have a backend and a database at all if there's a smart contract?**
The contract is intentionally minimal — it only stores what changing
hands of money actually requires (parties, amount, status). It doesn't
store client names, business display names, or anything that makes a fast
dashboard possible. The backend/database layer is a read-optimized mirror
of on-chain state plus the human-facing context the contract shouldn't
have to carry; it's never the source of truth for whether money moved.

**How do you know the backend can't fake a referral's status?**
Every status change in Postgres is only ever written *after* the backend
has confirmed the matching transaction succeeded on Soroban — see
`/api/referrals/approve`, for example, which calls `submitSignedTransaction`
and only updates the database in the branch where that call didn't throw.
Anyone can independently verify the real state by calling `get_referral`
on the contract directly; the database is a cache, not an authority.

**Why USDC instead of XLM for the commission itself?**
Commissions in this world are quoted and budgeted in pesos, and businesses
think in dollar-pegged terms for the same reason — XLM's price moves;
nobody wants a commission that's worth 8% less by the time it's claimed.
USDC on Stellar gives the stability commissions need while still
settling in seconds for a fraction of a cent, which a card network or bank
transfer can't match.

**Why escrow at approval instead of just paying out directly when the
business approves?**
Separating "approved" from "claimed" mirrors how this already works in
practice — approval and disbursement are different moments, often
different people on the business side (an underwriter approves; finance
disburses). Escrowing at approval also means the agent's payout no longer
depends on the business's wallet having a balance *at claim time* — the
money is already locked in for them the instant it's approved.

**Is this only useful for big businesses, or does it work for a solo
agency owner?**
If anything it's more useful at small scale — a one-person brokerage
juggling referrals from a dozen agents has no payroll system and no
finance team, just a notebook or a group chat. Two wallets and a contract
call replace that entirely, with no monthly software fee and no
onboarding beyond installing Freighter.

**What would it take to move this from testnet to something businesses
actually use?**
Three things, roughly in order: a professional security audit of the
contract (it's explicitly unaudited right now, see the contract's own
header comment), a real onboarding flow for businesses that aren't
crypto-native (probably a custodial or assisted-signing option alongside
self-custody Freighter), and integration with whatever accounting tooling
Philippine SMEs already use, so this slots into existing bookkeeping
instead of becoming one more system to check.
