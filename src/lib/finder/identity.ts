import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const FINDER_COOKIE = "__Host-merkalku_finder";
const DAY = 86_400_000;
export type FinderIdentity = { v: 1; budget: string; budgetAt: number; session: string; sessionAt: number };
const opaque = () => randomBytes(24).toString("base64url");
export function pseudonym(key: Uint8Array, purpose: string, value: string): string {
  return createHmac("sha256", key).update(`merkalku-finder-v1/${purpose}\0${value}`).digest("hex");
}
export function signIdentity(identity: FinderIdentity, key: Uint8Array): string {
  const payload = Buffer.from(JSON.stringify(identity)).toString("base64url");
  return `${payload}.${pseudonym(key, "cookie", payload)}`;
}
export function readIdentity(cookie: string | null, key: Uint8Array, now: number): FinderIdentity | null {
  try {
    const entries = (cookie ?? "").split(";").map((entry) => entry.trim()).filter((entry) => entry.startsWith(`${FINDER_COOKIE}=`));
    if (entries.length !== 1) return null;
    const token = entries[0].slice(FINDER_COOKIE.length + 1);
    if (token.length > 1024) return null;
    const [payload, signature, extra] = token.split(".");
    if (extra || !/^[a-f0-9]{64}$/.test(signature ?? "") || !/^[A-Za-z0-9_-]+$/.test(payload ?? "")) return null;
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(pseudonym(key, "cookie", payload), "hex"))) return null;
    const identity = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as FinderIdentity;
    if (identity.v !== 1 || !/^[A-Za-z0-9_-]{32}$/.test(identity.budget) || !/^[A-Za-z0-9_-]{32}$/.test(identity.session)) return null;
    if (![identity.budgetAt, identity.sessionAt].every(Number.isSafeInteger) || identity.budgetAt > now || identity.sessionAt > now || identity.sessionAt < identity.budgetAt || now - identity.budgetAt >= 30 * DAY) return null;
    return identity;
  } catch { return null; }
}
export function renewIdentity(old: FinderIdentity | null, now: number): FinderIdentity {
  if (!old) return { v: 1, budget: opaque(), budgetAt: now, session: opaque(), sessionAt: now };
  return now - old.sessionAt >= DAY ? { ...old, session: opaque(), sessionAt: now } : old;
}
export function identityCookie(identity: FinderIdentity, key: Uint8Array, now: number): string {
  const maxAge = Math.max(0, Math.floor((identity.budgetAt + 30 * DAY - now) / 1000));
  return `${FINDER_COOKIE}=${signIdentity(identity, key)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/** Vercel overwrites x-forwarded-for. Reject lists, ports and missing platform identity.
 * Group IPv6 by /64 so rotating privacy addresses within one network share a budget. */
export function normalizedClientIp(request: Request, onVercel: boolean): string | null {
  if (!onVercel) return null;
  const raw = request.headers.get("x-forwarded-for")?.trim();
  if (!raw || raw.length > 64 || raw.includes(",") || !isIP(raw)) return null;
  if (isIP(raw) === 4) return raw;
  const canonical = new URL(`http://[${raw}]/`).hostname.slice(1, -1).toLowerCase();
  const [left, right = ""] = canonical.split("::");
  const a = left ? left.split(":") : [];
  const b = right ? right.split(":") : [];
  const groups = canonical.includes("::") ? [...a, ...Array(8 - a.length - b.length).fill("0"), ...b] : a;
  // IPv4 mapped IPv6 addresses must share the IPv4 quota.
  if (groups.slice(0, 5).every((x) => parseInt(x, 16) === 0) && parseInt(groups[5], 16) === 65535) {
    const high = parseInt(groups[6], 16), low = parseInt(groups[7], 16);
    return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
  }
  return `${groups.slice(0, 4).map((x) => parseInt(x, 16).toString(16)).join(":")}::/64`;
}
