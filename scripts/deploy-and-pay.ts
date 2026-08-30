import { parseEther } from "viem";

import { generateSalt } from "../packages/policy/src/index.ts";
import { startAnvil } from "./lib/anvil.ts";
import { runLocalPayment } from "./lib/local-payment.ts";

const anvil = await startAnvil();

try {
  const value = parseEther("0.01");
  const result = await runLocalPayment({
    rpcUrl: anvil.rpcUrl,
    value,
    maxAmount: parseEther("0.1"),
    salt: generateSalt(),
  });

  process.stdout.write(
    `${JSON.stringify({
      verifierAddress: result.verifierAddress,
      accountAddress: result.accountAddress,
      recipientAddress: result.recipientAddress,
      transactionHash: result.transactionHash,
      transferredWei: (result.recipientBalanceAfter - result.recipientBalanceBefore).toString(),
    })}\n`,
  );
} finally {
  await anvil.stop();
}
