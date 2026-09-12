import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { parseEther, type Address, type Hex } from "viem";
import { z } from "zod";
import { addressSchema, circuitAmountSchema } from "../../packages/policy/src/index.ts";
import type { CreatedPolicy } from "../../apps/policy-cli/src/create-policy.ts";

export interface OwnerUiOptions {
  ownerAddress: Address;
  accountAddress: Address;
  configured: () => boolean;
  prepare: (maxAmountWei: bigint) => Promise<{ commitment: Hex; activate: () => Promise<CreatedPolicy> }>;
}
type Draft = Awaited<ReturnType<OwnerUiOptions["prepare"]>>;
type Session = { walletAddress: Address; expires: number; draft?: Draft; amountEth?: string; status: "editing" | "ready" | "sending" | "complete" | "failed"; result?: Omit<CreatedPolicy, "token"> };
const eth = z.string().trim().regex(/^[0-9]+(?:\.[0-9]{1,18})?$/).transform((value) => parseEther(value)).pipe(circuitAmountSchema).refine((v) => v >= parseEther("0.1"));
const cookieName = "zk_owner";
export function registerOwnerUi(app: FastifyInstance, options: OwnerUiOptions) {
  const sessions = new Map<string, Session>();
  const lookup = (cookie: string | undefined) => {
    const id = new RegExp("(?:^|;\\s*)" + cookieName + "=([a-f0-9]{64})(?:;|$)").exec(cookie ?? "")?.[1];
    const session = id ? sessions.get(id) : undefined;
    if (!session || session.expires < Date.now()) return undefined;
    return session;
  };
  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/owner")) return;
    reply.header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "no-referrer")
      .header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const host = request.headers.host ?? "";
    if (!/^127\.0\.0\.1:[0-9]+$/.test(host)) return reply.code(403).send({ error: "ローカルのデモURLを開いてください。" });
    if (request.method !== "GET" && (request.headers.origin !== "http://" + host || !request.headers["content-type"]?.startsWith("application/json"))) {
      return reply.code(403).send({ error: "ページを開き直してください。" });
    }
    if (request.url.startsWith("/owner/api/") && request.url !== "/owner/api/login" && !lookup(request.headers.cookie)) {
      return reply.code(401).send({ error: "ウォレットを接続してログインしてください。" });
    }
  });
  for (const [route, file, type] of [
    ["/owner", "owner.html", "text/html; charset=utf-8"],
    ["/owner/app.js", "owner.js", "text/javascript; charset=utf-8"],
    ["/owner/style.css", "owner.css", "text/css; charset=utf-8"],
  ]) app.get(route!, async (_request, reply) => reply.type(type!).send(await readFile(new URL("./ui/" + file, import.meta.url), "utf8")));
  app.post("/owner/api/login", async (request, reply) => {
    const input = z.union([z.object({ walletAddress: addressSchema }).strict(), z.object({ demo: z.literal(true) }).strict()]).safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "接続したウォレットのアドレスを確認してください。" });
    const walletAddress = "demo" in input.data ? options.ownerAddress : input.data.walletAddress;
    // Demo-only session: the address is not authenticated by a wallet signature.
    for (const [id, session] of sessions) if (session.expires < Date.now()) sessions.delete(id);
    if (sessions.size >= 8) return reply.code(429).send({ error: "ログイン数の上限です。既存の画面からログアウトしてください。" });
    const id = randomBytes(32).toString("hex");
    sessions.set(id, { walletAddress, expires: Date.now() + 3600000, status: "editing" });
    reply.header("Set-Cookie", cookieName + "=" + id + "; HttpOnly; SameSite=Strict; Path=/owner; Max-Age=3600");
    return { walletAddress };
  });
  app.get("/owner/api/state", async (request) => {
    const session = lookup(request.headers.cookie)!;
    return { walletAddress: session.walletAddress, ownerAddress: options.ownerAddress, accountAddress: options.accountAddress, configured: options.configured(),
      status: session.status, amountEth: session.amountEth, commitment: session.draft?.commitment, result: session.result };
  });
  app.post("/owner/api/logout", async (request, reply) => {
    const session = lookup(request.headers.cookie)!;
    if (session.status === "sending") return reply.code(409).send({ error: "登録の完了をお待ちください。" });
    for (const [id, value] of sessions) if (value === session) sessions.delete(id);
    reply.header("Set-Cookie", cookieName + "=; HttpOnly; SameSite=Strict; Path=/owner; Max-Age=0");
    return { ok: true };
  });
  app.post("/owner/api/draft", async (request, reply) => {
    const session = lookup(request.headers.cookie)!;
    if (options.configured() || ["sending", "complete", "failed"].includes(session.status)) return reply.code(409).send({ error: "現在の状態では設定を変更できません。" });
    const input = z.object({ maxAmountEth: eth }).strict().safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "0.1 ETH以上、小数点以下18桁以内で入力してください。" });
    session.status = "sending";
    try {
      session.draft = await options.prepare(input.data.maxAmountEth);
      session.amountEth = (request.body as { maxAmountEth: string }).maxAmountEth.trim();
      session.status = "ready";
      return { commitment: session.draft.commitment, amountEth: session.amountEth, accountAddress: options.accountAddress };
    } catch {
      session.status = "editing";
      return reply.code(500).send({ error: "コミットメントを作成できませんでした。環境の状態を確認してください。" });
    }
  });
  app.post("/owner/api/back", async (request, reply) => {
    const session = lookup(request.headers.cookie)!;
    if (session.status !== "ready") return reply.code(409).send({ error: "現在の状態では戻れません。" });
    session.draft = undefined;
    session.status = "editing";
    return { ok: true };
  });
  app.post("/owner/api/confirm", async (request, reply) => {
    const session = lookup(request.headers.cookie)!;
    const input = z.object({ commitment: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }).strict().safeParse(request.body);
    if (session.status === "complete" && input.success && input.data.commitment === session.result?.commitment) return session.result;
    if (!input.success || session.status !== "ready" || !session.draft || session.draft.commitment !== input.data.commitment) {
      return reply.code(409).send({ error: "表示中のコミットメントを確認してください。二重送信はできません。" });
    }
    session.status = "sending";
    try {
      const { token: _token, ...result } = await session.draft.activate();
      session.result = result;
      session.status = "complete";
      return result;
    } catch {
      session.status = "failed";
      return reply.code(500).send({ error: "登録を完了できませんでした。再送せず、demo:stopから環境を準備し直してください。" });
    }
  });
  app.addHook("onClose", async () => { sessions.clear(); });
}
