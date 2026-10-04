import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function keyBuffer(key: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(key))
    throw new Error("TOKEN_ENCRYPTION_KEY must contain 64 hexadecimal characters");
  return Buffer.from(key, "hex");
}
export function encryptToken(value: string, key: string): string {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", keyBuffer(key), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function decryptToken(value: string, key: string): string {
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw new Error("Invalid encrypted token");
  const cipher = createDecipheriv("aes-256-gcm", keyBuffer(key), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8");
}
