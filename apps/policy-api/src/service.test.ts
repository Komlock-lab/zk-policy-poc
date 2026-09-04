import { describe, expect, it, vi } from "vitest";
import { type Address, type Hex, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PolicyChainGateway, PolicyTransaction } from "./chain.ts";
import { encryptPolicySecret, hashPolicyToken } from "./crypto.ts";
import { policyDomain, policyUpdateTypes } from "./eip712.ts";
import { PolicyRepository } from "./repository.ts";
import { PolicyApiError, PolicyService, type RegisterPolicyInput } from "./service.ts";

const owner = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const attacker = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const account = "0x0000000000000000000000000000000000001234" as Address;
const policyId = "00000000-0000-4000-8000-000000000001";

class FakeChain implements PolicyChainGateway {
  owner = owner.address;
  configured = false;
  commitment = toHex(0n, { size: 32 });
  transaction?: PolicyTransaction;

  async getOwner(): Promise<Address> {
    return this.owner;
  }
  async getPolicyState(): Promise<{ configured: boolean; commitment: Hex }> {
    return { configured: this.configured, commitment: this.commitment };
  }
  async getTransaction(): Promise<PolicyTransaction> {
    if (!this.transaction) throw new Error("not found");
    return this.transaction;
  }
}

async function signedInput(
  signer = owner,
  overrides: Partial<Omit<RegisterPolicyInput, "signature">> = {},
): Promise<RegisterPolicyInput> {
  const commitment = toHex(300n, { size: 32 });
  const unsigned = {
    policyId,
    account,
    maxAmountWei: "100",
    salt: "200",
    policyCommitment: commitment,
    nonce: "0",
    deadline: 2_000,
    ...overrides,
  };
  const signature = await signer.signTypedData({
    domain: policyDomain(account),
    types: policyUpdateTypes,
    primaryType: "PolicyUpdate",
    message: {
      policyId: unsigned.policyId,
      account: unsigned.account,
      policyCommitment: unsigned.policyCommitment,
      nonce: BigInt(unsigned.nonce),
      deadline: BigInt(unsigned.deadline),
    },
  });
  return { ...unsigned, signature };
}

function setup() {
  const repository = new PolicyRepository(":memory:");
  const chain = new FakeChain();
  const service = new PolicyService(
    repository,
    chain,
    Buffer.alloc(32, 1),
    () => 1_000,
    async (maxAmount, salt) => maxAmount + salt,
  );
  return { repository, chain, service };
}

async function setupActive() {
  const state = setup();
  const registration = await state.service.registerInitial(await signedInput());
  state.repository.activate(policyId, 1);
  state.chain.configured = true;
  state.chain.commitment = state.repository.getActive(policyId)!.commitment;
  return { ...state, token: registration.token };
}

async function setupPendingUpdate() {
  const state = await setupActive();
  const commitment = toHex(301n, { size: 32 });
  const update = await state.service.register(
    await signedInput(owner, {
      maxAmountWei: "101",
      policyCommitment: commitment,
      nonce: "1",
    }),
  );
  return { ...state, commitment, update };
}

function setupProofPolicy(active = true) {
  const repository = new PolicyRepository(":memory:");
  const chain = new FakeChain();
  const token = `zkp_${"a".repeat(43)}`;
  const commitment = toHex(300n, { size: 32 });
  repository.createInitialPending({
    policyId,
    account,
    expectedNonce: 0n,
    commitment,
    secret: encryptPolicySecret(
      { maxAmountWei: "100", salt: "200" },
      Buffer.alloc(32, 1),
      policyId,
      1,
    ),
    tokenHash: hashPolicyToken(token),
  });
  if (active) repository.activate(policyId, 1);
  chain.configured = true;
  chain.commitment = commitment;
  const generateProof = vi.fn(async ({ value }: { value: bigint }) => ({
    proof: "0x1234" as Hex,
    publicInputs: [toHex(value, { size: 32 }), commitment] as const,
  }));
  const service = new PolicyService(
    repository,
    chain,
    Buffer.alloc(32, 1),
    () => 1_000,
    async () => 300n,
    generateProof,
  );
  return { repository, chain, service, token, commitment, generateProof };
}

