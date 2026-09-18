"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { loginAccount, registerAccount } from "@/lib/actions";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const action = mode === "in" ? loginAccount : registerAccount;
    const result = await action(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    router.push(next);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your account unlocks subscribed stills. No card is taken on this site.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3 text-fg outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3 text-fg outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
      <button
        type="button"
        className="mt-6 text-sm font-semibold text-muted"
        onClick={() => setMode((current) => (current === "in" ? "up" : "in"))}
      >
        {mode === "in" ? "Need an account" : "Already have an account"}
      </button>
    </>
  );
}
