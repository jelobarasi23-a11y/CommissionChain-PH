//! CommissionChain PH — Referral Commission Escrow Contract
//!
//! Lifecycle of a referral:
//!   1. An agent calls `create_referral` to record a new referral for a
//!      business, naming a commission amount. Status: Pending.
//!   2. The business reviews it off-chain (client name, deal details live in
//!      the application database) and calls either:
//!        - `approve_referral`, which escrows the commission amount by
//!          transferring it from the business into this contract's own
//!          balance, or
//!        - `reject_referral`, which closes the referral with no funds
//!          movement.
//!   3. If approved, the agent calls `claim_commission` to release the
//!      escrowed funds from the contract to themselves.
//!
//! NOTE ON SCOPE: the literal `Referral` struct requested by the project
//! spec is `{id, agent, business, commission, approved, claimed}`. This
//! contract adds one additional field, `rejected`, because without it there
//! would be no way to distinguish "pending" from "rejected" (both would
//! otherwise just be `approved == false`), and `approve_referral` could be
//! called on a referral the business had already turned down. This is a
//! minimal, additive change that doesn't remove or rename anything the spec
//! asked for.
//!
//! SECURITY NOTE: this contract is an unaudited hackathon/testnet prototype.
//! It escrows real token balances once deployed, so it must not be pointed
//! at mainnet funds without an independent professional audit first.
#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec};

#[cfg(test)]
mod test;

/// Storage keys for this contract.
///
/// `Admin`, `Token`, `Initialized`, and `NextId` live in *instance* storage
/// because they're small, contract-wide configuration values that should be
/// kept alive as long as the contract instance itself is. `AllIds` and each
/// `Referral(id)` live in *persistent* storage because that collection and
/// the records it indexes are expected to grow without bound as the
/// contract is used.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Initialized,
    NextId,
    AllIds,
    Referral(u32),
}

/// An on-chain referral record.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Referral {
    pub id: u32,
    pub agent: Address,
    pub business: Address,
    pub commission: i128,
    pub approved: bool,
    /// See the module-level NOTE ON SCOPE above for why this field exists.
    pub rejected: bool,
    pub claimed: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// `initialize` was called a second time on an already-initialized contract.
    AlreadyInitialized = 1,
    /// A function that needs contract configuration was called before `initialize`.
    NotInitialized = 2,
    /// No referral exists with the given id.
    ReferralNotFound = 3,
    /// The caller is not the business named on this referral.
    NotTheBusiness = 4,
    /// The caller is not the agent named on this referral.
    NotTheAgent = 5,
    /// `approve_referral` was called on a referral that is already approved.
    AlreadyApproved = 6,
    /// The referral was already rejected and can no longer be acted on.
    AlreadyRejected = 7,
    /// `claim_commission` was called on a referral that was already claimed.
    AlreadyClaimed = 8,
    /// `claim_commission` was called before the referral was approved.
    NotApproved = 9,
    /// A commission amount of zero or less was supplied.
    InvalidAmount = 10,
}

#[contract]
pub struct ReferralContract;

#[contractimpl]
impl ReferralContract {
    /// One-time setup. Records the contract admin and the address of the
    /// token contract (e.g. the Stellar USDC SAC on testnet) that
    /// commissions will be escrowed and paid out in.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::NextId, &1u32);
        env.storage()
            .persistent()
            .set(&DataKey::AllIds, &Vec::<u32>::new(&env));

