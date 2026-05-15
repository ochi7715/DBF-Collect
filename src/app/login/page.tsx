"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { safeRedirect } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirectedFrom"), "/portal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    let error;
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.auth.signInWithPassword({ email, password });
      error = result.error;
    } catch (caughtError) {
      setLoading(false);
      setMessage(getAuthErrorMessage(caughtError));
      return;
    }
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function sendMagicLink() {
    setLoading(true);
    setMessage(null);
    let error;
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      error = result.error;
    } catch (caughtError) {
      setLoading(false);
      setMessage(getAuthErrorMessage(caughtError));
      return;
    }
    setLoading(false);
    setMessage(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <LoginShell>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="********"
          />
        </label>

        {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}

        <button
          disabled={loading}
          type="submit"
          className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <button
          disabled={loading || !email}
          type="button"
          onClick={sendMagicLink}
          className="focus-ring w-full rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Email me a sign-in link
        </button>
      </form>
      <div className="mt-6 grid gap-3 border-t border-slate-200 pt-6 text-sm sm:grid-cols-2">
        <a href="/signup" className="focus-ring rounded-xl border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50">
          Create account
        </a>
        <a href="/forgot-password" className="focus-ring rounded-xl border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700 hover:bg-slate-50">
          Forgot password
        </a>
      </div>
    </LoginShell>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">PaddlePass</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Access your Dragon Boat Festival team portal.</p>
        </div>
        {children}
      </section>
    </main>
  );
}