describe("PolicyService initial registration", () => {
  it("registers pending, returns token once, and activates a matching transaction", async () => {
    const { repository, chain, service } = setup();
    const result = await service.registerInitial(await signedInput());
    expect(result).toMatchObject({ policyId, policyVersion: 1, status: "pending" });
    expect(result.token).toMatch(/^zkp_/);
    const stored = repository.getPolicy(policyId);
    expect(stored?.tokenHash.toString("utf8")).not.toContain(result.token);

    chain.transaction = { from: owner.address, to: account, input: result.calldata, status: "success" };
    chain.configured = true;
    chain.commitment = repository.getVersion(policyId, 1)!.commitment;
    await expect(service.activate({ policyId, token: result.token, txHash: toHex(1n, { size: 32 }) })).resolves.toEqual({
      policyVersion: 1,
      status: "active",
    });
    expect(repository.getActive(policyId)?.version).toBe(1);
    repository.close();
  });

  it("rejects wrong owner without creating state", async () => {
    const { repository, service } = setup();
    await expect(service.registerInitial(await signedInput(attacker))).rejects.toMatchObject({
      code: "INVALID_OWNER_SIGNATURE",
    });
    expect(repository.getPolicyByAccount(account)).toBeUndefined();
    repository.close();
  });

  it("rejects initial registration when the account already has a policy", async () => {
    const { repository, chain, service } = setup();
    chain.configured = true;

    await expect(service.registerInitial(await signedInput())).rejects.toMatchObject({
      code: "POLICY_ALREADY_CONFIGURED",
    });
    expect(repository.getPolicyByAccount(account)).toBeUndefined();
    repository.close();
  });

  it("rejects expired signatures and commitment mismatches", async () => {
    const first = setup();
    await expect(first.service.registerInitial(await signedInput(owner, { deadline: 999 }))).rejects.toMatchObject({
      code: "SIGNATURE_EXPIRED",
    });
    expect(first.repository.getPolicyByAccount(account)).toBeUndefined();
    first.repository.close();

    const second = setup();
    await expect(
      second.service.registerInitial(
        await signedInput(owner, { policyCommitment: toHex(123n, { size: 32 }) }),
      ),
    ).rejects.toMatchObject({ code: "POLICY_COMMITMENT_MISMATCH" });
    expect(second.repository.getPolicyByAccount(account)).toBeUndefined();
    second.repository.close();
  });

  it("rejects replayed registration", async () => {
    const { repository, service } = setup();
    const input = await signedInput();
    await service.registerInitial(input);
    await expect(service.registerInitial(input)).rejects.toBeInstanceOf(PolicyApiError);
    expect(repository.getPolicyByAccount(account)?.nonce).toBe(1n);
    repository.close();
  });

  it("does not translate unexpected repository failures into conflicts", async () => {
    const { repository, service } = setup();
    vi.spyOn(repository, "createInitialPending").mockImplementation(() => {
      throw new Error("database unavailable");
    });

    await expect(service.registerInitial(await signedInput())).rejects.toThrow("database unavailable");
    repository.close();
  });

  it("rejects an invalid signature value without creating state", async () => {
    const { repository, service } = setup();
    const input = await signedInput();
    input.signature = `0x${"00".repeat(65)}`;

    await expect(service.registerInitial(input)).rejects.toMatchObject({
      code: "INVALID_OWNER_SIGNATURE",
      statusCode: 401,
    });
    expect(repository.getPolicyByAccount(account)).toBeUndefined();
    repository.close();
  });
});

