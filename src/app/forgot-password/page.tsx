"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    let error;
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      error = result.error;
    } catch (caughtError) {
      setLoading(false);
      setMessage(getAuthErrorMessage(caughtError));
      return;
    }

    setLoading(false);
    setMessage(error ? error.message : "Check your email for a password reset link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <BrandLockup />
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Reset password</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your email and we will send a secure link to set a new password.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>

          {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}

          <button disabled={loading} className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
