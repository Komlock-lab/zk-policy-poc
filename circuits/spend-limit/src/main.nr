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
