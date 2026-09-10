import assert from "node:assert/strict";
import { BaseError, ContractFunctionRevertedError, createWalletClient, formatEther, http, parseEther, parseAbi, toHex, zeroAddress } from "viem";
import { foundry } from "viem/chains";
import { preparePolicyPayment, type PolicyPaymentInput } from "../../apps/policy-cli/src/pay-with-policy.ts";
import { zkPolicyAccountAbi } from "../../apps/policy-api/src/chain.ts";
import { findArtifact } from "../../scripts/lib/local-payment.ts";

export type Scenario = "normal" | "tampered_amount";
export async function executeDemo(input: Omit<PolicyPaymentInput, "valueWei">, scenario: Scenario) {
  const amount = parseEther("0.1");
  const executionAmount = scenario === "normal" ? amount : parseEther("0.2");
  const { publicClient, owner, intent, proof } = await preparePolicyPayment({ ...input, valueWei: amount });
  const wallet = createWalletClient({ account: owner, chain: foundry, transport: http(input.rpcUrl, { fetchOptions: { redirect: "error" } }) });
  const state = async () => {
    const [balance, accountBalance, daily] = await Promise.all([
      publicClient.getBalance({ address: input.recipient }),
      publicClient.getBalance({ address: input.accountAddress }),
      publicClient.readContract({ address: input.accountAddress, abi: zkPolicyAccountAbi, functionName: "getDailySpend", args: [zeroAddress] }),
    ]);
    return { balance, accountBalance, day: daily[0], spent: daily[1] };
  };
  const original = { address: input.accountAddress, abi: zkPolicyAccountAbi, functionName: "execute" as const, account: owner,
    args: [input.recipient, amount, intent.issuedAt, intent.validUntil, proof.proof] as const };
  await publicClient.simulateContract(original);
  const gas = (await publicClient.estimateContractGas(original)) * 2n + 100_000n;
  const before = await state();
  if (scenario === "tampered_amount") {
    const verifier = await publicClient.readContract({ address: input.accountAddress, abi: parseAbi(["function verifier() view returns (address)"]), functionName: "verifier" });
    const verifierAbi = (await findArtifact("HonkVerifier")).abi;
    const inputs = [...proof.publicInputs];
    inputs[7] = toHex(executionAmount, { size: 32 });
    let rejected = false;
    try {
      const result = await publicClient.readContract({ address: verifier, abi: verifierAbi, functionName: "verify", args: [proof.proof, inputs] });
      rejected = result === false;
    } catch (error) {
      if (!(error instanceof BaseError) || !(error.walk((e) => e instanceof ContractFunctionRevertedError) instanceof ContractFunctionRevertedError)) throw error;
      rejected = true;
    }
    assert.ok(rejected, "modified amount was not rejected by verifier");
  }
  const hash = await wallet.writeContract({ ...original, gas,
    args: [input.recipient, executionAmount, intent.issuedAt, intent.validUntil, proof.proof] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  assert.ok(block.timestamp >= intent.issuedAt && block.timestamp <= intent.validUntil, "proof expired during execution");
  assert.equal(block.timestamp / 86400n, before.day, "day changed during execution");
  assert.ok(receipt.gasUsed < gas, "transaction exhausted gas");
  const after = await state();
  assert.equal(receipt.status, scenario === "normal" ? "success" : "reverted");
  const delta = scenario === "normal" ? amount : 0n;
  assert.equal(after.balance - before.balance, delta);
  assert.equal(before.accountBalance - after.accountBalance, delta);
  assert.equal(after.spent - before.spent, delta);
  return { scenario, proofAmountEth: "0.1", executionAmountEth: formatEther(executionAmount),
    transactionStatus: receipt.status, transactionHash: hash, recipientBalanceChangeEth: formatEther(after.balance - before.balance),
    dailySpendChangeEth: formatEther(after.spent - before.spent), gasUsed: receipt.gasUsed.toString(),
    validProofSimulationPassed: true, expectationMet: true };
}
