use poseidon::poseidon2::Poseidon2;

fn compute_policy_commitment(max_amount: u128, allowed_target: Field, salt: Field) -> Field {
    Poseidon2::hash([max_amount as Field, allowed_target, salt], 3)
}

fn main(
    value: pub u128,
    target: pub Field,
    policy_commitment: pub Field,
    max_amount: u128,
    allowed_target: Field,
    salt: Field,
) {
    assert(value <= max_amount, "value exceeds max amount");
    assert(target == allowed_target, "target not allowed");
    assert(
        compute_policy_commitment(max_amount, allowed_target, salt) == policy_commitment,
        "policy commitment mismatch",
    );
}

#[test]
fn accepts_value_below_limit() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let allowed_target: Field = 0x70997970c51812dc3a010c7d01b50e0d17dc79c8;
    let salt: Field = 123456789;
    main(
        10_000_000_000_000_000,
        allowed_target,
        compute_policy_commitment(max_amount, allowed_target, salt),
        max_amount,
        allowed_target,
        salt,
    );
}

#[test]
fn accepts_value_equal_to_limit() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let allowed_target: Field = 0x70997970c51812dc3a010c7d01b50e0d17dc79c8;
    let salt: Field = 987654321;
    main(
        max_amount,
        allowed_target,
        compute_policy_commitment(max_amount, allowed_target, salt),
        max_amount,
        allowed_target,
        salt,
    );
}

#[test(should_fail_with = "value exceeds max amount")]
fn rejects_value_above_limit() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let allowed_target: Field = 0x70997970c51812dc3a010c7d01b50e0d17dc79c8;
    let salt: Field = 123456789;
    main(
        1_000_000_000_000_000_000,
        allowed_target,
        compute_policy_commitment(max_amount, allowed_target, salt),
        max_amount,
        allowed_target,
        salt,
    );
}

#[test(should_fail_with = "target not allowed")]
fn rejects_target_not_allowed() {
    let max_amount: u128 = 100_000_000_000_000_000;
    let allowed_target: Field = 0x70997970c51812dc3a010c7d01b50e0d17dc79c8;
    let other_target: Field = 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc;
    let salt: Field = 123456789;
    main(
        10_000_000_000_000_000,
        other_target,
        compute_policy_commitment(max_amount, allowed_target, salt),
        max_amount,
        allowed_target,
        salt,
    );
}

#[test(should_fail_with = "policy commitment mismatch")]
fn rejects_wrong_commitment() {
    let allowed_target: Field = 0x70997970c51812dc3a010c7d01b50e0d17dc79c8;
    main(
        10_000_000_000_000_000,
        allowed_target,
        42,
        100_000_000_000_000_000,
        allowed_target,
        123456789,
    );
}

#[test]
fn matches_ts_sdk_commitment_vector() {
    // Locked against `packages/policy/src/commitment.ts`, which computes the same
    // hash via `@aztec/bb.js` `poseidon2Hash` outside the circuit. A change to the
    // `poseidon` dependency or its call shape that breaks this also breaks every
    // policyCommitment the TS SDK already computed for onchain registration.
    let max_amount: u128 = 100_000_000_000_000_000;
    let allowed_target: Field = 0x70997970c51812dc3a010c7d01b50e0d17dc79c8;
    let salt: Field = 123456789;
    assert(
        compute_policy_commitment(max_amount, allowed_target, salt)
            == 0x2efa087728f035622bbcf985bc41221322af049eef82bb031d13d822985c17e0,
    );
}
