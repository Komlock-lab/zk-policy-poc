use poseidon::poseidon2::Poseidon2;

fn compute_policy_commitment(max_amount: u128, salt: Field) -> Field {
    Poseidon2::hash([max_amount as Field, salt], 2)
}

fn main(value: pub u128, policy_commitment: pub Field, max_amount: u128, salt: Field) {
    assert(value <= max_amount, "value exceeds max amount");
    assert(
        compute_policy_commitment(max_amount, salt) == policy_commitment,
        "policy commitment mismatch",
    );
}

#[test]
fn accepts_value_below_limit() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let salt: Field = 123456789;
    main(
        10_000_000_000_000_000,
        compute_policy_commitment(max_amount, salt),
        max_amount,
        salt,
    );
}

#[test]
fn accepts_value_equal_to_limit() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let salt: Field = 987654321;
    main(max_amount, compute_policy_commitment(max_amount, salt), max_amount, salt);
}

#[test(should_fail_with = "value exceeds max amount")]
fn rejects_value_above_limit() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let salt: Field = 123456789;
    main(
        1_000_000_000_000_000_000,
        compute_policy_commitment(max_amount, salt),
        max_amount,
        salt,
    );
}

#[test(should_fail_with = "policy commitment mismatch")]
fn rejects_wrong_commitment() {
    main(10_000_000_000_000_000, 42, 100_000_000_000_000_000, 123456789);
}

#[test]
fn matches_ts_sdk_commitment_vector() {
    // Locked against `packages/policy/src/commitment.ts`, which computes the same
    // hash via `@aztec/bb.js` `poseidon2Hash` outside the circuit. A change to the
    // `poseidon` dependency or its call shape that breaks this also breaks every
    // policyCommitment the TS SDK already computed for onchain registration.
    let max_amount: u128 = 100_000_000_000_000_000;
    let salt: Field = 123456789;
    assert(
        compute_policy_commitment(max_amount, salt)
            == 0x0c2f1344913f23e28cbc4aec7d5bb46b6261934bd8829c5043b07f3c5de92c34,
    );
}
