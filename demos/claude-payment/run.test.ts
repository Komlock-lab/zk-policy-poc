import Fastify from "fastify";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  write: vi.fn(async () => {}),
  unlink: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
}));
vi.mock("node:fs/promises", async (original) => ({
  ...await original<typeof import("node:fs/promises")>(),
  writeFile: mocks.write, unlink: mocks.unlink,
}));
vi.mock("../../scripts/lib/anvil.ts", () => ({
  startAnvil: vi.fn(async () => ({ rpcUrl: "http://127.0.0.1:8545", stop: mocks.stop })),
}));
vi.mock("../../scripts/lib/local-payment.ts", () => ({ findArtifact: vi.fn(async () => ({})) }));
vi.mock("../../apps/policy-cli/src/create-policy.ts", () => ({ createAndActivatePolicy: mocks.register }));
vi.mock("../../apps/policy-api/src/repository.ts", () => ({ PolicyRepository: class { close() {} } }));
vi.mock("../../apps/policy-api/src/service.ts", () => ({ PolicyService: class {} }));
vi.mock("../../apps/policy-api/src/chain.ts", () => ({ createPolicyChainGateway: vi.fn(async () => ({})) }));
vi.mock("viem", async (original) => ({
  ...await original<typeof import("viem")>(),
  createPublicClient: () => ({
    getChainId: async () => 31337,
    waitForTransactionReceipt: async () => ({ status: "success", contractAddress: "0x" + "11".repeat(20) }),
  }),
  createWalletClient: () => ({ deployContract: async () => "0x12", sendTransaction: async () => "0x34" }),
}));
let app: ReturnType<typeof Fastify>;
vi.mock("../../apps/policy-api/src/server.ts", () => ({
  buildPolicyApi: () => {
    app = Fastify();
    vi.spyOn(app, "listen").mockResolvedValue("http://127.0.0.1:3000");
    return app;
  },
}));

const registration = {
  policyId: "00000000-0000-4000-8000-000000000001",
  policyVersion: 1,
  commitment: "0x" + "12".repeat(32),
  txHash: "0x" + "34".repeat(32),
  token: "zkp_" + "a".repeat(43),
};
let completion: Promise<void>;
let headers: { authorization: string };

async function start() {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.register.mockResolvedValue(registration);
  const { prepareDemo } = await import("./run.ts");
  completion = prepareDemo(() => {});
  await vi.waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
  const args = mocks.write.mock.calls[0] as unknown as [string, string, unknown];
  expect(args[2]).toEqual({ mode: 0o600, flag: "wx" });
  const connection = JSON.parse(args[1]);
  headers = { authorization: "Bearer " + connection.controlToken };
}
afterEach(async () => {
  if (app) {
    await app.inject({ method: "POST", url: "/demo/stop", headers });
    await completion;
    expect(mocks.stop).toHaveBeenCalledOnce();
  }
});

it("keeps preparation, policy registration, and payment session separate", async () => {
  await start();
  expect(mocks.register).not.toHaveBeenCalled();
  expect((await app.inject({ method: "POST", url: "/demo/policy", payload: { maxAmountWei: "100" } })).statusCode).toBe(401);
  expect((await app.inject({ method: "POST", url: "/demo/session", headers })).statusCode).toBe(409);
  expect((await app.inject({ method: "POST", url: "/demo/policy", headers, payload: { maxAmountWei: "1" } })).statusCode).toBe(400);
  expect(mocks.register).not.toHaveBeenCalled();
  const response = await app.inject({ method: "POST", url: "/demo/policy", headers, payload: { maxAmountWei: "100000000000000000" } });
  expect(response.statusCode).toBe(200);
  const { token, ...completion } = registration;
  expect(response.json()).toEqual(completion);
  expect(response.body).not.toContain(token);
  expect(mocks.register).toHaveBeenCalledOnce();
  expect((await app.inject({ method: "POST", url: "/demo/policy", headers, payload: { maxAmountWei: "100000000000000000" } })).statusCode).toBe(409);
  const session = await app.inject({ method: "POST", url: "/demo/session", headers });
  expect(session.statusCode).toBe(200);
  expect(session.json()).toMatchObject({ policyId: registration.policyId, token, rpcUrl: "http://127.0.0.1:8545" });
  expect((await app.inject({ method: "POST", url: "/demo/session", headers })).statusCode).toBe(409);
});

it("does not retry a failed registration or expose raw errors", async () => {
  await start();
  mocks.register.mockRejectedValue(new Error(registration.token));
  const response = await app.inject({ method: "POST", url: "/demo/policy", headers, payload: { maxAmountWei: "100000000000000000" } });
  expect(response.statusCode).toBe(500);
  expect(response.body).not.toContain(registration.token);
  expect((await app.inject({ method: "POST", url: "/demo/policy", headers, payload: { maxAmountWei: "100000000000000000" } })).statusCode).toBe(409);
  expect((await app.inject({ method: "POST", url: "/demo/session", headers })).statusCode).toBe(409);
  expect(mocks.register).toHaveBeenCalledOnce();
});

it("allows only one registration when configuration requests arrive together", async () => {
  await start();
  const responses = await Promise.all([1, 2].map(() => app.inject({ method: "POST", url: "/demo/policy", headers, payload: { maxAmountWei: "100000000000000000" } })));
  expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
  expect(mocks.register).toHaveBeenCalledOnce();
});