        Ok(())
    }

    /// Submit a new referral. Called by the agent. Stores the referral as
    /// Pending (approved = false, rejected = false, claimed = false). No
    /// funds move at this step.
    pub fn create_referral(
        env: Env,
        agent: Address,
        business: Address,
        commission: i128,
    ) -> Result<u32, Error> {
        agent.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }
        if commission <= 0 {
            return Err(Error::InvalidAmount);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1u32);
        env.storage().instance().set(&DataKey::NextId, &(id + 1));

        let referral = Referral {
            id,
            agent: agent.clone(),
            business: business.clone(),
            commission,
            approved: false,
            rejected: false,
            claimed: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Referral(id), &referral);

        let mut ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::AllIds)
            .unwrap_or(Vec::new(&env));
        ids.push_back(id);
        env.storage().persistent().set(&DataKey::AllIds, &ids);

        env.events().publish((symbol_short!("referral"), symbol_short!("created")), id);

        Ok(id)
    }

    /// Approve a referral. Called by the business. Escrows the commission
    /// amount by transferring it from the business's token balance into
    /// this contract's own balance, where it sits until the agent claims it.
    ///
    /// Authorization note: this function requires `business.require_auth()`
    /// directly, *and* the nested token transfer below requires
    /// `business.require_auth()` again inside the token contract's own
    /// logic. Both are satisfied by the single authorization the business
    /// signs for this top-level call — Soroban's auth model lets one signed
    /// authorization cover an entire call tree rooted at the invocation it
    /// names, so no separate signature for the token transfer is needed.
    pub fn approve_referral(env: Env, business: Address, referral_id: u32) -> Result<(), Error> {
        business.require_auth();

        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&DataKey::Referral(referral_id))
            .ok_or(Error::ReferralNotFound)?;

        if referral.business != business {
            return Err(Error::NotTheBusiness);
        }
        if referral.rejected {
            return Err(Error::AlreadyRejected);
        }
        if referral.approved {
            return Err(Error::AlreadyApproved);
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let token_client = token::TokenClient::new(&env, &token_address);
        token_client.transfer(
            &business,
            &env.current_contract_address(),
            &referral.commission,
        );

        referral.approved = true;
        env.storage()
            .persistent()
            .set(&DataKey::Referral(referral_id), &referral);

        env.events().publish((symbol_short!("referral"), symbol_short!("approved")), referral_id);

        Ok(())
    }

    /// Reject a referral. Called by the business. No funds move — this is
    /// only available before the referral has been approved.
    pub fn reject_referral(env: Env, business: Address, referral_id: u32) -> Result<(), Error> {
        business.require_auth();

        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&DataKey::Referral(referral_id))
            .ok_or(Error::ReferralNotFound)?;

        if referral.business != business {
            return Err(Error::NotTheBusiness);
        }
        if referral.approved {
            return Err(Error::AlreadyApproved);
        }
        if referral.rejected {
            return Err(Error::AlreadyRejected);
        }

        referral.rejected = true;
        env.storage()
            .persistent()
            .set(&DataKey::Referral(referral_id), &referral);

        env.events().publish((symbol_short!("referral"), symbol_short!("rejected")), referral_id);

        Ok(())
    }

    /// Claim an approved commission. Called by the agent. Releases the
    /// escrowed funds held by this contract to the agent.
    ///
    /// Authorization note: only `agent.require_auth()` is needed here, even
    /// though the nested token transfer moves funds *out of this contract's
    /// own balance*. Soroban contracts automatically satisfy
    /// `require_auth()` for their own contract address when invoking
    /// themselves, so the contract can authorize releasing its own escrowed
    /// balance without a separate signature — the agent's signature is what
    /// gates the whole call.
    pub fn claim_commission(env: Env, agent: Address, referral_id: u32) -> Result<(), Error> {
        agent.require_auth();

        let mut referral: Referral = env
            .storage()
            .persistent()
            .get(&DataKey::Referral(referral_id))
            .ok_or(Error::ReferralNotFound)?;

        if referral.agent != agent {
            return Err(Error::NotTheAgent);
        }
        if referral.rejected {
            return Err(Error::AlreadyRejected);
        }
        if !referral.approved {
            return Err(Error::NotApproved);
        }
        if referral.claimed {
            return Err(Error::AlreadyClaimed);
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let token_client = token::TokenClient::new(&env, &token_address);
        token_client.transfer(
            &env.current_contract_address(),
            &agent,
            &referral.commission,
        );

        referral.claimed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Referral(referral_id), &referral);

        env.events().publish((symbol_short!("referral"), symbol_short!("claimed")), referral_id);

        Ok(())
    }

    /// Fetch a single referral by id.
    pub fn get_referral(env: Env, referral_id: u32) -> Result<Referral, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Referral(referral_id))
            .ok_or(Error::ReferralNotFound)
    }

    /// Fetch every referral ever created, in ascending id (creation) order.
    pub fn get_all_referrals(env: Env) -> Vec<Referral> {
        let ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::AllIds)
            .unwrap_or(Vec::new(&env));

        let mut out: Vec<Referral> = Vec::new(&env);
        for id in ids.iter() {
            if let Some(r) = env
                .storage()
                .persistent()
                .get::<DataKey, Referral>(&DataKey::Referral(id))
            {
                out.push_back(r);
            }
        }
        out
    }
}
