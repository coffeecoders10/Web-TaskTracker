"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "@/actions/auth";
import ui from "@/components/ui/ui.module.css";
import styles from "./auth.module.css";

const initial: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, initial);
  const isLogin = mode === "login";

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{isLogin ? "Welcome back." : "Make a quiet start."}</h1>
      <p className={styles.lead}>
        {isLogin
          ? "Sign in to see what's next."
          : "Create an account to keep your tasks across devices."}
      </p>

      <form action={action} className={styles.form} noValidate>
        {!isLogin ? (
          <div className={ui.field}>
            <label className={ui.label} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              className={ui.input}
              defaultValue={state.fullName}
              autoComplete="name"
              required
            />
          </div>
        ) : null}

        <div className={ui.field}>
          <label className={ui.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            className={ui.input}
            defaultValue={state.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={ui.input}
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 8}
            required
          />
          {!isLogin ? <p className={styles.hint}>At least 8 characters.</p> : null}
        </div>

        <p className={styles.error} role="alert" aria-live="assertive">
          {state.error ?? ""}
        </p>

        <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={pending}>
          {pending ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className={styles.switch}>
        {isLogin ? "New here? " : "Already have an account? "}
        <Link href={isLogin ? "/signup" : "/login"} className={styles.switchLink}>
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
