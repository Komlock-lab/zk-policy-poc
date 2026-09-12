import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { readCreatePolicyArguments } from "../../apps/policy-cli/src/policy-input.ts";
import { connectionSchema, demoSessionSchema } from "./state.ts";
import { runPaymentSession } from "./session.ts";

class DemoError extends Error {}

async function request(path: string, body?: unknown) {
  const connection = connectionSchema.parse(JSON.parse(await readFile("demo-connection.json", "utf8")));
  const response = await fetch(connection.apiUrl + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: "Bearer " + connection.controlToken, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(120_000), redirect: "error",
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(result);
    throw new DemoError(error.success ? error.data.error : "デモ環境への要求に失敗しました");
  }
  return result;
}

async function stopEnvironment() {
  await request("/demo/stop", {});
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { await readFile("demo-connection.json"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    await delay(50);
  }
  throw new DemoError("停止処理が完了していません。少し待ってから準備し直してください");
}

async function main() {
  const mode = z.enum(["prepare", "policy", "claude", "stop", "assert-stopped"]).parse(process.argv[2]);
  if (mode === "assert-stopped") {
    try { await readFile("demo-connection.json"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    throw new DemoError("準備済みのデモがあります。先にpnpm demo:stopを実行してください");
  }
  if (mode === "prepare") {
    const child = spawn(process.execPath, ["--experimental-sqlite", "--import", "tsx", "demos/claude-payment/run.ts"], { detached: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new DemoError("デモ環境の準備がタイムアウトしました")), 120_000);
        child.once("message", (message) => {
          clearTimeout(timer);
          if (z.object({ ready: z.literal(true) }).safeParse(message).success) resolve();
          else reject(new DemoError("デモ環境を起動できませんでした。ポート8545とローカルサービスの実行権限を確認してください"));
        });
        child.once("error", () => { clearTimeout(timer); reject(new DemoError("デモ環境を起動できませんでした")); });
        child.once("exit", () => { clearTimeout(timer); reject(new DemoError("デモ環境が準備完了前に終了しました")); });
      });
      child.unref();
    } catch (error) { child.kill("SIGTERM"); throw error; }
    console.log("① 準備完了：回路・Verifier・Smart Account・ローカル環境を用意しました。\n次に pnpm demo:policy を実行してください。環境は1時間で自動停止します。");
    return;
  }
  if (mode === "stop") {
    await stopEnvironment();
    console.log("デモ環境を停止しました。");
    return;
  }
  if (mode === "policy") {
    const status = z.object({ configured: z.boolean(), sessionStarted: z.boolean() }).parse(await request("/demo/status"));
    if (status.configured) throw new DemoError("設定済みです。次に pnpm demo:claude を実行してください");
    if (!process.argv.includes("--cli")) {
      const connection = connectionSchema.parse(JSON.parse(await readFile("demo-connection.json", "utf8")));
      const url = connection.apiUrl + "/owner";
      console.log("② ポリシー設定画面: " + url + "\nオーナーキーでログインし、設定・コミットメント登録を完了してください。\n完了後は pnpm demo:claude を実行してください。");
      const browser = spawn("open", [url], { stdio: "ignore" });
      browser.once("error", () => console.log("上のURLをブラウザーで開いてください。"));
      return;
    }
    console.log("② ポリシー設定（送金デモは0.1 ETHを使用します）");
    const input = await readCreatePolicyArguments([]);
    if (!("maxAmountWei" in input) || input.maxAmountWei === undefined) throw new DemoError("上限金額が必要です");
    const result = await request("/demo/policy", { maxAmountWei: input.maxAmountWei.toString() });
    const completion = z.object({ policyId: z.string().uuid(), policyVersion: z.number().int().positive(), commitment: z.string().regex(/^0x[0-9a-fA-F]{64}$/), txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }).strict().parse(result);
    console.log(JSON.stringify(completion));
    console.log("② 設定完了。次に pnpm demo:claude を実行してください。");
    return;
  }
  const config = demoSessionSchema.parse(await request("/demo/session", {}));
  try { await runPaymentSession(config, process.argv.includes("--self-test")); }
  finally { await stopEnvironment(); }
}
main().catch((error: unknown) => {
  const message = error instanceof DemoError ? error.message : "デモを実行できませんでした。pnpm demo:prepare → demo:policy → demo:claude の順序と環境の稼働を確認してください";
  console.error(message);
  process.exitCode = 1;
});
