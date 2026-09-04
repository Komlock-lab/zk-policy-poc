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

const MAX_UINT256 = (1n << 256n) - 1n;

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

interface ValidatedPolicyUpdate {
  account: Address;
  maxAmount: bigint;
  salt: bigint;
  commitment: Hex;
  nonce: bigint;
  configured: boolean;
}

export type RegisterPolicyResult = {
  policyId: string;
  policyVersion: number;
  status: "pending";
  calldata: Hex;
  token?: string;
};

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

  async register(input: RegisterPolicyInput): Promise<RegisterPolicyResult> {
    const account = getAddress(input.account);
    const existing = this.repository.getPolicyByAccount(account);
    if (!existing) return this.registerInitial(input);
    if (existing.policyId !== input.policyId) {
      throw new PolicyApiError(409, "POLICY_OR_NONCE_CONFLICT");
    }
    return this.registerUpdate(input);
  }

  async registerInitial(input: RegisterPolicyInput): Promise<RegisterPolicyResult & { token: string }> {
    const validated = await this.validatePolicyUpdate(input);
    if (validated.configured) throw new PolicyApiError(409, "POLICY_ALREADY_CONFIGURED");

    const token = generatePolicyToken();
    const secret = encryptPolicySecret(
      { maxAmountWei: validated.maxAmount.toString(), salt: validated.salt.toString() },
      this.encryptionKey,
      input.policyId,
      1,
    );
    try {
      this.repository.createInitialPending({
        policyId: input.policyId,
        account: validated.account,
        expectedNonce: validated.nonce,
        commitment: validated.commitment,
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
      calldata: this.encodeCommitmentUpdate(validated.commitment),
    };
  }

  async registerUpdate(input: RegisterPolicyInput): Promise<RegisterPolicyResult> {
    const validated = await this.validatePolicyUpdate(input);
    const policy = this.repository.getPolicy(input.policyId);
    if (!policy || !isAddressEqual(policy.account, validated.account)) {
      throw new PolicyApiError(409, "POLICY_OR_NONCE_CONFLICT");
    }
    if (!validated.configured) throw new PolicyApiError(409, "POLICY_NOT_CONFIGURED");

    let pending;
    try {
      pending = this.repository.createNextPending({
        policyId: input.policyId,
        account: validated.account,
        expectedNonce: validated.nonce,
        commitment: validated.commitment,
        secretForVersion: (version) =>
          encryptPolicySecret(
            { maxAmountWei: validated.maxAmount.toString(), salt: validated.salt.toString() },
            this.encryptionKey,
            input.policyId,
            version,
          ),
      });
    } catch (error) {
      if (error instanceof PolicyRepositoryConflictError) {
        throw new PolicyApiError(409, "POLICY_OR_NONCE_CONFLICT");
      }
      throw error;
    }
    return {
      policyId: input.policyId,
      policyVersion: pending.version,
      status: "pending",
      calldata: this.encodeCommitmentUpdate(validated.commitment),
    };
  }

  async activate(input: { policyId: string; token: string; txHash: Hex }): Promise<{ policyVersion: number; status: "active" }> {
    const policy = this.repository.getPolicy(input.policyId);
    if (!policy || !matchesPolicyToken(input.token, policy.tokenHash)) {
      throw new PolicyApiError(401, "INVALID_POLICY_TOKEN");
    }
    const pending = this.repository.getPending(input.policyId);
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
    this.repository.activate(input.policyId, pending.version);
    return { policyVersion: pending.version, status: "active" };
  }

  private async validatePolicyUpdate(input: RegisterPolicyInput): Promise<ValidatedPolicyUpdate> {
    const account = getAddress(input.account);
    if (input.deadline < this.now()) throw new PolicyApiError(401, "SIGNATURE_EXPIRED");
    const maxAmount = parseCircuitAmount(BigInt(input.maxAmountWei));
    const salt = fieldElementSchema.parse(BigInt(input.salt));
    const commitment = toHex(await this.computeCommitment(maxAmount, salt), { size: 32 });
    if (commitment.toLowerCase() !== input.policyCommitment.toLowerCase()) {
      throw new PolicyApiError(400, "POLICY_COMMITMENT_MISMATCH");
    }
    const nonce = BigInt(input.nonce);
    if (nonce < 0n || nonce > MAX_UINT256) throw new PolicyApiError(400, "INVALID_NONCE");
    const message = {
      policyId: input.policyId,
      account,
      policyCommitment: commitment,
      nonce,
      deadline: BigInt(input.deadline),
    };
    let signer: Address;
    try {
      signer = await recoverPolicyUpdateSigner(message, input.signature);
    } catch {
      throw new PolicyApiError(401, "INVALID_OWNER_SIGNATURE");
    }
    const [owner, policyState] = await Promise.all([
      this.chain.getOwner(account),
      this.chain.getPolicyState(account),
    ]);
    if (!isAddressEqual(signer, owner)) throw new PolicyApiError(401, "INVALID_OWNER_SIGNATURE");
    return { account, maxAmount, salt, commitment, nonce, configured: policyState.configured };
  }

  private encodeCommitmentUpdate(commitment: Hex): Hex {
    return encodeFunctionData({
      abi: zkPolicyAccountAbi,
      functionName: "updatePolicyCommitment",
      args: [commitment],
    });
  }
}
