import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

export interface AnvilInstance {
  process: ChildProcess;
  rpcUrl: string;
  stop: () => Promise<void>;
}

export async function availablePort(port = 0): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate a local port"));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

async function waitForAnvil(rpcUrl: string, process: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`anvil exited before becoming ready: ${process.exitCode}`);
    }

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (response.ok) return;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("anvil did not become ready");
}

export async function startAnvil(requestedPort = 0): Promise<AnvilInstance> {
  const port = await availablePort(requestedPort);
  const rpcUrl = `http://127.0.0.1:${port}`;
  const process = spawn(
    "anvil",
    ["--host", "127.0.0.1", "--port", String(port), "--chain-id", "31337", "--silent"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  try {
    await waitForAnvil(rpcUrl, process);
  } catch (error) {
    process.kill("SIGTERM");
    throw error;
  }

  return {
    process,
    rpcUrl,
    stop: async () => {
      if (process.exitCode !== null) return;
      process.kill("SIGTERM");
      await new Promise<void>((resolve) => process.once("exit", () => resolve()));
    },
  };
}
