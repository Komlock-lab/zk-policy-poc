import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddressEqual,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { availablePort, startAnvil } from "./anvil.ts";
import { findArtifact } from "./local-payment.ts";

// Public, deterministic Anvil fixture keys; never used outside the local harness.
export const LOCAL_OWNER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const EXECUTOR_KEY =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const altoDirectory = resolve("node_modules/@pimlico/alto");
const artifactSchema = z.object({
  abi: z.array(z.unknown()),
  bytecode: z.object({ object: z.string().regex(/^0x[0-9a-fA-F]+$/) }),
});

async function stopChild(child: ChildProcess): Promise<void> {
  if (
    child.pid === undefined ||
    child.exitCode !== null ||
    child.signalCode !== null
  )
    return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 3_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

export async function startLocalBundler() {
  const anvil = await startAnvil();
  let child: ChildProcess | undefined;
  try {
    const transport = http(anvil.rpcUrl);
    const publicClient = createPublicClient({ chain: foundry, transport });
    const owner = privateKeyToAccount(LOCAL_OWNER_KEY);
    const wallet = createWalletClient({
      account: owner,
      chain: foundry,
      transport,
    });
    if ((await publicClient.getChainId()) !== 31337)
      throw new Error("local chain id must be 31337");
    async function deploy(artifact: {
      abi: Abi;
      bytecode: Hex;
    }): Promise<Address> {
      const hash = await wallet.deployContract(artifact);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress || receipt.status !== "success")
        throw new Error("local bundler contract deployment failed");
      return receipt.contractAddress;
    }
    async function simulation(name: string, filename: string) {
      const value = artifactSchema.parse(
        JSON.parse(
          await readFile(
            join(altoDirectory, "contracts", `${name}.sol`, `${filename}.json`),
            "utf8",
          ),
        ),
      );
      return deploy({
        abi: value.abi as Abi,
        bytecode: value.bytecode.object as Hex,
      });
    }
    const entryPointAddress = await deploy(await findArtifact("EntryPoint"));
    const pimlico = await simulation(
      "PimlicoSimulations",
      "PimlicoSimulations",
    );
    const simulations = await simulation(
      "EntryPointSimulations",
      "EntryPointSimulations08",
    );
    const port = await availablePort();
    const bundlerUrl = `http://127.0.0.1:${port}`;
    child = spawn(
      process.execPath,
      [
        join(altoDirectory, "esm/cli/alto.js"),
        "--rpc-url",
        anvil.rpcUrl,
        "--entrypoints",
        entryPointAddress,
        "--executor-private-keys",
        EXECUTOR_KEY,
        "--refilling-wallets",
        "false",
        "--deploy-simulations-contract",
        "false",
        "--pimlico-simulation-contract",
        pimlico,
        "--entrypoint-simulation-contract-v8",
        simulations,
        "--port",
        String(port),
        "--safe-mode",
        "true",
        "--log-level",
        "fatal",
        "--eip-7702-support",
        "false",
      ],
      {
        env: {
          PATH: process.env.PATH,
          ALTO_LOCAL_ENTRYPOINT_V08: entryPointAddress,
        },
        stdio: "ignore",
      },
    );
    let spawnError = false;
    child.once("error", () => {
      spawnError = true;
    });
    for (let attempt = 0; attempt < 200; attempt++) {
      if (spawnError || child.exitCode !== null)
        throw new Error("Alto exited before readiness");
      try {
        const rpc = async (method: string) => {
          const response = await fetch(bundlerUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
            signal: AbortSignal.timeout(1_000),
          });
          return z.object({ result: z.unknown() }).parse(await response.json())
            .result;
        };
        const chain = await rpc("eth_chainId");
        const entries = z
          .array(z.string().regex(/^0x[0-9a-fA-F]{40}$/))
          .parse(await rpc("eth_supportedEntryPoints"));
        if (
          chain !== "0x7a69" ||
          !entries.some((entry) =>
            isAddressEqual(entry as Address, entryPointAddress),
          )
        )
          throw new Error("Alto readiness configuration mismatch");
        const running = child;
        return {
          rpcUrl: anvil.rpcUrl,
          bundlerUrl,
          entryPointAddress,
          publicClient,
          wallet,
          owner,
          stop: async () => {
            await stopChild(running);
            await anvil.stop();
          },
        };
      } catch (error) {
        if (!(error instanceof TypeError) && !(error instanceof DOMException))
          throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("Alto did not become ready");
  } catch (error) {
    if (child) await stopChild(child);
    await anvil.stop();
    throw error;
  }
}
