import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { FinderQuery } from "./schema";

export type Cursor = { subject: string; queryHash: string; snapshot: string; after: string; page: 2; expiresAt: number };
export function queryHash(query: FinderQuery): string { return createHash("sha256").update(JSON.stringify([query.postcode, query.radiusKm])).digest("hex"); }
export function createCursor(cursor: Cursor, key: Uint8Array): string {
  if (key.byteLength !== 32) throw new Error("Finder cursor key must have 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("merkalku-finder-cursor-v1"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(cursor), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function readCursor(token: string, key: Uint8Array, subject: string, query: FinderQuery, now: number): Cursor | null {
  try {
    if (key.byteLength !== 32 || token.length > 1536 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
    const bytes = Buffer.from(token, "base64url");
    if (bytes.length < 29 || bytes.toString("base64url") !== token) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from("merkalku-finder-cursor-v1"));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const value: Cursor = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (value.subject !== subject || value.queryHash !== queryHash(query) || value.page !== 2 || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 300_000 || typeof value.after !== "string" || !value.after || value.after.length > 160 || typeof value.snapshot !== "string" || !value.snapshot || value.snapshot.length > 160) return null;
    return value;
  } catch { return null; }
}
