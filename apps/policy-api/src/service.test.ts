import { describe, expect, it, vi } from "vitest";
import { type Address, type Hex, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PolicyChainGateway, PolicyTransaction } from "./chain.ts";
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
  const service = new PolicyService(repository, chain, Buffer.alloc(32, 1), () => 1_000, async () => 300n);
  return { repository, chain, service };
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
});
