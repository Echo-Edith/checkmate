"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

type Mode = "login" | "register" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; subtitle: string; button: string }> = {
  login: { title: "Log in", subtitle: "Welcome back to Checkm8.", button: "Log in" },
  register: { title: "Create account", subtitle: "Start learning chess today.", button: "Create account" },
  forgot: { title: "Reset password", subtitle: "We will email you a reset link.", button: "Send reset link" },
  reset: { title: "Choose a new password", subtitle: "Use at least 8 characters.", button: "Update password" },
};

const inputClass =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [info, setInfo] = useState<string | null>(null);

  const copy = COPY[mode];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if ((mode === "register" || mode === "reset") && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.replace(safeNextPath(searchParams.get("next")));
        router.refresh();
      } else if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setInfo("Check your email to confirm your account, then log in.");
        }
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });
        if (authError) throw authError;
        setInfo("If an account exists for that email, a reset link is on its way.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {copy.subtitle}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {mode !== "reset" && (
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        )}

        {mode !== "forgot" && (
          <label className="block text-sm font-medium">
            {mode === "reset" ? "New password" : "Password"}
            <input
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="text-sm" style={{ color: "var(--accent)" }}>
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Please wait…" : copy.button}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-sm" style={{ color: "var(--muted)" }}>
        {mode === "login" && (
          <>
            <p>
              <Link href="/forgot-password" className="underline">
                Forgot your password?
              </Link>
            </p>
            <p>
              No account?{" "}
              <Link href="/register" className="underline">
                Create one
              </Link>
            </p>
          </>
        )}
        {mode === "register" && (
          <p>
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </p>
        )}
        {mode === "forgot" && (
          <p>
            <Link href="/login" className="underline">
              Back to log in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
