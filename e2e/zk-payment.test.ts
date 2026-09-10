import { fixturePaymentContext } from "../scripts/lib/payment-fixture.ts";
import { createPublicClient, http, parseEther } from "viem";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { generateSalt } from "../packages/policy/src/index.ts";
import { generateSpendLimitProof } from "../packages/prover/src/index.ts";
import { type AnvilInstance, startAnvil } from "../scripts/lib/anvil.ts";
import {
  localRecipientAddress,
  runLocalPayment,
} from "../scripts/lib/local-payment.ts";

describe("Phase 1 ZK payment", () => {
  let anvil: AnvilInstance;

  beforeAll(async () => {
    anvil = await startAnvil();
  });

  afterAll(async () => {
    await anvil.stop();
  });

  it("sends 0.01 ETH when the private limit is 0.1 ETH", async () => {
    const value = parseEther("0.01");
    const result = await runLocalPayment({
      rpcUrl: anvil.rpcUrl,
      value,
      maxAmount: parseEther("0.1"),
      salt: generateSalt(),
    });

    expect(result.recipientBalanceAfter - result.recipientBalanceBefore).toBe(value);
  });

  it("does not generate a proof or send when 1 ETH exceeds the 0.1 ETH limit", async () => {
    const publicClient = createPublicClient({ transport: http(anvil.rpcUrl) });
    const recipient = localRecipientAddress();
    const balanceBefore = await publicClient.getBalance({ address: recipient });

    await expect(
      generateSpendLimitProof({ context: fixturePaymentContext(),
        value: parseEther("1"),
        maxAmount: parseEther("0.1"),
        salt: generateSalt(),
      }),
    ).rejects.toThrow("value exceeds max amount");

    expect(await publicClient.getBalance({ address: recipient })).toBe(balanceBefore);
  });
});
