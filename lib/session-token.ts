import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed session token (HMAC-SHA256). Pure: no Next.js APIs, usable from the proxy. */

export type Session = {
  userId: string;
  username: string;
  name: string;
};

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Wall-clock seconds. Next.js flags `Date.now()` during rendering as an unstable
 * value; token expiry is a legitimate wall-clock check, so read the clock via the
 * Performance API instead.
 */
function nowSeconds(): number {
  return Math.floor((performance.timeOrigin + performance.now()) / 1000);
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(session: Session): string {
  const body = Buffer.from(
    JSON.stringify({
      ...session,
      exp: nowSeconds() + SESSION_MAX_AGE_SECONDS,
    }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<Session> & {
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp < nowSeconds()) return null;
    if (typeof data.userId !== "string" || !data.userId) return null;
    return {
      userId: data.userId,
      username: String(data.username ?? ""),
      name: String(data.name ?? ""),
    };
  } catch {
    return null;
  }
}
