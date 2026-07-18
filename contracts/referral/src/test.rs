#![cfg(test)]

use super::{Error, ReferralContract, ReferralContractClient};
use soroban_sdk::{testutils::Address as _, token, Address, Env};

/// Shared test fixture: registers the referral contract and a fresh
/// Stellar Asset Contract test token, mints a starting balance of the
/// token to the business account, then calls `initialize` on the
/// referral contract so it knows which token to escrow.
fn setup() -> (
    Env,
    ReferralContractClient<'static>,
    token::TokenClient<'static>,
    Address, // admin
    Address, // agent
    Address, // business
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let business = Address::generate(&env);

    let contract_id = env.register_contract(None, ReferralContract);
    let client = ReferralContractClient::new(&env, &contract_id);

    let token_address = env.register_stellar_asset_contract(admin.clone());
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);
    let token_client = token::TokenClient::new(&env, &token_address);

    // Give the business a starting balance large enough to cover the
    // commissions used across all tests below.
    token_admin_client.mint(&business, &1_000_000_000i128);

    client.initialize(&admin, &token_address);

    (env, client, token_client, admin, agent, business)
}

/// Test 1 — Happy Path.
/// create_referral -> approve_referral -> claim_commission should all
/// succeed in sequence, the referral should end up marked claimed, and the
/// agent's token balance should increase by exactly the commission amount.
#[test]
fn test_happy_path() {
    let (_env, client, token_client, _admin, agent, business) = setup();

    let commission: i128 = 5_000_0000; // 500.0000 units, 7-decimal style amount
    let id = client.create_referral(&agent, &business, &commission);

    let agent_balance_before = token_client.balance(&agent);
    let business_balance_before = token_client.balance(&business);

    client.approve_referral(&business, &id);
    // Escrow happened: business balance went down, contract now holds it.
    assert_eq!(
        token_client.balance(&business),
        business_balance_before - commission
    );

    client.claim_commission(&agent, &id);
    // Payout happened: agent balance went up by exactly the commission.
    assert_eq!(token_client.balance(&agent), agent_balance_before + commission);

    let referral = client.get_referral(&id);
    assert_eq!(referral.id, id);
    assert!(referral.approved);
    assert!(referral.claimed);
    assert!(!referral.rejected);
}

/// Test 2 — Unauthorized Approval.
/// An address that is not the business named on the referral must not be
/// able to approve it. We test the contract's own business-logic check
/// (not signature verification, since `mock_all_auths()` intentionally
/// bypasses real signature checks for all of these tests) by asserting the
/// declared `NotTheBusiness` error is returned.
#[test]
fn test_unauthorized_approval() {
    let (env, client, _token_client, _admin, agent, business) = setup();

    let commission: i128 = 1_000_0000;
    let id = client.create_referral(&agent, &business, &commission);

    let stranger = Address::generate(&env);
    let result = client.try_approve_referral(&stranger, &id);
    assert_eq!(result, Err(Ok(Error::NotTheBusiness)));

    // Confirm the referral is untouched.
    let referral = client.get_referral(&id);
    assert!(!referral.approved);
}

/// Test 3 — Duplicate Claim.
/// Once an agent has claimed a commission, a second claim attempt on the
/// same referral must fail with `AlreadyClaimed` rather than paying out
/// twice.
#[test]
fn test_duplicate_claim() {
    let (_env, client, _token_client, _admin, agent, business) = setup();

    let commission: i128 = 2_500_0000;
    let id = client.create_referral(&agent, &business, &commission);
    client.approve_referral(&business, &id);
    client.claim_commission(&agent, &id);

    let result = client.try_claim_commission(&agent, &id);
    assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));
}

/// Test 4 — Storage Verification.
/// After creating a referral, every field stored on-chain should exactly
/// match what was submitted, and the referral should be discoverable via
/// `get_all_referrals`.
#[test]
fn test_storage_verification() {
    let (_env, client, _token_client, _admin, agent, business) = setup();

    let commission: i128 = 7_777_0000;
    let id = client.create_referral(&agent, &business, &commission);

    let referral = client.get_referral(&id);
    assert_eq!(referral.id, id);
    assert_eq!(referral.agent, agent);
    assert_eq!(referral.business, business);
    assert_eq!(referral.commission, commission);
    assert!(!referral.approved);
    assert!(!referral.rejected);
    assert!(!referral.claimed);

    let all = client.get_all_referrals();
    assert_eq!(all.len(), 1);
    assert_eq!(all.get(0).unwrap(), referral);
}

/// Test 5 — Approval Status Verification.
/// `approved` should flip from false to true exactly once approve_referral
/// succeeds, and a second approval attempt on the same referral must be
/// rejected with `AlreadyApproved` rather than silently succeeding again.
#[test]
fn test_approval_status_verification() {
    let (_env, client, _token_client, _admin, agent, business) = setup();

    let commission: i128 = 3_300_0000;
    let id = client.create_referral(&agent, &business, &commission);
    assert!(!client.get_referral(&id).approved);

    client.approve_referral(&business, &id);
    assert!(client.get_referral(&id).approved);

    let result = client.try_approve_referral(&business, &id);
    assert_eq!(result, Err(Ok(Error::AlreadyApproved)));
}
