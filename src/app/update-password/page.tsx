"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    let error;
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.auth.updateUser({ password });
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

    setMessage("Password updated. Redirecting...");
    router.push("/portal");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            ABS Connect
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Choose new password</h1>
          <p className="mt-2 text-sm text-slate-600">Enter a new password after opening the reset link from your email.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">New password</span>
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Confirm new password</span>
            <input type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>

          {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}

          <button disabled={loading} className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Saving..." : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Need a new reset link?{" "}
          <Link href="/forgot-password" className="font-semibold text-brand-600 hover:text-brand-700">
            Start over
          </Link>
        </p>
      </section>
    </main>
  );
}
