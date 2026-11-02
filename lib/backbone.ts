import "server-only";

/**
 * Thin server-side client for the Backbone API (docs/backend-arch-docs).
 * The API key never leaves the server; browsers only talk to Next.js.
 */

export class BackboneError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BackboneError";
  }
}

function config() {
  const url = process.env.BACKBONE_URL?.replace(/\/+$/, "");
  const key = process.env.BACKBONE_DB_QUERY_API_KEY;
  const table = process.env.BACKBONE_DYNAMIC_TABLE || "user_habit";
  if (!url || !key) {
    throw new BackboneError("Backbone is not configured on the server.", 500);
  }
  return { url, key, table };
}

async function call(
  path: string,
  init: { method: string; body?: unknown; auth: boolean },
): Promise<{ status: number; json: unknown }> {
  const { url, key } = config();
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth) headers.Authorization = `Bearer ${key}`;

  let res: Response;
  try {
    res = await fetch(`${url}${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new BackboneError("Couldn't reach the server. Check your connection and try again.", 503);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON bodies are treated as empty.
  }
  return { status: res.status, json };
}

function errorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "error" in json) {
    const e = (json as { error: unknown }).error;
    if (typeof e === "string" && e) return e;
  }
  return fallback;
}

/* ---------------------------------- Auth ---------------------------------- */

export type BackboneUser = {
  user_id: string;
  username: string;
  full_name: string;
};

function parseUser(json: unknown): BackboneUser {
  const u = (json as { user?: Partial<BackboneUser> } | null)?.user;
  if (!u || typeof u.user_id !== "string" || typeof u.username !== "string") {
    throw new BackboneError("Unexpected response from the auth service.", 502);
  }
  return {
    user_id: u.user_id,
    username: u.username,
    full_name: typeof u.full_name === "string" ? u.full_name : u.username,
  };
}

export async function authLogin(username: string, password: string): Promise<BackboneUser> {
  const { status, json } = await call("/auth/login", {
    method: "POST",
    auth: false,
    body: { username, password },
  });
  if (status === 200) return parseUser(json);
  throw new BackboneError(errorMessage(json, "Couldn't sign in."), status);
}

export async function authSignup(input: {
  username: string;
  full_name: string;
  password: string;
}): Promise<BackboneUser> {
  const { status, json } = await call("/auth/signup", {
    method: "POST",
    auth: false,
    body: input,
  });
  if (status === 201) return parseUser(json);
  throw new BackboneError(errorMessage(json, "Couldn't create the account."), status);
}

/* ------------------------- Per-user document store ------------------------- */

function docPath(userId: string): string {
  return `/db_query_dynamic/${config().table}/${encodeURIComponent(userId)}`;
}

/**
 * A row that exists but was never written (create succeeded, first PUT didn't land
 * yet) makes Backbone answer 500 with a JSON-decoding message. That is recoverable,
 * unlike other 500s, so callers can tell the two apart.
 */
export function isEmptyRowError(err: unknown): boolean {
  return (
    err instanceof BackboneError &&
    err.status === 500 &&
    /NoneType|must be str, bytes or bytearray/i.test(err.message)
  );
}

/** Returns the stored document, or `null` if this user has no row yet. */
export async function readUserDoc(userId: string): Promise<unknown | null> {
  const { status, json } = await call(docPath(userId), { method: "GET", auth: true });
  if (status === 404) return null;
  if (status === 200) {
    return (json as { mjson?: unknown } | null)?.mjson ?? {};
  }
  throw new BackboneError(errorMessage(json, "Couldn't load your data."), status);
}

/** Replaces the whole document (the API has no merge). */
export async function writeUserDoc(userId: string, doc: unknown): Promise<void> {
  const { status, json } = await call(docPath(userId), {
    method: "PUT",
    auth: true,
    body: doc,
  });
  if (status === 200) return;
  throw new BackboneError(errorMessage(json, "Couldn't save your data."), status);
}

/**
 * Creates the user's row. Per the SOP, a fresh row has no document until the
 * first PUT (GET would 500), so the initial document is written immediately.
 */
export async function createUserDoc(userId: string, initial: unknown): Promise<void> {
  const { status, json } = await call(`/db_query_dynamic/${config().table}`, {
    method: "POST",
    auth: true,
    body: { id: userId },
  });
  if (status !== 201) {
    throw new BackboneError(errorMessage(json, "Couldn't set up your data."), status);
  }
  try {
    await writeUserDoc(userId, initial);
  } catch {
    await writeUserDoc(userId, initial); // one retry; an empty row can't be read back
  }
}
