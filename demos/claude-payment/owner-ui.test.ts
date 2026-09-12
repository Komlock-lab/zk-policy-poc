import Fastify from "fastify";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { parseEther, type Hex } from "viem";
import { registerOwnerUi } from "./owner-ui.ts";
import { LOCAL_OWNER_KEY } from "../../scripts/lib/alto.ts";

const owner = privateKeyToAccount(LOCAL_OWNER_KEY);
const commitment = ("0x" + "12".repeat(32)) as Hex;
const result = { policyId: "00000000-0000-4000-8000-000000000001", policyVersion: 1, commitment, txHash: ("0x" + "34".repeat(32)) as Hex, token: "zkp_" + "a".repeat(43) };
let app: ReturnType<typeof Fastify>;
let configured = false;
const activate = vi.fn(async () => { configured = true; return result; });
const prepare = vi.fn(async (_amount: bigint) => ({ commitment, activate }));
const base = { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json" };
let cookie: string;
beforeEach(async () => {
  vi.clearAllMocks(); configured = false;
  app = Fastify();
  registerOwnerUi(app, { ownerAddress: owner.address, accountAddress: owner.address, configured: () => configured, prepare });
  const login = await app.inject({ method: "POST", url: "/owner/api/login", headers: base, payload: { walletAddress: owner.address } });
  expect(login.statusCode).toBe(200);
  const header = String(login.headers["set-cookie"]);
  expect(header).toContain("HttpOnly"); expect(header).toContain("SameSite=Strict");
  cookie = header.split(";")[0]!;
  expect(login.body).not.toContain(LOCAL_OWNER_KEY);
});
afterEach(async () => { await app.close(); });
const post = (path: string, payload: unknown) => app.inject({ method: "POST", url: "/owner/api/" + path, headers: { ...base, cookie }, payload });

it("shows all three screens and does not embed credentials in assets", async () => {
  const page = await app.inject({ url: "/owner", headers: base });
  expect(page.statusCode).toBe(200);
  for (const id of ["login", "policy", "confirm"]) expect(page.body).toContain('id="' + id + '"');
  expect(page.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(page.body).not.toContain(LOCAL_OWNER_KEY);
  expect(page.body).not.toContain(result.token);
  expect(page.body).not.toContain('id="owner-key"');
  expect(page.body).toContain("ウォレットを接続");
});
it("rejects missing sessions, invalid addresses, cross-origin, and non-local requests", async () => {
  expect((await app.inject({ url: "/owner/api/state", headers: base })).statusCode).toBe(401);
  expect((await app.inject({ method: "POST", url: "/owner/api/login", headers: base, payload: { walletAddress: "invalid" } })).statusCode).toBe(400);
  expect((await app.inject({ method: "POST", url: "/owner/api/draft", headers: { ...base, cookie, origin: "https://example.com" }, payload: { maxAmountEth: "0.1" } })).statusCode).toBe(403);
  expect((await app.inject({ url: "/owner", headers: { host: "example.com:3000" } })).statusCode).toBe(403);
});
it("prepares the exact displayed commitment without sending, then registers it once", async () => {
  expect((await post("draft", { maxAmountEth: "0.1" })).json().commitment).toBe(commitment);
  expect(prepare).toHaveBeenCalledWith(parseEther("0.1"));
  expect(activate).not.toHaveBeenCalled();
  expect((await post("confirm", { commitment: "0x" + "56".repeat(32) })).statusCode).toBe(409);
  expect(activate).not.toHaveBeenCalled();
  const response = await post("confirm", { commitment });
  const { token, ...publicResult } = result;
  expect(response.json()).toEqual(publicResult);
  expect(response.body).not.toContain(token);
  expect((await post("confirm", { commitment })).json()).toEqual(publicResult);
  expect(activate).toHaveBeenCalledOnce();
});
it("supports returning to settings and invalidates the previous draft", async () => {
  await post("draft", { maxAmountEth: "0.1" });
  expect((await post("back", {})).statusCode).toBe(200);
  expect((await post("confirm", { commitment })).statusCode).toBe(409);
  expect(activate).not.toHaveBeenCalled();
  await post("draft", { maxAmountEth: "0.2" });
  expect(prepare).toHaveBeenLastCalledWith(parseEther("0.2"));
});
it.each(["", "0.09", "-1", "1e3", "0.1234567890123456789"])("rejects invalid ETH input %s", async (amount) => {
  expect((await post("draft", { maxAmountEth: amount })).statusCode).toBe(400);
  expect(prepare).not.toHaveBeenCalled();
});
it("accepts only the per-transaction limit from the frontend", async () => {
  expect((await post("draft", { maxAmountEth: "0.1", dailyLimit: "5" })).statusCode).toBe(400);
  expect(prepare).not.toHaveBeenCalled();
});
it("removes access after logout", async () => {
  await post("logout", {});
  expect((await app.inject({ url: "/owner/api/state", headers: { ...base, cookie } })).statusCode).toBe(401);
});
it("blocks concurrent sends and retains a failed state without exposing secrets", async () => {
  await post("draft", { maxAmountEth: "0.1" });
  let reject!: (error: Error) => void;
  activate.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  const sending = post("confirm", { commitment });
  const pending = sending.then((response: { statusCode: number; body: string }) => response);
  await vi.waitFor(() => expect(activate).toHaveBeenCalledOnce());
  expect((await post("confirm", { commitment })).statusCode).toBe(409);
  reject(new Error(result.token));
  const response = await pending;
  expect(response.statusCode).toBe(500);
  expect(response.body).not.toContain(result.token);
  expect((await post("confirm", { commitment })).statusCode).toBe(409);
  expect((await app.inject({ url: "/owner/api/state", headers: { ...base, cookie } })).json().status).toBe("failed");
});

it("creates a provisional demo session for a connected wallet without requiring an owner key or signature", async () => {
  const walletAddress = "0x" + "22".repeat(20);
  const response = await app.inject({ method: "POST", url: "/owner/api/login", headers: base, payload: { walletAddress } });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ walletAddress });
  expect((await app.inject({ method: "POST", url: "/owner/api/login", headers: base, payload: { ownerKey: LOCAL_OWNER_KEY } })).statusCode).toBe(400);
  expect(activate).not.toHaveBeenCalled();
});

it("allows explicit extension-free demo login without a private key", async () => {
  const response = await app.inject({ method: "POST", url: "/owner/api/login", headers: base, payload: { demo: true } });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ walletAddress: owner.address });
  expect(response.body).not.toContain(LOCAL_OWNER_KEY);
  const demoCookie = String(response.headers["set-cookie"]).split(";")[0]!;
  const state = await app.inject({ url: "/owner/api/state", headers: { ...base, cookie: demoCookie } });
  expect(state.json().status).toBe("editing");
  expect(activate).not.toHaveBeenCalled();
  for (const payload of [{}, { demo: false }, { demo: true, walletAddress: owner.address }]) {
    expect((await app.inject({ method: "POST", url: "/owner/api/login", headers: base, payload })).statusCode).toBe(400);
  }
});
