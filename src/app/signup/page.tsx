"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { safeRedirect } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthShell title="Create account" body="Create a team contact account for PaddlePass." />}>
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
  const emailRedirectTo =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  async function resendVerificationEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Enter your email address first, then resend the verification email.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: { emailRedirectTo },
      });

      if (error) {
        setMessage(getVerificationResendErrorMessage(error));
        return;
      }

      setMessage("We sent a fresh verification email. Use the newest link in your inbox.");
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const trimmedEmail = email.trim();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    let result;
    try {
      const supabase = createSupabaseBrowserClient();
      result = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: fullName || null },
          emailRedirectTo,
        },
      });
    } catch (error) {
      setLoading(false);
      setMessage(getAuthErrorMessage(error));
      return;
    }
    setLoading(false);

    const { data, error } = result;

    if (error) {
      if (isExistingSignupError(error)) {
        await resendVerificationEmail();
        return;
      }

      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    if (data.user?.identities?.length === 0) {
      await resendVerificationEmail();
      return;
    }

    setMessage("Check your email to confirm your account, then sign in. Use the newest verification email if you requested more than one.");
  }

  return (
    <AuthShell title="Create account" body="Create a team contact account for PaddlePass. Admins still control team access.">
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
        <button
          disabled={loading || !email.trim()}
          type="button"
          onClick={resendVerificationEmail}
          className="focus-ring w-full rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Resend verification email
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

function isExistingSignupError(error: { message?: string; code?: string; status?: number }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("already registered") ||
    message.includes("already exists") ||
    error.code === "user_already_exists" ||
    error.code === "email_exists"
  );
}

function getVerificationResendErrorMessage(error: { message?: string; status?: number }) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("already confirmed")) {
    return "That email is already verified. Sign in instead, or use forgot password if you do not remember the password.";
  }

  if (message.includes("rate") || error.status === 429) {
    return "A verification email was sent recently. Wait a minute, then try resending it again.";
  }

  return error.message ?? "We could not resend the verification email. Please try again.";
}

function AuthShell({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <BrandLockup />
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{body}</p>
        </div>
        {children}
      </section>
    </main>
  );
}
