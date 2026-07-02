# Why CommissionChain PH is a strong fit for Stellar

## Real-world adoption potential

The target users — solo and small-team insurance agencies, real-estate
brokerages, recruitment firms, solar installers, and marketing agencies
across Manila, Cebu, and Davao — are exactly the businesses least served
by existing fintech infrastructure built for either large enterprises or
individual consumers. They run on referral agents paid by commission, and
today that runs on trust, spreadsheets, and group chats. The entire
integration surface for a business to start using this is a Freighter
wallet and a willingness to sign one transaction per approval — no POS
integration, no merchant account, no minimum transaction volume. That's a
realistic adoption path for a five-person brokerage in a way that
enterprise blockchain tooling typically isn't.

## Serving the SME and freelancer economy

The Philippines' services economy runs heavily on commission-based
freelance work, and that arrangement is structurally disadvantaged by
slow, trust-dependent payouts — an agent has no leverage to demand faster
payment, and no record to point to if a commission goes unpaid. Putting
the referral and payout state machine on-chain doesn't just speed up
payment, it changes the power balance: an approved referral is money
already moved into escrow, not a promise the agent has to keep following
up on. That matters most for exactly the freelancers and micro-businesses
who have the least recourse when informal arrangements break down.

## USDC utility

Commission amounts are quoted, budgeted, and expected in dollar-stable
terms, not in an asset whose price could move materially between
"approved" and "claimed." Stellar's USDC support is what makes the
contract's escrow meaningful rather than risky — a business approving a
referral knows exactly how much value it's locking up, and an agent
claiming it knows exactly what they're getting, with neither side
exposed to the volatility that would make a referral approved today worth
a noticeably different amount next week.

## Soroban utility

This is a problem that's specifically a smart-contract problem, not just
a payments problem: it needs shared, enforceable state (a referral's
status), conditional fund movement (escrow only on approval, payout only
to the named agent, only once), and authorization that depends on *who*
is calling and *what state things are in* — a business can't approve
someone else's referral, an agent can't claim a commission that isn't
approved yet, nobody can claim twice. Soroban is what lets all of that
live in one auditable, deterministic place instead of being reconstructed
(and trusted) in application code, while still settling on Stellar's
fast, cheap classic ledger underneath.

## Scalability

Nothing about the design assumes a single business or a single industry.
The contract has no notion of "type of business" baked in — an insurance
agency, a solar installer, and a recruitment firm all just look like "a
business address that approves referrals," so the same deployed contract
already serves every vertical in the spec without modification. Each
referral is a small, independent, O(1) operation against the contract;
there's no shared global lock or batch process that would degrade as
volume grows, so the same architecture that handles one agency's ten
referrals a month scales unmodified to a platform-level rollout serving
many agencies, industries, and cities at once.
