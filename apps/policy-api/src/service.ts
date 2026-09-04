import { randomUUID } from "node:crypto";
import {
  type Address,
  type Hex,
  encodeFunctionData,
  getAddress,
  isAddressEqual,
  toHex,
} from "viem";
import { computePolicyCommitment, fieldElementSchema, parseCircuitAmount } from "../../../packages/policy/src/index.ts";
import { type PolicyChainGateway, zkPolicyAccountAbi } from "./chain.ts";
import { encryptPolicySecret, generatePolicyToken, hashPolicyToken, matchesPolicyToken } from "./crypto.ts";
import { recoverPolicyUpdateSigner } from "./eip712.ts";
import { PolicyRepository, PolicyRepositoryConflictError } from "./repository.ts";

export class PolicyApiError extends Error {
  constructor(readonly statusCode: number, readonly code: string) {
    super(code);
  }
}

export interface RegisterPolicyInput {
  policyId: string;
  account: Address;
  maxAmountWei: string;
  salt: string;
  policyCommitment: Hex;
  nonce: string;
  deadline: number;
  signature: Hex;
}

export class PolicyService {
  constructor(
    private readonly repository: PolicyRepository,
    private readonly chain: PolicyChainGateway,
    private readonly encryptionKey: Buffer,
    private readonly now: () => number = () => Math.floor(Date.now() / 1_000),
    private readonly computeCommitment: (maxAmount: bigint, salt: bigint) => Promise<bigint> =
      computePolicyCommitment,
  ) {}

  getContext(accountInput: Address): { policyId: string; nonce: string } {
    const account = getAddress(accountInput);
    const existing = this.repository.getPolicyByAccount(account);
    return existing
      ? { policyId: existing.policyId, nonce: existing.nonce.toString() }
      : { policyId: randomUUID(), nonce: "0" };
  }

  async registerInitial(input: RegisterPolicyInput): Promise<{
    policyId: string;
    policyVersion: number;
    status: "pending";
    token: string;
    calldata: Hex;
  }> {
    const account = getAddress(input.account);
    if (input.deadline < this.now()) throw new PolicyApiError(401, "SIGNATURE_EXPIRED");
    const maxAmount = parseCircuitAmount(BigInt(input.maxAmountWei));
    const salt = fieldElementSchema.parse(BigInt(input.salt));
    const commitment = toHex(await this.computeCommitment(maxAmount, salt), { size: 32 });
    if (commitment.toLowerCase() !== input.policyCommitment.toLowerCase()) {
      throw new PolicyApiError(400, "POLICY_COMMITMENT_MISMATCH");
    }
    const nonce = BigInt(input.nonce);
    const message = {
      policyId: input.policyId,
      account,
      policyCommitment: commitment,
      nonce,
      deadline: BigInt(input.deadline),
    };
    const [signer, owner, policyState] = await Promise.all([
      recoverPolicyUpdateSigner(message, input.signature),
      this.chain.getOwner(account),
      this.chain.getPolicyState(account),
    ]);
    if (!isAddressEqual(signer, owner)) throw new PolicyApiError(401, "INVALID_OWNER_SIGNATURE");
    if (policyState.configured) throw new PolicyApiError(409, "POLICY_ALREADY_CONFIGURED");

    const token = generatePolicyToken();
    const secret = encryptPolicySecret(
      { maxAmountWei: maxAmount.toString(), salt: salt.toString() },
      this.encryptionKey,
      input.policyId,
      1,
    );
    try {
      this.repository.createInitialPending({
        policyId: input.policyId,
        account,
        expectedNonce: nonce,
        commitment,
        secret,
        tokenHash: hashPolicyToken(token),
      });
    } catch (error) {
      if (error instanceof PolicyRepositoryConflictError) {
        throw new PolicyApiError(409, "POLICY_OR_NONCE_CONFLICT");
      }
      throw error;
    }
    return {
      policyId: input.policyId,
      policyVersion: 1,
      status: "pending",
      token,
      calldata: encodeFunctionData({ abi: zkPolicyAccountAbi, functionName: "updatePolicyCommitment", args: [commitment] }),
    };
  }

  async activate(input: { policyId: string; token: string; txHash: Hex }): Promise<{ policyVersion: number; status: "active" }> {
    const policy = this.repository.getPolicy(input.policyId);
    if (!policy || !matchesPolicyToken(input.token, policy.tokenHash)) {
      throw new PolicyApiError(401, "INVALID_POLICY_TOKEN");
    }
    const pending = this.repository.getVersion(input.policyId, 1);
    if (!pending || pending.status !== "pending") throw new PolicyApiError(409, "POLICY_NOT_PENDING");
    let transaction;
    try {
      transaction = await this.chain.getTransaction(input.txHash);
    } catch {
      throw new PolicyApiError(409, "TRANSACTION_NOT_CONFIRMED");
    }
    const owner = await this.chain.getOwner(policy.account);
    const expectedInput = encodeFunctionData({
      abi: zkPolicyAccountAbi,
      functionName: "updatePolicyCommitment",
      args: [pending.commitment],
    });
    if (
      transaction.status !== "success" ||
      transaction.to === null ||
      !isAddressEqual(transaction.to, policy.account) ||
      !isAddressEqual(transaction.from, owner) ||
      transaction.input.toLowerCase() !== expectedInput.toLowerCase()
    ) {
      throw new PolicyApiError(409, "TRANSACTION_MISMATCH");
    }
    const state = await this.chain.getPolicyState(policy.account);
    if (!state.configured || state.commitment.toLowerCase() !== pending.commitment.toLowerCase()) {
      throw new PolicyApiError(409, "ONCHAIN_POLICY_MISMATCH");
    }
    this.repository.activate(input.policyId, 1);
    return { policyVersion: 1, status: "active" };
  }
}
