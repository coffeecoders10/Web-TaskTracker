"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authLogin, authSignup, BackboneError } from "@/lib/backbone";
import {
  clearLoginFailures,
  loginRetryAfter,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { createSession, destroySession } from "@/lib/session";

export type AuthState = {
  error?: string;
  username?: string;
  fullName?: string;
};

const USERNAME = /^[A-Za-z0-9_]{3,30}$/;

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

async function throttleKey(username: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${username.toLowerCase()}|${ip}`;
}

function describe(err: unknown, fallback: string): string {
  if (err instanceof BackboneError) {
    if (err.status === 401) return "Invalid username or password.";
    if (err.status === 409) return "That username is taken. Try another.";
    if (err.status >= 500 || err.status === 503) return err.message;
    return err.message || fallback;
  }
  return fallback;
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const username = text(form, "username").trim();
  const password = text(form, "password");
  if (!username || !password) {
    return { error: "Enter your username and password.", username };
  }

  const key = await throttleKey(username);
  const wait = loginRetryAfter(key);
  if (wait > 0) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.`,
      username,
    };
  }

  try {
    const user = await authLogin(username, password);
    clearLoginFailures(key);
    await createSession({ userId: user.user_id, username: user.username, name: user.full_name });
  } catch (err) {
    if (err instanceof BackboneError && err.status === 401) recordLoginFailure(key);
    return { error: describe(err, "Couldn't sign in. Try again."), username };
  }
  redirect("/");
}

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const username = text(form, "username").trim();
  const fullName = text(form, "fullName").replace(/\s+/g, " ").trim();
  const password = text(form, "password");
  const keep = { username, fullName };

  if (!USERNAME.test(username)) {
    return { ...keep, error: "Username must be 3–30 letters, numbers or underscores." };
  }
  if (fullName.split(" ").length < 2 || fullName.length > 120) {
    return { ...keep, error: "Enter your first and last name." };
  }
  if (password.length < 8) {
    return { ...keep, error: "Password must be at least 8 characters." };
  }

  try {
    const user = await authSignup({ username, full_name: fullName, password });
    await createSession({ userId: user.user_id, username: user.username, name: user.full_name });
  } catch (err) {
    return { ...keep, error: describe(err, "Couldn't create the account. Try again.") };
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
