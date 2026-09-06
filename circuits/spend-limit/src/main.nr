use poseidon::poseidon2::Poseidon2;

// Public: ADR-0012's 15 ordered payment fields. Private: the 65 normalized policy fields.
fn main(public_inputs: pub [Field; 15], policy_fields: [Field; 65]) {
    let p = public_inputs;
    let s = policy_fields;
    assert(p[0] == 2);
    assert(s[0] == 2);
    assert(p[1] == (p[1] as u64) as Field);
    for i in [2, 5, 6, 8] { p[i].assert_max_bit_size::<160>(); }
    assert(p[4] == (p[4] as u8) as Field);
    for i in [7, 9, 10, 14] { assert(p[i] == (p[i] as u128) as Field); }
    for i in [11, 12, 13] { assert(p[i] == (p[i] as u64) as Field); }
    assert(s[1] == (s[1] as u64) as Field);
    assert((s[2] == 0) | (s[2] == 1));
    let recipient_count = s[3] as u8;
    assert((s[3] == recipient_count as Field) & (recipient_count <= 16));
    if s[2] == 0 { assert(recipient_count == 0); }
    let mut recipient_allowed = false;
    for i in 0..16 {
        let recipient = s[4 + i];
        recipient.assert_max_bit_size::<160>();
        if i < recipient_count as u32 {
            if i > 0 { assert(s[3 + i].lt(recipient)); }
            recipient_allowed = recipient_allowed | (recipient == p[5]);
        } else { assert(recipient == 0); }
    }
    assert((s[2] == 0) | recipient_allowed, "recipient is not allowed");
    assert(s[63] == 0);
    assert((s[45] == 0) | (s[45] == 1));
    let contract_count = s[46] as u8;
    assert((s[46] == contract_count as Field) & (contract_count <= 16));
    if s[45] == 0 { assert(contract_count == 0); }
    let mut contract_allowed = false;
    for i in 0..16 {
        let target = s[47 + i];
        target.assert_max_bit_size::<160>();
        if i < contract_count as u32 {
            if i > 0 { assert(s[46 + i].lt(target)); }
            contract_allowed = contract_allowed | (target == p[8]);
        } else { assert(target == 0); }
    }
    if p[4] == 2 { assert((s[45] == 0) | contract_allowed, "contract is not allowed"); }
    let asset_count = s[20] as u8;
    assert((s[20] == asset_count as Field) & (asset_count > 0) & (asset_count <= 8));
    let mut allowed = false;
    for i in 0..8 {
        let asset = s[21 + i * 3];
        let limit = s[22 + i * 3];
        asset.assert_max_bit_size::<160>();
        assert(limit == (limit as u128) as Field);
        assert(s[23 + i * 3] == 0);
        if i < asset_count as u32 {
            if i > 0 { assert(s[21 + (i - 1) * 3].lt(asset)); }
            allowed = allowed | ((asset == p[6]) & (p[7] as u128 <= limit as u128));
        } else { assert((asset == 0) & (limit == 0)); }
    }
    assert(allowed, "value exceeds max amount");
    assert((p[4] == 0) | (p[4] == 1) | (p[4] == 2));
    if p[4] != 1 { assert((p[6] == 0) & (p[8] == p[5])); }
    else { assert((p[6] != 0) & (p[8] == p[6])); }
    if p[4] != 2 { assert((p[9] == 0) & (p[10] == 0)); }
    let issued_at = p[11] as u64;
    let valid_until = p[12] as u64;
    assert(valid_until >= issued_at);
    assert(valid_until - issued_at <= s[1] as u64);
    assert(Poseidon2::hash(s, 65) == p[3], "policy commitment mismatch");
}

fn fixture(value: u128, limit: u128, salt: Field) -> ([Field; 15], [Field; 65]) {
    let mut s = [0; 65];
    s[0] = 2; s[1] = 300; s[20] = 1; s[22] = limit as Field; s[64] = salt;
    let mut p = [0; 15];
    p[0] = 2; p[1] = 31337; p[2] = 1; p[3] = Poseidon2::hash(s, 65);
    p[5] = 2; p[7] = value as Field; p[8] = 2; p[11] = 100; p[12] = 400;
    (p, s)
}
#[test]
fn accepts_value_below_limit() { let (p, s) = fixture(10, 100, 123456789); assert(p[3] == 8681856271876768858477722514944831047648970978592868574920873064906263226319); main(p, s); }
#[test]
fn accepts_value_equal_to_limit() { let (p, s) = fixture(100, 100, 987654321); main(p, s); }
#[test(should_fail_with = "value exceeds max amount")]
fn rejects_value_above_limit() { let (p, s) = fixture(101, 100, 123456789); main(p, s); }
#[test(should_fail_with = "policy commitment mismatch")]
fn rejects_wrong_commitment() { let (mut p, s) = fixture(10, 100, 123456789); p[3] = 42; main(p, s); }

#[test]
fn accepts_recipient_added_to_allowlist() {
    let (mut p, mut s) = fixture(10, 100, 123456789);
    s[2] = 1; s[3] = 2; s[4] = 1; s[5] = 2;
    p[3] = Poseidon2::hash(s, 65);
    main(p, s);
}
#[test]
fn accepts_last_recipient_in_full_allowlist() {
    let (mut p, mut s) = fixture(10, 100, 123456789);
    s[2] = 1; s[3] = 16;
    for i in 0..16 { s[4 + i] = (i + 1) as Field; }
    p[5] = 16; p[8] = 16; p[3] = Poseidon2::hash(s, 65);
    main(p, s);
}

#[test]
fn accepts_erc20_with_its_own_asset_limit() {
    let (mut p, mut s) = fixture(10, 1, 123456789);
    s[20] = 2; s[24] = 1234; s[25] = 100;
    s[2] = 1; s[3] = 1; s[4] = p[5];
    p[4] = 1; p[6] = 1234; p[8] = 1234;
    p[3] = Poseidon2::hash(s, 65);
    main(p, s);
}

#[test]
fn accepts_allowed_contract_with_invoice() {
    let (mut p, mut s) = fixture(10, 100, 123456789);
    s[2] = 1; s[3] = 1; s[4] = p[5];
    s[45] = 1; s[46] = 1; s[47] = p[5];
    p[4] = 2; p[9] = 123; p[10] = 456;
    p[3] = Poseidon2::hash(s, 65);
    main(p, s);
}
#[test]
fn accepts_native_with_contract_condition_enabled() {
    let (mut p, mut s) = fixture(10, 100, 123456789);
    s[45] = 1; s[46] = 1; s[47] = 1234;
    p[3] = Poseidon2::hash(s, 65);
    main(p, s);
}
