import { z } from "zod";

const schema = z.object({
  POLICY_API_DB_PATH: z.string().min(1),
  POLICY_API_ENCRYPTION_KEY: z.string().min(1),
  POLICY_API_HOST: z.literal("127.0.0.1").default("127.0.0.1"),
  POLICY_API_PORT: z.coerce.number().int().min(0).max(65_535).default(3_000),
  POLICY_API_RPC_URL: z.string().url(),
});

export interface PolicyApiConfig {
  dbPath: string;
  encryptionKey: Buffer;
  host: "127.0.0.1";
  port: number;
  rpcUrl: string;
}

export function parsePolicyApiConfig(input: NodeJS.ProcessEnv): PolicyApiConfig {
  const value = schema.parse(input);
  const rpcUrl = new URL(value.POLICY_API_RPC_URL);
  if (rpcUrl.protocol !== "http:" || rpcUrl.hostname !== "127.0.0.1") {
    throw new Error("POLICY_API_RPC_URL must use local HTTP address 127.0.0.1");
  }
  const encryptionKey = Buffer.from(value.POLICY_API_ENCRYPTION_KEY, "base64");
  if (
    encryptionKey.length !== 32 ||
    encryptionKey.toString("base64") !== value.POLICY_API_ENCRYPTION_KEY
  ) {
    throw new Error("POLICY_API_ENCRYPTION_KEY must be a canonical base64 encoded 32-byte key");
  }
  return {
    dbPath: value.POLICY_API_DB_PATH,
    encryptionKey,
    host: value.POLICY_API_HOST,
    port: value.POLICY_API_PORT,
    rpcUrl: value.POLICY_API_RPC_URL,
  };
}