describe("PolicyService policy updates", () => {
  it("activates the latest pending version and supersedes the previous active version", async () => {
    const { repository, chain, service, token } = await setupActive();
    const commitment = toHex(301n, { size: 32 });
    const update = await service.register(
      await signedInput(owner, {
        maxAmountWei: "101",
        policyCommitment: commitment,
        nonce: "1",
      }),
    );
    expect(update).toMatchObject({ policyId, policyVersion: 2, status: "pending" });
    expect(repository.getVersion(policyId, 1)?.status).toBe("active");

    chain.transaction = { from: owner.address, to: account, input: update.calldata, status: "success" };
    chain.commitment = commitment;
    await expect(service.activate({ policyId, token, txHash: toHex(2n, { size: 32 }) })).resolves.toEqual({
      policyVersion: 2,
      status: "active",
    });
    expect(repository.getVersion(policyId, 1)?.status).toBe("superseded");
    expect(repository.getVersion(policyId, 2)?.status).toBe("active");
    repository.close();
  });

  it("replaces an unconfirmed pending version with a new nonce", async () => {
    const { repository, service } = await setupActive();
    await service.register(
      await signedInput(owner, {
        maxAmountWei: "101",
        policyCommitment: toHex(301n, { size: 32 }),
        nonce: "1",
      }),
    );
    const replacement = await service.register(
      await signedInput(owner, {
        maxAmountWei: "102",
        policyCommitment: toHex(302n, { size: 32 }),
        nonce: "2",
      }),
    );

    expect(replacement.policyVersion).toBe(3);
    expect(repository.getVersion(policyId, 1)?.status).toBe("active");
    expect(repository.getVersion(policyId, 2)?.status).toBe("superseded");
    expect(repository.getVersion(policyId, 3)?.status).toBe("pending");
    repository.close();
  });

  it("rejects a replayed update without replacing pending state", async () => {
    const { repository, service } = await setupActive();
    const input = await signedInput(owner, {
      maxAmountWei: "101",
      policyCommitment: toHex(301n, { size: 32 }),
      nonce: "1",
    });
    await service.register(input);

    await expect(service.register(input)).rejects.toMatchObject({ code: "POLICY_OR_NONCE_CONFLICT" });
    expect(repository.getPending(policyId)?.version).toBe(2);
    expect(repository.getPolicy(policyId)?.nonce).toBe(2n);
    repository.close();
  });

  it("keeps state unchanged for every activation rejection", async () => {
    const scenarios: Array<{
      name: string;
      expectedCode: string;
      arrange: (state: Awaited<ReturnType<typeof setupPendingUpdate>>) => string;
    }> = [
      {
        name: "wrong token",
        expectedCode: "INVALID_POLICY_TOKEN",
        arrange: ({ token }) => `${token}x`,
      },
      {
        name: "missing receipt",
        expectedCode: "TRANSACTION_NOT_CONFIRMED",
        arrange: ({ token }) => token,
      },
      {
        name: "reverted transaction",
        expectedCode: "TRANSACTION_MISMATCH",
        arrange: ({ chain, token, update }) => {
          chain.transaction = { from: owner.address, to: account, input: update.calldata, status: "reverted" };
          return token;
        },
      },
      {
        name: "wrong target",
        expectedCode: "TRANSACTION_MISMATCH",
        arrange: ({ chain, token, update }) => {
          chain.transaction = {
            from: owner.address,
            to: "0x0000000000000000000000000000000000009999",
            input: update.calldata,
            status: "success",
          };
          return token;
        },
      },
      {
        name: "wrong sender",
        expectedCode: "TRANSACTION_MISMATCH",
        arrange: ({ chain, token, update }) => {
          chain.transaction = { from: attacker.address, to: account, input: update.calldata, status: "success" };
          return token;
        },
      },
      {
        name: "wrong calldata",
        expectedCode: "TRANSACTION_MISMATCH",
        arrange: ({ chain, token }) => {
          chain.transaction = { from: owner.address, to: account, input: "0x1234", status: "success" };
          return token;
        },
      },
      {
        name: "on-chain commitment mismatch",
        expectedCode: "ONCHAIN_POLICY_MISMATCH",
        arrange: ({ chain, token, update }) => {
          chain.transaction = { from: owner.address, to: account, input: update.calldata, status: "success" };
          return token;
        },
      },
    ];

    for (const [index, scenario] of scenarios.entries()) {
      const state = await setupPendingUpdate();
      const token = scenario.arrange(state);
      await expect(
        state.service.activate({ policyId, token, txHash: toHex(BigInt(index + 2), { size: 32 }) }),
        scenario.name,
      ).rejects.toMatchObject({ code: scenario.expectedCode });
      expect(state.repository.getVersion(policyId, 1)?.status, scenario.name).toBe("active");
      expect(state.repository.getPending(policyId)?.version, scenario.name).toBe(2);
      state.repository.close();
    }
  });

  it("does not translate unexpected update repository failures into conflicts", async () => {
    const { repository, service } = await setupActive();
    vi.spyOn(repository, "createNextPending").mockImplementation(() => {
      throw new Error("database unavailable");
    });

    await expect(
      service.register(
        await signedInput(owner, {
          maxAmountWei: "101",
          policyCommitment: toHex(301n, { size: 32 }),
          nonce: "1",
        }),
      ),
    ).rejects.toThrow("database unavailable");
    repository.close();
  });
});

