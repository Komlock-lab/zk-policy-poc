import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface PolicySecret {
  maxAmountWei: string;
  salt: string;
}

export interface EncryptedPolicySecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

const aad = (policyId: string, version: number): Buffer =>
  Buffer.from(`${policyId}:${version}`, "utf8");

export function encryptPolicySecret(
  secret: PolicySecret,
  key: Buffer,
  policyId: string,
  version: number,
): EncryptedPolicySecret {
  if (key.length !== 32) throw new Error("encryption key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  cipher.setAAD(aad(policyId, version));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(secret), "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptPolicySecret(
  encrypted: EncryptedPolicySecret,
  key: Buffer,
  policyId: string,
  version: number,
): PolicySecret {
  if (key.length !== 32) throw new Error("encryption key must be 32 bytes");
  const decipher = createDecipheriv("aes-256-gcm", key, encrypted.iv, { authTagLength: 16 });
  decipher.setAAD(aad(policyId, version));
  decipher.setAuthTag(encrypted.authTag);
  const decoded = JSON.parse(
    Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]).toString("utf8"),
  ) as unknown;
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("maxAmountWei" in decoded) ||
    typeof decoded.maxAmountWei !== "string" ||
    !("salt" in decoded) ||
    typeof decoded.salt !== "string"
  ) {
    throw new Error("decrypted policy has an invalid shape");
  }
  return { maxAmountWei: decoded.maxAmountWei, salt: decoded.salt };
}

export const generatePolicyToken = (): string => `zkp_${randomBytes(32).toString("base64url")}`;
export const hashPolicyToken = (token: string): Buffer =>
  createHash("sha256").update(token, "utf8").digest();

export function matchesPolicyToken(token: string, expected: Buffer): boolean {
  const actual = hashPolicyToken(token);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
