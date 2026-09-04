import { afterEach, describe, expect, it } from "vitest";
import { parseEther, toHex, type Address, type Hex } from "viem";
import { z } from "zod";
import { computePolicyCommitment } from "../packages/policy/src/index.ts";
import { encryptPolicySecret, hashPolicyToken } from "../apps/policy-api/src/crypto.ts";
import { PolicyRepository } from "../apps/policy-api/src/repository.ts";
import { buildPolicyApi } from "../apps/policy-api/src/server.ts";
import { PolicyService } from "../apps/policy-api/src/service.ts";

const account = "0x0000000000000000000000000000000000001234" as Address;
const policyId = "00000000-0000-4000-8000-000000000001";
const token = `zkp_${"a".repeat(43)}`;
const encryptionKey = Buffer.alloc(32, 1);

const proofResponseSchema = z
  .object({
    policyId: z.string().uuid(),
    policyVersion: z.number().int().positive(),
    proof: z.string().regex(/^0x[0-9a-f]+$/i),
    publicInputs: z.tuple([
      z.string().regex(/^0x[0-9a-f]{64}$/i),
      z.string().regex(/^0x[0-9a-f]{64}$/i),
    ]),
  })
  .strict();

describe("policy proof API", () => {
  let repository: PolicyRepository | undefined;

  afterEach(() => {
    repository?.close();
    repository = undefined;
  });

  it("returns a locally verified proof bound to the requested value and active commitment", async () => {
    const maxAmount = parseEther("0.1");
    const value = parseEther("0.01");
    const salt = 123n;
    const commitment = await computePolicyCommitment(maxAmount, salt);
    const commitmentHex = toHex(commitment, { size: 32 });
    repository = new PolicyRepository(":memory:");
    repository.createInitialPending({
      policyId,
      account,
      expectedNonce: 0n,
      commitment: commitmentHex,
      secret: encryptPolicySecret(
        { maxAmountWei: maxAmount.toString(), salt: salt.toString() },
        encryptionKey,
        policyId,
        1,
      ),
      tokenHash: hashPolicyToken(token),
    });
    repository.activate(policyId, 1);
    const chain = {
      getOwner: async () => account,
      getPolicyState: async () => ({ configured: true, commitment: commitmentHex }),
      getTransaction: async () => {
        throw new Error("not used");
      },
    };
    const app = buildPolicyApi(new PolicyService(repository, chain, encryptionKey));

    const response = await app.inject({
      method: "POST",
      url: `/v1/policies/${policyId}/proofs`,
      headers: { authorization: `Bearer ${token}` },
      payload: { valueWei: value.toString() },
    });
    expect(response.statusCode).toBe(200);
    const body = proofResponseSchema.parse(response.json()) as {
      policyId: string;
      policyVersion: number;
      proof: Hex;
      publicInputs: [Hex, Hex];
    };
    expect(body.policyId).toBe(policyId);
    expect(body.policyVersion).toBe(1);
    expect(body.proof.length).toBeGreaterThan(2);
    expect(body.publicInputs).toEqual([toHex(value, { size: 32 }), commitmentHex]);

    await app.close();
  }, 120_000);
});