describe("PolicyService proof generation", () => {
  it("authenticates, checks active chain state, and returns bound public inputs", async () => {
    const { repository, service, token, commitment, generateProof } = setupProofPolicy();

    await expect(service.createProof({ policyId, token, valueWei: "10" })).resolves.toEqual({
      policyId,
      policyVersion: 1,
      proof: "0x1234",
      publicInputs: [toHex(10n, { size: 32 }), commitment],
    });
    expect(generateProof).toHaveBeenCalledWith({
      value: 10n,
      maxAmount: 100n,
      salt: 200n,
      policyCommitment: 300n,
    });
    repository.close();
  });

  it("rejects an invalid token before loading the encrypted version", async () => {
    const { repository, chain, service, generateProof } = setupProofPolicy();
    const getActive = vi.spyOn(repository, "getActive");
    const getPolicyState = vi.spyOn(chain, "getPolicyState");

    await expect(
      service.createProof({ policyId, token: `zkp_${"b".repeat(43)}`, valueWei: "10" }),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_POLICY_TOKEN" });
    expect(getActive).not.toHaveBeenCalled();
    expect(getPolicyState).not.toHaveBeenCalled();
    expect(generateProof).not.toHaveBeenCalled();
    repository.close();
  });

  it("rejects pending and on-chain mismatched policies before decryption or proving", async () => {
    const pending = setupProofPolicy(false);
    await expect(
      pending.service.createProof({ policyId, token: pending.token, valueWei: "10" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "POLICY_NOT_ACTIVE" });
    expect(pending.generateProof).not.toHaveBeenCalled();
    pending.repository.close();

    const mismatched = setupProofPolicy();
    mismatched.chain.commitment = toHex(301n, { size: 32 });
    await expect(
      mismatched.service.createProof({ policyId, token: mismatched.token, valueWei: "10" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "ONCHAIN_POLICY_MISMATCH" });
    expect(mismatched.generateProof).not.toHaveBeenCalled();
    mismatched.repository.close();
  });

  it("rejects an amount above the active limit without proving", async () => {
    const { repository, service, token, generateProof } = setupProofPolicy();
    await expect(service.createProof({ policyId, token, valueWei: "101" })).rejects.toMatchObject({
      statusCode: 422,
      code: "POLICY_LIMIT_EXCEEDED",
    });
    expect(generateProof).not.toHaveBeenCalled();
    repository.close();
  });

  it("maps authenticated-ciphertext and prover failures to stable secret-free errors", async () => {
    const corrupted = setupProofPolicy();
    corrupted.repository.database
      .prepare("UPDATE policy_versions SET auth_tag = ? WHERE policy_id = ? AND version = 1")
      .run(Buffer.alloc(16), policyId);
    await expect(
      corrupted.service.createProof({ policyId, token: corrupted.token, valueWei: "10" }),
    ).rejects.toMatchObject({ statusCode: 500, code: "POLICY_SECRET_INVALID" });
    expect(corrupted.generateProof).not.toHaveBeenCalled();
    corrupted.repository.close();

    const failedProof = setupProofPolicy();
    failedProof.generateProof.mockRejectedValueOnce(new Error("private witness leaked here"));
    await expect(
      failedProof.service.createProof({ policyId, token: failedProof.token, valueWei: "10" }),
    ).rejects.toMatchObject({ statusCode: 500, code: "PROOF_GENERATION_FAILED" });
    failedProof.repository.close();
  });

  it.each([
    [toHex(11n, { size: 32 }), toHex(300n, { size: 32 })],
    [toHex(10n, { size: 32 }), toHex(301n, { size: 32 })],
  ])("rejects unexpected returned public inputs", async (publicValue, publicCommitment) => {
    const fixture = setupProofPolicy();
    fixture.generateProof.mockResolvedValueOnce({
      proof: "0x1234",
      publicInputs: [publicValue, publicCommitment],
    });
    await expect(
      fixture.service.createProof({ policyId, token: fixture.token, valueWei: "10" }),
    ).rejects.toMatchObject({ statusCode: 500, code: "PROOF_PUBLIC_INPUT_MISMATCH" });
    fixture.repository.close();
  });
});
