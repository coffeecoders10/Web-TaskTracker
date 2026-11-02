import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE } from "./session-constants";
import {
  decodeSession,
  encodeSession,
  SESSION_MAX_AGE_SECONDS,
  type Session,
} from "./session-token";

/**
 * Backbone login only verifies credentials; it issues no session. This is our
 * session: an HMAC-signed, httpOnly cookie carrying the verified `user_id`.
 * The user id used for every data operation comes from here, never from the client.
 */

export type { Session };

/** Verified session for this request, or null. Deduplicated per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
});

export async function createSession(session: Session): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
