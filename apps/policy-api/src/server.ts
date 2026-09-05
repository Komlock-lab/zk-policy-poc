import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { U128_MAX } from "../../../packages/policy/src/index.ts";
import { PolicyApiError, PolicyService } from "./service.ts";

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .refine((value) => {
    const body = value.slice(2);
    return body === body.toLowerCase() || body === body.toUpperCase() || isAddress(value, { strict: true });
  })
  .transform((value) => getAddress(value) as Address);
const bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform((value) => value as Hex);
const signatureSchema = z
  .string()
  .regex(/^0x(?:[0-9a-fA-F]{128}|[0-9a-fA-F]{130})$/)
  .transform((value) => value as Hex);
const uuidSchema = z.string().uuid();
const MAX_UINT256 = (1n << 256n) - 1n;
const uint256DecimalSchema = z
  .string()
  .refine((value) => /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) < MAX_UINT256);
const circuitAmountDecimalSchema = z
  .string()
  .refine((value) => /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) <= U128_MAX);

function bearerToken(header: string | undefined): string {
  const match = /^Bearer (zkp_[A-Za-z0-9_-]{43})$/.exec(header ?? "");
  if (!match?.[1]) throw new PolicyApiError(401, "INVALID_POLICY_TOKEN");
  return match[1];
}

export function buildPolicyApi(service: PolicyService): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 32 * 1_024 });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof PolicyApiError) {
      void reply.status(error.statusCode).send({ error: error.code });
      return;
    }
    if (error instanceof z.ZodError) {
      void reply.status(400).send({ error: "INVALID_REQUEST" });
      return;
    }
    void reply.status(500).send({ error: "INTERNAL_ERROR" });
  });

  app.get("/v1/accounts/:account/policy-context", async (request) => {
    const { account } = z.object({ account: addressSchema }).parse(request.params);
    return service.getContext(account);
  });

  app.put("/v1/policies/:policyId", async (request) => {
    const { policyId } = z.object({ policyId: uuidSchema }).parse(request.params);
    const body = z
      .object({
        account: addressSchema,
        maxAmountWei: z.string().regex(/^(0|[1-9][0-9]*)$/),
        salt: z.string().regex(/^(0|[1-9][0-9]*)$/),
        policyCommitment: bytes32Schema,
        nonce: uint256DecimalSchema,
        deadline: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        signature: signatureSchema,
      })
      .parse(request.body);
    return service.register({ policyId, ...body });
  });

  app.post("/v1/policies/:policyId/activate", async (request) => {
    const { policyId } = z.object({ policyId: uuidSchema }).parse(request.params);
    const { txHash } = z.object({ txHash: bytes32Schema }).parse(request.body);
    return service.activate({
      policyId,
      txHash,
      token: bearerToken(request.headers.authorization),
    });
  });

  app.post("/v1/policies/:policyId/proofs", async (request) => {
    const { policyId } = z.object({ policyId: uuidSchema }).parse(request.params);
    const { valueWei } = z.object({ valueWei: circuitAmountDecimalSchema }).strict().parse(request.body);
    return service.createProof({
      policyId,
      valueWei,
      token: bearerToken(request.headers.authorization),
    });
  });

  app.post("/v1/policies/:policyId/token", async (request) => {
    const { policyId } = z.object({ policyId: uuidSchema }).parse(request.params);
    const body = z
      .object({
        account: addressSchema,
        nonce: uint256DecimalSchema,
        deadline: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        signature: signatureSchema,
      })
      .strict()
      .parse(request.body);
    return service.rotatePolicyToken({ policyId, ...body });
  });

  return app;
}
