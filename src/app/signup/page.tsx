"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { safeRedirect } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthShell title="Create account" body="Create a caregiver account for ABS Connect." />}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirectedFrom"), "/portal");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then sign in.");
  }

  return (
    <AuthShell title="Create account" body="Create a caregiver account for ABS Connect. Staff still controls child record access.">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Full name</span>
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Confirm password</span>
          <input type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>

        {message ? <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p> : null}

        <button disabled={loading} className="focus-ring w-full rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            ABS Connect
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{body}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
